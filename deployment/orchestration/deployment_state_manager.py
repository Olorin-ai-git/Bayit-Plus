#!/usr/bin/env python3
"""
Deployment State Manager for Olorin Platform.

Manages persistent deployment tracking, state synchronization, artifact
management, and deployment metadata across distributed deployment agents.
"""

import json
import logging
import asyncio
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from pathlib import Path
from dataclasses import dataclass, asdict
from enum import Enum
import uuid

logger = logging.getLogger(__name__)


class DeploymentStatus(Enum):
    """Deployment status states."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    SUCCESS = "success"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"


class ServiceType(Enum):
    """Supported service types for deployment."""
    BACKEND = "backend"
    FRONTEND = "frontend"
    WEB_PORTAL = "web_portal"


@dataclass
class ServiceDeployment:
    """Represents a service deployment state."""
    service: str
    status: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    health_status: Optional[Dict[str, Any]] = None
    logs: List[str] = None
    version: Optional[str] = None
    artifacts: Optional[Dict[str, str]] = None
    
    def __post_init__(self):
        if self.logs is None:
            self.logs = []
        if self.artifacts is None:
            self.artifacts = {}


@dataclass
class DeploymentState:
    """Complete deployment state with all metadata."""
    deployment_id: str
    status: str
    environment: str
    services: Dict[str, ServiceDeployment]
    started_at: str
    completed_at: Optional[str] = None
    error: Optional[str] = None
    logs: List[str] = None
    metadata: Optional[Dict[str, Any]] = None
    
    def __post_init__(self):
        if self.logs is None:
            self.logs = []
        if self.metadata is None:
            self.metadata = {}


class DeploymentStateManager:
    """
    Manages deployment state persistence and synchronization.
    
    Handles real-time state tracking, artifact management, and metadata
    collection with persistent storage and cross-agent synchronization.
    """
    
    def __init__(self, state_dir: str = "/tmp/olorin_deployments"):
        self.state_dir = Path(state_dir)
        self.state_dir.mkdir(parents=True, exist_ok=True)
        
        # In-memory state cache
        self.deployments: Dict[str, DeploymentState] = {}
        
        # Load existing state
        asyncio.create_task(self._load_existing_states())
    
    async def create_deployment(
        self, 
        services: List[str], 
        environment: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Create a new deployment with initial state.
        
        Args:
            services: List of service names to deploy
            environment: Target environment (staging/production)
            metadata: Optional deployment metadata
            
        Returns:
            Unique deployment identifier
        """
        deployment_id = str(uuid.uuid4())
        current_time = datetime.now(timezone.utc).isoformat()
        
        # Initialize service deployments
        service_deployments = {
            service: ServiceDeployment(
                service=service,
                status=DeploymentStatus.PENDING.value,
                started_at=None
            )
            for service in services
        }
        
        # Create deployment state
        deployment_state = DeploymentState(
            deployment_id=deployment_id,
            status=DeploymentStatus.PENDING.value,
            environment=environment,
            services=service_deployments,
            started_at=current_time,
            metadata=metadata or {}
        )
        
        # Store in memory and persist
        self.deployments[deployment_id] = deployment_state
        await self._persist_deployment_state(deployment_id)
        
        logger.info(f"Created deployment {deployment_id} for services: {services}")
        return deployment_id
    
    async def update_deployment_status(
        self, 
        deployment_id: str, 
        status: DeploymentStatus,
        error: Optional[str] = None
    ):
        """
        Update overall deployment status.
        
        Args:
            deployment_id: Unique identifier for the deployment
            status: New deployment status
            error: Error message if status is FAILED
        """
        if deployment_id not in self.deployments:
            raise ValueError(f"Deployment {deployment_id} not found")
        
        deployment = self.deployments[deployment_id]
        deployment.status = status.value
        
        if status in [DeploymentStatus.SUCCESS, DeploymentStatus.FAILED, DeploymentStatus.ROLLED_BACK]:
            deployment.completed_at = datetime.now(timezone.utc).isoformat()
        
        if error:
            deployment.error = error
        
        await self._persist_deployment_state(deployment_id)
        logger.info(f"Updated deployment {deployment_id} status to {status.value}")
    
    async def update_service_deployment(
        self,
        deployment_id: str,
        service: str,
        status: DeploymentStatus,
        health_status: Optional[Dict[str, Any]] = None,
        version: Optional[str] = None,
        artifacts: Optional[Dict[str, str]] = None
    ):
        """
        Update service deployment state.
        
        Args:
            deployment_id: Unique identifier for the deployment
            service: Service name
            status: New service deployment status
            health_status: Health check results
            version: Deployed version
            artifacts: Deployment artifacts
        """
        if deployment_id not in self.deployments:
            raise ValueError(f"Deployment {deployment_id} not found")
        
        deployment = self.deployments[deployment_id]
        if service not in deployment.services:
            # Create new service deployment if not exists
            deployment.services[service] = ServiceDeployment(
                service=service,
                status=status.value
            )
        
        service_deployment = deployment.services[service]
        service_deployment.status = status.value
        
        current_time = datetime.now(timezone.utc).isoformat()
        
        if status == DeploymentStatus.IN_PROGRESS and not service_deployment.started_at:
            service_deployment.started_at = current_time
        
        if status in [DeploymentStatus.SUCCESS, DeploymentStatus.FAILED]:
            service_deployment.completed_at = current_time
        
        if health_status:
            service_deployment.health_status = health_status
        
        if version:
            service_deployment.version = version
        
        if artifacts:
            service_deployment.artifacts.update(artifacts)
        
        await self._persist_deployment_state(deployment_id)
        logger.info(f"Updated service {service} in deployment {deployment_id} to {status.value}")
    
    async def add_deployment_log(self, deployment_id: str, message: str):
        """
        Add log message to deployment.
        
        Args:
            deployment_id: Unique identifier for the deployment
            message: Log message to add
        """
        if deployment_id not in self.deployments:
            logger.warning(f"Deployment {deployment_id} not found for logging")
            return
        
        timestamp = datetime.now(timezone.utc).isoformat()
        log_message = f"[{timestamp}] {message}"
        
        deployment = self.deployments[deployment_id]
        deployment.logs.append(log_message)
        
        # Persist periodically (every 10 logs) to avoid excessive I/O
        if len(deployment.logs) % 10 == 0:
            await self._persist_deployment_state(deployment_id)
    
    async def add_service_log(self, deployment_id: str, service: str, message: str):
        """
        Add log message to service deployment.
        
        Args:
            deployment_id: Unique identifier for the deployment
            service: Service name
            message: Log message to add
        """
        if deployment_id not in self.deployments:
            logger.warning(f"Deployment {deployment_id} not found for service logging")
            return
        
        deployment = self.deployments[deployment_id]
        if service not in deployment.services:
            logger.warning(f"Service {service} not found in deployment {deployment_id}")
            return
        
        timestamp = datetime.now(timezone.utc).isoformat()
        log_message = f"[{timestamp}] {message}"
        
        deployment.services[service].logs.append(log_message)
    
    def get_deployment_state(self, deployment_id: str) -> Optional[Dict[str, Any]]:
        """
        Get complete deployment state.
        
        Args:
            deployment_id: Unique identifier for the deployment
            
        Returns:
            Deployment state dictionary or None if not found
        """
        if deployment_id not in self.deployments:
            return None
        
        deployment = self.deployments[deployment_id]
        return asdict(deployment)
    
    def list_deployments(
        self, 
        environment: Optional[str] = None,
        status: Optional[DeploymentStatus] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        List deployments with optional filtering.
        
        Args:
            environment: Filter by environment
            status: Filter by status
            limit: Maximum number of deployments to return
            
        Returns:
            List of deployment state dictionaries
        """
        deployments = list(self.deployments.values())
        
        # Apply filters
        if environment:
            deployments = [d for d in deployments if d.environment == environment]
        
        if status:
            deployments = [d for d in deployments if d.status == status.value]
        
        # Sort by created time (newest first) and limit
        deployments.sort(key=lambda d: d.started_at, reverse=True)
        deployments = deployments[:limit]
        
        return [asdict(d) for d in deployments]
    
    async def _persist_deployment_state(self, deployment_id: str):
        """
        Persist deployment state to disk.
        
        Args:
            deployment_id: Unique identifier for the deployment
        """
        if deployment_id not in self.deployments:
            return
        
        try:
            state_file = self.state_dir / f"{deployment_id}.json"
            deployment = self.deployments[deployment_id]
            
            with open(state_file, 'w') as f:
                json.dump(asdict(deployment), f, indent=2)
                
        except Exception as e:
            logger.error(f"Failed to persist deployment state for {deployment_id}: {e}")
    
    async def _load_existing_states(self):
        """
        Load existing deployment states from disk.
        """
        try:
            for state_file in self.state_dir.glob("*.json"):
                with open(state_file, 'r') as f:
                    state_data = json.load(f)
                
                # Reconstruct ServiceDeployment objects
                services = {}
                for service_name, service_data in state_data.get('services', {}).items():
                    services[service_name] = ServiceDeployment(**service_data)
                
                # Create DeploymentState object
                deployment_state = DeploymentState(
                    deployment_id=state_data['deployment_id'],
                    status=state_data['status'],
                    environment=state_data['environment'],
                    services=services,
                    started_at=state_data['started_at'],
                    completed_at=state_data.get('completed_at'),
                    error=state_data.get('error'),
                    logs=state_data.get('logs', []),
                    metadata=state_data.get('metadata', {})
                )
                
                self.deployments[deployment_state.deployment_id] = deployment_state
            
            logger.info(f"Loaded {len(self.deployments)} existing deployment states")
            
        except Exception as e:
            logger.error(f"Failed to load existing deployment states: {e}")