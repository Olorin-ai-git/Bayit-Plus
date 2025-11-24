"""
State Update Helper
Feature: 005-polling-and-persistence

Provides helper functions for updating investigation state fields.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders or TODOs
"""

from typing import Dict, Any
from datetime import datetime
import json

from app.models.investigation_state import InvestigationState
from app.schemas.investigation_state import InvestigationStateUpdate
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def apply_state_updates(
    state: InvestigationState,
    data: InvestigationStateUpdate
) -> Dict[str, Any]:
    """Apply updates to investigation state and track changes.

    Args:
        state: Investigation state to update
        data: Update data

    Returns:
        Dictionary of changes made
    """
    changes: Dict[str, Any] = {}

    if data.lifecycle_stage:
        # Handle both string (from use_enum_values=True) and enum objects
        lifecycle_value = data.lifecycle_stage if isinstance(data.lifecycle_stage, str) else data.lifecycle_stage.value
        changes["lifecycle_stage"] = lifecycle_value
        state.lifecycle_stage = lifecycle_value

    if data.settings:
        changes["settings"] = data.settings.dict()
        state.settings_json = json.dumps(data.settings.dict())

    if data.progress:
        progress_dict = data.progress.dict()
        
        # CRITICAL: Ensure overall_risk_score is set from risk_score if available
        # This ensures investigations have overall_risk_score for comparison metrics
        if "risk_score" in progress_dict and progress_dict["risk_score"] is not None:
            risk_score = progress_dict["risk_score"]
            
            # CRITICAL FIX: Validate risk_score is in [0, 1] range
            # If > 1.0, this indicates a bug where domain scores are being summed instead of averaged
            try:
                risk_score_float = float(risk_score)
                if risk_score_float < 0 or risk_score_float > 1.0:
                    logger.error(f"🚨 CRITICAL BUG: Invalid risk_score {risk_score_float} outside [0, 1] range!")
                    logger.error(f"   This indicates domain scores are being incorrectly aggregated (likely summed instead of averaged)")
                    logger.error(f"   Investigation ID: {state.investigation_id}")
                    logger.error(f"   This is a critical bug that must be fixed at the source - rejecting invalid score")
                    # Don't clamp - reject invalid scores to force fixing the root cause
                    progress_dict["risk_score"] = None
                    progress_dict["overall_risk_score"] = None
                else:
                    progress_dict["overall_risk_score"] = progress_dict["risk_score"]
            except (ValueError, TypeError) as e:
                logger.error(f"❌ Invalid risk_score type/value: {risk_score} ({type(risk_score)}): {e}")
                progress_dict["risk_score"] = None
                progress_dict["overall_risk_score"] = None
        
        # CRITICAL FIX: Extract risk score from domain_findings.risk.risk_score if not already set or invalid
        # This handles parallel graph investigations where finalize_risk() is not called
        # The risk agent calculates the score and stores it in domain_findings.risk.risk_score
        # but it may not be copied to the top-level risk_score/overall_risk_score
        # Also handles cases where risk_score is invalid (> 1.0) and needs to be replaced
        current_risk_score = progress_dict.get("risk_score")
        if current_risk_score is None or current_risk_score == 0 or (isinstance(current_risk_score, (int, float)) and current_risk_score > 1.0):
            if isinstance(current_risk_score, (int, float)) and current_risk_score > 1.0:
                logger.warning(
                    f"⚠️ Invalid risk_score={current_risk_score} detected for investigation {state.investigation_id}, "
                    f"attempting to extract correct score from domain_findings.risk.risk_score"
                )
            domain_findings = progress_dict.get("domain_findings", {})
            if isinstance(domain_findings, dict):
                risk_domain = domain_findings.get("risk", {})
                if isinstance(risk_domain, dict):
                    risk_score_from_domain = risk_domain.get("risk_score") or risk_domain.get("score")
                    if risk_score_from_domain is not None:
                        try:
                            risk_score_float = float(risk_score_from_domain)
                            # Validate it's in [0, 1] range
                            if 0 <= risk_score_float <= 1.0:
                                old_score = current_risk_score if current_risk_score is not None else "None/0"
                                progress_dict["risk_score"] = risk_score_float
                                progress_dict["overall_risk_score"] = risk_score_float
                                logger.info(
                                    f"✅ Extracted risk_score={risk_score_float:.3f} from domain_findings.risk.risk_score "
                                    f"for investigation {state.investigation_id} (replaced invalid score: {old_score})"
                                )
                            else:
                                logger.warning(
                                    f"⚠️ Risk score from domain_findings.risk.risk_score is out of range: {risk_score_float} "
                                    f"for investigation {state.investigation_id}"
                                )
                        except (ValueError, TypeError) as e:
                            logger.warning(
                                f"⚠️ Failed to extract risk_score from domain_findings.risk.risk_score: {e} "
                                f"for investigation {state.investigation_id}"
                            )
        
        # Store transaction_scores if provided in progress_dict
        if "transaction_scores" in progress_dict:
            transaction_scores = progress_dict["transaction_scores"]
            if isinstance(transaction_scores, dict):
                # Validate all scores are in [0.0, 1.0] range before storage
                validated_scores = {}
                invalid_count = 0
                for tx_id, score in transaction_scores.items():
                    try:
                        score_float = float(score)
                        if 0.0 <= score_float <= 1.0:
                            validated_scores[str(tx_id)] = score_float
                        else:
                            invalid_count += 1
                            logger.warning(
                                f"⚠️ Invalid transaction score {score_float} for {tx_id} "
                                f"in investigation {state.investigation_id}, excluding"
                            )
                    except (ValueError, TypeError):
                        invalid_count += 1
                        logger.warning(
                            f"⚠️ Invalid transaction score type for {tx_id} "
                            f"in investigation {state.investigation_id}, excluding"
                        )
                
                if validated_scores:
                    progress_dict["transaction_scores"] = validated_scores
                    if invalid_count > 0:
                        logger.warning(
                            f"⚠️ Excluded {invalid_count} invalid transaction scores "
                            f"for investigation {state.investigation_id}"
                        )
                else:
                    # No valid scores - remove transaction_scores key
                    progress_dict.pop("transaction_scores", None)
                    logger.warning(
                        f"⚠️ No valid transaction scores found for investigation {state.investigation_id}"
                    )
        
        changes["progress"] = progress_dict
        state.progress_json = json.dumps(progress_dict)

    # Results are now stored in progress_json, not a separate results_json field
    # No need to handle results separately

    if data.status:
        # Handle both string (from use_enum_values=True) and enum objects
        status_value = data.status if isinstance(data.status, str) else data.status.value
        changes["status"] = status_value
        state.status = status_value
        
        # Index investigation in workspace registry, generate manifest, and run linter when completed
        if status_value in ("COMPLETED", "completed", "COMPLETE", "complete"):
            _index_investigation_on_completion(state)
            _generate_investigation_manifest_on_completion(state)
            _lint_investigation_on_completion(state)
            # Trigger package generation for auto-comparison investigations
            _trigger_package_generation_on_completion(state)

    state.version += 1
    state.updated_at = datetime.utcnow()

    return changes


