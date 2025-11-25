"""
SOAR Playbook Executor Service

Provides integration with Splunk SOAR for playbook execution and orchestration.
"""

import json
import logging
from datetime import datetime
from typing import Any, Dict, Optional

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.models.soar_playbook_execution import SOARPlaybookExecution
from app.persistence.database import get_db_session
from app.service.config_loader import get_config_loader
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class PlaybookExecutor:
    """
    Executes SOAR playbooks via REST API.

    Features:
    - SOAR API integration
    - Playbook execution tracking
    - Error handling and retry logic
    - Execution status monitoring
    """

    def __init__(self):
        """Initialize SOAR playbook executor."""
        self.config_loader = get_config_loader()
        self.soar_host = self._load_soar_host()
        self.soar_api_token = self._load_soar_api_token()
        self._http_client: Optional[httpx.AsyncClient] = None

    def _load_soar_host(self) -> str:
        """Load SOAR host from config."""
        soar_host = self.config_loader.load_secret("SOAR_HOST")
        if not soar_host:
            raise ValueError(
                "SOAR_HOST not configured. Set environment variable or configure secret."
            )
        return soar_host

    def _load_soar_api_token(self) -> str:
        """Load SOAR API token from config."""
        soar_token = self.config_loader.load_secret("SOAR_API_TOKEN")
        if not soar_token:
            raise ValueError(
                "SOAR_API_TOKEN not configured. Set environment variable or configure secret."
            )
        return soar_token

    async def _get_http_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._http_client is None:
            self._http_client = httpx.AsyncClient(
                timeout=httpx.Timeout(60.0),
                headers={
                    "Authorization": f"Bearer {self.soar_api_token}",
                    "Content-Type": "application/json",
                },
            )
        return self._http_client

    @retry(
        stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def execute_playbook(
        self,
        playbook_id: str,
        investigation_id: Optional[str],
        anomaly_id: Optional[str],
        tenant_id: str,
        trigger_reason: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> SOARPlaybookExecution:
        """
        Execute a SOAR playbook.

        Args:
            playbook_id: SOAR playbook identifier
            investigation_id: Optional investigation ID
            anomaly_id: Optional anomaly ID
            tenant_id: Tenant ID
            trigger_reason: Optional reason for trigger
            context: Optional additional context

        Returns:
            SOARPlaybookExecution instance

        Raises:
            Exception: If playbook execution fails
        """
        try:
            # Create execution record
            execution = SOARPlaybookExecution(
                playbook_id=playbook_id,
                investigation_id=investigation_id,
                anomaly_id=anomaly_id,
                tenant_id=tenant_id,
                trigger_reason=trigger_reason,
                status="running",
                started_at=datetime.utcnow(),
            )

            # Save execution record
            with get_db_session() as db:
                db.add(execution)
                db.commit()
                db.refresh(execution)

            logger.info(
                f"Executing SOAR playbook {playbook_id} for tenant {tenant_id}, "
                f"execution_id={execution.id}"
            )

            # Build playbook execution request
            playbook_request = {
                "playbook_id": playbook_id,
                "context": {
                    "investigation_id": investigation_id,
                    "anomaly_id": anomaly_id,
                    "tenant_id": tenant_id,
                    "execution_id": execution.id,
                    "trigger_reason": trigger_reason,
                    **(context or {}),
                },
            }

            # Call SOAR API
            client = await self._get_http_client()
            url = f"{self.soar_host}/rest/playbook_execution"

            response = await client.post(url, json=playbook_request)

            if response.status_code == 202:
                # Playbook accepted for execution
                logger.info(
                    f"SOAR playbook {playbook_id} accepted, execution_id={execution.id}"
                )
                return execution
            elif response.status_code == 404:
                # Playbook not found
                execution.status = "failed"
                execution.error_message = f"Playbook {playbook_id} not found"
                execution.completed_at = datetime.utcnow()
                with get_db_session() as db:
                    db.merge(execution)
                    db.commit()
                raise ValueError(f"SOAR playbook {playbook_id} not found")
            else:
                # Other error
                error_text = response.text
                execution.status = "failed"
                execution.error_message = (
                    f"SOAR API error: {response.status_code} - {error_text}"
                )
                execution.completed_at = datetime.utcnow()
                with get_db_session() as db:
                    db.merge(execution)
                    db.commit()
                raise Exception(
                    f"SOAR API error: {response.status_code} - {error_text}"
                )

        except Exception as e:
            logger.error(
                f"Failed to execute SOAR playbook {playbook_id}: {e}", exc_info=True
            )
            raise

    async def get_execution_status(
        self, execution_id: str, tenant_id: str
    ) -> Optional[SOARPlaybookExecution]:
        """
        Get playbook execution status.

        Args:
            execution_id: Execution identifier
            tenant_id: Tenant ID

        Returns:
            SOARPlaybookExecution instance or None if not found
        """
        try:
            with get_db_session() as db:
                execution = (
                    db.query(SOARPlaybookExecution)
                    .filter(
                        SOARPlaybookExecution.id == execution_id,
                        SOARPlaybookExecution.tenant_id == tenant_id,
                    )
                    .first()
                )

                if not execution:
                    return None

                # If still running, check SOAR API for status
                if execution.status == "running":
                    try:
                        client = await self._get_http_client()
                        url = f"{self.soar_host}/rest/playbook_execution/{execution_id}"
                        response = await client.get(url)

                        if response.status_code == 200:
                            soar_status = response.json()
                            # Update execution status from SOAR
                            execution.status = soar_status.get("status", "running")
                            if execution.status in ("completed", "failed", "cancelled"):
                                execution.completed_at = datetime.utcnow()
                            if "actions_executed" in soar_status:
                                execution.set_actions_executed(
                                    soar_status["actions_executed"]
                                )
                            if "error_message" in soar_status:
                                execution.error_message = soar_status["error_message"]

                            db.merge(execution)
                            db.commit()
                            db.refresh(execution)
                    except Exception as e:
                        logger.warning(f"Failed to check SOAR status: {e}")

                return execution

        except Exception as e:
            logger.error(f"Failed to get execution status: {e}", exc_info=True)
            return None

    async def close(self) -> None:
        """Close HTTP client."""
        if self._http_client:
            await self._http_client.aclose()
            self._http_client = None
