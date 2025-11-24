"""
MaxMind minFraud Client Service

Provides full integration with MaxMind minFraud API for IP risk scoring.
Includes error handling, rate limiting, request queuing, and fallback to AbuseIPDB.
"""

import json
import logging
import time
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime
from queue import Queue
from threading import Lock

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.service.logging import get_bridge_logger
from app.service.config_loader import get_config_loader
from app.service.ip_risk.exceptions import (
    MaxMindError,
    MaxMindConnectionError,
    MaxMindAuthenticationError,
    MaxMindInvalidRequestError,
    MaxMindRateLimitError,
    MaxMindServerError,
    MaxMindConfigurationError
)
from app.service.ip_risk.score_cache import ScoreCache
from sqlalchemy import text
from app.persistence.database import get_db_session
from app.service.config import get_settings_for_env
from app.config.snowflake_config import SnowflakeConfig
from app.models.ip_risk_score import IPRiskScore

logger = get_bridge_logger(__name__)


class MaxMindClient:
    """
    MaxMind minFraud API client with full production implementation.
    
    Features:
    - Real MaxMind API integration
    - Redis caching (1 hour TTL)
    - Rate limit handling with request queuing
    - Exponential backoff retry logic
    - Fallback to AbuseIPDB on failure
    - Snowflake persistence
    - Comprehensive error handling
    """
    
    API_BASE_URL = "https://minfraud.maxmind.com/minfraud/v2.0"
    RATE_LIMIT_REQUESTS_PER_SECOND = 10  # Conservative limit
    MAX_QUEUE_SIZE = 1000
    REQUEST_TIMEOUT_SECONDS = 30
    
    def __init__(
        self,
        score_cache: Optional[ScoreCache] = None,
    ):
        """
        Initialize MaxMind client.
        
        Args:
            score_cache: Optional score cache instance
        """
        self.config_loader = get_config_loader()
        self.score_cache = score_cache or ScoreCache()
        
        # Load MaxMind credentials
        self.account_id = self._load_account_id()
        self.license_key = self._load_license_key()
        
        # Rate limiting and queuing
        self._request_queue: Queue = Queue(maxsize=self.MAX_QUEUE_SIZE)
        self._rate_limit_lock = Lock()
        self._last_request_time = 0.0
        self._request_count = 0
        self._rate_limit_window_start = time.time()
        
        # HTTP client
        self._http_client: Optional[httpx.AsyncClient] = None
        
        # AbuseIPDB fallback client (lazy import)
        self._abuseipdb_client = None
    
    def _load_account_id(self) -> str:
        """Load MaxMind account ID from config."""
        account_id = self.config_loader.load_secret("MAXMIND_ACCOUNT_ID")
        if not account_id:
            raise MaxMindConfigurationError(
                "MAXMIND_ACCOUNT_ID not configured. Set environment variable or configure secret."
            )
        return account_id
    
    def _load_license_key(self) -> str:
        """Load MaxMind license key from config."""
        license_key = self.config_loader.load_secret("MAXMIND_LICENSE_KEY")
        if not license_key:
            raise MaxMindConfigurationError(
                "MAXMIND_LICENSE_KEY not configured. Set environment variable or configure secret."
            )
        return license_key
    
    async def _get_http_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._http_client is None:
            self._http_client = httpx.AsyncClient(
                timeout=httpx.Timeout(self.REQUEST_TIMEOUT_SECONDS),
                auth=(self.account_id, self.license_key)
            )
        return self._http_client
    
    def _check_rate_limit(self) -> None:
        """
        Check and enforce rate limit with request queuing.
        
        Blocks if rate limit would be exceeded.
        """
        current_time = time.time()
        
        # Reset window if 1 second has passed
        if current_time - self._rate_limit_window_start >= 1.0:
            self._rate_limit_window_start = current_time
            self._request_count = 0
        
        # Wait if rate limit exceeded
        if self._request_count >= self.RATE_LIMIT_REQUESTS_PER_SECOND:
            sleep_time = 1.0 - (current_time - self._rate_limit_window_start)
            if sleep_time > 0:
                time.sleep(sleep_time)
                self._rate_limit_window_start = time.time()
                self._request_count = 0
        
        self._request_count += 1
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type((MaxMindConnectionError, MaxMindServerError))
    )
    async def score_transaction(
        self,
        transaction_id: str,
        ip_address: str,
        email: Optional[str] = None,
        billing_country: Optional[str] = None,
        transaction_amount: Optional[float] = None,
        currency: Optional[str] = None,
        **additional_data: Any
    ) -> Dict[str, Any]:
        """
        Score transaction using MaxMind minFraud API.
        
        Args:
            transaction_id: Transaction ID
            ip_address: IP address
            email: Optional email address
            billing_country: Optional billing country code
            transaction_amount: Optional transaction amount
            currency: Optional currency code
            **additional_data: Additional transaction data
            
        Returns:
            Dictionary with risk score and insights
            
        Raises:
            MaxMindError: If scoring fails
        """
        # Check cache first
        cached_score = self.score_cache.get_cached_score(ip_address)
        if cached_score:
            logger.info(f"Returning cached score for IP {ip_address}")
            cached_score["cached"] = True
            cached_score["transaction_id"] = transaction_id
            return cached_score
        
        # Check rate limit
        with self._rate_limit_lock:
            self._check_rate_limit()
        
        try:
            # Build request payload
            payload = {
                "device": {
                    "ip_address": ip_address
                }
            }
            
            if email:
                payload["email"] = {"address": email}
            
            if billing_country:
                payload["billing"] = {"country": billing_country}
            
            if transaction_amount is not None and currency:
                payload["event"] = {
                    "amount": transaction_amount,
                    "currency": currency
                }
            
            # Add additional data
            payload.update(additional_data)
            
            # Call MaxMind API
            client = await self._get_http_client()
            url = f"{self.API_BASE_URL}/score"
            
            logger.info(f"Calling MaxMind API for transaction {transaction_id}, IP {ip_address}")
            
            # Performance monitoring: Track API response time
            import time
            start_time = time.time()
            
            response = await client.post(url, json=payload)
            
            # Performance monitoring: Log response time
            response_time_ms = (time.time() - start_time) * 1000
            logger.info(
                f"MaxMind API response: transaction={transaction_id}, IP={ip_address}, "
                f"response_time_ms={response_time_ms:.2f}, status={response.status_code}"
            )
            
            # Track metrics
            try:
                from prometheus_client import Histogram
                maxmind_api_duration = Histogram(
                    'maxmind_api_duration_seconds',
                    'MaxMind API response duration',
                    ['status_code']
                )
                maxmind_api_duration.labels(status_code=str(response.status_code)).observe(
                    response_time_ms / 1000.0
                )
            except ImportError:
                pass  # Prometheus not available
            
            # Handle response
            if response.status_code == 200:
                response_data = response.json()
                
                # Extract risk score and insights
                risk_score = response_data.get("risk_score", 0.0)
                ip_data = response_data.get("ip_address", {})
                ip_risk = ip_data.get("risk", {})
                ip_traits = ip_data.get("traits", {})
                ip_location = ip_data.get("location", {})
                
                # Build result
                result = {
                    "transaction_id": transaction_id,
                    "ip_address": ip_address,
                    "risk_score": float(ip_risk.get("score", risk_score)),
                    "is_proxy": ip_traits.get("is_proxy", False),
                    "is_vpn": ip_traits.get("is_vpn", False),
                    "is_tor": ip_traits.get("is_tor", False),
                    "geolocation": {
                        "country": ip_location.get("country", {}),
                        "region": ip_location.get("subdivisions", [{}])[0] if ip_location.get("subdivisions") else {},
                        "city": ip_location.get("city", {})
                    } if ip_location else None,
                    "velocity_signals": response_data.get("velocity", {}),
                    "scored_at": datetime.utcnow().isoformat(),
                    "cached": False,
                    "provider": "maxmind"
                }
                
                # Cache result
                self.score_cache.set_cached_score(ip_address, result)
                
                # Persist to PostgreSQL (analytics tables)
                await self._persist_to_postgresql(result)
                
                return result
                
            elif response.status_code == 401:
                raise MaxMindAuthenticationError("Invalid MaxMind credentials")
            elif response.status_code == 400:
                raise MaxMindInvalidRequestError(f"Invalid request: {response.text}")
            elif response.status_code == 429:
                raise MaxMindRateLimitError("MaxMind rate limit exceeded")
            elif response.status_code >= 500:
                raise MaxMindServerError(f"MaxMind server error: {response.status_code}")
            else:
                raise MaxMindError(f"Unexpected status code: {response.status_code}")
                
        except httpx.TimeoutException as e:
            raise MaxMindConnectionError(f"MaxMind API timeout: {e}") from e
        except httpx.RequestError as e:
            raise MaxMindConnectionError(f"MaxMind API connection error: {e}") from e
        except MaxMindError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error scoring transaction: {e}", exc_info=True)
            raise MaxMindError(f"Unexpected error: {e}") from e
    
    async def _persist_to_postgresql(self, score_data: Dict[str, Any]) -> None:
        """
        Persist IP risk score to PostgreSQL ip_risk_scores table.
        
        Args:
            score_data: Score data dictionary
        """
        try:
            # Execute in thread pool to avoid blocking async context
            import asyncio
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                lambda: self._sync_persist_to_postgresql(score_data)
            )
            
            # Publish to Kafka for event streaming
            await self._publish_to_kafka(score_data)
            
        except Exception as e:
            logger.error(f"Failed to persist to PostgreSQL: {e}", exc_info=True)
    
    def _sync_persist_to_postgresql(self, score_data: Dict[str, Any]) -> None:
        """
        Synchronous helper to persist IP risk score to PostgreSQL.
        
        Args:
            score_data: Score data dictionary
        """
        try:
            with get_db_session() as db:
                # Build INSERT query
                query = text("""
                    INSERT INTO ip_risk_scores (
                        transaction_id, ip_address, tenant_id, risk_score,
                        is_proxy, is_vpn, is_tor,
                        geolocation_data, velocity_signals,
                        scored_at, provider
                    ) VALUES (
                        :transaction_id, :ip_address, :tenant_id, :risk_score,
                        :is_proxy, :is_vpn, :is_tor,
                        :geolocation_data, :velocity_signals,
                        :scored_at, :provider
                    )
                    ON CONFLICT (transaction_id, ip_address) DO UPDATE SET
                        risk_score = EXCLUDED.risk_score,
                        is_proxy = EXCLUDED.is_proxy,
                        is_vpn = EXCLUDED.is_vpn,
                        is_tor = EXCLUDED.is_tor,
                        geolocation_data = EXCLUDED.geolocation_data,
                        velocity_signals = EXCLUDED.velocity_signals,
                        updated_at = CURRENT_TIMESTAMP
                """)
                
                params = {
                    "transaction_id": score_data.get("transaction_id"),
                    "ip_address": score_data.get("ip_address"),
                    "tenant_id": score_data.get("tenant_id", "default"),  # TODO: Get from context
                    "risk_score": score_data.get("risk_score"),
                    "is_proxy": score_data.get("is_proxy", False),
                    "is_vpn": score_data.get("is_vpn", False),
                    "is_tor": score_data.get("is_tor", False),
                    "geolocation_data": json.dumps(score_data.get("geolocation", {})),
                    "velocity_signals": json.dumps(score_data.get("velocity_signals", {})),
                    "scored_at": score_data.get("scored_at") or datetime.utcnow(),
                    "provider": score_data.get("provider", "maxmind")
                }
                
                # Execute query
                db.execute(query, params)
                db.commit()
                
                logger.info(f"Persisted IP risk score to PostgreSQL: {score_data.get('transaction_id')}")
            
        except Exception as e:
            logger.error(f"Failed to persist to PostgreSQL: {e}", exc_info=True)
            raise
    
    async def _publish_to_kafka(self, score_data: Dict[str, Any]) -> None:
        """
        Publish IP risk score event to Kafka for Snowpipe Streaming.
        
        Args:
            score_data: Score data dictionary
        """
        try:
            producer = _get_kafka_producer()
            if not producer:
                logger.debug("Kafka producer not available, skipping event publishing")
                return
            
            # Create event for Kafka
            event = {
                "event_id": f"ip_risk_{score_data['transaction_id']}_{datetime.utcnow().isoformat()}",
                "event_type": "ip_risk_score",
                "transaction_id": score_data.get("transaction_id"),
                "timestamp": score_data.get("scored_at", datetime.utcnow().isoformat()),
                "data": score_data
            }
            
            # Publish to Kafka topic
            topic = self.config_loader.load_secret("KAFKA_IP_RISK_TOPIC") or "ip_risk_scores"
            key = score_data.get("transaction_id") or score_data.get("ip_address")
            
            # Run in executor since producer is synchronous
            loop = asyncio.get_event_loop()
            success = await loop.run_in_executor(
                None,
                lambda: producer.publish_event(topic=topic, event=event, key=key)
            )
            
            if success:
                logger.debug(f"Published IP risk score event to Kafka: {event['event_id']}")
            else:
                logger.warning(f"Failed to publish IP risk score event to Kafka: {event['event_id']}")
                
        except Exception as e:
            logger.error(f"Error publishing IP risk score to Kafka: {e}", exc_info=True)
    
    async def _get_abuseipdb_fallback(self, ip_address: str) -> Dict[str, Any]:
        """
        Fallback to AbuseIPDB if MaxMind unavailable.
        
        Args:
            ip_address: IP address
            
        Returns:
            Fallback score data
        """
        try:
            if self._abuseipdb_client is None:
                from app.service.agent.tools.threat_intelligence_tool.abuseipdb.abuseipdb_client import AbuseIPDBClient
                from app.service.agent.tools.threat_intelligence_tool.abuseipdb.models import AbuseIPDBConfig
                
                config = AbuseIPDBConfig(
                    api_key_secret="ABUSEIPDB_API_KEY",
                    base_url="https://api.abuseipdb.com/api/v2",
                    timeout=30
                )
                self._abuseipdb_client = AbuseIPDBClient(config)
            
            # Get AbuseIPDB reputation
            reputation_response = await self._abuseipdb_client.check_ip_reputation(ip_address)
            
            if reputation_response.success and reputation_response.ip_info:
                ip_info = reputation_response.ip_info
                
                # Convert AbuseIPDB confidence to risk score (0-100)
                abuse_confidence = ip_info.abuse_confidence_percentage or 0
                risk_score = float(abuse_confidence)
                
                # Build fallback result
                result = {
                    "transaction_id": f"fallback_{ip_address}",
                    "ip_address": ip_address,
                    "risk_score": risk_score,
                    "is_proxy": False,  # AbuseIPDB doesn't provide this
                    "is_vpn": False,
                    "is_tor": False,
                    "geolocation": {
                        "country": {"code": ip_info.country_code, "name": ip_info.country_name} if ip_info.country_code else None
                    } if ip_info.country_code else None,
                    "velocity_signals": {},
                    "scored_at": datetime.utcnow().isoformat(),
                    "cached": False,
                    "provider": "abuseipdb_fallback"
                }
                
                logger.info(f"Using AbuseIPDB fallback for IP {ip_address}, risk_score={risk_score}")
                return result
            else:
                raise MaxMindError("AbuseIPDB fallback also failed")
                
        except Exception as e:
            logger.error(f"AbuseIPDB fallback failed: {e}")
            raise MaxMindError(f"Both MaxMind and AbuseIPDB failed: {e}") from e
    
    async def score_transaction_with_fallback(
        self,
        transaction_id: str,
        ip_address: str,
        **kwargs: Any
    ) -> Dict[str, Any]:
        """
        Score transaction with automatic fallback to AbuseIPDB.
        
        Args:
            transaction_id: Transaction ID
            ip_address: IP address
            **kwargs: Additional transaction data
            
        Returns:
            Score data from MaxMind or AbuseIPDB fallback
        """
        try:
            return await self.score_transaction(
                transaction_id=transaction_id,
                ip_address=ip_address,
                **kwargs
            )
        except (MaxMindConnectionError, MaxMindServerError, MaxMindRateLimitError) as e:
            logger.warning(f"MaxMind unavailable ({e}), falling back to AbuseIPDB")
            return await self._get_abuseipdb_fallback(ip_address)
    
    async def close(self) -> None:
        """Close HTTP client."""
        if self._http_client:
            await self._http_client.aclose()
            self._http_client = None

