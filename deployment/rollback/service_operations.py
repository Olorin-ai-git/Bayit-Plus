#!/usr/bin/env python3
"""
Service Operations for Recovery Automation.

Real implementations for service management operations including
configuration, restart, health checks, and backup/restore.

Author: Gil Klainert
Date: 2025-11-12
"""

import asyncio
import json
import logging
import os
import subprocess
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional

from deployment.monitoring.health_aggregator import (
    HealthAggregator,
    ServiceType,
    HealthStatus
)
from deployment.rollback.recovery_config import RecoveryAutomationConfig

logger = logging.getLogger(__name__)


class ServiceOperations:
    """Real service operations implementation."""

    def __init__(self, config: RecoveryAutomationConfig):
        """
        Initialize service operations.

        Args:
            config: Recovery automation configuration
        """
        self.config = config
        self.health_aggregator = HealthAggregator()

    async def get_current_configuration(self, service: str) -> Dict[str, Any]:
        """
        Get current configuration for service.

        Args:
            service: Service name (backend, frontend)

        Returns:
            Current configuration dictionary

        Raises:
            ValueError: If service is not recognized
        """
        config_file_path = self._get_service_config_path(service)

        if not config_file_path.exists():
            logger.warning(f"Configuration file not found for {service}: {config_file_path}")
            return {}

        try:
            with open(config_file_path, 'r', encoding='utf-8') as f:
                config_data = json.load(f)

            logger.info(f"Retrieved configuration for {service}")
            return config_data

        except Exception as e:
            logger.error(f"Error reading configuration for {service}: {e}")
            return {}

    async def apply_configuration_change(
        self,
        service: str,
        parameter: str,
        value: Any
    ) -> bool:
        """
        Apply configuration change to service.

        Args:
            service: Service name
            parameter: Configuration parameter to change
            value: New value for parameter

        Returns:
            True if successful, False otherwise
        """
        config_file_path = self._get_service_config_path(service)

        try:
            # Read current configuration
            current_config = await self.get_current_configuration(service)

            # Update parameter
            current_config[parameter] = value

            # Write updated configuration
            config_file_path.parent.mkdir(parents=True, exist_ok=True)

            with open(config_file_path, 'w', encoding='utf-8') as f:
                json.dump(current_config, f, indent=2)

            logger.info(f"Applied configuration change to {service}: {parameter}={value}")
            return True

        except Exception as e:
            logger.error(f"Error applying configuration change to {service}: {e}")
            return False

    async def restart_service(self, service: str) -> bool:
        """
        Restart a service using configured restart command.

        Args:
            service: Service name

        Returns:
            True if restart successful, False otherwise
        """
        restart_cmd = self._get_service_restart_command(service)

        if not restart_cmd:
            logger.error(f"No restart command configured for {service}")
            return False

        try:
            logger.info(f"Restarting service: {service} with command: {restart_cmd}")

            result = await asyncio.create_subprocess_shell(
                restart_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            stdout, stderr = await asyncio.wait_for(
                result.communicate(),
                timeout=self.config.service_restart_timeout_seconds
            )

            if result.returncode == 0:
                logger.info(f"Successfully restarted {service}")
                return True
            else:
                logger.error(
                    f"Failed to restart {service}: "
                    f"exit code {result.returncode}, stderr: {stderr.decode()}"
                )
                return False

        except asyncio.TimeoutError:
            logger.error(f"Timeout restarting {service}")
            return False
        except Exception as e:
            logger.error(f"Error restarting {service}: {e}")
            return False

    async def start_service(self, service: str) -> bool:
        """
        Start a service.

        Args:
            service: Service name

        Returns:
            True if start successful, False otherwise
        """
        start_cmd = self._get_service_start_command(service)

        if not start_cmd:
            logger.error(f"No start command configured for {service}")
            return False

        try:
            logger.info(f"Starting service: {service} with command: {start_cmd}")

            result = await asyncio.create_subprocess_shell(
                start_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            stdout, stderr = await asyncio.wait_for(
                result.communicate(),
                timeout=self.config.service_restart_timeout_seconds
            )

            if result.returncode == 0:
                logger.info(f"Successfully started {service}")
                return True
            else:
                logger.error(
                    f"Failed to start {service}: "
                    f"exit code {result.returncode}, stderr: {stderr.decode()}"
                )
                return False

        except asyncio.TimeoutError:
            logger.error(f"Timeout starting {service}")
            return False
        except Exception as e:
            logger.error(f"Error starting {service}: {e}")
            return False

    async def stop_service(self, service: str) -> bool:
        """
        Stop a service.

        Args:
            service: Service name

        Returns:
            True if stop successful, False otherwise
        """
        stop_cmd = self._get_service_stop_command(service)

        if not stop_cmd:
            logger.error(f"No stop command configured for {service}")
            return False

        try:
            logger.info(f"Stopping service: {service} with command: {stop_cmd}")

            result = await asyncio.create_subprocess_shell(
                stop_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            stdout, stderr = await asyncio.wait_for(
                result.communicate(),
                timeout=self.config.service_restart_timeout_seconds
            )

            if result.returncode == 0:
                logger.info(f"Successfully stopped {service}")
                return True
            else:
                logger.error(
                    f"Failed to stop {service}: "
                    f"exit code {result.returncode}, stderr: {stderr.decode()}"
                )
                return False

        except asyncio.TimeoutError:
            logger.error(f"Timeout stopping {service}")
            return False
        except Exception as e:
            logger.error(f"Error stopping {service}: {e}")
            return False

    async def verify_service_health(self, service: str) -> bool:
        """
        Verify service health using HealthAggregator.

        Args:
            service: Service name

        Returns:
            True if service is healthy, False otherwise
        """
        try:
            service_type = self._map_service_to_type(service)

            health = await self.health_aggregator.check_service_health(
                service_type,
                "detailed",
                "local"
            )

            is_healthy = health.status == HealthStatus.HEALTHY

            logger.info(f"Service {service} health status: {health.status.value}")

            return is_healthy

        except Exception as e:
            logger.error(f"Error verifying health of {service}: {e}")
            return False

    async def reset_service_configuration(self, service: str) -> bool:
        """
        Reset service configuration to baseline.

        Args:
            service: Service name

        Returns:
            True if reset successful, False otherwise
        """
        baseline_config_path = self._get_baseline_config_path(service)
        current_config_path = self._get_service_config_path(service)

        if not baseline_config_path.exists():
            logger.error(f"Baseline configuration not found for {service}")
            return False

        try:
            shutil.copy2(baseline_config_path, current_config_path)
            logger.info(f"Reset configuration for {service} to baseline")
            return True

        except Exception as e:
            logger.error(f"Error resetting configuration for {service}: {e}")
            return False

    async def create_service_backup(self, service: str, backup_id: str):
        """
        Create service backup.

        Args:
            service: Service name
            backup_id: Unique backup identifier
        """
        backup_dir = Path(self.config.backup_directory) / service / backup_id
        config_path = self._get_service_config_path(service)

        try:
            backup_dir.mkdir(parents=True, exist_ok=True)

            # Backup configuration
            if config_path.exists():
                shutil.copy2(config_path, backup_dir / "config.json")

            # Create metadata
            metadata = {
                "service": service,
                "backup_id": backup_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "config_backed_up": config_path.exists()
            }

            with open(backup_dir / "metadata.json", 'w') as f:
                json.dump(metadata, f, indent=2)

            logger.info(f"Created backup {backup_id} for service {service}")

        except Exception as e:
            logger.error(f"Error creating backup for {service}: {e}")
            raise

    async def restore_service_backup(self, service: str, backup_id: str):
        """
        Restore service from backup.

        Args:
            service: Service name
            backup_id: Backup identifier to restore
        """
        backup_dir = Path(self.config.backup_directory) / service / backup_id
        config_path = self._get_service_config_path(service)

        if not backup_dir.exists():
            logger.error(f"Backup {backup_id} not found for {service}")
            raise FileNotFoundError(f"Backup directory not found: {backup_dir}")

        try:
            # Restore configuration
            backup_config = backup_dir / "config.json"
            if backup_config.exists():
                shutil.copy2(backup_config, config_path)

            logger.info(f"Restored service {service} from backup {backup_id}")

        except Exception as e:
            logger.error(f"Error restoring backup for {service}: {e}")
            raise

    def _get_service_config_path(self, service: str) -> Path:
        """Get path to service configuration file."""
        config_dir = Path("/etc/olorin") / service
        return config_dir / "config.json"

    def _get_baseline_config_path(self, service: str) -> Path:
        """Get path to baseline configuration file."""
        config_dir = Path("/etc/olorin") / service
        return config_dir / "baseline_config.json"

    def _get_service_restart_command(self, service: str) -> Optional[str]:
        """Get restart command for service."""
        if service == "backend":
            return self.config.services.backend_restart_command
        elif service == "frontend":
            return self.config.services.frontend_restart_command
        return None

    def _get_service_start_command(self, service: str) -> Optional[str]:
        """Get start command for service."""
        restart_cmd = self._get_service_restart_command(service)
        if restart_cmd:
            return restart_cmd.replace("restart", "start")
        return None

    def _get_service_stop_command(self, service: str) -> Optional[str]:
        """Get stop command for service."""
        restart_cmd = self._get_service_restart_command(service)
        if restart_cmd:
            return restart_cmd.replace("restart", "stop")
        return None

    def _map_service_to_type(self, service: str) -> ServiceType:
        """Map service name to ServiceType enum."""
        service_map = {
            "backend": ServiceType.BACKEND,
            "frontend": ServiceType.FRONTEND,
            "web_portal": ServiceType.WEB_PORTAL
        }
        return service_map.get(service.lower(), ServiceType.BACKEND)
