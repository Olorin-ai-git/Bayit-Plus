from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional


@dataclass
class NetworkInfo:
    ip_address: str
    isp: str
    is_vpn: bool
    is_proxy: bool
    dns_ip_country: str
    network_type: str
    timestamp: datetime


@dataclass
class DeviceInfo:
    device_type: str  # PC/phone/tablet
    os_type: str  # Windows/Mac
    browser: str
    language: str
    timezone: str
    screen_resolution: str
    smart_id: str
    timestamp: datetime


@dataclass
class UserBehaviorInfo:
    login_frequency: float  # Average logins per day
    typical_hours: List[int]  # 0-23 hours when user typically logs in
    typical_days: List[str]  # Days of week
    mfa_methods: List[str]
    last_login: datetime
    session_duration: float  # Average session duration in minutes


@dataclass
class Location:
    """Location information."""

    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    risk_level: str = "LOW"  # LOW, MEDIUM, HIGH


@dataclass
class RiskAssessment:
    """Risk assessment data."""

    risk_level: float
    risk_factors: List[str]
    confidence: float
    timestamp: datetime
    source: str = "UnknownAgent"
    location: Optional[Location] = None

    def __post_init__(self):
        """Validate risk assessment data."""
        if not 0 <= self.risk_level <= 1:
            raise ValueError("Risk level must be between 0 and 1")
        if not 0 <= self.confidence <= 1:
            raise ValueError("Confidence must be between 0 and 1")
        if not isinstance(self.timestamp, datetime):
            raise ValueError("Timestamp must be a datetime object")
        if not self.risk_factors:
            raise ValueError("Risk factors cannot be empty")
        if not self.source:
            raise ValueError("Source cannot be empty")


class BaseAgent(ABC):
    """Base class for all fraud detection agents."""

    @abstractmethod
    async def initialize(self) -> None:
        """Initialize any necessary connections or resources."""
        pass

    @abstractmethod
    async def shutdown(self) -> None:
        """Clean up resources."""
        pass


class NetworkAnalysisAgent(BaseAgent):
    """Agent responsible for analyzing network patterns."""

    @abstractmethod
    async def get_network_info(self, user_id: str) -> NetworkInfo:
        """Get current network information for a user."""
        pass

    @abstractmethod
    async def analyze_network_patterns(
        self, user_id: str, timeframe_days: int = 30
    ) -> List[NetworkInfo]:
        """Analyze network patterns over time."""
        pass

    @abstractmethod
    async def detect_network_anomalies(self, user_id: str) -> List[RiskAssessment]:
        """Detect suspicious network activity."""
        pass


class DeviceFingerprintAgent(BaseAgent):
    """Agent responsible for device fingerprinting and analysis."""

    @abstractmethod
    async def get_device_info(self, user_id: str) -> DeviceInfo:
        """Get current device information for a user."""
        pass

    @abstractmethod
    async def get_device_history(
        self, user_id: str, timeframe_days: int = 30
    ) -> List[DeviceInfo]:
        """Get device history for a user."""
        pass

    @abstractmethod
    async def detect_device_anomalies(self, user_id: str) -> List[RiskAssessment]:
        """Detect suspicious device activity."""
        pass


class UserBehaviorAgent(BaseAgent):
    """Agent responsible for analyzing user behavior patterns."""

    @abstractmethod
    async def get_behavior_profile(self, user_id: str) -> UserBehaviorInfo:
        """Get current behavior profile for a user."""
        pass

    @abstractmethod
    async def analyze_behavior_patterns(
        self, user_id: str, timeframe_days: int = 30
    ) -> List[UserBehaviorInfo]:
        """Analyze behavior patterns over time."""
        pass

    @abstractmethod
    async def detect_behavior_anomalies(self, user_id: str) -> List[RiskAssessment]:
        """Detect suspicious behavior patterns."""
        pass


class AnomalyDetectionAgent(BaseAgent):
    """Agent responsible for integrating and analyzing data from other agents."""

    @abstractmethod
    async def establish_baseline(self, user_id: str) -> Dict[str, Any]:
        """Establish a baseline of normal behavior for a user."""
        pass

    @abstractmethod
    async def calculate_risk_score(self, user_id: str) -> RiskAssessment:
        """Calculate overall risk score based on all available data."""
        pass

    @abstractmethod
    async def filter_false_positives(
        self, risk_assessments: List[RiskAssessment]
    ) -> List[RiskAssessment]:
        """Filter out likely false positive detections."""
        pass

    @abstractmethod
    async def detect_legitimate_scenarios(
        self, user_id: str, risk_assessment: RiskAssessment
    ) -> bool:
        """Check if suspicious activity matches known legitimate scenarios."""
        pass
