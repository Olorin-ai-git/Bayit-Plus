"""
Remediation Agent

Takes countermeasures for suspected fraud based on investigation results.
Responsibilities include:
- Labeling entities based on risk scores
- Taking automated remediation actions
- Logging remediation decisions
"""

import time
from typing import Dict, Any, Optional
from datetime import datetime
import pytz

from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.state_schema import InvestigationState
from app.persistence.database import get_db
from app.persistence.models import EntityRecord
from sqlalchemy.orm import Session

logger = get_bridge_logger(__name__)

# Remediation threshold: entities with risk score > 0.3 are labeled as SUSPECTED_FRAUD
REMEDIATION_RISK_THRESHOLD = 0.3


async def remediation_agent_node(state: InvestigationState, config: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Remediation agent node.
    
    Takes countermeasures for suspected fraud, including:
    - Labeling entities based on investigation risk scores
    - Recording remediation actions
    
    Args:
        state: Investigation state with risk assessment results
        config: Optional configuration
        
    Returns:
        Updates dict with remediation actions taken
    """
    try:
        start_time = time.time()
        investigation_id = state.get('investigation_id', 'unknown')
        entity_id = state.get("entity_id")
        entity_type = state.get("entity_type")
        overall_risk_score = state.get("overall_risk_score")
        
        logger.info(f"[Remediation] 🛡️ Starting remediation for investigation {investigation_id}")
        logger.info(f"[Remediation]   Entity: {entity_type}:{entity_id}")
        logger.info(f"[Remediation]   Risk Score: {overall_risk_score}")
        
        updates = {}
        remediation_actions = []
        
        if not entity_id or not entity_type:
            logger.warning("[Remediation] ⚠️ Missing entity_id or entity_type, skipping remediation")
            return updates
        
        if overall_risk_score is None:
            logger.warning("[Remediation] ⚠️ No risk score available, skipping remediation")
            return updates
        
        # Determine entity label based on risk score
        if overall_risk_score > REMEDIATION_RISK_THRESHOLD:
            label = "SUSPECTED_FRAUD"
            logger.info(f"[Remediation] 🚨 Risk score {overall_risk_score:.3f} exceeds threshold {REMEDIATION_RISK_THRESHOLD}, labeling as {label}")
        else:
            label = "NOT_FRAUD"
            logger.info(f"[Remediation] ✅ Risk score {overall_risk_score:.3f} below threshold {REMEDIATION_RISK_THRESHOLD}, labeling as {label}")
        
        # Store entity label in database
        try:
            db: Session = next(get_db())
            
            # Find or create entity record
            entity_record = db.query(EntityRecord).filter(
                EntityRecord.entity_type == entity_type,
                EntityRecord.entity_id == entity_id
            ).first()
            
            if entity_record:
                # Update existing record
                entity_record.risk_score = overall_risk_score
                entity_record.status = label.lower().replace("_", " ")  # "suspected fraud" or "not fraud"
                entity_record.last_analyzed = datetime.now(pytz.timezone("America/New_York"))
                
                # Store label in attributes JSON
                if entity_record.attributes is None:
                    entity_record.attributes = {}
                entity_record.attributes["label"] = label
                entity_record.attributes["label_assigned_at"] = datetime.now(pytz.timezone("America/New_York")).isoformat()
                entity_record.attributes["label_assigned_by"] = "remediation_agent"
                entity_record.attributes["investigation_id"] = investigation_id
                entity_record.attributes["risk_score_at_labeling"] = overall_risk_score
                
                db.commit()
                logger.info(f"[Remediation] ✅ Updated entity record with label: {label}")
            else:
                # Create new entity record
                entity_record = EntityRecord(
                    entity_type=entity_type,
                    entity_id=entity_id,
                    risk_score=overall_risk_score,
                    status=label.lower().replace("_", " "),
                    last_analyzed=datetime.now(pytz.timezone("America/New_York")),
                    attributes={
                        "label": label,
                        "label_assigned_at": datetime.now(pytz.timezone("America/New_York")).isoformat(),
                        "label_assigned_by": "remediation_agent",
                        "investigation_id": investigation_id,
                        "risk_score_at_labeling": overall_risk_score
                    }
                )
                db.add(entity_record)
                db.commit()
                logger.info(f"[Remediation] ✅ Created entity record with label: {label}")
            
            remediation_actions.append({
                "action": "label_assigned",
                "entity_type": entity_type,
                "entity_id": entity_id,
                "label": label,
                "risk_score": overall_risk_score,
                "threshold": REMEDIATION_RISK_THRESHOLD,
                "timestamp": datetime.now(pytz.timezone("America/New_York")).isoformat()
            })
            
        except Exception as e:
            logger.error(f"[Remediation] ❌ Failed to store entity label: {e}", exc_info=True)
            remediation_actions.append({
                "action": "label_assignment_failed",
                "error": str(e),
                "timestamp": datetime.now(pytz.timezone("America/New_York")).isoformat()
            })
        
        # Store remediation actions in state
        updates["remediation_actions"] = remediation_actions
        updates["entity_label"] = label
        updates["remediation_completed"] = True
        
        duration = time.time() - start_time
        logger.info(f"[Remediation] ✅ Remediation complete in {duration:.2f}s")
        logger.info(f"[Remediation]   Actions taken: {len(remediation_actions)}")
        
        return updates
        
    except Exception as e:
        logger.error(f"[Remediation] ❌ Remediation agent failed: {e}", exc_info=True)
        return {
            "remediation_actions": [{
                "action": "remediation_failed",
                "error": str(e),
                "timestamp": datetime.now(pytz.timezone("America/New_York")).isoformat()
            }],
            "remediation_completed": False
        }

