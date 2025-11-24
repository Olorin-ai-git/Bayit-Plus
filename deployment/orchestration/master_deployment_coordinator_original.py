#!/usr/bin/env python3
"""
Master Deployment Coordinator for Olorin Platform.

Orchestrates cross-service deployments with dependency management,
health validation, and coordination across backend and frontend services.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import json
import subprocess
import os
import aiohttp

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ServiceType(Enum):
    """Supported service types for deployment."""
    BACKEND = "backend"
    FRONTEND = "frontend"
    WEB_PORTAL = "web_portal"


class DeploymentStatus(Enum):
    """Deployment status states."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    SUCCESS = "success"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"


@dataclass
class DeploymentConfig:
    """Configuration for a deployment operation."""
    services: List[ServiceType]
    environment: str
    deployment_id: str
    timeout: int = 900  # 15 minutes default
    health_check_retries: int = 5
    health_check_interval: int = 30


@dataclass
class ServiceDeployment:
    """Represents a service deployment state."""
    service: ServiceType
    status: DeploymentStatus
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    health_status: Optional[Dict[str, Any]] = None
    logs: List[str] = None


class MasterDeploymentCoordinator:
    """
    Master coordinator for cross-service deployments.
    
    Manages deployment sequencing, health validation, and coordination
    across multiple services with dependency awareness.
    """
    
    def __init__(self):
        self.deployments: Dict[str, Dict[str, Any]] = {}
        self.health_endpoints = {
            ServiceType.BACKEND: "http://localhost:8090/health/detailed",
            ServiceType.FRONTEND: "http://localhost:3000",
        }
    
    async def deploy_services(
        self, 
        config: DeploymentConfig
    ) -> Dict[str, Any]:
        """
        Deploy multiple services with proper coordination.
        
        Args:
            config: Deployment configuration with services and environment
            
        Returns:
            Deployment result with status and details
        """
        deployment_id = config.deployment_id
        logger.info(f"Starting deployment {deployment_id} for services: {config.services}")
        
        # Initialize deployment state
        self.deployments[deployment_id] = {
            "config": config,
            "status": DeploymentStatus.IN_PROGRESS,
            "services": {},
            "started_at": datetime.now(timezone.utc),
            "logs": []
        }
        
        try:
            # Plan deployment sequence based on dependencies
            sequence = await self._plan_deployment_sequence(config.services)
            self._log_deployment(deployment_id, f"Deployment sequence: {sequence}")
            
            # Execute deployment phases
            for phase_services in sequence:
                await self._deploy_phase(deployment_id, phase_services, config)
                await self._validate_phase_health(deployment_id, phase_services, config)
            
            # Final system health validation
            await self._validate_system_health(deployment_id, config)
            
            # Mark deployment as successful
            self.deployments[deployment_id]["status"] = DeploymentStatus.SUCCESS
            self.deployments[deployment_id]["completed_at"] = datetime.now(timezone.utc)
            
            self._log_deployment(deployment_id, "Deployment completed successfully")
            return self._get_deployment_result(deployment_id)
        
        except Exception as e:
            logger.error(f"Deployment {deployment_id} failed: {e}")
            self.deployments[deployment_id]["status"] = DeploymentStatus.FAILED
            self.deployments[deployment_id]["error"] = str(e)
            
            # Trigger rollback if needed
            await self._trigger_rollback(deployment_id, str(e))
            raise
    
    async def _plan_deployment_sequence(
        self, 
        services: List[ServiceType]
    ) -> List[List[ServiceType]]:
        """
        Plan deployment sequence based on service dependencies.
        
        Args:
            services: List of services to deploy
            
        Returns:
            List of deployment phases, each containing services that can be deployed in parallel
        """
        # Define service dependencies (backend must be deployed before frontend)
        dependencies = {
            ServiceType.BACKEND: [],
            ServiceType.FRONTEND: [ServiceType.BACKEND],
            ServiceType.WEB_PORTAL: []
        }
        
        sequence = []
        remaining_services = set(services)
        deployed_services = set()
        
        while remaining_services:
            # Find services that can be deployed (all dependencies met)
            ready_services = []
            for service in remaining_services:
                service_deps = dependencies.get(service, [])
                if all(dep in deployed_services for dep in service_deps):
                    ready_services.append(service)
            
            if not ready_services:
                raise ValueError(f"Circular dependency detected in services: {remaining_services}")
            
            sequence.append(ready_services)
            for service in ready_services:
                remaining_services.remove(service)
                deployed_services.add(service)
        
        return sequence
    
    async def _deploy_phase(
        self, 
        deployment_id: str, 
        services: List[ServiceType], 
        config: DeploymentConfig
    ):
        """Deploy a phase of services in parallel."""
        self._log_deployment(deployment_id, f"Deploying phase: {services}")
        
        # Deploy services in parallel
        tasks = []
        for service in services:
            task = asyncio.create_task(
                self._deploy_service(deployment_id, service, config)
            )
            tasks.append(task)
        
        # Wait for all services in this phase to complete
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Check for failures
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                service = services[i]
                raise RuntimeError(f"Service {service.value} deployment failed: {result}")
    
    async def _deploy_service(
        self, 
        deployment_id: str, 
        service: ServiceType, 
        config: DeploymentConfig
    ):
        """Deploy a single service."""
        service_deployment = ServiceDeployment(
            service=service,
            status=DeploymentStatus.IN_PROGRESS,
            started_at=datetime.now(timezone.utc),
            logs=[]
        )
        
        self.deployments[deployment_id]["services"][service.value] = service_deployment
        
        try:
            if service == ServiceType.BACKEND:
                await self._deploy_backend(deployment_id, config)
            elif service == ServiceType.FRONTEND:
                await self._deploy_frontend(deployment_id, config)
            elif service == ServiceType.WEB_PORTAL:
                await self._deploy_web_portal(deployment_id, config)
            
            service_deployment.status = DeploymentStatus.SUCCESS
            service_deployment.completed_at = datetime.now(timezone.utc)
            
        except Exception as e:
            service_deployment.status = DeploymentStatus.FAILED
            service_deployment.logs.append(f"Deployment failed: {e}")
            raise
    
    async def _deploy_backend(self, deployment_id: str, config: DeploymentConfig):
        """Deploy backend service using existing deployment script."""
        self._log_deployment(deployment_id, "Deploying backend to Cloud Run")
        
        # Use existing proven deployment script
