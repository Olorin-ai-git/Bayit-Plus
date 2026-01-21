"""
MCP (Model Context Protocol) Configuration Schema

Configuration for MCP client connections, connection pooling,
health monitoring, and server management.
"""

import os
from typing import Optional

from pydantic import BaseModel, Field, validator

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class MCPConnectionPoolConfig(BaseModel):
    """Configuration for MCP connection pool."""

    pool_size: int = Field(..., description="Maximum number of connections in pool")
    min_connections: int = Field(1, description="Minimum connections to maintain")
    connection_timeout_seconds: int = Field(
        ..., description="Connection timeout in seconds"
    )
    max_reconnect_attempts: int = Field(
        ..., description="Maximum reconnection attempts"
    )
    reconnect_delay_seconds: int = Field(
        5, description="Delay between reconnection attempts"
    )

    @validator("pool_size")
    def validate_pool_size(cls, v):
        if v <= 0 or v > 100:
            raise ValueError("Pool size must be between 1 and 100")
        return v

    @validator("min_connections")
    def validate_min_connections(cls, v):
        if v < 0:
            raise ValueError("Minimum connections must be non-negative")
        return v

    @validator("connection_timeout_seconds")
    def validate_timeout(cls, v):
        if v <= 0 or v > 300:
            raise ValueError("Connection timeout must be between 1 and 300 seconds")
        return v

    @validator("max_reconnect_attempts")
    def validate_reconnect_attempts(cls, v):
        if v < 0 or v > 20:
            raise ValueError("Max reconnect attempts must be between 0 and 20")
        return v

    @validator("reconnect_delay_seconds")
    def validate_reconnect_delay(cls, v):
        if v < 0 or v > 60:
            raise ValueError("Reconnect delay must be between 0 and 60 seconds")
        return v


class MCPHealthMonitorConfig(BaseModel):
    """Configuration for MCP health monitoring."""

    health_check_interval_seconds: int = Field(
        ..., description="Interval between health checks"
    )
    ping_timeout_seconds: int = Field(10, description="Timeout for ping operations")
    error_rate_threshold: float = Field(
        0.1, description="Error rate threshold (0.0-1.0)"
    )
    memory_usage_threshold_mb: int = Field(
        1000, description="Memory usage threshold in MB"
    )
    max_connection_count: int = Field(100, description="Maximum allowed connections")
    enable_auto_recovery: bool = Field(True, description="Enable automatic recovery")

    @validator("health_check_interval_seconds")
    def validate_interval(cls, v):
        if v <= 0 or v > 3600:
            raise ValueError("Health check interval must be between 1 and 3600 seconds")
        return v

    @validator("ping_timeout_seconds")
    def validate_ping_timeout(cls, v):
        if v <= 0 or v > 60:
            raise ValueError("Ping timeout must be between 1 and 60 seconds")
        return v

    @validator("error_rate_threshold")
    def validate_error_rate(cls, v):
        if v < 0.0 or v > 1.0:
            raise ValueError("Error rate threshold must be between 0.0 and 1.0")
        return v

    @validator("memory_usage_threshold_mb")
    def validate_memory(cls, v):
        if v <= 0 or v > 10000:
            raise ValueError("Memory usage threshold must be between 1 and 10000 MB")
        return v

    @validator("max_connection_count")
    def validate_max_connections(cls, v):
        if v <= 0 or v > 1000:
            raise ValueError("Max connection count must be between 1 and 1000")
        return v


class MCPConfig(BaseModel):
    """Complete MCP configuration."""

    connection_pool: MCPConnectionPoolConfig
    health_monitor: MCPHealthMonitorConfig

    # Protocol settings
    protocol_version: str = Field("1.0", description="MCP protocol version")
    enable_compression: bool = Field(True, description="Enable data compression")
    enable_encryption: bool = Field(True, description="Enable connection encryption")

    # Logging and monitoring
    enable_detailed_logging: bool = Field(
        False, description="Enable detailed MCP logging"
    )
    log_level: str = Field("INFO", description="MCP logging level")

    @validator("protocol_version")
    def validate_protocol_version(cls, v):
        valid_versions = ["1.0", "1.1", "2.0"]
        if v not in valid_versions:
            raise ValueError(f"Protocol version must be one of: {valid_versions}")
        return v

    @validator("log_level")
    def validate_log_level(cls, v):
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in valid_levels:
            raise ValueError(f"Log level must be one of: {valid_levels}")
        return v.upper()

    class Config:
        validate_assignment = True


def load_mcp_config() -> MCPConfig:
    """
    Load and validate MCP configuration from environment variables.

    Returns:
        Validated MCPConfig instance

    Raises:
        ValueError: If configuration is invalid or missing required values
        RuntimeError: If configuration fails to load
    """
    try:
        config = MCPConfig(
            connection_pool=MCPConnectionPoolConfig(
                pool_size=int(os.getenv("MCP_CONNECTION_POOL_SIZE", "10")),
                min_connections=int(os.getenv("MCP_MIN_CONNECTIONS", "1")),
                connection_timeout_seconds=int(
                    os.getenv("MCP_CONNECTION_TIMEOUT_SECONDS", "30")
                ),
                max_reconnect_attempts=int(
                    os.getenv("MCP_MAX_RECONNECT_ATTEMPTS", "5")
                ),
                reconnect_delay_seconds=int(
                    os.getenv("MCP_RECONNECT_DELAY_SECONDS", "5")
                ),
            ),
            health_monitor=MCPHealthMonitorConfig(
                health_check_interval_seconds=int(
                    os.getenv("MCP_HEALTH_CHECK_INTERVAL_SECONDS", "60")
                ),
                ping_timeout_seconds=int(os.getenv("MCP_PING_TIMEOUT_SECONDS", "10")),
                error_rate_threshold=float(
                    os.getenv("MCP_ERROR_RATE_THRESHOLD", "0.1")
                ),
                memory_usage_threshold_mb=int(
                    os.getenv("MCP_MEMORY_THRESHOLD_MB", "1000")
                ),
                max_connection_count=int(os.getenv("MCP_MAX_CONNECTION_COUNT", "100")),
                enable_auto_recovery=os.getenv(
                    "MCP_ENABLE_AUTO_RECOVERY", "true"
                ).lower()
                == "true",
            ),
            protocol_version=os.getenv("MCP_PROTOCOL_VERSION", "1.0"),
            enable_compression=os.getenv("MCP_ENABLE_COMPRESSION", "true").lower()
            == "true",
            enable_encryption=os.getenv("MCP_ENABLE_ENCRYPTION", "true").lower()
            == "true",
            enable_detailed_logging=os.getenv(
                "MCP_ENABLE_DETAILED_LOGGING", "false"
            ).lower()
            == "true",
            log_level=os.getenv("MCP_LOG_LEVEL", "INFO"),
        )

        logger.info("MCP configuration loaded successfully")
        return config

    except ValueError as e:
        logger.error(f"Configuration validation failed: {e}")
        raise RuntimeError(f"Invalid MCP configuration – refusing to start: {e}")
    except Exception as e:
        logger.error(f"Failed to load MCP configuration: {e}")
        raise RuntimeError(f"Configuration load failed – refusing to start: {e}")
