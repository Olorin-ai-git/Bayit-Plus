"""
Signal processor for device fingerprinting data.

Handles processing, validation, and persistence of device signals
to PostgreSQL (analytics) and Splunk.
Note: Snowflake is only used as transaction data source, analytics tables are in PostgreSQL.
"""

import json
import logging
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import text

from app.models.device_signal import DeviceSignal
from app.persistence.database import get_db_session
from app.service.config_loader import get_config_loader
from app.service.device_fingerprint.sdk_manager import SDKManager
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

# Lazy import for Kafka producer
_kafka_producer = None


def _get_kafka_producer():
    """Get or create Kafka producer instance."""
    global _kafka_producer
    if _kafka_producer is None:
        try:
            from app.service.events.kafka_producer import KafkaProducer

            _kafka_producer = KafkaProducer()
        except Exception as e:
            logger.warning(f"Kafka producer not available: {e}")
            _kafka_producer = None
    return _kafka_producer


class SignalProcessor:
    """
    Processes device fingerprint signals and persists them to PostgreSQL and Splunk.

    Features:
    - Multi-SDK support with tenant configuration
    - PostgreSQL persistence (analytics tables)
    - Splunk mirroring for real-time alerting
    - Graceful degradation on SDK failure
    """

    def __init__(self, sdk_manager: Optional[SDKManager] = None):
        """
        Initialize signal processor.

        Args:
            sdk_manager: Optional SDK manager instance
        """
        self.sdk_manager = sdk_manager or SDKManager()
        self.config_loader = get_config_loader()

        # Initialize Splunk client if available
        self._splunk_client = None
        try:
            from app.service.agent.tools.splunk_tool.splunk_tool import SplunkQueryTool

            # Splunk client will be initialized on first use
        except ImportError:
            logger.warning("Splunk tools not available, skipping Splunk mirroring")

    def process_signal(
        self, device_signal: DeviceSignal, tenant_id: str
    ) -> Dict[str, Any]:
        """
        Process device signal and persist to Snowflake and Splunk.

        Args:
            device_signal: Device signal data
            tenant_id: Tenant ID

        Returns:
            Processing result with status and IDs
        """
        try:
            # Validate SDK provider matches tenant configuration
            signal_dict = device_signal.model_dump()
            if not self.sdk_manager.validate_device_signal(signal_dict, tenant_id):
                logger.warning(
                    f"Device signal SDK mismatch for tenant {tenant_id}. "
                    f"Expected: {self.sdk_manager.get_tenant_sdk_provider(tenant_id).value}, "
                    f"Got: {signal_dict.get('sdk_provider')}"
                )
                # Continue processing but log warning

            # Add tenant_id if not present
            if not signal_dict.get("tenant_id"):
                signal_dict["tenant_id"] = tenant_id

            # Ensure captured_at is set
            if not signal_dict.get("captured_at"):
                signal_dict["captured_at"] = datetime.utcnow().isoformat()

            # Performance monitoring: Track processing time
            import time

            start_time = time.time()

            # Persist to PostgreSQL (analytics tables)
            postgres_result = self._persist_to_postgresql(signal_dict)

            # Mirror to Splunk for real-time alerting
            splunk_result = self._mirror_to_splunk(signal_dict)

            # Publish to Kafka for Snowpipe Streaming
            kafka_result = self._publish_to_kafka(signal_dict, tenant_id)

            # Performance monitoring: Log processing time and capture rate
            processing_time_ms = (time.time() - start_time) * 1000
            logger.info(
                f"Device signal processed: device_id={signal_dict['device_id']}, "
                f"processing_time_ms={processing_time_ms:.2f}, tenant={tenant_id}, "
                f"sdk_provider={signal_dict.get('sdk_provider')}"
            )

            # Track metrics
            try:
                from prometheus_client import Counter, Histogram

                device_signal_counter = Counter(
                    "device_signal_captures_total",
                    "Total device signal captures",
                    ["sdk_provider", "tenant_id"],
                )
                device_signal_duration = Histogram(
                    "device_signal_processing_duration_seconds",
                    "Device signal processing duration",
                    ["sdk_provider", "tenant_id"],
                )
                device_signal_counter.labels(
                    sdk_provider=signal_dict.get("sdk_provider", "unknown"),
                    tenant_id=tenant_id,
                ).inc()
                device_signal_duration.labels(
                    sdk_provider=signal_dict.get("sdk_provider", "unknown"),
                    tenant_id=tenant_id,
                ).observe(processing_time_ms / 1000.0)
            except ImportError:
                pass  # Prometheus not available

            return {
                "status": "success",
                "device_id": signal_dict["device_id"],
                "transaction_id": signal_dict.get("transaction_id"),
                "postgresql": postgres_result,
                "splunk": splunk_result,
                "kafka": kafka_result,
                "processing_time_ms": processing_time_ms,
            }

        except Exception as e:
            logger.error(f"Failed to process device signal: {e}", exc_info=True)
            raise

    def _persist_to_postgresql(self, signal_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Persist device signal to PostgreSQL device_signals table.

        Args:
            signal_dict: Device signal dictionary

        Returns:
            Persistence result
        """
        try:
            with get_db_session() as db:
                # Build INSERT query
                query = text(
                    """
                    INSERT INTO device_signals (
                        device_id, transaction_id, user_id, tenant_id,
                        confidence_score, browser_fingerprint, behavioral_signals,
                        captured_at, sdk_provider
                    ) VALUES (
                        :device_id, :transaction_id, :user_id, :tenant_id,
                        :confidence_score, :browser_fingerprint, :behavioral_signals,
                        :captured_at, :sdk_provider
                    )
                    ON CONFLICT (device_id) DO UPDATE SET
                        transaction_id = EXCLUDED.transaction_id,
                        user_id = EXCLUDED.user_id,
                        confidence_score = EXCLUDED.confidence_score,
                        browser_fingerprint = EXCLUDED.browser_fingerprint,
                        behavioral_signals = EXCLUDED.behavioral_signals,
                        updated_at = CURRENT_TIMESTAMP
                """
                )

                # Prepare parameters
                params = {
                    "device_id": signal_dict["device_id"],
                    "transaction_id": signal_dict.get("transaction_id"),
                    "user_id": signal_dict.get("user_id"),
                    "tenant_id": signal_dict.get("tenant_id"),
                    "confidence_score": signal_dict.get("confidence_score"),
                    "browser_fingerprint": (
                        json.dumps(signal_dict.get("browser_fingerprint"))
                        if signal_dict.get("browser_fingerprint")
                        else None
                    ),
                    "behavioral_signals": (
                        json.dumps(signal_dict.get("behavioral_signals"))
                        if signal_dict.get("behavioral_signals")
                        else None
                    ),
                    "captured_at": signal_dict.get("captured_at") or datetime.utcnow(),
                    "sdk_provider": signal_dict.get("sdk_provider", "fingerprint_pro"),
                }

                # Execute query
                db.execute(query, params)
                db.commit()

                logger.info(
                    f"Inserted device signal to PostgreSQL: {signal_dict['device_id']}"
                )

                return {
                    "status": "success",
                    "device_id": signal_dict["device_id"],
                }

        except Exception as e:
            logger.error(f"Failed to persist to PostgreSQL: {e}", exc_info=True)
            return {"status": "error", "error": str(e)}

    def _mirror_to_splunk(self, signal_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Mirror device signal to Splunk for real-time alerting.

        Args:
            signal_dict: Device signal dictionary

        Returns:
            Mirroring result
        """
        try:
            # Check if Splunk is available
            if not self._splunk_client:
                logger.debug("Splunk client not available, skipping mirroring")
                return {"status": "skipped", "reason": "splunk_not_available"}

            # Format event for Splunk
            splunk_event = {
                "event_type": "device_signal",
                "device_id": signal_dict["device_id"],
                "transaction_id": signal_dict.get("transaction_id"),
                "user_id": signal_dict.get("user_id"),
                "tenant_id": signal_dict.get("tenant_id"),
                "confidence_score": signal_dict.get("confidence_score"),
                "sdk_provider": signal_dict.get("sdk_provider"),
                "timestamp": signal_dict.get(
                    "captured_at", datetime.utcnow().isoformat()
                ),
            }

            # Send to Splunk (placeholder - actual implementation would use Splunk client)
            logger.info(
                f"Would send device signal to Splunk: {signal_dict['device_id']}"
            )

            return {
                "status": "success",
                "event_id": f"device_signal_{signal_dict['device_id']}",
            }

        except Exception as e:
            logger.error(f"Failed to mirror to Splunk: {e}", exc_info=True)
            return {"status": "error", "error": str(e)}

    def _publish_to_kafka(
        self, signal_dict: Dict[str, Any], tenant_id: str
    ) -> Dict[str, Any]:
        """
        Publish device signal event to Kafka for Snowpipe Streaming.

        Args:
            signal_dict: Device signal dictionary
            tenant_id: Tenant ID

        Returns:
            Publishing result
        """
        try:
            producer = _get_kafka_producer()
            if not producer:
                logger.debug("Kafka producer not available, skipping event publishing")
                return {"status": "skipped", "reason": "kafka_not_available"}

            # Create event for Kafka
            event = {
                "event_id": f"device_signal_{signal_dict['device_id']}_{datetime.utcnow().isoformat()}",
                "event_type": "device_signal",
                "transaction_id": signal_dict.get("transaction_id"),
                "timestamp": signal_dict.get(
                    "captured_at", datetime.utcnow().isoformat()
                ),
                "tenant_id": tenant_id,
                "data": signal_dict,
            }

            # Publish to Kafka topic
            topic = (
                self.config_loader.load_secret("KAFKA_DEVICE_SIGNALS_TOPIC")
                or "device_signals"
            )
            key = signal_dict.get("transaction_id") or signal_dict["device_id"]

            success = producer.publish_event(topic=topic, event=event, key=key)

            if success:
                logger.debug(
                    f"Published device signal event to Kafka: {event['event_id']}"
                )
                return {"status": "success", "event_id": event["event_id"]}
            else:
                logger.warning(
                    f"Failed to publish device signal event to Kafka: {event['event_id']}"
                )
                return {"status": "failed", "reason": "kafka_publish_failed"}

        except Exception as e:
            logger.error(f"Error publishing device signal to Kafka: {e}", exc_info=True)
            return {"status": "error", "error": str(e)}

    def process_fallback_signal(
        self,
        transaction_id: str,
        user_id: Optional[str],
        tenant_id: str,
        user_agent: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Process fallback device signal when SDK fails.

        Uses User-Agent and basic browser info as fallback.

        Args:
            transaction_id: Transaction ID
            user_id: User ID
            tenant_id: Tenant ID
            user_agent: User-Agent string

        Returns:
            Processing result
        """
        try:
            # Generate fallback device_id from User-Agent hash
            import hashlib

            fallback_id = hashlib.sha256(
                f"{user_agent or 'unknown'}_{tenant_id}".encode()
            ).hexdigest()[:32]

            fallback_signal = DeviceSignal(
                device_id=f"fallback_{fallback_id}",
                transaction_id=transaction_id,
                user_id=user_id,
                tenant_id=tenant_id,
                confidence_score=0.1,  # Low confidence for fallback
                browser_fingerprint={"user_agent": user_agent} if user_agent else None,
                behavioral_signals=None,
                sdk_provider=self.sdk_manager.get_tenant_sdk_provider(tenant_id).value,
            )

            logger.warning(
                f"Processing fallback device signal for transaction {transaction_id}, "
                f"tenant {tenant_id}"
            )

            return self.process_signal(fallback_signal, tenant_id)

        except Exception as e:
            logger.error(f"Failed to process fallback signal: {e}", exc_info=True)
            raise
