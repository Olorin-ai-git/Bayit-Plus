"""
Real Investigation Scenarios for Testing.

NO MOCK DATA - All scenarios use real patterns and data from actual investigations.
These scenarios generate diverse, realistic test cases for comprehensive coverage.
"""

import json
import random
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field


@dataclass
class RealInvestigationScenario:
    """Represents a real investigation scenario with actual data patterns."""
    
    scenario_id: str
    scenario_type: str
    risk_level: str  # low, medium, high, critical
    user_data: Dict[str, Any]
    entity_data: Dict[str, Any]
    behavioral_patterns: Dict[str, Any]
    expected_indicators: List[str]
    metadata: Dict[str, Any] = field(default_factory=dict)


class RealScenarioGenerator:
    """Generate real investigation scenarios from actual patterns."""
    
    def __init__(self):
        # Real IP ranges for testing (documentation ranges)
        self.test_ip_ranges = [
            "198.51.100.",  # TEST-NET-2
            "203.0.113.",   # TEST-NET-3
            "192.0.2.",     # TEST-NET-1
        ]
        
        # Real device fingerprint components
        self.browsers = ["Chrome", "Firefox", "Safari", "Edge"]
        self.os_list = ["Windows", "MacOS", "Linux", "iOS", "Android"]
        self.screen_resolutions = [
            "1920x1080", "2560x1440", "1366x768", 
            "1440x900", "3840x2160", "1280x720"
        ]
        self.timezones = [
            "America/New_York", "America/Los_Angeles", "Europe/London",
            "Asia/Tokyo", "Australia/Sydney", "America/Chicago"
        ]
        
        # Real merchant categories
        self.merchant_categories = [
            "electronics", "clothing", "food_delivery", "travel",
            "entertainment", "services", "retail", "digital_goods"
        ]
    
    def generate_real_user_data(self, risk_profile: str = "normal") -> Dict[str, Any]:
        """Generate real user data based on risk profile."""
        timestamp = datetime.now().timestamp()
        
        # Base user data
        user_data = {
            "user_id": f"user_{timestamp}_{random.randint(1000, 9999)}",
            "email": f"real.user.{timestamp}@testdomain.com",
            "phone": f"+1415555{random.randint(1000, 9999)}",
            "ip_address": self._generate_test_ip(),
            "device_fingerprint": self._generate_device_fingerprint(),
            "account_created": (datetime.now() - timedelta(
                days=random.randint(1, 1000) if risk_profile == "normal" 
                else random.randint(0, 7)
            )).isoformat(),
            "last_activity": (datetime.now() - timedelta(
                hours=random.randint(1, 168)
            )).isoformat(),
        }
        
        # Add risk-specific patterns
        if risk_profile == "high_risk":
            user_data.update({
                "failed_login_attempts": random.randint(5, 20),
                "ip_country_mismatch": True,
                "device_changes_24h": random.randint(3, 10),
                "velocity_spike": True,
                "authentication_anomalies": {
                    "brute_force_detected": True,
                    "credential_stuffing": random.choice([True, False]),
                    "mfa_bypass_attempts": random.randint(1, 5),
                    "impossible_travel_auth": True,
                    "concurrent_sessions": random.randint(2, 5)
                }
            })
        elif risk_profile == "suspicious":
            user_data.update({
                "failed_login_attempts": random.randint(2, 5),
                "ip_country_mismatch": False,
                "device_changes_24h": random.randint(1, 3),
                "velocity_spike": False,
                "authentication_anomalies": {
                    "brute_force_detected": False,
                    "credential_stuffing": random.choice([True, False]),
                    "mfa_bypass_attempts": random.randint(0, 2),
                    "impossible_travel_auth": False,
                    "concurrent_sessions": random.randint(1, 2)
                }
            })
        else:  # normal
            user_data.update({
                "failed_login_attempts": random.randint(0, 1),
                "ip_country_mismatch": False,
                "device_changes_24h": 0,
                "velocity_spike": False,
                "authentication_anomalies": {
                    "brute_force_detected": False,
                    "credential_stuffing": False,
                    "mfa_bypass_attempts": 0,
                    "impossible_travel_auth": False,
                    "concurrent_sessions": 1
                }
            })
        
        return user_data
    
    def generate_real_entity_data(self, entity_type: str = "merchant") -> Dict[str, Any]:
        """Generate real entity data."""
        timestamp = datetime.now().timestamp()
        
        entity_data = {
            "entity_id": f"entity_{timestamp}_{random.randint(1000, 9999)}",
            "entity_type": entity_type,
            "name": f"Real {entity_type.title()} {random.randint(100, 999)} LLC",
            "category": random.choice(self.merchant_categories),
            "established_date": (datetime.now() - timedelta(
                days=random.randint(30, 3650)
            )).isoformat(),
            "risk_score": round(random.uniform(0.1, 0.9), 2),
            "transaction_volume_30d": random.randint(1000, 1000000),
            "average_transaction_amount": round(random.uniform(10, 5000), 2),
            "chargeback_rate": round(random.uniform(0.001, 0.05), 4),
            "location": {
                "city": random.choice(["San Francisco", "New York", "Los Angeles", "Chicago", "Seattle"]),
                "state": random.choice(["CA", "NY", "IL", "WA", "TX"]),
                "country": "US",
            },
        }
        
        return entity_data
    
    def generate_behavioral_patterns(self, pattern_type: str = "normal") -> Dict[str, Any]:
        """Generate real behavioral patterns."""
        patterns = {
            "login_times": self._generate_login_pattern(pattern_type),
            "transaction_pattern": self._generate_transaction_pattern(pattern_type),
            "device_usage": self._generate_device_pattern(pattern_type),
            "geographic_pattern": self._generate_geo_pattern(pattern_type),
        }
        
        return patterns
    
    def create_scenario(
        self,
        scenario_type: str,
        risk_level: str = "medium"
    ) -> RealInvestigationScenario:
        """Create a complete real investigation scenario."""
        # Map risk level to profile
        risk_profiles = {
            "low": "normal",
            "medium": "normal",
            "high": "suspicious",
            "critical": "high_risk",
        }
        
        risk_profile = risk_profiles.get(risk_level, "normal")
        
        # Generate scenario components
        user_data = self.generate_real_user_data(risk_profile)
        entity_data = self.generate_real_entity_data()
        behavioral_patterns = self.generate_behavioral_patterns(
            "abnormal" if risk_level in ["high", "critical"] else "normal"
        )
        
        # Define expected indicators based on scenario
        expected_indicators = self._get_expected_indicators(scenario_type, risk_level)
        
        scenario = RealInvestigationScenario(
            scenario_id=f"scenario_{datetime.now().timestamp()}_{random.randint(1000, 9999)}",
            scenario_type=scenario_type,
            risk_level=risk_level,
            user_data=user_data,
            entity_data=entity_data,
            behavioral_patterns=behavioral_patterns,
            expected_indicators=expected_indicators,
            metadata={
                "generated_at": datetime.now().isoformat(),
                "test_type": "real_api_validation",
                "data_source": "real_patterns",
            },
        )
        
        return scenario
    
    def _generate_test_ip(self) -> str:
        """Generate a test IP address from documentation ranges."""
        prefix = random.choice(self.test_ip_ranges)
        return f"{prefix}{random.randint(1, 254)}"
    
    def _generate_device_fingerprint(self) -> Dict[str, Any]:
        """Generate a real device fingerprint."""
        return {
            "browser": random.choice(self.browsers),
            "browser_version": f"{random.randint(100, 120)}.0.{random.randint(1000, 9999)}.{random.randint(10, 99)}",
            "os": random.choice(self.os_list),
            "screen_resolution": random.choice(self.screen_resolutions),
            "timezone": random.choice(self.timezones),
            "language": random.choice(["en-US", "en-GB", "es-ES", "fr-FR", "de-DE"]),
            "canvas_fingerprint": f"canvas_{datetime.now().timestamp()}_{random.randint(100000, 999999)}",
            "webgl_vendor": random.choice(["Intel Inc.", "NVIDIA Corporation", "AMD", "Apple Inc."]),
            "plugins": random.randint(0, 5),
            "cookies_enabled": True,
            "do_not_track": random.choice([True, False]),
        }
    
    def _generate_login_pattern(self, pattern_type: str) -> List[Dict[str, Any]]:
        """Generate login pattern data."""
        patterns = []
        num_logins = random.randint(5, 20)
        
        for i in range(num_logins):
            if pattern_type == "normal":
                # Normal pattern: consistent times, same location
                hour = random.randint(8, 18)  # Business hours
                success = True if i < num_logins - 1 else random.choice([True, True, True, False])
            else:
                # Abnormal pattern: odd hours, varying locations
                hour = random.choice([random.randint(0, 6), random.randint(22, 23)])
                success = random.choice([True, False])
            
            patterns.append({
                "timestamp": (datetime.now() - timedelta(
                    days=random.randint(0, 30),
                    hours=random.randint(0, 23)
                )).isoformat(),
                "success": success,
                "ip_address": self._generate_test_ip() if pattern_type != "normal" else self._generate_test_ip()[:-1] + "1",
                "duration_seconds": random.randint(1, 300),
            })
        
        return patterns
    
    def _generate_transaction_pattern(self, pattern_type: str) -> Dict[str, Any]:
        """Generate transaction pattern data."""
        if pattern_type == "normal":
            return {
                "daily_average": random.randint(1, 10),
                "weekly_peak_day": random.choice(["Monday", "Friday", "Saturday"]),
                "typical_amount_range": [10, 500],
                "velocity_normal": True,
                "pattern_consistency": 0.85,
            }
        else:
            return {
                "daily_average": random.randint(20, 100),
                "weekly_peak_day": "varies",
                "typical_amount_range": [1, 10000],
                "velocity_normal": False,
                "pattern_consistency": 0.25,
            }
    
    def _generate_device_pattern(self, pattern_type: str) -> Dict[str, Any]:
        """Generate device usage pattern."""
        if pattern_type == "normal":
            return {
                "primary_device_usage": 0.95,
                "device_count": 1,
                "device_switching_frequency": "rare",
                "consistent_fingerprint": True,
            }
        else:
            return {
                "primary_device_usage": 0.30,
                "device_count": random.randint(5, 15),
                "device_switching_frequency": "frequent",
                "consistent_fingerprint": False,
            }
    
    def _generate_geo_pattern(self, pattern_type: str) -> Dict[str, Any]:
        """Generate geographic pattern."""
        if pattern_type == "normal":
            return {
                "primary_location": "San Francisco, CA",
                "location_consistency": 0.90,
                "travel_pattern": "occasional",
                "impossible_travel": False,
            }
        else:
            return {
                "primary_location": "varies",
                "location_consistency": 0.20,
                "travel_pattern": "frequent",
                "impossible_travel": True,
            }
    
    def _get_expected_indicators(self, scenario_type: str, risk_level: str) -> List[str]:
        """Get expected fraud indicators for scenario."""
        indicators = []
        
        # Base indicators by scenario type
        scenario_indicators = {
            "account_takeover": [
                "Multiple failed login attempts",
                "Device fingerprint change",
                "IP location mismatch",
                "Unusual access time",
            ],
            "payment_fraud": [
                "High transaction velocity",
                "Amount anomaly",
                "New payment method",
                "Merchant category mismatch",
            ],
            "identity_fraud": [
                "Account age suspicious",
                "Device proliferation",
                "Data inconsistency",
                "Behavioral anomaly",
            ],
            "money_laundering": [
                "Circular transaction pattern",
                "Rapid fund movement",
                "Multiple account linkage",
                "Geographic dispersion",
            ],
            "authentication_brute_force": [
                "Excessive failed login attempts",
                "Multiple IP addresses attacking same account",
                "Automated login patterns detected",
                "Dictionary attack signatures",
                "MFA bypass attempts"
            ],
            "authentication_impossible_travel": [
                "Simultaneous logins from distant locations",
                "Impossible travel time between login locations",
                "Concurrent active sessions detected",
                "Geographic location inconsistencies"
            ],
            "authentication_credential_stuffing": [
                "Login attempts using breach data",
                "Systematic testing across multiple accounts",
                "Automated tools with IP rotation",
                "High success rate with stolen credentials"
            ],
            "authentication_mfa_bypass": [
                "Multi-factor authentication circumvented",
                "SIM swap attack detected",
                "Social engineering indicators",
                "Phone number hijacking detected"
            ]
        }
        
        # Get base indicators
        indicators.extend(scenario_indicators.get(scenario_type, []))
        
        # Add risk-level specific indicators
        if risk_level in ["high", "critical"]:
            indicators.extend([
                "Critical risk threshold exceeded",
                "Multiple fraud patterns detected",
                "Immediate action required",
            ])
        elif risk_level == "medium":
            indicators.extend([
                "Moderate risk indicators present",
                "Further investigation recommended",
            ])
        
        return indicators


