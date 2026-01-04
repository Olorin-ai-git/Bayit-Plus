"""
Logging Configuration Manager - Multi-source configuration loading and management

This module handles configuration loading from multiple sources with priority resolution,
validation, and dynamic reconfiguration support for the unified logging system.

Author: Gil Klainert
Date: 2025-01-04
Plan: /docs/plans/2025-01-04-unified-logging-system-plan.md
"""

import argparse
import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import yaml

from .unified_logging_core import LogFormat, LogOutput


@dataclass
class LoggingConfig:
    """Unified logging configuration data class"""

    log_level: str = "WARNING"
    log_format: LogFormat = LogFormat.HUMAN
    log_outputs: List[LogOutput] = field(default_factory=lambda: [LogOutput.CONSOLE])
    async_logging: bool = False
    buffer_size: int = 1000
    lazy_initialization: bool = True
    suppress_noisy_loggers: bool = True
    performance_monitoring: bool = True

    # Output-specific configuration
    console_format: Optional[LogFormat] = None
    file_path: str = "logs/olorin_server.log"
    json_file_path: str = "logs/olorin_server.json"
    structured_file_path: str = "logs/olorin_structured.log"
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    backup_count: int = 5
    rotation_type: str = "size"  # "size" for size-based, "time" for daily rotation

    # Performance settings
    max_memory_usage: int = 50 * 1024 * 1024  # 50MB
    flush_interval: float = 5.0  # seconds

    # Enhanced decision logger integration
    preserve_enhanced_logging: bool = True
    preserve_journey_tracking: bool = True
    preserve_context_logging: bool = True

    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary"""
        config_dict = {}
        for key, value in self.__dict__.items():
            if isinstance(value, (LogFormat, LogOutput)):
                config_dict[key] = value.value
            elif isinstance(value, list) and value and isinstance(value[0], LogOutput):
                config_dict[key] = [item.value for item in value]
            else:
                config_dict[key] = value
        return config_dict


class LoggingConfigManager:
    """
    Multi-source logging configuration manager

    Handles configuration loading from multiple sources with priority resolution:
    1. Command-line arguments (highest priority)
    2. Environment variables
    3. YAML configuration files
    4. Application defaults (lowest priority)
    """

    def __init__(self, config_file_path: Optional[str] = None):
        """
        Initialize configuration manager

        Args:
            config_file_path: Optional path to YAML configuration file
        """
        self._config_file_path = config_file_path or "config/logging_config.yaml"
        self._cached_config: Optional[LoggingConfig] = None
        self._file_watcher_enabled = False
        self._logger = logging.getLogger(__name__)

    def load_configuration(
        self, args: Optional[argparse.Namespace] = None, force_reload: bool = False
    ) -> LoggingConfig:
        """
        Load configuration from all sources with priority resolution

        Args:
            args: Parsed command-line arguments
            force_reload: Force reload even if cached configuration exists

        Returns:
            Merged configuration object
        """
        if self._cached_config is not None and not force_reload:
            return self._cached_config

        # Start with default configuration
        config = LoggingConfig()

        # Load and merge YAML configuration
        yaml_config = self._load_yaml_config()
        if yaml_config:
            config = self._merge_yaml_config(config, yaml_config)

        # Load and merge environment variables
        env_config = self._load_env_config()
        config = self._merge_env_config(config, env_config)

        # Load and merge command-line arguments (highest priority)
        if args:
            config = self._merge_args_config(config, args)

        # Validate final configuration
        self._validate_configuration(config)

        # Cache the configuration
        self._cached_config = config

        return config

    def _load_yaml_config(self) -> Optional[Dict[str, Any]]:
        """Load configuration from YAML file"""
        config_path = Path(self._config_file_path)

        if not config_path.exists():
            self._logger.debug(f"Configuration file not found: {config_path}")
            return None

        try:
            with open(config_path, "r", encoding="utf-8") as f:
                yaml_data = yaml.safe_load(f)

            # Extract unified logging configuration if present
            if "unified_logging" in yaml_data:
                return yaml_data["unified_logging"]

            # Fall back to legacy configuration structure
            return yaml_data

        except Exception as e:
            self._logger.warning(f"Error loading YAML configuration: {e}")
            return None

    def _load_env_config(self) -> Dict[str, Any]:
        """Load configuration from environment variables"""
        env_config = {}

        # Environment variable mappings
        env_mappings = {
            "OLORIN_LOG_LEVEL": "log_level",
            "OLORIN_LOG_FORMAT": "log_format",
            "OLORIN_LOG_OUTPUT": "log_outputs",
            "OLORIN_LOG_CONFIG": "config_file_path",
            "OLORIN_LOG_ASYNC": "async_logging",
            "OLORIN_LOG_BUFFER_SIZE": "buffer_size",
            "OLORIN_LOG_LAZY_INIT": "lazy_initialization",
            "OLORIN_LOG_SUPPRESS_NOISY": "suppress_noisy_loggers",
            "OLORIN_LOG_PERFORMANCE": "performance_monitoring",
            "OLORIN_LOG_FILE_PATH": "file_path",
            "OLORIN_LOG_JSON_FILE_PATH": "json_file_path",
            "OLORIN_LOG_STRUCTURED_FILE_PATH": "structured_file_path",
            "OLORIN_LOG_MAX_FILE_SIZE": "max_file_size",
            "OLORIN_LOG_BACKUP_COUNT": "backup_count",
            "OLORIN_LOG_ROTATION_TYPE": "rotation_type",  # "size" or "time"
        }

        for env_var, config_key in env_mappings.items():
            value = os.getenv(env_var)
            if value is not None:
                env_config[config_key] = self._convert_env_value(config_key, value)

        return env_config

    def _convert_env_value(self, key: str, value: str) -> Any:
        """Convert environment variable string value to appropriate type"""
        # Boolean values
        if key in [
            "async_logging",
            "lazy_initialization",
            "suppress_noisy_loggers",
            "performance_monitoring",
        ]:
            return value.lower() in ("true", "1", "yes", "on")

        # Integer values
        if key in ["buffer_size", "max_file_size", "backup_count"]:
            try:
                return int(value)
            except ValueError:
                self._logger.warning(f"Invalid integer value for {key}: {value}")
                return None

        # Float values
        if key in ["flush_interval"]:
            try:
                return float(value)
            except ValueError:
                self._logger.warning(f"Invalid float value for {key}: {value}")
                return None

        # Enum values
        if key == "log_format":
            try:
                return LogFormat(value.lower())
            except ValueError:
                self._logger.warning(f"Invalid log format: {value}")
                return None

        # List values (comma-separated)
        if key == "log_outputs":
            outputs = []
            for output in value.split(","):
                try:
                    outputs.append(LogOutput(output.strip().lower()))
                except ValueError:
                    self._logger.warning(f"Invalid log output: {output.strip()}")
            return outputs if outputs else None

        # String values (default)
        return value

    def _merge_yaml_config(
        self, config: LoggingConfig, yaml_config: Dict[str, Any]
    ) -> LoggingConfig:
        """Merge YAML configuration into base configuration"""
        for key, value in yaml_config.items():
            if hasattr(config, key):
                # Convert string enum values
                if key == "log_format" and isinstance(value, str):
                    try:
                        value = LogFormat(value.lower())
                    except ValueError:
                        self._logger.warning(f"Invalid log format in YAML: {value}")
                        continue

                elif key == "log_outputs" and isinstance(value, list):
                    try:
                        value = [
                            LogOutput(item.lower()) if isinstance(item, str) else item
                            for item in value
                        ]
                    except ValueError:
                        self._logger.warning(f"Invalid log outputs in YAML: {value}")
                        continue

                setattr(config, key, value)
            else:
                self._logger.debug(f"Unknown configuration key in YAML: {key}")

        return config

    def _merge_env_config(
        self, config: LoggingConfig, env_config: Dict[str, Any]
    ) -> LoggingConfig:
        """Merge environment configuration into base configuration"""
        for key, value in env_config.items():
            if value is not None and hasattr(config, key):
                setattr(config, key, value)

        return config

    def _merge_args_config(
        self, config: LoggingConfig, args: argparse.Namespace
    ) -> LoggingConfig:
        """Merge command-line arguments into base configuration"""
        # Command-line argument mappings
        arg_mappings = {
            "log_level": "log_level",
            "log_format": "log_format",
            "log_output": "log_outputs",
            "log_config": "config_file_path",
            "async_logging": "async_logging",
            "buffer_size": "buffer_size",
            "suppress_noisy": "suppress_noisy_loggers",
            "performance_monitoring": "performance_monitoring",
            "rotation_type": "rotation_type",
            "max_file_size": "max_file_size",
            "backup_count": "backup_count",
        }

        for arg_name, config_key in arg_mappings.items():
            if hasattr(args, arg_name) and getattr(args, arg_name) is not None:
                value = getattr(args, arg_name)

                # Convert argument values
                if config_key == "log_format" and isinstance(value, str):
                    try:
                        value = LogFormat(value.lower())
                    except ValueError:
                        self._logger.warning(f"Invalid log format argument: {value}")
                        continue

                elif config_key == "log_outputs":
                    if isinstance(value, str):
                        # Parse comma-separated string
                        outputs = []
                        for output in value.split(","):
                            try:
                                outputs.append(LogOutput(output.strip().lower()))
                            except ValueError:
                                self._logger.warning(
                                    f"Invalid log output argument: {output.strip()}"
                                )
                        value = outputs if outputs else [LogOutput.CONSOLE]
                    elif isinstance(value, list):
                        # Convert list of strings to LogOutput enums
                        try:
                            value = [
                                (
                                    LogOutput(item.lower())
                                    if isinstance(item, str)
                                    else item
                                )
                                for item in value
                            ]
                        except ValueError:
                            self._logger.warning(
                                f"Invalid log outputs argument: {value}"
                            )
                            continue

                setattr(config, config_key, value)

        return config

    def _validate_configuration(self, config: LoggingConfig) -> None:
        """Validate final configuration"""
        # Validate log level
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if config.log_level.upper() not in valid_levels:
            self._logger.warning(
                f"Invalid log level: {config.log_level}, defaulting to WARNING"
            )
            config.log_level = "WARNING"
        else:
            config.log_level = config.log_level.upper()

        # Validate log outputs
        if not config.log_outputs:
            self._logger.warning("No log outputs specified, defaulting to console")
            config.log_outputs = [LogOutput.CONSOLE]

        # Validate buffer size
        if config.buffer_size <= 0:
            self._logger.warning(
                f"Invalid buffer size: {config.buffer_size}, defaulting to 1000"
            )
            config.buffer_size = 1000

        # Validate file paths for file outputs
        file_outputs = [LogOutput.FILE, LogOutput.JSON_FILE, LogOutput.STRUCTURED_FILE]
        if any(output in config.log_outputs for output in file_outputs):
            # Ensure log directory exists
            log_dir = Path("logs")
            log_dir.mkdir(exist_ok=True)

        # Validate file size limits
        if config.max_file_size <= 0:
            self._logger.warning(
                f"Invalid max file size: {config.max_file_size}, defaulting to 10MB"
            )
            config.max_file_size = 10 * 1024 * 1024

        # Validate backup count
        if config.backup_count < 0:
            self._logger.warning(
                f"Invalid backup count: {config.backup_count}, defaulting to 5"
            )
            config.backup_count = 5

    def get_enhanced_command_line_parser(self) -> argparse.ArgumentParser:
        """
        Get enhanced command-line argument parser with logging options

        Returns:
            ArgumentParser configured with unified logging options
        """
        parser = argparse.ArgumentParser(
            description="Olorin Server with Unified Logging"
        )

        # Existing arguments (preserved for compatibility)
        parser.add_argument(
            "--log-level",
            default="WARNING",
            choices=["DEBUG", "INFO", "WARNING", "ERROR"],
            help="Set logging level (default: WARNING)",
        )

        # New unified logging arguments
        parser.add_argument(
            "--log-format",
            default="human",
            choices=["human", "json", "structured"],
            help="Set log output format (default: human)",
        )

        parser.add_argument(
            "--log-output",
            default="console",
            help="Comma-separated list of log outputs: console,file,json_file,structured_file (default: console)",
        )

        parser.add_argument(
            "--log-config", help="Path to logging configuration YAML file"
        )

        parser.add_argument(
            "--async-logging",
            action="store_true",
            help="Enable asynchronous logging for better performance",
        )

        parser.add_argument(
            "--buffer-size",
            type=int,
            default=1000,
            help="Buffer size for async logging (default: 1000)",
        )

        parser.add_argument(
            "--suppress-noisy",
            action="store_true",
            default=True,
            help="Suppress verbose third-party loggers (default: True)",
        )

        parser.add_argument(
            "--performance-monitoring",
            action="store_true",
            default=True,
            help="Enable logging performance monitoring (default: True)",
        )

        parser.add_argument(
            "--rotation-type",
            default="size",
            choices=["size", "time"],
            help="Log rotation type: 'size' for size-based, 'time' for daily rotation (default: size)",
        )

        parser.add_argument(
            "--max-file-size",
            type=int,
            default=10 * 1024 * 1024,
            help="Max log file size in bytes before rotation (default: 10MB)",
        )

        parser.add_argument(
            "--backup-count",
            type=int,
            default=5,
            help="Number of backup log files to keep (default: 5)",
        )

        return parser

    def update_yaml_config_file(self, config: LoggingConfig) -> bool:
        """
        Update YAML configuration file with current settings

        Args:
            config: Configuration to save

        Returns:
            True if successful, False otherwise
        """
        try:
            config_path = Path(self._config_file_path)
            config_path.parent.mkdir(parents=True, exist_ok=True)

            # Load existing YAML structure if it exists
            existing_yaml = {}
            if config_path.exists():
                with open(config_path, "r", encoding="utf-8") as f:
                    existing_yaml = yaml.safe_load(f) or {}

            # Update unified logging section
            existing_yaml["unified_logging"] = config.to_dict()

            # Write back to file
            with open(config_path, "w", encoding="utf-8") as f:
                yaml.dump(existing_yaml, f, default_flow_style=False, indent=2)

            self._logger.info(f"Updated configuration file: {config_path}")
            return True

        except Exception as e:
            self._logger.error(f"Error updating YAML configuration: {e}")
            return False

    def clear_cache(self):
        """Clear cached configuration to force reload"""
        self._cached_config = None

    def get_configuration_summary(self) -> Dict[str, Any]:
        """Get summary of current configuration sources and values"""
        if self._cached_config is None:
            return {"error": "No configuration loaded"}

        return {
            "configuration": self._cached_config.to_dict(),
            "sources": {
                "config_file": self._config_file_path,
                "config_file_exists": Path(self._config_file_path).exists(),
                "environment_variables": [
                    key for key in os.environ.keys() if key.startswith("OLORIN_LOG_")
                ],
            },
            "validation_status": "valid",
        }