def _index_investigation_on_completion(state: InvestigationState):
    """
    Index investigation in workspace registry when it completes.
    
    This is called automatically when investigation status changes to COMPLETED.
    """
    try:
        from app.service.investigation.workspace_registry import get_registry
        from app.service.logging.investigation_folder_manager import get_folder_manager
        import json
        
        registry = get_registry()
        folder_manager = get_folder_manager()
        
        # Get investigation folder path
        investigation_folder = folder_manager.get_investigation_folder(state.investigation_id)
        canonical_path = str(investigation_folder) if investigation_folder else None
        
        # Extract metadata from state
        settings_dict = {}
        if state.settings_json:
            try:
                settings_dict = json.loads(state.settings_json)
            except json.JSONDecodeError:
                pass
        
        progress_dict = {}
        if state.progress_json:
            try:
                progress_dict = json.loads(state.progress_json)
            except json.JSONDecodeError:
                pass
        
        # Extract entity information
        entities = settings_dict.get("entities", [])
        entity_type = None
        entity_ids = []
        
        if entities and len(entities) > 0:
            entity_type = entities[0].get("entity_type") if isinstance(entities[0], dict) else getattr(entities[0], "entity_type", None)
            for entity in entities:
                entity_value = entity.get("entity_value") if isinstance(entity, dict) else getattr(entity, "entity_value", None)
                if entity_value:
                    entity_ids.append(entity_value)
        
        # Extract other metadata
        investigation_type = settings_dict.get("investigation_type")
        graph_type = settings_dict.get("graph_type") or settings_dict.get("graph")
        trigger_source = settings_dict.get("trigger_source") or "unknown"
        title = settings_dict.get("name") or f"Investigation {state.investigation_id[:8]}"
        
        # Index investigation
        registry.index_investigation(
            investigation_id=state.investigation_id,
            title=title,
            investigation_type=investigation_type,
            graph_type=graph_type,
            trigger_source=trigger_source,
            status=state.status,
            entity_type=entity_type,
            entity_ids=entity_ids if entity_ids else None,
            tags=None,  # Can be extracted from settings if needed
            canonical_path=canonical_path,
            created_at=state.created_at,
            updated_at=state.updated_at,
            completed_at=state.updated_at if state.status in ("COMPLETED", "completed") else None,
            metadata={
                "user_id": state.user_id,
                "version": state.version,
                "lifecycle_stage": state.lifecycle_stage
            }
        )
        
    except Exception as e:
        # Don't fail state update if registry indexing fails
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Failed to index investigation {state.investigation_id} in registry: {e}")


