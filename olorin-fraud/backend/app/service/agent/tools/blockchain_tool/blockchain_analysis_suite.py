"""Blockchain Analysis Suite - Foundation for cryptocurrency investigation tools."""

import asyncio
import hashlib
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple, Union

import httpx
import tenacity
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class BlockchainNetwork(Enum):
    """Supported blockchain networks."""

    BITCOIN = "bitcoin"
    ETHEREUM = "ethereum"
    BITCOIN_CASH = "bitcoin_cash"
    LITECOIN = "litecoin"
    BINANCE_SMART_CHAIN = "binance_smart_chain"
    POLYGON = "polygon"
    SOLANA = "solana"
    CARDANO = "cardano"
    AVALANCHE = "avalanche"
    TRON = "tron"


class RiskLevel(Enum):
    """Risk assessment levels."""

    VERY_LOW = "very_low"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"
    CRITICAL = "critical"


class AddressType(Enum):
    """Types of blockchain addresses."""

    PERSONAL_WALLET = "personal_wallet"
    EXCHANGE = "exchange"
    MIXER = "mixer"
    GAMBLING = "gambling"
    MERCHANT = "merchant"
    MINING_POOL = "mining_pool"
    ICO_WALLET = "ico_wallet"
    DEFI_CONTRACT = "defi_contract"
    UNKNOWN = "unknown"
    SANCTIONED = "sanctioned"


@dataclass
class AddressInfo:
    """Information about a blockchain address."""

    address: str
    network: BlockchainNetwork
    address_type: AddressType = AddressType.UNKNOWN
    balance: Optional[float] = None
    first_seen: Optional[datetime] = None
    last_seen: Optional[datetime] = None
    total_received: Optional[float] = None
    total_sent: Optional[float] = None
    transaction_count: int = 0

    # Risk and compliance
    risk_level: RiskLevel = RiskLevel.LOW
    risk_factors: Set[str] = field(default_factory=set)
    sanctions_match: bool = False
    compliance_flags: Set[str] = field(default_factory=set)

    # Labels and tags
    labels: Set[str] = field(default_factory=set)
    cluster_id: Optional[str] = None
    entity_name: Optional[str] = None


@dataclass
class TransactionAnalysis:
    """Analysis of a blockchain transaction."""

    transaction_id: str
    network: BlockchainNetwork
    timestamp: Optional[datetime] = None
    block_height: Optional[int] = None
    confirmations: int = 0

    # Transaction details
    input_addresses: List[str] = field(default_factory=list)
    output_addresses: List[str] = field(default_factory=list)
    total_input_value: Optional[float] = None
    total_output_value: Optional[float] = None
    fee: Optional[float] = None

    # Analysis results
    risk_score: float = 0.0
    risk_factors: Set[str] = field(default_factory=set)
    suspicious_patterns: List[str] = field(default_factory=list)
    mixer_usage: bool = False
    exchange_involvement: bool = False

    # Tracing information
    hops_from_source: Optional[int] = None
    trace_depth: int = 0
    related_entities: Set[str] = field(default_factory=set)


@dataclass
class RiskAssessment:
    """Comprehensive risk assessment for addresses or transactions."""

    subject: str  # address or transaction ID
    network: BlockchainNetwork
    overall_risk: RiskLevel
    risk_score: float  # 0.0 to 1.0

    # Risk breakdown
    aml_risk: float = 0.0
    sanctions_risk: float = 0.0
    mixing_risk: float = 0.0
    exchange_risk: float = 0.0
    volume_risk: float = 0.0

    # Detailed findings
    risk_factors: Dict[str, float] = field(default_factory=dict)
    compliance_issues: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)

    # Metadata
    assessed_at: datetime = field(default_factory=datetime.now)
    confidence_level: float = 0.8
    data_sources: Set[str] = field(default_factory=set)


class BlockchainProvider(ABC):
    """Abstract base class for blockchain data providers."""

    @abstractmethod
    async def get_address_info(
        self, address: str, network: BlockchainNetwork
    ) -> Optional[AddressInfo]:
        """Get information about a blockchain address."""
        pass

    @abstractmethod
    async def get_transaction_info(
        self, tx_id: str, network: BlockchainNetwork
    ) -> Optional[TransactionAnalysis]:
        """Get information about a transaction."""
        pass

    @abstractmethod
    async def trace_funds(
        self, address: str, network: BlockchainNetwork, depth: int = 3
    ) -> List[TransactionAnalysis]:
        """Trace funds from an address."""
        pass

    @abstractmethod
    async def check_sanctions(self, address: str, network: BlockchainNetwork) -> bool:
        """Check if address is on sanctions lists."""
        pass


