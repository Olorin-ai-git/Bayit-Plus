"""
Entity Label Helper

Retrieves entity labels from EntityRecord for comparison purposes.
Labels are assigned by the Remediation Agent based on investigation risk scores.
"""

from typing import Optional, Dict, Any
from app.persistence.database import get_db
from app.persistence.models import EntityRecord
from sqlalchemy.orm import Session
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def get_entity_label(entity_type: str, entity_id: str) -> Optional[str]:
    """
    Get entity label from EntityRecord.
    
    Labels are assigned by the Remediation Agent:
    - "SUSPECTED_FRAUD" if risk_score > 0.3
    - "NOT_FRAUD" if risk_score <= 0.3
    - None if no label exists
    
    Args:
        entity_type: Entity type (e.g., "email", "device_id", "ip")
        entity_id: Entity ID value
        
    Returns:
        Entity label ("SUSPECTED_FRAUD", "NOT_FRAUD") or None if not found
    """
    try:
        db: Session = next(get_db())
        
        entity_record = db.query(EntityRecord).filter(
            EntityRecord.entity_type == entity_type,
            EntityRecord.entity_id == entity_id
        ).first()
        
        if entity_record and entity_record.attributes:
            label = entity_record.attributes.get("label")
            if label in ("SUSPECTED_FRAUD", "NOT_FRAUD"):
                logger.debug(f"Found entity label for {entity_type}:{entity_id}: {label}")
                return label
        
        logger.debug(f"No entity label found for {entity_type}:{entity_id}")
        return None
        
    except Exception as e:
        logger.warning(f"Failed to retrieve entity label for {entity_type}:{entity_id}: {e}")
        return None


def map_label_to_actual_outcome(label: Optional[str]) -> Optional[str]:
    """
    Map entity label to actual_outcome format used by comparison system.
    
    Args:
        label: Entity label ("SUSPECTED_FRAUD", "NOT_FRAUD", or None)
        
    Returns:
        actual_outcome string ("FRAUD", "NOT_FRAUD", or None)
    """
    if label == "SUSPECTED_FRAUD":
        return "FRAUD"
    elif label == "NOT_FRAUD":
        return "NOT_FRAUD"
    else:
        return None