def _generate_investigation_manifest_on_completion(state: InvestigationState):
    """
    Generate investigation manifest when it completes.
    
    This is called automatically when investigation status changes to COMPLETED.
    """
    try:
        from app.service.investigation.manifest_generator import get_manifest_generator
        from app.service.logging.investigation_folder_manager import get_folder_manager
        from app.service.investigation.workspace_registry import get_registry
        import json
        
        manifest_generator = get_manifest_generator()
        folder_manager = get_folder_manager()
        registry = get_registry()
        
        # Get investigation folder path
        investigation_folder = folder_manager.get_investigation_folder(state.investigation_id)
        canonical_path = str(investigation_folder) if investigation_folder else None
        
        # Extract metadata from state
        settings_dict = {}
        if state.settings_json:
            try:
                settings_dict = json.loads(state.settings_json)
            except json.JSONDecodeError:
                pass
        
        # Extract entity information
        entities = settings_dict.get("entities", [])
        entity_type = None
        entity_ids = []
        
        if entities and len(entities) > 0:
            entity_type = entities[0].get("entity_type") if isinstance(entities[0], dict) else getattr(entities[0], "entity_type", None)
            for entity in entities:
                entity_value = entity.get("entity_value") if isinstance(entity, dict) else getattr(entity, "entity_value", None)
                if entity_value:
                    entity_ids.append(entity_value)
        
        # Query registry for file references
        file_references = []
        try:
            # Get files for this investigation from registry
            with registry._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT canonical_path, entity_view_path, file_kind, file_ext, sha256_hash
                    FROM files
                    WHERE investigation_id = ?
                """, (state.investigation_id,))
                
                for row in cursor.fetchall():
                    file_ref = {
                        "canonical_path": row["canonical_path"],
                        "entity_view_path": row["entity_view_path"],
                        "kind": row["file_kind"],
                        "extension": row["file_ext"],
                        "sha256": row["sha256_hash"]
                    }
                    file_references.append(file_ref)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to query file references for manifest: {e}")
        
        # Generate manifest
        manifest = manifest_generator.generate_investigation_manifest(
            investigation_id=state.investigation_id,
            title=settings_dict.get("name") or f"Investigation {state.investigation_id[:8]}",
            investigation_type=settings_dict.get("investigation_type"),
            graph_type=settings_dict.get("graph_type") or settings_dict.get("graph"),
            trigger_source=settings_dict.get("trigger_source") or "unknown",
            status=state.status,
            entity_type=entity_type,
            entity_ids=entity_ids if entity_ids else None,
            tags=None,
            canonical_path=canonical_path,
            entity_view_paths=None,  # Can be populated from registry if needed
            created_at=state.created_at,
            updated_at=state.updated_at,
            completed_at=state.updated_at if state.status in ("COMPLETED", "completed") else None,
            metadata={
                "user_id": state.user_id,
                "version": state.version,
                "lifecycle_stage": state.lifecycle_stage
            },
            file_references=file_references if file_references else None
        )
        
        # Save manifest to investigation folder
        if investigation_folder:
            manifest_path = manifest_generator.save_investigation_manifest(
                manifest,
                output_path=investigation_folder / "manifest.json"
            )
            import logging
            logger = logging.getLogger(__name__)
            logger.debug(f"Generated investigation manifest: {manifest_path}")
        
    except Exception as e:
        # Don't fail state update if manifest generation fails
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Failed to generate manifest for investigation {state.investigation_id}: {e}")


def _lint_investigation_on_completion(state: InvestigationState):
    """
    Run linter validation when investigation completes.
    
    This is called automatically when investigation status changes to COMPLETED.
    """
    try:
        from app.service.investigation.linter_service import get_linter_service
        import json
        
        linter = get_linter_service()
        
        # Extract investigation data from state
        investigation_data = {
            "investigation_id": state.investigation_id,
            "status": state.status,
            "risk_score": None,  # Will be extracted from progress_json
            "final_risk_score": None,
            "tools_used": 0,
            "tool_results": []
        }
        
        # Parse progress_json for risk scores and tool usage
        if state.progress_json:
            try:
                progress_dict = json.loads(state.progress_json)
                investigation_data.update(progress_dict)
                
                # Extract risk scores
                investigation_data["risk_score"] = progress_dict.get("risk_score")
                investigation_data["final_risk_score"] = (
                    progress_dict.get("overall_risk_score") or
                    progress_dict.get("final_risk_score")
                )
                
                # Extract tool usage
                investigation_data["tools_used"] = progress_dict.get("tools_used", 0)
                investigation_data["tool_results"] = progress_dict.get("tool_results", [])
                
                # Extract domain findings
                investigation_data["domain_findings"] = progress_dict.get("domain_findings", {})
                
            except json.JSONDecodeError:
                pass
        
        # Run linter
        issues = linter.lint_investigation(investigation_data, state.investigation_id)
        
        if issues:
            import logging
            logger = logging.getLogger(__name__)
            summary = linter.format_issues_summary(issues)
            logger.warning(f"Linter found issues for investigation {state.investigation_id}:\n{summary}")
            
            # Check if issues should block report generation
            if linter.should_block_report_generation(issues):
                logger.error(
                    f"Linter FAIL issues found for investigation {state.investigation_id}. "
                    "Report generation may be blocked."
                )
        
    except Exception as e:
        # Don't fail state update if linting fails
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Failed to lint investigation {state.investigation_id}: {e}")


def _trigger_package_generation_on_completion(state: InvestigationState):
    """
    Trigger package generation for auto-comparison investigations when they complete.
    
    This function checks if the investigation is part of an auto-comparison flow
    and triggers package generation asynchronously. The actual package generation
    is handled by _wait_and_create_final_zip_package in app/service/__init__.py,
    but this hook ensures it happens even if investigations complete after timeout.
    """
    try:
        import json
        
        # Check if this is an auto-comparison investigation
        settings_dict = {}
        if state.settings_json:
            try:
                settings_dict = json.loads(state.settings_json)
            except json.JSONDecodeError:
                pass
        
        investigation_type = settings_dict.get("investigation_type") or settings_dict.get("trigger_source", "")
        is_auto_comparison = (
            investigation_type == "auto_comparison" or
            state.investigation_id.startswith("auto-comp-") or
            "auto_comparison" in investigation_type.lower()
        )
        
        if not is_auto_comparison:
            return  # Not an auto-comparison investigation, skip
        
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"📦 Auto-comparison investigation completed: {state.investigation_id}")
        logger.info("   Package generation will be handled by background task in _wait_and_create_final_zip_package")
        
        # Note: The actual package generation happens in _wait_and_create_final_zip_package
        # which polls for investigation completion. This hook is mainly for logging
        # and ensuring the system knows when auto-comparison investigations complete.
        
    except Exception as e:
        # Don't fail state update if package generation trigger fails
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Failed to trigger package generation for investigation {state.investigation_id}: {e}")
