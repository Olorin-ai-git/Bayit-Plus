"""
Domain Findings Persistence Service
Feature: Domain Findings Persistence

Service for persisting domain findings (including LLM risk scores and reasoning) to database.
Stores domain_findings in progress_json for live updates and ensures they're available in results_json.

SYSTEM MANDATE Compliance:
- No hardcoded values: All data from actual execution
- Complete implementation: Fully functional persistence
- Type-safe: All parameters and returns properly typed
- No mocks/stubs: Real database operations only
"""

import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.models.investigation_state import InvestigationState
from app.service.logging import get_bridge_logger
from app.service.tool_execution_service import _serialize_datetime_for_json

logger = get_bridge_logger(__name__)


class DomainFindingsService:
    """Service for persisting and retrieving domain findings with LLM analysis"""

    def __init__(self, db: Session):
        """Initialize service with database session."""
        self.db = db

    def persist_domain_findings(
        self,
        investigation_id: str,
        domain: str,
        findings: Dict[str, Any],
        from_version: Optional[int] = None,
    ) -> bool:
        """
        Persist domain findings to database progress_json.

        Args:
            investigation_id: Investigation identifier
            domain: Domain name (network, device, location, etc.)
            findings: Domain findings dictionary (includes llm_analysis)
            from_version: Current version for optimistic locking (optional)

        Returns:
            True if successful, False otherwise
        """
        try:
            # Get investigation state
            state = (
                self.db.query(InvestigationState)
                .filter(InvestigationState.investigation_id == investigation_id)
                .first()
            )

            if not state:
                logger.warning(
                    f"Investigation {investigation_id} not found for domain findings persistence"
                )
                return False

            # Parse existing progress_json
            progress_data = {}
            if state.progress_json:
                try:
                    progress_data = json.loads(state.progress_json)
                except json.JSONDecodeError as e:
                    logger.warning(
                        f"Failed to parse progress_json for {investigation_id}: {e}"
                    )
                    progress_data = {}

            # Initialize domain_findings structure if it doesn't exist
            if "domain_findings" not in progress_data:
                progress_data["domain_findings"] = {}

            # Serialize datetime objects in findings before storing
            serialized_findings = _serialize_datetime_for_json(findings)

            # Store domain findings with timestamp
            progress_data["domain_findings"][domain] = {
                **serialized_findings,
                "persisted_at": datetime.now(timezone.utc).isoformat(),
            }

            # Update progress_json
            state.progress_json = json.dumps(progress_data)

            # Update version for optimistic locking
            if from_version is not None:
                if state.version != from_version:
                    logger.warning(
                        f"Version mismatch for {investigation_id}: expected {from_version}, got {state.version}"
                    )
                    return False
                state.version = from_version + 1
            else:
                state.version = (state.version or 1) + 1

            # Update timestamp
            state.updated_at = datetime.now(timezone.utc)

            # Commit changes
            self.db.commit()

            # Create audit entry for domain findings event
            try:
                import json as json_module

                from app.service.audit_helper import create_audit_entry

                # Create rich payload with domain findings summary
                payload = {
                    "domain": domain,
                    "risk_score": findings.get("risk_score"),
                    "confidence": findings.get("confidence"),
                    "evidence_count": len(findings.get("evidence", [])),
                    "risk_indicators_count": len(findings.get("risk_indicators", [])),
                    "has_llm_analysis": bool(findings.get("llm_analysis")),
                    "llm_confidence": (
                        findings.get("llm_analysis", {}).get("confidence")
                        if findings.get("llm_analysis")
                        else None
                    ),
                    "analysis_duration": (
                        findings.get("llm_analysis", {}).get("analysis_duration")
                        if findings.get("llm_analysis")
                        else None
                    ),
                    # Include summary of LLM response (first 500 chars)
                    "llm_response_preview": (
                        findings.get("llm_analysis", {}).get("llm_response", "")[:500]
                        if findings.get("llm_analysis")
                        and findings.get("llm_analysis", {}).get("llm_response")
                        else None
                    ),
                }

                create_audit_entry(
                    db=self.db,
                    investigation_id=investigation_id,
                    user_id="SYSTEM",  # Domain agents run as SYSTEM
                    action_type="DOMAIN_FINDINGS",
                    changes_json=json_module.dumps(
                        payload
                    ),  # Payload is the changes_json directly
                    from_version=(
                        from_version if from_version is not None else state.version - 1
                    ),
                    to_version=state.version,
                    source="SYSTEM",
                )
                self.db.commit()
            except Exception as audit_error:
                # Don't fail persistence if audit entry creation fails
                logger.warning(
                    f"Failed to create audit entry for domain findings: {str(audit_error)}"
                )

            logger.info(
                f"✅ Persisted {domain} domain findings for investigation {investigation_id} "
                f"(risk_score: {findings.get('risk_score', 'N/A')}, "
                f"has_llm_analysis: {bool(findings.get('llm_analysis'))})"
            )
            return True

        except Exception as e:
            logger.error(f"Failed to persist domain findings: {str(e)}", exc_info=True)
            self.db.rollback()
            return False

    def get_domain_findings(
        self, investigation_id: str, domain: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Retrieve domain findings from database.

        Args:
            investigation_id: Investigation identifier
            domain: Optional domain name to filter (if None, returns all domains)

        Returns:
            Dictionary of domain findings (single domain if domain specified, all domains otherwise)
        """
        try:
            state = (
                self.db.query(InvestigationState)
                .filter(InvestigationState.investigation_id == investigation_id)
                .first()
            )

            if not state or not state.progress_json:
                return {} if domain else {}

            progress_data = json.loads(state.progress_json)
            domain_findings = progress_data.get("domain_findings", {})

            if domain:
                return domain_findings.get(domain, {})
            else:
                return domain_findings

        except Exception as e:
            logger.error(f"Failed to retrieve domain findings: {str(e)}", exc_info=True)
            return {} if domain else {}

    def ensure_domain_findings_in_results(
        self, investigation_id: str, results_data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        DEPRECATED: Domain findings are now stored in progress_json, not a separate results_json field.
        This method is kept for backward compatibility but does nothing.

        Args:
            investigation_id: Investigation identifier
            results_data: Optional results data (ignored)

        Returns:
            True (always succeeds since domain_findings are already in progress_json)
        """
        # Domain findings are already stored in progress_json, no action needed
        logger.debug(
            f"ensure_domain_findings_in_results called for {investigation_id} - no action needed (domain_findings are in progress_json)"
        )
        return True
