#!/usr/bin/env python3
"""
Health Aggregator for Olorin Platform.

Integrates with existing backend health endpoints, monitors frontend health,
and provides cross-service health correlation for deployment validation.
"""

import asyncio
import aiohttp
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class ServiceType(Enum):
    """Supported service types for health monitoring."""
    BACKEND = "backend"
    FRONTEND = "frontend"
    WEB_PORTAL = "web_portal"


class HealthStatus(Enum):
    """Health status states."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


@dataclass
class ServiceHealth:
    """Represents health status of a service."""
    service: str
    status: HealthStatus
    timestamp: datetime
    details: Dict[str, Any]
    response_time_ms: Optional[float] = None
    error: Optional[str] = None


@dataclass
class SystemHealth:
    """Aggregated system health status."""
    overall_status: HealthStatus
    timestamp: datetime
    services: Dict[str, ServiceHealth]
    dependencies_healthy: bool
    critical_issues: List[str]


class HealthAggregator:
    """
    Aggregates health information across all Olorin services.
    
    Integrates with existing backend health endpoints and monitors
    frontend health to provide comprehensive deployment validation.
    """
    
    def __init__(self):
        # Health endpoints configuration
        self.health_endpoints = {
            ServiceType.BACKEND: {
                "basic": "http://localhost:8090/health",
                "detailed": "http://localhost:8090/health/detailed",
                "liveness": "http://localhost:8090/health/live",
                "readiness": "http://localhost:8090/health/ready"
            },
            ServiceType.FRONTEND: {
                "basic": "http://localhost:3000",
                "health": "http://localhost:3000/health"
            }
        }
        
        # Production endpoints (updated during deployment)
        self.production_endpoints = {
            ServiceType.BACKEND: {
                "detailed": "https://olorin-backend-us-central1.run.app/health/detailed",
                "readiness": "https://olorin-backend-us-central1.run.app/health/ready"
            },
            ServiceType.FRONTEND: {
                "basic": "https://olorin-ai.web.app",
                "health": "https://olorin-ai.web.app/health"
            }
        }
        
        # Health status cache
        self.health_cache: Dict[str, ServiceHealth] = {}
        self.cache_ttl_seconds = 30
    
    async def check_service_health(
        self, 
        service: ServiceType, 
        endpoint_type: str = "detailed",
        environment: str = "local"
    ) -> ServiceHealth:
        """
        Check health of a specific service.
        
        Args:
            service: Service type to check
            endpoint_type: Type of health endpoint (basic, detailed, etc.)
            environment: Environment (local, production)
            
        Returns:
            ServiceHealth object with status and details
        """
        start_time = datetime.now()
        
        try:
            # Select appropriate endpoint
            endpoints = (
                self.production_endpoints if environment == "production" 
                else self.health_endpoints
            )
            
            if service not in endpoints:
                return ServiceHealth(
                    service=service.value,
                    status=HealthStatus.UNKNOWN,
                    timestamp=start_time,
                    details={},
                    error=f"No endpoints configured for {service.value}"
                )
            
            service_endpoints = endpoints[service]
            if endpoint_type not in service_endpoints:
                endpoint_type = "basic"  # Fallback to basic
            
            endpoint = service_endpoints[endpoint_type]
            
            # Perform health check
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
                async with session.get(endpoint) as response:
                    response_time = (datetime.now() - start_time).total_seconds() * 1000
                    
                    if response.status == 200:
                        try:
                            health_data = await response.json()
                            status = self._determine_health_status(health_data)
                        except Exception:
                            # If JSON parsing fails, assume healthy if 200 OK
                            health_data = {"status": "ok", "timestamp": start_time.isoformat()}
                            status = HealthStatus.HEALTHY
                    else:
                        health_data = {
                            "status": "error",
                            "http_status": response.status,
                            "timestamp": start_time.isoformat()
                        }
                        status = HealthStatus.UNHEALTHY
                    
                    service_health = ServiceHealth(
                        service=service.value,
                        status=status,
                        timestamp=start_time,
                        details=health_data,
                        response_time_ms=response_time
                    )
                    
                    # Cache the result
                    cache_key = f"{service.value}_{environment}_{endpoint_type}"
                    self.health_cache[cache_key] = service_health
                    
                    logger.info(
                        f"Health check for {service.value}: {status.value} "
                        f"({response_time:.1f}ms)"
                    )
                    return service_health
        
        except asyncio.TimeoutError:
            error_msg = f"Health check timeout for {service.value}"
            logger.warning(error_msg)
            return ServiceHealth(
                service=service.value,
                status=HealthStatus.UNHEALTHY,
                timestamp=start_time,
                details={},
                error=error_msg
            )
        
        except Exception as e:
            error_msg = f"Health check error for {service.value}: {e}"
            logger.error(error_msg)
            return ServiceHealth(
                service=service.value,
                status=HealthStatus.UNHEALTHY,
                timestamp=start_time,
                details={},
                error=error_msg
            )
    
    async def check_system_health(
        self, 
        services: List[ServiceType],
        environment: str = "local"
    ) -> SystemHealth:
        """
        Check health of all specified services and provide system overview.
        
        Args:
            services: List of services to check
            environment: Environment (local, production)
            
        Returns:
            SystemHealth object with aggregated status
        """
        timestamp = datetime.now(timezone.utc)
        service_health_results = {}
        critical_issues = []
        
        # Check all services in parallel
        health_tasks = [
            self.check_service_health(service, "detailed", environment)
            for service in services
        ]
        
        health_results = await asyncio.gather(*health_tasks, return_exceptions=True)
        
        # Process results
        healthy_count = 0
        total_services = len(services)
        
        for i, result in enumerate(health_results):
            service = services[i]
            
            if isinstance(result, Exception):
                # Handle exceptions
                service_health = ServiceHealth(
                    service=service.value,
                    status=HealthStatus.UNHEALTHY,
                    timestamp=timestamp,
                    details={},
                    error=str(result)
                )
                critical_issues.append(f"{service.value}: {result}")
            else:
                service_health = result
                if service_health.status == HealthStatus.HEALTHY:
                    healthy_count += 1
                elif service_health.status == HealthStatus.UNHEALTHY:
                    critical_issues.append(
                        f"{service.value}: {service_health.error or 'Unhealthy'}"
                    )
            
            service_health_results[service.value] = service_health
        
        # Determine overall system health
        if healthy_count == total_services:
            overall_status = HealthStatus.HEALTHY
        elif healthy_count > 0:
            overall_status = HealthStatus.DEGRADED
        else:
            overall_status = HealthStatus.UNHEALTHY
        
        # Check service dependencies
        dependencies_healthy = await self._check_service_dependencies(
            service_health_results, environment
        )
        
        system_health = SystemHealth(
            overall_status=overall_status,
            timestamp=timestamp,
            services=service_health_results,
            dependencies_healthy=dependencies_healthy,
            critical_issues=critical_issues
        )
        
        logger.info(
            f"System health check completed: {overall_status.value} "
            f"({healthy_count}/{total_services} services healthy)"
        )
        
        return system_health
    
    async def wait_for_service_health(
        self,
        service: ServiceType,
        environment: str = "local",
        timeout_seconds: int = 300,
        check_interval: int = 10
    ) -> bool:
        """
        Wait for a service to become healthy with timeout.
        
        Args:
            service: Service to wait for
            environment: Environment (local, production)
            timeout_seconds: Maximum time to wait
            check_interval: Seconds between health checks
            
        Returns:
            True if service becomes healthy, False if timeout
        """
        start_time = datetime.now()
        timeout_delta = datetime.now() + datetime.timedelta(seconds=timeout_seconds)
        
        logger.info(f"Waiting for {service.value} to become healthy (timeout: {timeout_seconds}s)")
        
        while datetime.now() < timeout_delta:
            health = await self.check_service_health(service, "readiness", environment)
            
            if health.status == HealthStatus.HEALTHY:
                elapsed = (datetime.now() - start_time).total_seconds()
                logger.info(f"{service.value} is healthy after {elapsed:.1f}s")
                return True
            
            logger.info(f"{service.value} not ready: {health.status.value}")
            await asyncio.sleep(check_interval)
        
        logger.warning(f"Timeout waiting for {service.value} to become healthy")
        return False
    
    def _determine_health_status(self, health_data: Dict[str, Any]) -> HealthStatus:
        """
        Determine health status from health endpoint response.
        
        Args:
            health_data: Health endpoint response data
            
        Returns:
            Determined health status
        """
        # Check status field
        status = health_data.get("status", "").lower()
        if status in ["healthy", "ok", "up"]:
            return HealthStatus.HEALTHY
        elif status in ["degraded", "warning"]:
            return HealthStatus.DEGRADED
        elif status in ["unhealthy", "down", "error"]:
            return HealthStatus.UNHEALTHY
        
        # Check dependencies if available
        dependencies = health_data.get("dependencies", {})
        if dependencies:
            if all(dep for dep in dependencies.values() if isinstance(dep, bool)):
                return HealthStatus.HEALTHY
            elif any(dep for dep in dependencies.values() if isinstance(dep, bool)):
                return HealthStatus.DEGRADED
            else:
                return HealthStatus.UNHEALTHY
        
        # Default based on presence of error
        if health_data.get("error"):
            return HealthStatus.UNHEALTHY
        
        return HealthStatus.HEALTHY  # Default if status unclear
    
    async def _check_service_dependencies(
        self,
        service_health_results: Dict[str, ServiceHealth],
        environment: str
    ) -> bool:
        """
        Check if service dependencies are healthy.
        
        Args:
            service_health_results: Current service health results
            environment: Environment being checked
            
        Returns:
            True if all critical dependencies are healthy
        """
        # For Olorin, frontend depends on backend
        if "backend" in service_health_results and "frontend" in service_health_results:
            backend_health = service_health_results["backend"]
            if backend_health.status != HealthStatus.HEALTHY:
                logger.warning("Backend dependency not healthy for frontend")
                return False
        
        return True