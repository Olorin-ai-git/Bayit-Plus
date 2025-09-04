import os
from dataclasses import dataclass
from typing import Any, Dict

import yaml
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


@dataclass
class NetworkConfig:
    """Network agent configuration."""

    vpn_risk_threshold: float = 0.7
    proxy_risk_threshold: float = 0.8
    ip_change_threshold: int = 5


@dataclass
class DeviceConfig:
    """Device agent configuration."""

    device_change_threshold: int = 3
    browser_change_threshold: int = 2
    resolution_change_threshold: float = 0.1


@dataclass
class BehaviorConfig:
    """User behavior agent configuration."""

    login_frequency_threshold: int = 10
    session_duration_threshold: int = 120
    unusual_hour_threshold: float = 0.1


@dataclass
class AnomalyConfig:
    """Anomaly detection agent configuration."""

    high_risk_threshold: float = 0.8
    medium_risk_threshold: float = 0.6
    network_weight: float = 0.35
    device_weight: float = 0.35
    behavior_weight: float = 0.30
    correlation_threshold: int = 2


@dataclass
class SystemConfig:
    """Overall system configuration."""

    network: NetworkConfig
    device: DeviceConfig
    behavior: BehaviorConfig
    anomaly: AnomalyConfig
    log_level: str = "INFO"
    data_retention_days: int = 90


class ConfigurationManager:
    """Manages configuration for the fraud detection system."""

    def __init__(self, config_path: str = None):
        self.config_path = config_path or os.getenv(
            "ATO_CONFIG_PATH", "config/ato_config.yaml"
        )
        self.config = self._load_default_config()

    def _load_default_config(self) -> SystemConfig:
        """Load default configuration."""
        return SystemConfig(
            network=NetworkConfig(),
            device=DeviceConfig(),
            behavior=BehaviorConfig(),
            anomaly=AnomalyConfig(),
        )

    def load_config(self) -> SystemConfig:
        """Load configuration from file or use defaults."""
        try:
            if os.path.exists(self.config_path):
                with open(self.config_path, "r") as f:
                    config_data = yaml.safe_load(f)

                # Update default config with file values
                network_config = NetworkConfig(**config_data.get("network", {}))
                device_config = DeviceConfig(**config_data.get("device", {}))
                behavior_config = BehaviorConfig(**config_data.get("behavior", {}))
                anomaly_config = AnomalyConfig(**config_data.get("anomaly", {}))

                self.config = SystemConfig(
                    network=network_config,
                    device=device_config,
                    behavior=behavior_config,
                    anomaly=anomaly_config,
                    log_level=config_data.get("log_level", "INFO"),
                    data_retention_days=config_data.get("data_retention_days", 90),
                )

                logger.info(f"Configuration loaded from {self.config_path}")
            else:
                logger.warning(
                    f"Configuration file not found at {self.config_path}, "
                    "using default values"
                )

        except Exception as e:
            logger.error(f"Error loading configuration: {str(e)}")
            logger.warning("Using default configuration")

        return self.config

    def get_agent_config(self, agent_type: str) -> Dict[str, Any]:
        """Get configuration for specific agent type."""
        if agent_type == "network":
            return self._dataclass_to_dict(self.config.network)
        elif agent_type == "device":
            return self._dataclass_to_dict(self.config.device)
        elif agent_type == "behavior":
            return self._dataclass_to_dict(self.config.behavior)
        elif agent_type == "anomaly":
            return self._dataclass_to_dict(self.config.anomaly)
        else:
            raise ValueError(f"Unknown agent type: {agent_type}")

    def validate_config(self) -> bool:
        """Validate configuration values."""
        try:
            # Validate risk weights sum to 1.0
            weights_sum = (
                self.config.anomaly.network_weight
                + self.config.anomaly.device_weight
                + self.config.anomaly.behavior_weight
            )
            if not 0.99 <= weights_sum <= 1.01:
                logger.error(f"Risk weights must sum to 1.0, got {weights_sum}")
                return False

            # Validate thresholds are in valid ranges
            if not 0 <= self.config.anomaly.high_risk_threshold <= 1:
                logger.error("High risk threshold must be between 0 and 1")
                return False

            if not 0 <= self.config.anomaly.medium_risk_threshold <= 1:
                logger.error("Medium risk threshold must be between 0 and 1")
                return False

            if (
                self.config.anomaly.medium_risk_threshold
                >= self.config.anomaly.high_risk_threshold
            ):
                logger.error(
                    "Medium risk threshold must be less than high risk threshold"
                )
                return False

            # Validate positive integer values
            if self.config.network.ip_change_threshold <= 0:
                logger.error("IP change threshold must be positive")
                return False

            if self.config.device.device_change_threshold <= 0:
                logger.error("Device change threshold must be positive")
                return False

            if self.config.behavior.login_frequency_threshold <= 0:
                logger.error("Login frequency threshold must be positive")
                return False

            return True

        except Exception as e:
            logger.error(f"Error validating configuration: {str(e)}")
            return False

    @staticmethod
    def _dataclass_to_dict(obj: Any) -> Dict[str, Any]:
        """Convert dataclass instance to dictionary."""
        return {
            field.name: getattr(obj, field.name)
            for field in obj.__dataclass_fields__.values()
        }
