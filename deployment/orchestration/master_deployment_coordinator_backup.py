#!/usr/bin/env python3
"""
Refactored Master Deployment Coordinator for Olorin Platform.

Orchestrates cross-service deployments using modular components:
- DeploymentSequencer: Manages dependency sequencing
- DeploymentStateManager: Handles state persistence
- HealthAggregator: Coordinates health validation

This coordinator delegates to specialized modules while maintaining
the main orchestration flow and deployment lifecycle management.
"""

import asyncio
import logging
import subprocess
import os
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum

# Import specialized modules
from .deployment_sequencer import DeploymentSequencer, ServiceType
from .deployment_state_manager import DeploymentStateManager, DeploymentStatus
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
    
    Delegates to specialized modules for sequencing, state management,
    and health validation while orchestrating the overall deployment flow.
    """
    
    def __init__(self):
        self.sequencer = DeploymentSequencer()
        self.state_manager = DeploymentStateManager()
        self.health_aggregator = HealthAggregator()
        
        # Deployment script paths
        self.deployment_scripts = {
            ServiceType.BACKEND: "/Users/gklainert/Documents/olorin/scripts/deploy-backend.sh",
            ServiceType.FRONTEND: "/Users/gklainert/Documents/olorin/scripts/deploy-frontend.sh",
        }
    
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
            metadata={
                "timeout": config.timeout,
                "health_retries": config.health_check_retries,
                "started_by": "coordinator"
            }
        )
        
        await self.state_manager.add_deployment_log(
            deployment_id, 
            f"Starting deployment for services: {[s.value for s in config.services]}"
        )
        
        try:
            # Update to in-progress
            await self.state_manager.update_deployment_status(
                deployment_id, 
                DeploymentStatus.IN_PROGRESS
            )
            
            # Plan deployment sequence
            sequence = await self.sequencer.plan_deployment_sequence(
                deployment_id, 
                config.services
            )
            
            await self.state_manager.add_deployment_log(
                deployment_id,
                f"Deployment sequence planned: {len(sequence)} phases"
            )
            
            # Execute deployment phases
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
                    deployment_id,
                    phase_index,
                    self._deploy_service,
                    config
                )
                
                # Validate phase health
                await self._validate_phase_health(deployment_id, phase_services, config)
                
                # Update deployed services
                deployed_services.update(phase_services)
            
            # Final system health validation
            await self._validate_system_health(deployment_id, config)
            
            # Mark as successful
            await self.state_manager.update_deployment_status(
                deployment_id, 
                DeploymentStatus.SUCCESS
            )
            
            await self.state_manager.add_deployment_log(
                deployment_id, 
                "Deployment completed successfully"
            )
            
            return self.state_manager.get_deployment_state(deployment_id)
            
        except Exception as e:
            logger.error(f"Deployment {deployment_id} failed: {e}")
            
            await self.state_manager.update_deployment_status(
                deployment_id, 
                DeploymentStatus.FAILED, 
                str(e)
            )
            
            await self.state_manager.add_deployment_log(
                deployment_id, 
                f"Deployment failed: {e}"
            )
            
            # Cleanup and trigger rollback if needed
            await self._trigger_rollback(deployment_id)
            raise
    
    async def _deploy_service(
        self, 
        deployment_id: str, 
        service: ServiceType, 
        config: DeploymentConfig
    ):
        """
        Deploy a single service using appropriate deployment method.
        
        Args:
            deployment_id: Unique identifier for the deployment
            service: Service type to deploy
            config: Deployment configuration
        """
        await self.state_manager.update_service_deployment(
            deployment_id, service.value, DeploymentStatus.IN_PROGRESS
        )
        
        await self.state_manager.add_service_log(
            deployment_id, 
            service.value,
            f"Starting {service.value} deployment"
        )
        
        try:
            if service == ServiceType.BACKEND:
                await self._deploy_backend(deployment_id, config)
            elif service == ServiceType.FRONTEND:
                await self._deploy_frontend(deployment_id, config)
            elif service == ServiceType.WEB_PORTAL:
                await self._deploy_web_portal(deployment_id, config)
            
            await self.state_manager.update_service_deployment(
                deployment_id, service.value, DeploymentStatus.SUCCESS
            )
            
            await self.state_manager.add_service_log(
                deployment_id,
                service.value,
                f"{service.value} deployment completed"
            )
            
        except Exception as e:
            await self.state_manager.update_service_deployment(
                deployment_id, service.value, DeploymentStatus.FAILED
            )
            
            await self.state_manager.add_service_log(
                deployment_id,
                service.value,
                f"{service.value} deployment failed: {e}"
            )
            raise
    
    async def _deploy_backend(self, deployment_id: str, config: DeploymentConfig):
        """Deploy backend service to Google Cloud Run."""
        script_path = "/Users/gklainert/Documents/olorin/scripts/deploy-cloudrun-direct.sh"
        
        env_vars = os.environ.copy()
        env_vars.update({
            "DEPLOYMENT_ID": deployment_id,
            "ENVIRONMENT": config.environment
        })
        
        process = await asyncio.create_subprocess_exec(
            script_path,
            "--project=olorin-ai",
            "--region=us-central1", 
            f"--environment={config.environment}",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env_vars
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            error_msg = stderr.decode() if stderr else "Backend deployment failed"
            raise RuntimeError(error_msg)
    
    async def _deploy_frontend(self, deployment_id: str, config: DeploymentConfig):
        """Deploy frontend service to Firebase Hosting."""
        frontend_dir = "/Users/gklainert/Documents/olorin/olorin-front"
        
        # Build frontend
        build_process = await asyncio.create_subprocess_exec(
            "npm", "run", "build",
            cwd=frontend_dir,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await build_process.communicate()
        if build_process.returncode != 0:
            raise RuntimeError(f"Frontend build failed: {stderr.decode()}")
        
        # Deploy to Firebase
        deploy_process = await asyncio.create_subprocess_exec(
            "firebase", "deploy", "--only", "hosting:olorin-frontend",
            cwd="/Users/gklainert/Documents/olorin",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await deploy_process.communicate()
        if deploy_process.returncode != 0:
            raise RuntimeError(f"Frontend deployment failed: {stderr.decode()}")
    
    async def _deploy_web_portal(self, deployment_id: str, config: DeploymentConfig):
        """Deploy web portal service (placeholder)."""
        await self.state_manager.add_service_log(
            deployment_id, 
            ServiceType.WEB_PORTAL.value,
            "Web portal deployment not yet implemented"
        )
    
    async def _validate_phase_health(
        self, 
        deployment_id: str, 
        services: List[ServiceType], 
        config: DeploymentConfig
    ):
        """Validate health of services in a deployment phase."""
        await self.state_manager.add_deployment_log(
            deployment_id,
            f"Validating health for phase services: {[s.value for s in services]}"
        )
        
        # Wait for services to be ready
        for service in services:
            is_ready = await self.health_aggregator.wait_for_service_health(
                service,
                config.environment,
                timeout_seconds=config.health_check_interval * config.health_check_retries
            )
            
            if not is_ready:
                raise RuntimeError(f"Health validation failed for {service.value}")
    
    async def _validate_system_health(self, deployment_id: str, config: DeploymentConfig):
        """Perform final system-wide health validation."""
        await self.state_manager.add_deployment_log(
            deployment_id,
            "Performing final system health validation"
        )
        
        system_health = await self.health_aggregator.check_system_health(
            config.services, config.environment
        )
        
        if system_health.overall_status != HealthStatus.HEALTHY:
            critical_issues = "; ".join(system_health.critical_issues)
            raise RuntimeError(f"System health validation failed: {critical_issues}")
        
        await self.state_manager.add_deployment_log(
            deployment_id,
            "System health validation completed successfully"
        )
    
    async def _trigger_rollback(self, deployment_id: str):
        """Trigger rollback procedures for failed deployment."""
        await self.state_manager.add_deployment_log(
            deployment_id,
            "Triggering rollback procedures"
        )
        
        # Update status to rolled back
        await self.state_manager.update_deployment_status(
            deployment_id, 
            DeploymentStatus.ROLLED_BACK
        )
        
        # Cleanup deployment tracking
        self.sequencer.cleanup_deployment(deployment_id)
    
    def get_deployment_status(self, deployment_id: str) -> Optional[Dict[str, Any]]:
        """Get current status of a deployment."""
        return self.state_manager.get_deployment_state(deployment_id)
    
    def list_deployments(
        self, 
        environment: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """List deployments with optional filtering."""
        return self.state_manager.list_deployments(environment=environment, limit=limit)