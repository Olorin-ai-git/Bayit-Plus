from collections import OrderedDict
from typing import List, Optional

from app.models.api_models import (
    Investigation,
    InvestigationCreate,
    InvestigationUpdate,
)

# In-memory investigation store (primary source, max 20)
IN_MEMORY_INVESTIGATIONS = OrderedDict()


# Purge cache at import to avoid stale dicts from previous runs
def _purge_on_import():
    IN_MEMORY_INVESTIGATIONS.clear()


_purge_on_import()

# Helper to enforce max 20 investigations in memory
MAX_IN_MEMORY_INVESTIGATIONS = 20


def _add_to_memory(investigation):
    # Handle both Investigation objects and dicts
    investigation_id = investigation.id if hasattr(investigation, 'id') else investigation.get('id') if isinstance(investigation, dict) else None
    if not investigation_id:
        return  # Skip if no ID found
    
    if investigation_id in IN_MEMORY_INVESTIGATIONS:
        IN_MEMORY_INVESTIGATIONS.move_to_end(investigation_id)
    IN_MEMORY_INVESTIGATIONS[investigation_id] = investigation
    while len(IN_MEMORY_INVESTIGATIONS) > MAX_IN_MEMORY_INVESTIGATIONS:
        IN_MEMORY_INVESTIGATIONS.popitem(last=False)


def create_investigation(investigation_create):
    investigation = Investigation(
        id=investigation_create.id,
        entity_id=investigation_create.entity_id,
        entity_type=investigation_create.entity_type,
        user_id=investigation_create.entity_id,  # Deprecated, kept for backward compatibility
        status="IN_PROGRESS",
        policy_comments="",
        investigator_comments="",
        overall_risk_score=0.0,
        device_llm_thoughts="",
        location_llm_thoughts="",
        network_llm_thoughts="",
        logs_llm_thoughts="",
        device_risk_score=0.0,
        location_risk_score=0.0,
        network_risk_score=0.0,
        logs_risk_score=0.0,
    )
    IN_MEMORY_INVESTIGATIONS[investigation_create.id] = investigation
    return investigation


def get_investigation(investigation_id: str):
    # Only use in-memory investigations
    return IN_MEMORY_INVESTIGATIONS.get(investigation_id)


def update_investigation(investigation_id: str, update: InvestigationUpdate):
    inv = IN_MEMORY_INVESTIGATIONS.get(investigation_id)
    if inv and isinstance(inv, dict):
        inv = Investigation(**inv)
    if inv:
        if hasattr(update, "entity_id") and update.entity_id is not None:
            inv.entity_id = update.entity_id
            inv.user_id = update.entity_id
        if hasattr(update, "entity_type") and update.entity_type is not None:
            inv.entity_type = update.entity_type
        if update.status is not None:
            inv.status = update.status
        if update.policy_comments is not None:
            inv.policy_comments = update.policy_comments
        if update.investigator_comments is not None:
            inv.investigator_comments = update.investigator_comments
        _add_to_memory(inv)
    return inv


def delete_investigation(investigation_id: str):
    """
    Delete investigation from both database and in-memory store.
    Returns the deleted investigation dict if found, None otherwise.
    """
    from app.persistence.database import get_db_session
    from app.models.investigation_state import InvestigationState
    from app.service.logging import get_bridge_logger
    
    logger = get_bridge_logger(__name__)
    deleted_inv = None
    
    # First, try to delete from database
    try:
        with get_db_session() as session:
            db_inv = session.query(InvestigationState).filter(
                InvestigationState.investigation_id == investigation_id
            ).first()
            
            if db_inv:
                # Extract data before deletion for return value
                deleted_inv = {
                    'investigation_id': db_inv.investigation_id,
                    'user_id': db_inv.user_id,
                    'status': db_inv.status,
                }
                # Delete from database
                session.delete(db_inv)
                session.commit()
                logger.info(f"[DELETE_INVESTIGATION] Deleted investigation {investigation_id} from database")
            else:
                logger.debug(f"[DELETE_INVESTIGATION] Investigation {investigation_id} not found in database")
    except Exception as db_error:
        logger.error(f"[DELETE_INVESTIGATION] Database deletion failed: {db_error}", exc_info=True)
        # Continue to try in-memory deletion even if database deletion fails
    
    # Also delete from in-memory store (for backward compatibility)
    inv_memory = IN_MEMORY_INVESTIGATIONS.pop(investigation_id, None)
    
    # Return database result if found, otherwise return in-memory result
    if deleted_inv:
        return deleted_inv
    elif inv_memory:
        # Convert in-memory investigation to dict format if needed
        if hasattr(inv_memory, 'id'):
            return {'investigation_id': inv_memory.id, 'user_id': getattr(inv_memory, 'user_id', None), 'status': getattr(inv_memory, 'status', None)}
        elif isinstance(inv_memory, dict):
            return inv_memory
        else:
            return {'investigation_id': investigation_id}
    
    return None