class ChainalysisProvider(BlockchainProvider):
    """Chainalysis API provider implementation."""

    def __init__(self, api_key: str, base_url: str = "https://api.chainalysis.com"):
        """Initialize Chainalysis provider."""
        self.api_key = api_key
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=30.0)

        # Circuit breaker state
        self.circuit_breaker_state = {
            "state": "closed",
            "failure_count": 0,
            "last_failure_time": 0,
            "failure_threshold": 3,
            "recovery_timeout": 60.0,
        }

    async def get_address_info(
        self, address: str, network: BlockchainNetwork
    ) -> Optional[AddressInfo]:
        """Get address information from Chainalysis."""
        try:

            @tenacity.retry(
                stop=stop_after_attempt(3),
                wait=wait_exponential(multiplier=1, min=1, max=5),
                retry=retry_if_exception_type(
                    (httpx.HTTPError, httpx.TimeoutException)
                ),
            )
            async def _fetch_address():
                headers = {"Authorization": f"Bearer {self.api_key}"}
                response = await self.client.get(
                    f"{self.base_url}/v1/addresses/{address}",
                    headers=headers,
                    params={"network": network.value},
                )
                response.raise_for_status()
                return response.json()

            data = await _fetch_address()
            return self._parse_address_response(data, address, network)

        except Exception as e:
            logger.error(f"Failed to fetch address info from Chainalysis: {e}")
            return None

    async def get_transaction_info(
        self, tx_id: str, network: BlockchainNetwork
    ) -> Optional[TransactionAnalysis]:
        """Get transaction information from Chainalysis."""
        try:

            @tenacity.retry(
                stop=stop_after_attempt(3),
                wait=wait_exponential(multiplier=1, min=1, max=5),
                retry=retry_if_exception_type(
                    (httpx.HTTPError, httpx.TimeoutException)
                ),
            )
            async def _fetch_transaction():
                headers = {"Authorization": f"Bearer {self.api_key}"}
                response = await self.client.get(
                    f"{self.base_url}/v1/transactions/{tx_id}",
                    headers=headers,
                    params={"network": network.value},
                )
                response.raise_for_status()
                return response.json()

            data = await _fetch_transaction()
            return self._parse_transaction_response(data, tx_id, network)

        except Exception as e:
            logger.error(f"Failed to fetch transaction info from Chainalysis: {e}")
            return None

    async def trace_funds(
        self, address: str, network: BlockchainNetwork, depth: int = 3
    ) -> List[TransactionAnalysis]:
        """Trace funds using Chainalysis."""
        # Implementation placeholder - would integrate with Chainalysis tracing API
        logger.info(
            f"Tracing funds from {address} on {network.value} with depth {depth}"
        )
        return []

    async def check_sanctions(self, address: str, network: BlockchainNetwork) -> bool:
        """Check sanctions using Chainalysis."""
        # Implementation placeholder - would check against Chainalysis sanctions data
        return False

    def _parse_address_response(
        self, data: Dict[str, Any], address: str, network: BlockchainNetwork
    ) -> AddressInfo:
        """Parse Chainalysis address response."""
        return AddressInfo(
            address=address,
            network=network,
            balance=data.get("balance", 0.0),
            total_received=data.get("totalReceived", 0.0),
            total_sent=data.get("totalSent", 0.0),
            transaction_count=data.get("transactionCount", 0),
        )

    def _parse_transaction_response(
        self, data: Dict[str, Any], tx_id: str, network: BlockchainNetwork
    ) -> TransactionAnalysis:
        """Parse Chainalysis transaction response."""
        return TransactionAnalysis(
            transaction_id=tx_id,
            network=network,
            confirmations=data.get("confirmations", 0),
            total_input_value=data.get("totalInput", 0.0),
            total_output_value=data.get("totalOutput", 0.0),
            fee=data.get("fee", 0.0),
        )


class AddressValidator:
    """Utility class for validating blockchain addresses."""

    @staticmethod
    def validate_bitcoin_address(address: str) -> bool:
        """Validate Bitcoin address format."""
        if not address:
            return False

        # Basic format checks for different Bitcoin address types
        if address.startswith("1") and len(address) in (26, 35):  # P2PKH
            return True
        elif address.startswith("3") and len(address) in (26, 35):  # P2SH
            return True
        elif address.startswith("bc1") and len(address) in (42, 62):  # Bech32
            return True

        return False

    @staticmethod
    def validate_ethereum_address(address: str) -> bool:
        """Validate Ethereum address format."""
        if not address:
            return False

        # Ethereum addresses are 42 characters long (0x + 40 hex chars)
        if len(address) != 42 or not address.startswith("0x"):
            return False

        # Check if all characters after 0x are hex
        try:
            int(address[2:], 16)
            return True
        except ValueError:
            return False

    @staticmethod
    def detect_network_from_address(address: str) -> Optional[BlockchainNetwork]:
        """Detect blockchain network from address format."""
        if AddressValidator.validate_bitcoin_address(address):
            return BlockchainNetwork.BITCOIN
        elif AddressValidator.validate_ethereum_address(address):
            return BlockchainNetwork.ETHEREUM
        else:
            return None


