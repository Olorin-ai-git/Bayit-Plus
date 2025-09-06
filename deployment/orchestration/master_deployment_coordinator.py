#!/usr/bin/env python3
"""
Master Deployment Coordinator for Olorin Platform.

Orchestrates cross-service deployments using modular components.
Delegates execution to specialized modules while maintaining coordination flow.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

# Import specialized modules
from .deployment_sequencer import DeploymentSequencer, ServiceType
from .deployment_state_manager import DeploymentStateManager, DeploymentStatus
from .deployment_executor import DeploymentExecutor
from ..monitoring.health_aggregator import HealthAggregator, HealthStatus

logger = logging.getLogger(__name__)


@dataclass
class DeploymentConfig:
    """Configuration for a deployment operation."""
    services: List[ServiceType]
    environment: str
    timeout: int = 900  # 15 minutes default
    health_check_retries: int = 5
    health_check_interval: int = 30


class MasterDeploymentCoordinator:
    """
    Master coordinator for cross-service deployments.
    
    Orchestrates deployment flow by coordinating between sequencer,
    state manager, executor, and health aggregator modules.
    """
    
    def __init__(self):
        self.sequencer = DeploymentSequencer()
        self.state_manager = DeploymentStateManager()
        self.executor = DeploymentExecutor()
        self.health_aggregator = HealthAggregator()
    
    async def deploy_services(self, config: DeploymentConfig) -> Dict[str, Any]:
        """
        Deploy multiple services with coordination and health validation.
        
        Args:
            config: Deployment configuration
            
        Returns:
            Deployment result with status and details
        """
        # Create deployment tracking
        deployment_id = await self.state_manager.create_deployment(
            services=[service.value for service in config.services],
            environment=config.environment,
            metadata={"timeout": config.timeout, "started_by": "coordinator"}
        )
        
        await self.state_manager.add_deployment_log(
            deployment_id, 
            f"Starting coordinated deployment for: {[s.value for s in config.services]}"
        )
        
        try:
            # Update to in-progress
            await self.state_manager.update_deployment_status(
                deployment_id, DeploymentStatus.IN_PROGRESS
            )
            
            # Plan and execute deployment sequence
            await self._execute_deployment_phases(deployment_id, config)
            
            # Final system health validation
            await self._validate_system_health(deployment_id, config)
            
            # Mark as successful
            await self.state_manager.update_deployment_status(
                deployment_id, DeploymentStatus.SUCCESS
            )
            
            await self.state_manager.add_deployment_log(
                deployment_id, "Coordinated deployment completed successfully"
            )
            
            return self.state_manager.get_deployment_state(deployment_id)
            
        except Exception as e:
            logger.error(f"Deployment {deployment_id} failed: {e}")
            await self._handle_deployment_failure(deployment_id, str(e))
            raise
    
    async def _execute_deployment_phases(self, deployment_id: str, config: DeploymentConfig):
        """Execute deployment phases with proper sequencing."""
        # Plan deployment sequence
        sequence = await self.sequencer.plan_deployment_sequence(
            deployment_id, config.services
        )
        
        await self.state_manager.add_deployment_log(
            deployment_id, f"Planned {len(sequence)} deployment phases"
        )
        
        # Execute each phase
        deployed_services = set()
        for phase_index, phase_services in enumerate(sequence):
            # Validate dependencies
            deps_met = await self.sequencer.validate_phase_dependencies(
                deployment_id, phase_index, deployed_services
            )
            
            if not deps_met:
                raise RuntimeError(f"Dependencies not met for phase {phase_index}")
            
            # Execute phase
            await self.sequencer.execute_deployment_phase(
                deployment_id, phase_index, self._deploy_service_wrapper, config
            )
            
            # Validate phase health
            await self._validate_phase_health(deployment_id, phase_services, config)
            
            # Update deployed services
            deployed_services.update(phase_services)
    
    async def _deploy_service_wrapper(self, deployment_id: str, service: ServiceType, config: DeploymentConfig):
        """Wrapper for service deployment that integrates with executor."""
        await self.executor.deploy_service(
            deployment_id, service, config.environment, self.state_manager
        )
    
    async def _validate_phase_health(self, deployment_id: str, services: List[ServiceType], config: DeploymentConfig):
        """Validate health of services in a deployment phase."""
        await self.state_manager.add_deployment_log(
            deployment_id, f"Validating health for: {[s.value for s in services]}"
        )
        
        for service in services:
            is_ready = await self.health_aggregator.wait_for_service_health(
                service, config.environment,
                timeout_seconds=config.health_check_interval * config.health_check_retries
            )
            
            if not is_ready:
                raise RuntimeError(f"Health validation failed for {service.value}")
    
    async def _validate_system_health(self, deployment_id: str, config: DeploymentConfig):
        """Perform final system-wide health validation."""
        await self.state_manager.add_deployment_log(
            deployment_id, "Performing final system health validation"
        )
        
        system_health = await self.health_aggregator.check_system_health(
            config.services, config.environment
        )
        
        if system_health.overall_status != HealthStatus.HEALTHY:
            critical_issues = "; ".join(system_health.critical_issues)
            raise RuntimeError(f"System health validation failed: {critical_issues}")
        
        await self.state_manager.add_deployment_log(
            deployment_id, "System health validation completed successfully"
        )
    
    async def _handle_deployment_failure(self, deployment_id: str, error_message: str):
        """Handle deployment failure with proper state updates and cleanup."""
        await self.state_manager.update_deployment_status(
            deployment_id, DeploymentStatus.FAILED, error_message
        )
        
        await self.state_manager.add_deployment_log(
            deployment_id, f"Deployment failed: {error_message}"
        )
        
        # Cleanup and prepare for potential rollback
        self.sequencer.cleanup_deployment(deployment_id)
    
    def get_deployment_status(self, deployment_id: str) -> Optional[Dict[str, Any]]:
        """Get current status of a deployment."""
        return self.state_manager.get_deployment_state(deployment_id)
    
    def list_deployments(self, environment: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """List deployments with optional filtering."""
        return self.state_manager.list_deployments(environment=environment, limit=limit)