def delete_investigations(investigation_ids: List[str]):
    # Delete from in-memory
    for iid in investigation_ids:
        IN_MEMORY_INVESTIGATIONS.pop(iid, None)


def purge_investigation_cache():
    IN_MEMORY_INVESTIGATIONS.clear()


def list_investigations() -> list:
    """
    List all investigations from the database.
    Falls back to in-memory store if database query fails.
    """
    import traceback
    try:
        from app.persistence.database import get_db_session
        from app.models.investigation_state import InvestigationState
        import json
        from app.service.logging import get_bridge_logger
        
        logger = get_bridge_logger(__name__)
        investigations = []
        
        try:
            # Extract all data while session is open
            investigation_data = []
            with get_db_session() as session:
                # Query all investigation states from database
                db_investigations = session.query(InvestigationState).order_by(
                    InvestigationState.updated_at.desc()
                ).all()
                
                logger.debug(f"[LIST_INVESTIGATIONS] Found {len(db_investigations)} investigations in database")
                
                # Extract all data from database objects while session is still open
                # NOTE: results_json is IGNORED - it contains hardcoded values (e.g., risk_score: 85)
                # We only use progress_json for all data extraction
                for db_inv in db_investigations:
                    investigation_data.append({
                        'investigation_id': db_inv.investigation_id,
                        'user_id': db_inv.user_id,
                        'status': db_inv.status,
                        'settings_json': db_inv.settings_json,
                        'progress_json': db_inv.progress_json,
                        # 'results_json': db_inv.results_json,  # IGNORED - contains hardcoded values
                        'created_at': db_inv.created_at.isoformat() if db_inv.created_at else None,
                        'updated_at': db_inv.updated_at.isoformat() if db_inv.updated_at else None,
                    })
        except Exception as db_error:
            logger.error(f"[LIST_INVESTIGATIONS] Database query failed: {db_error}")
            logger.error(f"[LIST_INVESTIGATIONS] Traceback: {traceback.format_exc()}")
            # Return in-memory store on database error
            return list(IN_MEMORY_INVESTIGATIONS.values())
        
        if not investigation_data:
            logger.debug("[LIST_INVESTIGATIONS] No investigations found in database, returning in-memory store")
            return list(IN_MEMORY_INVESTIGATIONS.values())
        
        # Now process the extracted data (session is closed, but we have all the data)
        for idx, db_inv_data in enumerate(investigation_data):
            try:
                # Validate required fields exist
                if not db_inv_data or 'investigation_id' not in db_inv_data:
                    logger.warning(f"[LIST_INVESTIGATIONS] Skipping invalid investigation data at index {idx}: missing investigation_id")
                    continue
                # Extract entity_id and entity_type from settings_json if available
                # NO FALLBACKS - only use real data from database
                entity_id: Optional[str] = None
                entity_type: Optional[str] = None
                name: Optional[str] = None
                owner: Optional[str] = None  # Extract from settings_json, NO FALLBACK to user_id
                sources: Optional[List[str]] = None
                tools: Optional[List[str]] = None
                risk_model: Optional[str] = None
                description: Optional[str] = None
                time_from: Optional[str] = None
                time_to: Optional[str] = None

                if db_inv_data['settings_json']:
                    try:
                        settings = json.loads(db_inv_data['settings_json'])
                        # Ensure settings is a dict (json.loads can return None for "null" JSON)
                        if not isinstance(settings, dict):
                            settings = {}
                        
                        # Extract entity_id - check multiple possible locations and formats
                        # NO FALLBACKS - only use real data from database
                        if settings.get('entity_id'):
                            entity_id = settings['entity_id']
                        elif settings.get('entities') and isinstance(settings.get('entities'), list) and len(settings.get('entities', [])) > 0:
                            # Check both camelCase and snake_case formats
                            entities_list = settings.get('entities', [])
                            first_entity = entities_list[0] if entities_list else None
                            if isinstance(first_entity, dict):
                                # Check camelCase first (actual format in DB)
                                if 'entityValue' in first_entity and first_entity['entityValue']:
                                    entity_id = first_entity['entityValue']
                                elif 'entity_value' in first_entity and first_entity['entity_value']:
                                    entity_id = first_entity['entity_value']
                                # Otherwise entity_id remains None (NO FALLBACK)
                        
                        # Extract entity_type - check multiple possible locations and formats
                        # NO FALLBACKS - only use real data from database
                        if settings.get('entity_type'):
                            entity_type = settings['entity_type']
                        elif settings.get('entityType'):  # camelCase at top level
                            entity_type = settings['entityType']
                        elif settings.get('entities') and isinstance(settings.get('entities'), list) and len(settings.get('entities', [])) > 0:
                            # Check both camelCase and snake_case formats
                            entities_list = settings.get('entities', [])
                            first_entity = entities_list[0] if entities_list else None
                            if isinstance(first_entity, dict):
                                # Check camelCase first (actual format in DB)
                                if 'entityType' in first_entity and first_entity['entityType']:
                                    entity_type = first_entity['entityType']
                                elif 'entity_type' in first_entity and first_entity['entity_type']:
                                    entity_type = first_entity['entity_type']
                                # Otherwise entity_type remains None (NO FALLBACK)
                        
                        # Extract name - only if present
                        if settings.get('name'):
                            name = settings['name']
                        
                        # Extract owner - only if present (NO FALLBACK to user_id)
                        if settings.get('owner'):
                            owner = settings['owner']
                        elif settings.get('investigator'):
                            owner = settings['investigator']
                        elif settings.get('created_by'):
                            owner = settings['created_by']
                        
                        # Extract sources - only if present and valid
                        # Note: sources may not exist in settings_json for some investigations
                        if 'sources' in settings and settings['sources']:
                            sources_raw = settings['sources'] if isinstance(settings['sources'], list) else []
                            if sources_raw:
                                # Handle sources: extract string values (could be strings or dicts)
                                extracted_sources = [
                                    s if isinstance(s, str) else (s.get('source_name') or s.get('name'))
                                    for s in sources_raw
                                    if (isinstance(s, str) or (isinstance(s, dict) and (s.get('source_name') or s.get('name'))))
                                ]
                                if extracted_sources:
                                    sources = extracted_sources
                        
                        # Extract tools - only if present and valid
                        # Note: tools may be an empty list [] in settings_json
                        if 'tools' in settings and settings['tools']:
                            tools_raw = settings['tools'] if isinstance(settings['tools'], list) else []
                            if tools_raw:
                                # Handle tools: extract tool_name from dicts, or use string directly
                                extracted_tools = [
                                    t if isinstance(t, str) else (t.get('tool_name') or t.get('tool_id') or t.get('name'))
                                    for t in tools_raw
                                    if (isinstance(t, str) or (isinstance(t, dict) and (t.get('tool_name') or t.get('tool_id') or t.get('name'))))
                                ]
                                if extracted_tools:
                                    tools = extracted_tools
                            # If tools is an empty list [], keep it as None (not an empty list) to match API contract
                            elif isinstance(settings.get('tools'), list) and len(settings.get('tools', [])) == 0:
                                # Empty list means no tools - keep as None (NO FALLBACK to empty list)
                                tools = None
                        
                        # Extract risk model - only if present
                        if settings.get('risk_model'):
                            risk_model = settings['risk_model']
                        elif settings.get('riskModel'):
                            risk_model = settings['riskModel']
                        
                        # Extract description - only if present
                        if settings.get('description'):
                            description = settings['description']
                        
                        # Extract time range - only if present
                        # Check multiple possible field names: time_range, timeRange
                        time_range = settings.get('time_range') or settings.get('timeRange')
                        if isinstance(time_range, dict):
                            # Check for start_time (actual format in DB), then from, then start
                            if time_range.get('start_time'):
                                time_from = time_range['start_time']
                            elif time_range.get('from'):
                                time_from = time_range['from']
                            elif time_range.get('start'):
                                time_from = time_range['start']
                            
                            # Check for end_time (actual format in DB), then to, then end
                            if time_range.get('end_time'):
                                time_to = time_range['end_time']
                            elif time_range.get('to'):
                                time_to = time_range['to']
                            elif time_range.get('end'):
                                time_to = time_range['end']
                    except (json.JSONDecodeError, TypeError, IndexError) as e:
                        logger.debug(f"Error parsing settings_json for {db_inv_data['investigation_id']}: {e}")
                        pass
                
                # Map InvestigationState status to Investigation status
                status_map = {
                    'CREATED': 'pending',
                    'SETTINGS': 'pending',
                    'IN_PROGRESS': 'in-progress',
                    'COMPLETED': 'completed',
                    'ERROR': 'failed',
                    'CANCELLED': 'archived'
                }
                investigation_status = status_map.get(db_inv_data['status'], 'pending')
                
                # Extract progress and phases from progress_json
                # NO FALLBACKS - only use real data
                progress_value: Optional[float] = None
                phases_list: Optional[List[Dict[str, Any]]] = None
                progress_data = None  # Will store parsed progress_json for reuse
                
                if db_inv_data['progress_json']:
                    try:
                        progress_data = json.loads(db_inv_data['progress_json'])
                        # Ensure progress_data is a dict (json.loads can return None for "null" JSON)
                        if not isinstance(progress_data, dict):
                            progress_data = {}
                        
                        # Extract progress - only if present
                        if 'percent_complete' in progress_data:
                            progress_value = float(progress_data['percent_complete'])
                        elif 'completion_percent' in progress_data:
                            progress_value = float(progress_data['completion_percent'])
                        elif 'progress_percentage' in progress_data:
                            progress_value = float(progress_data['progress_percentage'])
                        
                        # Extract phases - only if present
                        phases_raw = progress_data.get('phases')
                        if phases_raw and isinstance(phases_raw, list):
                            phases_list = phases_raw
                        elif progress_data.get('current_phase'):
                            # Only create phase structure if we have both current_phase AND progress_value
                            if progress_value is not None:
                                phases_list = [{
                                    'name': progress_data['current_phase'],
                                    'status': 'in-progress' if db_inv_data['status'] == 'IN_PROGRESS' else 'completed',
                                    'pct': progress_value
                                }]
                    except (json.JSONDecodeError, TypeError, ValueError) as e:
                        logger.debug(f"Error parsing progress_json for {db_inv_data['investigation_id']}: {e}")
                        pass
                
                # Extract risk scores and LLM thoughts from progress_json ONLY
                # IGNORE results_json - it contains hardcoded values (e.g., risk_score: 85)
                # NO FALLBACKS - only use real data from progress_json
                overall_risk_score: Optional[float] = None
                device_risk_score: Optional[float] = None
                location_risk_score: Optional[float] = None
                network_risk_score: Optional[float] = None
                logs_risk_score: Optional[float] = None
                device_llm_thoughts: Optional[str] = None
                location_llm_thoughts: Optional[str] = None
                network_llm_thoughts: Optional[str] = None
                logs_llm_thoughts: Optional[str] = None
                policy_comments: Optional[str] = None
                investigator_comments: Optional[str] = None
                
                # Extract ALL data from progress_json ONLY (ignore results_json completely)
                if progress_data is not None:
                    try:
                        # Extract overall_risk_score from progress_json
                        if 'overall_risk_score' in progress_data:
                            overall_risk_score = float(progress_data['overall_risk_score'])
                        elif 'risk_score' in progress_data:
                            overall_risk_score = float(progress_data['risk_score'])
                        elif 'final_risk_score' in progress_data:
                            overall_risk_score = float(progress_data['final_risk_score'])
                        
                        # Extract domain findings from progress_json
                        domain_findings_raw = progress_data.get('domain_findings')
                        
                        # If overall_risk_score is still None, try to extract from domain_findings.risk.risk_score
                        # This handles cases where the risk agent has calculated a score but it's not at the top level
                        if overall_risk_score is None and isinstance(domain_findings_raw, dict) and 'risk' in domain_findings_raw:
                            risk_findings = domain_findings_raw.get('risk', {})
                            if isinstance(risk_findings, dict) and 'risk_score' in risk_findings:
                                risk_score_value = risk_findings.get('risk_score')
                                if risk_score_value is not None:
                                    try:
                                        overall_risk_score = float(risk_score_value)
                                        logger.debug(f"[LIST_INVESTIGATIONS] Extracted overall_risk_score from domain_findings.risk.risk_score: {overall_risk_score}")
                                    except (ValueError, TypeError):
                                        pass
                        # Ensure domain_findings is a dict (not None, not other type)
                        if isinstance(domain_findings_raw, dict):
                            domain_findings = domain_findings_raw
                        else:
                            domain_findings = {}
                        
                        # Debug: Log what we found (only at debug level to reduce noise)
                        if domain_findings:
                            try:
                                domain_keys = list(domain_findings.keys()) if domain_findings else []
                                logger.debug(f"[LIST_INVESTIGATIONS] Found domain_findings in progress_json for {db_inv_data['investigation_id']}: {domain_keys}")
                                # Log structure of each domain for debugging
                                for domain_name in ['device', 'location', 'network', 'logs']:
                                    if domain_name in domain_findings:
                                        domain_data = domain_findings[domain_name]
                                        if isinstance(domain_data, dict):
                                            domain_keys_list = list(domain_data.keys())[:10] if domain_data else []
                                            logger.debug(f"[LIST_INVESTIGATIONS] Domain '{domain_name}' keys: {domain_keys_list}")
                                            logger.debug(f"[LIST_INVESTIGATIONS] Domain '{domain_name}' risk_score: {domain_data.get('risk_score')}")
                                            llm_analysis = domain_data.get('llm_analysis', {})
                                            if isinstance(llm_analysis, dict):
                                                llm_keys = list(llm_analysis.keys()) if llm_analysis else []
                                                logger.debug(f"[LIST_INVESTIGATIONS] Domain '{domain_name}' llm_analysis keys: {llm_keys}")
                            except Exception as debug_error:
                                logger.debug(f"[LIST_INVESTIGATIONS] Error in debug logging: {debug_error}")
                        # Note: Most investigations don't have domain_findings in progress_json - this is expected for older investigations
                        
                        if isinstance(domain_findings, dict) and domain_findings:
                            try:
                                domain_keys_list = list(domain_findings.keys()) if domain_findings else []
                                logger.debug(f"[LIST_INVESTIGATIONS] Processing progress_json domain_findings for {db_inv_data['investigation_id']}: {domain_keys_list}")
                            except Exception as key_error:
                                logger.debug(f"[LIST_INVESTIGATIONS] Error getting domain_findings keys: {key_error}")
                                domain_keys_list = []
                            # Extract device domain
                            if domain_findings.get('device'):
                                device_data = domain_findings.get('device', {})
                                if isinstance(device_data, dict):
                                    # Extract risk score from progress_json - check risk_score first, then metrics.avg_model_score
                                    if 'risk_score' in device_data and device_data['risk_score'] is not None:
                                        device_risk_score = float(device_data['risk_score'])
                                        logger.debug(f"[LIST_INVESTIGATIONS] Extracted device_risk_score from progress_json: {device_risk_score}")
                                    elif 'metrics' in device_data and isinstance(device_data['metrics'], dict):
                                        if 'avg_model_score' in device_data['metrics'] and device_data['metrics']['avg_model_score'] is not None:
                                            device_risk_score = float(device_data['metrics']['avg_model_score'])
                                            logger.debug(f"[LIST_INVESTIGATIONS] Extracted device_risk_score from metrics.avg_model_score: {device_risk_score}")
                                    # ALWAYS prefer progress_json LLM thoughts over results_json (more up-to-date)
                                    # NO FALLBACKS - only extract if present
                                    llm_analysis = device_data.get('llm_analysis', {})
                                    progress_llm_thoughts = (
                                        device_data.get('llm_response_text') or
                                        (llm_analysis.get('reasoning') if isinstance(llm_analysis, dict) and llm_analysis.get('reasoning') else None) or
                                        (llm_analysis.get('llm_response') if isinstance(llm_analysis, dict) and llm_analysis.get('llm_response') else None) or
                                        device_data.get('llm_thoughts') or
                                        device_data.get('reasoning') or
                                        None
                                    )
                                    # Always use progress_json value (it's more up-to-date) - only if not None
                                    if progress_llm_thoughts:
                                        device_llm_thoughts = progress_llm_thoughts
                                        logger.debug(f"[LIST_INVESTIGATIONS] Extracted device_llm_thoughts from progress_json: length={len(device_llm_thoughts) if device_llm_thoughts else 0}")
                            
                            # Extract location domain
                            if domain_findings.get('location'):
                                location_data = domain_findings.get('location', {})
                                if isinstance(location_data, dict):
                                    # Extract risk score from progress_json - check risk_score first, then metrics.avg_model_score
                                    if 'risk_score' in location_data and location_data['risk_score'] is not None:
                                        location_risk_score = float(location_data['risk_score'])
                                        logger.debug(f"[LIST_INVESTIGATIONS] Extracted location_risk_score from progress_json: {location_risk_score}")
                                    elif 'metrics' in location_data and isinstance(location_data['metrics'], dict):
                                        if 'avg_model_score' in location_data['metrics'] and location_data['metrics']['avg_model_score'] is not None:
                                            location_risk_score = float(location_data['metrics']['avg_model_score'])
                                            logger.debug(f"[LIST_INVESTIGATIONS] Extracted location_risk_score from metrics.avg_model_score: {location_risk_score}")
                                    
                                    # Extract LLM thoughts from progress_json
                                    # NO FALLBACKS - only extract if present
                                    llm_analysis = location_data.get('llm_analysis', {})
                                    progress_llm_thoughts = (
                                        location_data.get('llm_response_text') or
                                        (llm_analysis.get('reasoning') if isinstance(llm_analysis, dict) and llm_analysis.get('reasoning') else None) or
                                        (llm_analysis.get('llm_response') if isinstance(llm_analysis, dict) and llm_analysis.get('llm_response') else None) or
                                        location_data.get('llm_thoughts') or
                                        location_data.get('reasoning') or
                                        None
                                    )
                                    # Use progress_json value - only if not None
                                    if progress_llm_thoughts:
                                        location_llm_thoughts = progress_llm_thoughts
                                        logger.debug(f"[LIST_INVESTIGATIONS] Extracted location_llm_thoughts from progress_json: length={len(location_llm_thoughts) if location_llm_thoughts else 0}")
                            
                            # Extract network domain
                            if domain_findings.get('network'):
                                network_data = domain_findings.get('network', {})
                                if isinstance(network_data, dict):
                                    # Extract risk score from progress_json - check risk_score first, then metrics.avg_model_score
                                    if 'risk_score' in network_data and network_data['risk_score'] is not None:
                                        network_risk_score = float(network_data['risk_score'])
                                        logger.debug(f"[LIST_INVESTIGATIONS] Extracted network_risk_score from progress_json: {network_risk_score}")
                                    elif 'metrics' in network_data and isinstance(network_data['metrics'], dict):
                                        if 'avg_model_score' in network_data['metrics'] and network_data['metrics']['avg_model_score'] is not None:
                                            network_risk_score = float(network_data['metrics']['avg_model_score'])
                                            logger.debug(f"[LIST_INVESTIGATIONS] Extracted network_risk_score from metrics.avg_model_score: {network_risk_score}")
                                    
                                    # Extract LLM thoughts from progress_json
                                    # NO FALLBACKS - only extract if present
                                    llm_analysis = network_data.get('llm_analysis', {})
                                    progress_llm_thoughts = (
                                        network_data.get('llm_response_text') or
                                        (llm_analysis.get('reasoning') if isinstance(llm_analysis, dict) and llm_analysis.get('reasoning') else None) or
                                        (llm_analysis.get('llm_response') if isinstance(llm_analysis, dict) and llm_analysis.get('llm_response') else None) or
                                        network_data.get('llm_thoughts') or
                                        network_data.get('reasoning') or
                                        None
                                    )
                                    # Use progress_json value - only if not None
                                    if progress_llm_thoughts:
                                        network_llm_thoughts = progress_llm_thoughts
                                        logger.debug(f"[LIST_INVESTIGATIONS] Extracted network_llm_thoughts from progress_json: length={len(network_llm_thoughts) if network_llm_thoughts else 0}")
                            
                            # Extract logs domain
                            if domain_findings.get('logs'):
                                logs_data = domain_findings.get('logs', {})
                                if isinstance(logs_data, dict):
                                    # Extract risk score from progress_json - check risk_score first, then metrics.avg_model_score
                                    if 'risk_score' in logs_data and logs_data['risk_score'] is not None:
                                        logs_risk_score = float(logs_data['risk_score'])
                                        logger.debug(f"[LIST_INVESTIGATIONS] Extracted logs_risk_score from progress_json: {logs_risk_score}")
                                    elif 'metrics' in logs_data and isinstance(logs_data['metrics'], dict):
                                        if 'avg_model_score' in logs_data['metrics'] and logs_data['metrics']['avg_model_score'] is not None:
                                            logs_risk_score = float(logs_data['metrics']['avg_model_score'])
                                            logger.debug(f"[LIST_INVESTIGATIONS] Extracted logs_risk_score from metrics.avg_model_score: {logs_risk_score}")
                                    
                                    # Extract LLM thoughts from progress_json
                                    # NO FALLBACKS - only extract if present
                                    llm_analysis = logs_data.get('llm_analysis', {})
                                    progress_llm_thoughts = (
                                        logs_data.get('llm_response_text') or
                                        (llm_analysis.get('reasoning') if isinstance(llm_analysis, dict) and llm_analysis.get('reasoning') else None) or
                                        (llm_analysis.get('llm_response') if isinstance(llm_analysis, dict) and llm_analysis.get('llm_response') else None) or
                                        logs_data.get('llm_thoughts') or
                                        logs_data.get('reasoning') or
                                        None
                                    )
                                    # Use progress_json value - only if not None
                                    if progress_llm_thoughts:
                                        logs_llm_thoughts = progress_llm_thoughts
                                        logger.debug(f"[LIST_INVESTIGATIONS] Extracted logs_llm_thoughts from progress_json: length={len(logs_llm_thoughts) if logs_llm_thoughts else 0}")
                    except (json.JSONDecodeError, TypeError) as e:
                        logger.debug(f"Error parsing progress_json for {db_inv_data['investigation_id']}: {e}")
                
                # NO FALLBACKS - keep None values as None (don't convert to 0.0)
                # Only convert to float if value exists
                device_risk_score_final = float(device_risk_score) if device_risk_score is not None else None
                location_risk_score_final = float(location_risk_score) if location_risk_score is not None else None
                network_risk_score_final = float(network_risk_score) if network_risk_score is not None else None
                logs_risk_score_final = float(logs_risk_score) if logs_risk_score is not None else None
                overall_risk_score_final = float(overall_risk_score) if overall_risk_score is not None else None
                
                # Log where overall_risk_score came from for debugging
                if overall_risk_score_final is not None:
                    logger.debug(f"[LIST_INVESTIGATIONS] Investigation {db_inv_data['investigation_id']} overall_risk_score={overall_risk_score_final} extracted from progress_json")
                else:
                    logger.debug(f"[LIST_INVESTIGATIONS] Investigation {db_inv_data['investigation_id']} has no overall_risk_score in progress_json")

                # Log extracted values for debugging (only log if we found data)
                if device_risk_score_final is not None or location_risk_score_final is not None or network_risk_score_final is not None or logs_risk_score_final is not None:
                    logger.debug(f"[LIST_INVESTIGATIONS] Investigation {db_inv_data['investigation_id']} extracted risk scores: device={device_risk_score_final}, location={location_risk_score_final}, network={network_risk_score_final}, logs={logs_risk_score_final}")
                
                # Safely check LLM thoughts before logging lengths
                device_llm_safe = device_llm_thoughts if device_llm_thoughts else ""
                location_llm_safe = location_llm_thoughts if location_llm_thoughts else ""
                network_llm_safe = network_llm_thoughts if network_llm_thoughts else ""
                logs_llm_safe = logs_llm_thoughts if logs_llm_thoughts else ""
                
                if device_llm_thoughts or location_llm_thoughts or network_llm_thoughts or logs_llm_thoughts:
                    logger.debug(f"[LIST_INVESTIGATIONS] Investigation {db_inv_data['investigation_id']} extracted LLM thoughts lengths: device={len(device_llm_safe)}, location={len(location_llm_safe)}, network={len(network_llm_safe)}, logs={len(logs_llm_safe)}")
                
                # Create Investigation object matching InvestigationOut model
                # Log values before creating object (for debugging)
                if location_llm_thoughts or network_llm_thoughts or logs_llm_thoughts:
                    logger.debug(f"[LIST_INVESTIGATIONS] Creating Investigation {db_inv_data['investigation_id']} with LLM thoughts: location={len(location_llm_safe)}, network={len(network_llm_safe)}, logs={len(logs_llm_safe)}")
                
                # Create a dict with all fields for InvestigationOut
                # NO FALLBACKS - use None if data doesn't exist
                # Note: entity_id and entity_type are required fields in InvestigationOut, but we'll use None if not found
                # The Pydantic model will need to handle this or we need to make them Optional
                investigation_dict = {
                    'id': db_inv_data['investigation_id'],
                    'entity_id': entity_id,  # NO FALLBACK - use None if not found
                    'entity_type': entity_type,  # NO FALLBACK - use None if not found
                    'user_id': db_inv_data['user_id'],  # This comes from DB column, not a fallback
                    'status': investigation_status,
                    'policy_comments': policy_comments if policy_comments else "",
                    'investigator_comments': investigator_comments if investigator_comments else "",
                    'overall_risk_score': overall_risk_score_final,  # None if not present
                    'device_llm_thoughts': device_llm_thoughts,  # None if not present
                    'location_llm_thoughts': location_llm_thoughts,  # None if not present
                    'network_llm_thoughts': network_llm_thoughts,  # None if not present
                    'logs_llm_thoughts': logs_llm_thoughts,  # None if not present
                    'device_risk_score': device_risk_score_final,
                    'location_risk_score': location_risk_score_final,
                    'network_risk_score': network_risk_score_final,
                    'logs_risk_score': logs_risk_score_final,
                    # Frontend-required fields - NO FALLBACKS
                    'name': name,  # None if not present
                    'owner': owner,  # NO FALLBACK - extracted from settings_json, None if not present
                    'created': db_inv_data.get('created_at'),  # None if not present
                    'updated': db_inv_data.get('updated_at'),  # None if not present
                    'sources': sources,  # None if not present
                    'tools': tools,  # None if not present
                    'progress': progress_value,  # None if not present
                    'phases': phases_list,  # None if not present
                    'riskModel': risk_model,  # None if not present
                    'description': description,  # None if not present
                    'from_date': time_from,  # None if not present
                    'to_date': time_to,  # None if not present
                    'domain_findings': domain_findings if isinstance(domain_findings, dict) and domain_findings else None,  # CRITICAL: Include domain_findings so map_investigation_to_transactions can extract risk.risk_score
                }
                
                # Create Investigation object (for backward compatibility with in-memory store)
                # Note: Investigation model requires non-None values (defaults to "" for strings, 0.0 for floats)
                # Convert None to defaults for backward compatibility
                try:
                    investigation = Investigation(
                        id=investigation_dict['id'],
                        entity_id=investigation_dict['entity_id'] if investigation_dict['entity_id'] is not None else "",
                        entity_type=investigation_dict['entity_type'] if investigation_dict['entity_type'] is not None else "",
                        user_id=investigation_dict['user_id'],
                        status=investigation_dict['status'],
                        policy_comments=investigation_dict['policy_comments'],
                        investigator_comments=investigation_dict['investigator_comments'],
                        overall_risk_score=investigation_dict['overall_risk_score'] if investigation_dict['overall_risk_score'] is not None else 0.0,
                        device_llm_thoughts=investigation_dict['device_llm_thoughts'] if investigation_dict['device_llm_thoughts'] is not None else "",
                        location_llm_thoughts=investigation_dict['location_llm_thoughts'] if investigation_dict['location_llm_thoughts'] is not None else "",
                        network_llm_thoughts=investigation_dict['network_llm_thoughts'] if investigation_dict['network_llm_thoughts'] is not None else "",
                        logs_llm_thoughts=investigation_dict['logs_llm_thoughts'] if investigation_dict['logs_llm_thoughts'] is not None else "",
                        device_risk_score=investigation_dict['device_risk_score'] if investigation_dict['device_risk_score'] is not None else 0.0,
                        location_risk_score=investigation_dict['location_risk_score'] if investigation_dict['location_risk_score'] is not None else 0.0,
                        network_risk_score=investigation_dict['network_risk_score'] if investigation_dict['network_risk_score'] is not None else 0.0,
                        logs_risk_score=investigation_dict['logs_risk_score'] if investigation_dict['logs_risk_score'] is not None else 0.0,
                    )
                    
                    # Verify the object was created correctly
                    # Safely check for LLM thoughts - handle None values
                    if investigation:
                        try:
                            loc_thoughts = getattr(investigation, 'location_llm_thoughts', None) or ""
                            net_thoughts = getattr(investigation, 'network_llm_thoughts', None) or ""
                            logs_thoughts = getattr(investigation, 'logs_llm_thoughts', None) or ""
                            
                            # Ensure all are strings (not None) before calling len()
                            loc_thoughts = loc_thoughts if loc_thoughts else ""
                            net_thoughts = net_thoughts if net_thoughts else ""
                            logs_thoughts = logs_thoughts if logs_thoughts else ""
                            
                            if loc_thoughts or net_thoughts or logs_thoughts:
                                logger.debug(f"[LIST_INVESTIGATIONS] Investigation {investigation.id} created successfully with LLM thoughts: location={len(loc_thoughts)}, network={len(net_thoughts)}, logs={len(logs_thoughts)}")
                        except Exception as log_error:
                            logger.warning(f"[LIST_INVESTIGATIONS] Error logging investigation LLM thoughts: {log_error}")
                except Exception as inv_create_error:
                    logger.warning(f"[LIST_INVESTIGATIONS] Failed to create Investigation object for {investigation_dict.get('id', 'unknown')}: {inv_create_error}")
                    investigation = None
                
                # Create a custom object that includes all fields for InvestigationOut
                # We'll use a SimpleNamespace or dict-like object that InvestigationOut can validate
                from types import SimpleNamespace
                investigation_with_extras = SimpleNamespace(**investigation_dict)
                
                # Store the dict for InvestigationOut conversion (router will use model_validate with dict)
                investigations.append(investigation_dict)
            except Exception as inv_error:
                investigation_id = db_inv_data.get('investigation_id', f'unknown-{idx}') if db_inv_data else f'unknown-{idx}'
                error_msg = str(inv_error)
                error_type = type(inv_error).__name__
                full_traceback = traceback.format_exc()
                logger.error(f"[LIST_INVESTIGATIONS] Failed to convert investigation {investigation_id} (index {idx}): {error_type}: {error_msg}")
                logger.error(f"[LIST_INVESTIGATIONS] Full traceback:\n{full_traceback}")
                # Continue with next investigation instead of failing completely
                continue
        
        # If database has investigations, return them (and sync to in-memory cache)
        if investigations:
            logger.debug(f"[LIST_INVESTIGATIONS] Successfully converted {len(investigations)} investigations")
            # Sync to in-memory cache for backward compatibility
            for inv in investigations:
                _add_to_memory(inv)
            return investigations
        
        # Fallback to in-memory store if database is empty
        logger.debug("[LIST_INVESTIGATIONS] No investigations converted, returning in-memory store")
        return list(IN_MEMORY_INVESTIGATIONS.values())
        
    except Exception as e:
        # Log error but don't fail - fallback to in-memory store
        import traceback
        from app.service.logging import get_bridge_logger
        logger = get_bridge_logger(__name__)
        logger.error(f"[LIST_INVESTIGATIONS] Unexpected error: {e}, falling back to in-memory store")
        logger.error(f"[LIST_INVESTIGATIONS] Full traceback: {traceback.format_exc()}")
    return list(IN_MEMORY_INVESTIGATIONS.values())


def update_investigation_llm_thoughts(
    investigation_id: str, domain: str, llm_thoughts: str
):
    inv = IN_MEMORY_INVESTIGATIONS.get(investigation_id)
    # If inv is a dict (legacy), convert to Investigation
    if inv and isinstance(inv, dict):
        inv = Investigation(**inv)
    if not inv:
        return None
    if domain == "device":
        inv.device_llm_thoughts = llm_thoughts
    elif domain == "location":
        inv.location_llm_thoughts = llm_thoughts
    elif domain == "network":
        inv.network_llm_thoughts = llm_thoughts
    _add_to_memory(inv)
    return inv


def ensure_investigation_exists(
    investigation_id: str, entity_id: str, entity_type: str = "user_id"
):
    investigation = get_investigation(investigation_id)
    if not investigation:
        from app.models.api_models import InvestigationCreate

        create_investigation(
            InvestigationCreate(
                id=investigation_id, entity_id=entity_id, entity_type=entity_type
            )
        )