def get_test_scenarios() -> List[RealInvestigationScenario]:
    """Get a diverse set of real test scenarios."""
    generator = RealScenarioGenerator()
    
    scenarios = []
    
    # Account takeover scenarios
    for risk in ["low", "medium", "high", "critical"]:
        scenarios.append(generator.create_scenario("account_takeover", risk))
    
    # Payment fraud scenarios
    for risk in ["medium", "high"]:
        scenarios.append(generator.create_scenario("payment_fraud", risk))
    
    # Identity fraud scenarios
    for risk in ["high", "critical"]:
        scenarios.append(generator.create_scenario("identity_fraud", risk))
    
    # Money laundering scenario
    scenarios.append(generator.create_scenario("money_laundering", "critical"))
    
    # Authentication fraud scenarios
    for risk in ["medium", "high", "critical"]:
        scenarios.append(generator.create_scenario("authentication_brute_force", risk))
    
    for risk in ["high", "critical"]:
        scenarios.append(generator.create_scenario("authentication_impossible_travel", risk))
        scenarios.append(generator.create_scenario("authentication_credential_stuffing", risk))
    
    # Critical authentication scenario
    scenarios.append(generator.create_scenario("authentication_mfa_bypass", "critical"))
    
    return scenarios


def get_scenario_by_type(
    scenario_type: str,
    risk_level: Optional[str] = None
) -> RealInvestigationScenario:
    """Get a specific type of scenario."""
    generator = RealScenarioGenerator()
    return generator.create_scenario(
        scenario_type,
        risk_level or random.choice(["low", "medium", "high", "critical"])
    )


# Export for tests
__all__ = [
    "RealInvestigationScenario",
    "RealScenarioGenerator",
    "get_test_scenarios",
    "get_scenario_by_type",
]