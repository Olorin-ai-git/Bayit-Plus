#!/usr/bin/env python3
"""
Deployment Sequencer for Olorin Platform.

Manages service dependency graphs, deployment sequencing, and parallel execution
coordination. Ensures services are deployed in the correct order based on
their dependencies and health requirements.
"""

import asyncio
import logging
from typing import Dict, List, Set, Optional
from enum import Enum
from dataclasses import dataclass
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class ServiceType(Enum):
    """Supported service types for deployment."""
    BACKEND = "backend"
    FRONTEND = "frontend"
    WEB_PORTAL = "web_portal"


class PhaseStatus(Enum):
    """Status of deployment phases."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class DeploymentPhase:
    """Represents a deployment phase with services and status."""
    services: List[ServiceType]
    status: PhaseStatus
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    dependencies_met: bool = False


class DeploymentSequencer:
    """
    Manages deployment sequencing based on service dependencies.
    
    Coordinates parallel and sequential deployment execution with proper
    dependency validation and health check integration.
    """
    
    def __init__(self):
        # Define service dependencies (key depends on values)
        self.dependencies = {
            ServiceType.BACKEND: [],  # No dependencies
            ServiceType.FRONTEND: [ServiceType.BACKEND],  # Depends on backend
            ServiceType.WEB_PORTAL: []  # Independent
        }
        
        # Track deployment phases
        self.phases: Dict[str, List[DeploymentPhase]] = {}
    
    async def plan_deployment_sequence(
        self, 
        deployment_id: str,
        services: List[ServiceType]
    ) -> List[List[ServiceType]]:
        """
        Plan deployment sequence based on service dependencies.
        
        Args:
            deployment_id: Unique identifier for the deployment
            services: List of services to deploy
            
        Returns:
            List of deployment phases, each containing services for parallel deployment
        """
        logger.info(f"Planning deployment sequence for {deployment_id}: {services}")
        
        sequence = []
        remaining_services = set(services)
        deployed_services = set()
        
        while remaining_services:
            # Find services ready for deployment (all dependencies met)
            ready_services = []
            for service in remaining_services:
                service_deps = self.dependencies.get(service, [])
                if all(dep in deployed_services for dep in service_deps):
                    ready_services.append(service)
            
            if not ready_services:
                raise ValueError(
                    f"Circular dependency detected in services: {remaining_services}"
                )
            
            # Create deployment phase
            phase = DeploymentPhase(
                services=ready_services,
                status=PhaseStatus.PENDING
            )
            
            sequence.append(ready_services)
            
            # Update tracking
            for service in ready_services:
                remaining_services.remove(service)
                deployed_services.add(service)
        
        # Store phases for tracking
        self.phases[deployment_id] = [
            DeploymentPhase(services=phase_services, status=PhaseStatus.PENDING)
            for phase_services in sequence
        ]
        
        logger.info(f"Deployment sequence planned: {len(sequence)} phases")
        return sequence
    
    async def execute_deployment_phase(
        self,
        deployment_id: str,
        phase_index: int,
        deployment_executor,
        config
    ) -> bool:
        """
        Execute a specific deployment phase with parallel service deployment.
        
        Args:
            deployment_id: Unique identifier for the deployment
            phase_index: Index of the phase to execute
            deployment_executor: Function to execute individual service deployment
            config: Deployment configuration
            
        Returns:
            True if phase completed successfully, False otherwise
        """
        if deployment_id not in self.phases:
            raise ValueError(f"No phases found for deployment {deployment_id}")
        
        phases = self.phases[deployment_id]
        if phase_index >= len(phases):
            raise ValueError(f"Phase index {phase_index} out of range")
        
        phase = phases[phase_index]
        phase.status = PhaseStatus.RUNNING
        phase.started_at = datetime.now(timezone.utc)
        
        logger.info(f"Executing phase {phase_index} for {deployment_id}: {phase.services}")
        
        try:
            # Deploy services in parallel within the phase
            tasks = []
            for service in phase.services:
                task = asyncio.create_task(
                    deployment_executor(deployment_id, service, config)
                )
                tasks.append(task)
            
            # Wait for all services in this phase to complete
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Check for failures
            failed_services = []
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    service = phase.services[i]
                    failed_services.append((service, result))
            
            if failed_services:
                phase.status = PhaseStatus.FAILED
                error_details = "; ".join([
                    f"{service.value}: {error}" 
                    for service, error in failed_services
                ])
                raise RuntimeError(f"Phase {phase_index} failed: {error_details}")
            
            # Phase completed successfully
            phase.status = PhaseStatus.COMPLETED
            phase.completed_at = datetime.now(timezone.utc)
            
            logger.info(f"Phase {phase_index} completed successfully")
            return True
            
        except Exception as e:
            phase.status = PhaseStatus.FAILED
            phase.completed_at = datetime.now(timezone.utc)
            logger.error(f"Phase {phase_index} failed: {e}")
            raise
    
    async def validate_phase_dependencies(
        self,
        deployment_id: str,
        phase_index: int,
        deployed_services: Set[ServiceType]
    ) -> bool:
        """
        Validate that all dependencies are met for a deployment phase.
        
        Args:
            deployment_id: Unique identifier for the deployment
            phase_index: Index of the phase to validate
            deployed_services: Set of already deployed services
            
        Returns:
            True if all dependencies are met, False otherwise
        """
        if deployment_id not in self.phases:
            return False
        
        phases = self.phases[deployment_id]
        if phase_index >= len(phases):
            return False
        
        phase = phases[phase_index]
        
        # Check dependencies for all services in this phase
        for service in phase.services:
            service_deps = self.dependencies.get(service, [])
            if not all(dep in deployed_services for dep in service_deps):
                logger.warning(
                    f"Dependencies not met for {service.value}: "
                    f"requires {service_deps}, have {deployed_services}"
                )
                return False
        
        phase.dependencies_met = True
        return True
    
    def get_phase_status(self, deployment_id: str) -> Optional[List[Dict]]:
        """
        Get status of all phases for a deployment.
        
        Args:
            deployment_id: Unique identifier for the deployment
            
        Returns:
            List of phase status dictionaries or None if not found
        """
        if deployment_id not in self.phases:
            return None
        
        return [
            {
                "phase_index": i,
                "services": [service.value for service in phase.services],
                "status": phase.status.value,
                "started_at": phase.started_at,
                "completed_at": phase.completed_at,
                "dependencies_met": phase.dependencies_met
            }
            for i, phase in enumerate(self.phases[deployment_id])
        ]
    
    def cleanup_deployment(self, deployment_id: str):
        """
        Clean up tracking data for a completed deployment.
        
        Args:
            deployment_id: Unique identifier for the deployment
        """
        if deployment_id in self.phases:
            del self.phases[deployment_id]
            logger.info(f"Cleaned up phases for deployment {deployment_id}")