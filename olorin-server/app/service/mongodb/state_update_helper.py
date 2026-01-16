"""
MongoDB State Update Helper
Feature: MongoDB Atlas Migration

Provides helper functions for updating investigation state fields.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders or TODOs
- File size: < 200 lines (split from original 565-line file)
"""

import json
from datetime import datetime
from typing import Any, Dict

from app.models.mongodb.investigation import Investigation
from app.schemas.investigation_state import InvestigationStateUpdate
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def apply_state_updates(
    investigation: Investigation, data: InvestigationStateUpdate
) -> Dict[str, Any]:
    """Apply updates to investigation state and track changes.

    Args:
        investigation: Investigation document to update
        data: Update data

    Returns:
        Dictionary of changes made
    """
    changes: Dict[str, Any] = {}

    if data.lifecycle_stage:
        lifecycle_value = (
            data.lifecycle_stage
            if isinstance(data.lifecycle_stage, str)
            else data.lifecycle_stage.value
        )
        changes["lifecycle_stage"] = lifecycle_value
        investigation.lifecycle_stage = lifecycle_value

    if data.settings:
        settings_dict = data.settings.model_dump(mode="json")
        changes["settings"] = settings_dict
        investigation.settings = data.settings

    if data.progress:
        progress_dict = data.progress.model_dump(mode="json")

        # Validate and normalize risk_score
        progress_dict = _validate_and_normalize_risk_score(
            progress_dict, investigation.investigation_id
        )

        # Validate transaction scores
        progress_dict = _validate_transaction_scores(
            progress_dict, investigation.investigation_id
        )

        changes["progress"] = progress_dict
        investigation.progress = data.progress

    if data.status:
        status_value = (
            data.status if isinstance(data.status, str) else data.status.value
        )
        changes["status"] = status_value
        investigation.status = status_value

    investigation.version += 1
    investigation.updated_at = datetime.utcnow()

    return changes


def _validate_and_normalize_risk_score(
    progress_dict: Dict[str, Any], investigation_id: str
) -> Dict[str, Any]:
    """Validate and normalize risk_score to [0.0, 1.0] range.

    Ensures overall_risk_score is set from risk_score if available.
    Extracts score from domain_findings if not present or invalid.
    """
    if "risk_score" in progress_dict and progress_dict["risk_score"] is not None:
        risk_score = progress_dict["risk_score"]

        try:
            risk_score_float = float(risk_score)
            if risk_score_float < 0 or risk_score_float > 1.0:
                logger.error(
                    f"Invalid risk_score {risk_score_float} outside [0, 1] range "
                    f"for investigation {investigation_id}"
                )
                progress_dict["risk_score"] = None
                progress_dict["overall_risk_score"] = None
            else:
                progress_dict["overall_risk_score"] = progress_dict["risk_score"]
        except (ValueError, TypeError) as e:
            logger.error(
                f"Invalid risk_score type/value: {risk_score} ({type(risk_score)}): {e}"
            )
            progress_dict["risk_score"] = None
            progress_dict["overall_risk_score"] = None

    # Extract from domain_findings if needed
    current_risk_score = progress_dict.get("risk_score")
    if (
        current_risk_score is None
        or current_risk_score == 0
        or (isinstance(current_risk_score, (int, float)) and current_risk_score > 1.0)
    ):
        domain_findings = progress_dict.get("domain_findings", {})
        if isinstance(domain_findings, dict):
            risk_domain = domain_findings.get("risk", {})
            if isinstance(risk_domain, dict):
                risk_score_from_domain = risk_domain.get("risk_score") or risk_domain.get("score")
                if risk_score_from_domain is not None:
                    try:
                        risk_score_float = float(risk_score_from_domain)
                        if 0 <= risk_score_float <= 1.0:
                            progress_dict["risk_score"] = risk_score_float
                            progress_dict["overall_risk_score"] = risk_score_float
                            logger.info(
                                f"Extracted risk_score={risk_score_float:.3f} from domain_findings "
                                f"for investigation {investigation_id}"
                            )
                    except (ValueError, TypeError) as e:
                        logger.warning(
                            f"Failed to extract risk_score from domain_findings: {e} "
                            f"for investigation {investigation_id}"
                        )

    return progress_dict


def _validate_transaction_scores(
    progress_dict: Dict[str, Any], investigation_id: str
) -> Dict[str, Any]:
    """Validate transaction scores are in [0.0, 1.0] range."""
    if "transaction_scores" not in progress_dict:
        return progress_dict

    transaction_scores = progress_dict["transaction_scores"]
    if not isinstance(transaction_scores, dict):
        return progress_dict

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
                    f"Invalid transaction score {score_float} for {tx_id} "
                    f"in investigation {investigation_id}"
                )
        except (ValueError, TypeError):
            invalid_count += 1
            logger.warning(
                f"Invalid transaction score type for {tx_id} "
                f"in investigation {investigation_id}"
            )

    if validated_scores:
        progress_dict["transaction_scores"] = validated_scores
        if invalid_count > 0:
            logger.warning(
                f"Excluded {invalid_count} invalid transaction scores "
                f"for investigation {investigation_id}"
            )
    else:
        progress_dict.pop("transaction_scores", None)
        logger.warning(
            f"No valid transaction scores found for investigation {investigation_id}"
        )

    return progress_dict