class ChainDetector:
    """Utility class for blockchain network detection and validation."""

    @staticmethod
    def get_supported_networks() -> List[BlockchainNetwork]:
        """Get list of supported blockchain networks."""
        return list(BlockchainNetwork)

    @staticmethod
    def normalize_network_name(network_name: str) -> Optional[BlockchainNetwork]:
        """Normalize network name to standard enum."""
        network_mapping = {
            "btc": BlockchainNetwork.BITCOIN,
            "bitcoin": BlockchainNetwork.BITCOIN,
            "eth": BlockchainNetwork.ETHEREUM,
            "ethereum": BlockchainNetwork.ETHEREUM,
            "bch": BlockchainNetwork.BITCOIN_CASH,
            "ltc": BlockchainNetwork.LITECOIN,
            "bsc": BlockchainNetwork.BINANCE_SMART_CHAIN,
            "matic": BlockchainNetwork.POLYGON,
            "polygon": BlockchainNetwork.POLYGON,
            "sol": BlockchainNetwork.SOLANA,
            "solana": BlockchainNetwork.SOLANA,
        }

        return network_mapping.get(network_name.lower())


class BlockchainAnalysisSuite:
    """Main blockchain analysis suite orchestrating different providers."""

    def __init__(self):
        """Initialize the blockchain analysis suite."""
        self.providers: Dict[str, BlockchainProvider] = {}
        self.address_validator = AddressValidator()
        self.chain_detector = ChainDetector()

        # Cache for recent results
        self.address_cache: Dict[str, Tuple[AddressInfo, datetime]] = {}
        self.transaction_cache: Dict[str, Tuple[TransactionAnalysis, datetime]] = {}
        self.cache_ttl = timedelta(minutes=15)

    def register_provider(self, name: str, provider: BlockchainProvider) -> None:
        """Register a blockchain data provider."""
        self.providers[name] = provider
        logger.info(f"Registered blockchain provider: {name}")

    async def analyze_address(
        self,
        address: str,
        network: Optional[BlockchainNetwork] = None,
        provider_preference: Optional[str] = None,
    ) -> Optional[AddressInfo]:
        """Analyze a blockchain address."""
        # Validate address format
        if not network:
            network = self.address_validator.detect_network_from_address(address)
            if not network:
                logger.error(f"Unable to detect network for address: {address}")
                return None

        # Check cache first
        cache_key = f"{address}:{network.value}"
        if cache_key in self.address_cache:
            cached_info, cached_time = self.address_cache[cache_key]
            if datetime.now() - cached_time < self.cache_ttl:
                logger.debug(f"Using cached address info for {address}")
                return cached_info

        # Select provider
        provider = self._select_provider(provider_preference)
        if not provider:
            logger.error("No blockchain provider available")
            return None

        # Get address information
        try:
            address_info = await provider.get_address_info(address, network)
            if address_info:
                # Cache the result
                self.address_cache[cache_key] = (address_info, datetime.now())

                # Perform additional analysis
                await self._enhance_address_analysis(address_info, provider)

                logger.info(f"Successfully analyzed address: {address}")
                return address_info

        except Exception as e:
            logger.error(f"Failed to analyze address {address}: {e}")

        return None

    async def analyze_transaction(
        self,
        tx_id: str,
        network: BlockchainNetwork,
        provider_preference: Optional[str] = None,
    ) -> Optional[TransactionAnalysis]:
        """Analyze a blockchain transaction."""
        # Check cache first
        cache_key = f"{tx_id}:{network.value}"
        if cache_key in self.transaction_cache:
            cached_analysis, cached_time = self.transaction_cache[cache_key]
            if datetime.now() - cached_time < self.cache_ttl:
                logger.debug(f"Using cached transaction analysis for {tx_id}")
                return cached_analysis

        # Select provider
        provider = self._select_provider(provider_preference)
        if not provider:
            logger.error("No blockchain provider available")
            return None

        # Get transaction information
        try:
            tx_analysis = await provider.get_transaction_info(tx_id, network)
            if tx_analysis:
                # Cache the result
                self.transaction_cache[cache_key] = (tx_analysis, datetime.now())

                # Perform additional analysis
                await self._enhance_transaction_analysis(tx_analysis, provider)

                logger.info(f"Successfully analyzed transaction: {tx_id}")
                return tx_analysis

        except Exception as e:
            logger.error(f"Failed to analyze transaction {tx_id}: {e}")

        return None

    async def assess_risk(
        self,
        subject: str,
        network: BlockchainNetwork,
        provider_preference: Optional[str] = None,
    ) -> Optional[RiskAssessment]:
        """Perform comprehensive risk assessment."""
        provider = self._select_provider(provider_preference)
        if not provider:
            logger.error("No blockchain provider available")
            return None

        # Determine if subject is address or transaction
        if self.address_validator.validate_bitcoin_address(
            subject
        ) or self.address_validator.validate_ethereum_address(subject):
            return await self._assess_address_risk(subject, network, provider)
        else:
            return await self._assess_transaction_risk(subject, network, provider)

    def _select_provider(
        self, preference: Optional[str] = None
    ) -> Optional[BlockchainProvider]:
        """Select the best available provider."""
        if preference and preference in self.providers:
            return self.providers[preference]
        elif self.providers:
            return next(iter(self.providers.values()))
        else:
            return None

    async def _enhance_address_analysis(
        self, address_info: AddressInfo, provider: BlockchainProvider
    ) -> None:
        """Enhance address analysis with additional checks."""
        try:
            # Check sanctions
            address_info.sanctions_match = await provider.check_sanctions(
                address_info.address, address_info.network
            )

            if address_info.sanctions_match:
                address_info.risk_level = RiskLevel.CRITICAL
                address_info.risk_factors.add("sanctions_match")
                address_info.compliance_flags.add("OFAC")

        except Exception as e:
            logger.warning(f"Failed to enhance address analysis: {e}")

    async def _enhance_transaction_analysis(
        self, tx_analysis: TransactionAnalysis, provider: BlockchainProvider
    ) -> None:
        """Enhance transaction analysis with pattern detection."""
        try:
            # Analyze for suspicious patterns
            if tx_analysis.total_input_value and tx_analysis.total_output_value:
                # Check for round number patterns (common in mixers)
                if tx_analysis.total_output_value % 1.0 == 0:
                    tx_analysis.suspicious_patterns.append("round_number_output")

                # Check for multiple outputs (possible mixing)
                if len(tx_analysis.output_addresses) > 10:
                    tx_analysis.suspicious_patterns.append("multiple_outputs")
                    tx_analysis.mixer_usage = True

            # Calculate risk score based on patterns
            tx_analysis.risk_score = len(tx_analysis.suspicious_patterns) * 0.2

        except Exception as e:
            logger.warning(f"Failed to enhance transaction analysis: {e}")

    async def _assess_address_risk(
        self, address: str, network: BlockchainNetwork, provider: BlockchainProvider
    ) -> Optional[RiskAssessment]:
        """Assess risk for a blockchain address."""
        address_info = await provider.get_address_info(address, network)
        if not address_info:
            return None

        risk_assessment = RiskAssessment(
            subject=address,
            network=network,
            overall_risk=address_info.risk_level,
            risk_score=0.0,
        )

        # Calculate risk components
        if address_info.sanctions_match:
            risk_assessment.sanctions_risk = 1.0
            risk_assessment.risk_factors["sanctions"] = 1.0

        if AddressType.MIXER in [address_info.address_type]:
            risk_assessment.mixing_risk = 0.8
            risk_assessment.risk_factors["mixing"] = 0.8

        # Calculate overall risk score
        risk_assessment.risk_score = max(
            risk_assessment.sanctions_risk,
            risk_assessment.mixing_risk * 0.6,
            risk_assessment.aml_risk * 0.4,
        )

        return risk_assessment

    async def _assess_transaction_risk(
        self, tx_id: str, network: BlockchainNetwork, provider: BlockchainProvider
    ) -> Optional[RiskAssessment]:
        """Assess risk for a transaction."""
        tx_analysis = await provider.get_transaction_info(tx_id, network)
        if not tx_analysis:
            return None

        risk_assessment = RiskAssessment(
            subject=tx_id,
            network=network,
            overall_risk=RiskLevel.LOW,
            risk_score=tx_analysis.risk_score,
        )

        # Set overall risk level based on score
        if risk_assessment.risk_score >= 0.8:
            risk_assessment.overall_risk = RiskLevel.CRITICAL
        elif risk_assessment.risk_score >= 0.6:
            risk_assessment.overall_risk = RiskLevel.HIGH
        elif risk_assessment.risk_score >= 0.4:
            risk_assessment.overall_risk = RiskLevel.MEDIUM

        return risk_assessment

    async def get_analysis_summary(self) -> Dict[str, Any]:
        """Get summary of analysis operations."""
        return {
            "providers_registered": len(self.providers),
            "supported_networks": [net.value for net in BlockchainNetwork],
            "address_cache_size": len(self.address_cache),
            "transaction_cache_size": len(self.transaction_cache),
            "cache_ttl_minutes": self.cache_ttl.total_seconds() / 60,
        }

    async def clear_cache(self) -> None:
        """Clear analysis cache."""
        self.address_cache.clear()
        self.transaction_cache.clear()
        logger.info("Blockchain analysis cache cleared")
