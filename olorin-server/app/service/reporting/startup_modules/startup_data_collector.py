"""
Startup Data Collection Module

Extracted data collection methods from startup_report_generator.py
"""

import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class StartupDataCollector:
    """Collects data for startup reports"""

    def __init__(self):
        self.logger = logger

    def collect_system_info(self) -> Dict[str, Any]:
        """Collect system information"""
        return {
            "python_version": os.sys.version,
            "platform": os.name,
            "environment": os.getenv("ENVIRONMENT", "development"),
            "timestamp": datetime.now().isoformat(),
        }

    def collect_database_info(self) -> Dict[str, Any]:
        """Collect database configuration information"""
        db_provider = os.getenv("DATABASE_PROVIDER", "postgresql")
        return {
            "provider": db_provider,
            "snowflake_enabled": os.getenv("USE_SNOWFLAKE", "false").lower() == "true",
            "postgresql_enabled": db_provider.lower() == "postgresql",
        }

    def collect_service_info(self) -> Dict[str, Any]:
        """Collect service configuration information"""
        return {
            "server_url": os.getenv("SERVER_URL", "http://localhost:8090"),
            "log_level": os.getenv("LOG_LEVEL", "INFO"),
            "verification_enabled": os.getenv(
                "LLM_VERIFICATION_ENABLED", "false"
            ).lower()
            == "true",
        }

    def collect_analytics_info(self) -> Dict[str, Any]:
        """Collect analytics configuration"""
        # Read selector time window configuration
        selector_hours = int(os.getenv("SELECTOR_TIME_WINDOW_HOURS", "24"))
        default_time_window = f"{selector_hours}h"

        return {
            "snowflake_enabled": os.getenv("USE_SNOWFLAKE", "false").lower() == "true",
            "default_time_window": default_time_window,
            "default_group_by": os.getenv("ANALYTICS_DEFAULT_GROUP_BY", "email"),
            "cache_ttl": int(os.getenv("ANALYTICS_CACHE_TTL", "300")),
        }

    def collect_all_data(self) -> Dict[str, Any]:
        """Collect all startup data"""
        return {
            "system": self.collect_system_info(),
            "database": self.collect_database_info(),
            "service": self.collect_service_info(),
            "analytics": self.collect_analytics_info(),
            "collected_at": datetime.now().isoformat(),
        }
