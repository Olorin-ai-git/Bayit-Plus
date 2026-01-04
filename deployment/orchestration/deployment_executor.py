#!/usr/bin/env python3
"""
Deployment Executor for Olorin Platform.

Handles the actual execution of service deployments using existing proven scripts
and infrastructure. Separated from main coordinator to maintain modularity.
"""

import asyncio
import subprocess
import os
import logging
from typing import Dict, List, Optional, Any
from enum import Enum

logger = logging.getLogger(__name__)


class ServiceType(Enum):
    """Supported service types for deployment."""
    BACKEND = "backend"
    FRONTEND = "frontend"
    WEB_PORTAL = "web_portal"


class DeploymentExecutor:
    """
    Executes individual service deployments.
    
    Integrates with existing deployment infrastructure while providing
    a consistent interface for the orchestration system.
    """
    
    def __init__(self):
        # Deployment script paths
        self.deployment_scripts = {
            ServiceType.BACKEND: "/Users/gklainert/Documents/olorin/scripts/deployment/deploy-cloudrun-direct.sh",
            ServiceType.FRONTEND: "/Users/gklainert/Documents/olorin/scripts/deploy-frontend.sh",
        }
    
    async def deploy_service(
        self, 
        deployment_id: str, 
        service: ServiceType, 
        environment: str,
        state_manager
    ):
        """
        Deploy a single service using appropriate deployment method.
        
        Args:
            deployment_id: Unique identifier for the deployment
            service: Service type to deploy
            environment: Target environment
            state_manager: State manager for logging and updates
        """
        await state_manager.update_service_deployment(
            deployment_id, service.value, "in_progress"
        )
        
        await state_manager.add_service_log(
            deployment_id, 
            service.value,
            f"Starting {service.value} deployment"
        )
        
        try:
            if service == ServiceType.BACKEND:
                await self._deploy_backend(deployment_id, environment)
            elif service == ServiceType.FRONTEND:
                await self._deploy_frontend(deployment_id, environment)
            elif service == ServiceType.WEB_PORTAL:
                await self._deploy_web_portal(deployment_id, environment)
            
            await state_manager.update_service_deployment(
                deployment_id, service.value, "success"
            )
            
            await state_manager.add_service_log(
                deployment_id,
                service.value,
                f"{service.value} deployment completed successfully"
            )
            
        except Exception as e:
            await state_manager.update_service_deployment(
                deployment_id, service.value, "failed"
            )
            
            await state_manager.add_service_log(
                deployment_id,
                service.value,
                f"{service.value} deployment failed: {e}"
            )
            raise
    
    async def _deploy_backend(self, deployment_id: str, environment: str):
        """Deploy backend service to Google Cloud Run."""
        logger.info(f"Deploying backend to Cloud Run for deployment {deployment_id}")
        
        script_path = "/Users/gklainert/Documents/olorin/scripts/deployment/deploy-cloudrun-direct.sh"
        
        env_vars = os.environ.copy()
        env_vars.update({
            "DEPLOYMENT_ID": deployment_id,
            "ENVIRONMENT": environment
        })
        
        process = await asyncio.create_subprocess_exec(
            script_path,
            "--project=olorin-ai",
            "--region=us-central1", 
            f"--environment={environment}",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env_vars
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            error_msg = stderr.decode() if stderr else "Backend deployment failed"
            raise RuntimeError(error_msg)
        
        logger.info(f"Backend deployment completed for {deployment_id}")
    
    async def _deploy_frontend(self, deployment_id: str, environment: str):
        """Deploy frontend service to Firebase Hosting."""
        logger.info(f"Deploying frontend to Firebase Hosting for deployment {deployment_id}")
        
        frontend_dir = "/Users/gklainert/Documents/olorin/olorin-front"
        
        # Build frontend
        build_process = await asyncio.create_subprocess_exec(
            "npm", "run", "build",
            cwd=frontend_dir,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env={**os.environ, "DEPLOYMENT_ID": deployment_id}
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
        
        logger.info(f"Frontend deployment completed for {deployment_id}")
    
    async def _deploy_web_portal(self, deployment_id: str, environment: str):
        """Deploy web portal service (placeholder)."""
        logger.info(f"Web portal deployment for {deployment_id} - not yet implemented")
        # TODO: Implement web portal deployment when ready