<<<<<<< HEAD
        script_path = "/Users/gklainert/Documents/olorin/deploy-cloudrun-direct.sh"
=======
        script_path = "/Users/gklainert/Documents/olorin/scripts/deployment/deploy-cloudrun-direct.sh"
>>>>>>> 001-modify-analyzer-method
        
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
            raise RuntimeError(f"Backend deployment failed: {error_msg}")
        
        self._log_deployment(deployment_id, "Backend deployment completed")
    
    async def _deploy_frontend(self, deployment_id: str, config: DeploymentConfig):
        """Deploy frontend service to Firebase Hosting."""
        self._log_deployment(deployment_id, "Deploying frontend to Firebase Hosting")
        
        # Change to frontend directory and deploy
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
            error_msg = stderr.decode() if stderr else "Frontend build failed"
            raise RuntimeError(f"Frontend build failed: {error_msg}")
        
        # Deploy to Firebase
        deploy_process = await asyncio.create_subprocess_exec(
            "firebase", "deploy", "--only", "hosting:olorin-frontend",
            cwd="/Users/gklainert/Documents/olorin",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await deploy_process.communicate()
        
        if deploy_process.returncode != 0:
            error_msg = stderr.decode() if stderr else "Frontend deployment failed"
            raise RuntimeError(f"Frontend deployment failed: {error_msg}")
        
        self._log_deployment(deployment_id, "Frontend deployment completed")
    
    async def _deploy_web_portal(self, deployment_id: str, config: DeploymentConfig):
        """Deploy web portal service."""
        self._log_deployment(deployment_id, "Web portal deployment not yet implemented")
        # TODO: Implement web portal deployment
        pass
    
    async def _validate_phase_health(
        self, 
        deployment_id: str, 
        services: List[ServiceType], 
        config: DeploymentConfig
    ):
        """Validate health of services in a deployment phase."""
        self._log_deployment(deployment_id, f"Validating health for services: {services}")
        
        for service in services:
            await self._validate_service_health(deployment_id, service, config)
    
    async def _validate_service_health(
        self, 
        deployment_id: str, 
        service: ServiceType, 
        config: DeploymentConfig
    ):
        """Validate health of a single service."""
        endpoint = self.health_endpoints.get(service)
        if not endpoint:
            self._log_deployment(deployment_id, f"No health endpoint for {service.value}")
            return
        
        for attempt in range(config.health_check_retries):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(endpoint, timeout=30) as response:
                        if response.status == 200:
                            health_data = await response.json()
                            self.deployments[deployment_id]["services"][service.value].health_status = health_data
                            self._log_deployment(
                                deployment_id, 
                                f"Health check passed for {service.value}"
                            )
                            return
                        else:
                            self._log_deployment(
                                deployment_id, 
                                f"Health check failed for {service.value}: HTTP {response.status}"
                            )
            
            except Exception as e:
                self._log_deployment(
                    deployment_id, 
                    f"Health check error for {service.value}: {e}"
                )
            
            if attempt < config.health_check_retries - 1:
                await asyncio.sleep(config.health_check_interval)
        
        raise RuntimeError(f"Health validation failed for {service.value}")
    
    async def _validate_system_health(self, deployment_id: str, config: DeploymentConfig):
        """Perform final system-wide health validation."""
        self._log_deployment(deployment_id, "Performing final system health validation")
        
        # Validate all deployed services are healthy
        for service_type in config.services:
            await self._validate_service_health(deployment_id, service_type, config)
        
        self._log_deployment(deployment_id, "System health validation completed")
    
    async def _trigger_rollback(self, deployment_id: str, error_message: str):
        """Trigger rollback procedures for failed deployment."""
        self._log_deployment(deployment_id, f"Triggering rollback due to: {error_message}")
        self.deployments[deployment_id]["status"] = DeploymentStatus.ROLLED_BACK
        
        # TODO: Implement rollback procedures
        # This would integrate with the automated rollback manager
    
    def _log_deployment(self, deployment_id: str, message: str):
        """Log deployment message with timestamp."""
        timestamp = datetime.now(timezone.utc).isoformat()
        log_message = f"[{timestamp}] {message}"
        
        if deployment_id in self.deployments:
            self.deployments[deployment_id]["logs"].append(log_message)
        
        logger.info(f"[{deployment_id}] {message}")
    
    def _get_deployment_result(self, deployment_id: str) -> Dict[str, Any]:
        """Get deployment result with status and details."""
        deployment = self.deployments.get(deployment_id, {})
        
        return {
            "deployment_id": deployment_id,
            "status": deployment.get("status", DeploymentStatus.FAILED).value,
            "started_at": deployment.get("started_at"),
            "completed_at": deployment.get("completed_at"),
            "services": {
                service_name: {
                    "status": service_deployment.status.value,
                    "started_at": service_deployment.started_at,
                    "completed_at": service_deployment.completed_at,
                    "health_status": service_deployment.health_status
                }
                for service_name, service_deployment in deployment.get("services", {}).items()
            },
            "logs": deployment.get("logs", []),
            "error": deployment.get("error")
        }
    
    def get_deployment_status(self, deployment_id: str) -> Optional[Dict[str, Any]]:
        """Get current status of a deployment."""
        return self._get_deployment_result(deployment_id) if deployment_id in self.deployments else None
    
    def list_deployments(self) -> List[Dict[str, Any]]:
        """List all deployments with their status."""
        return [
            self._get_deployment_result(deployment_id) 
            for deployment_id in self.deployments.keys()
        ]