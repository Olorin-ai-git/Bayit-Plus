"""
FastAPI router for smoke test endpoints.
Provides REST API access to smoke test functionality.
"""

import asyncio
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.service.logging import get_bridge_logger
from app.service.smoke_tests.smoke_test_runner import SmokeTestRunner

logger = get_bridge_logger(__name__)

router = APIRouter(prefix="/smoke-tests", tags=["smoke-tests"])

# Global runner instance for caching reports
smoke_test_runner = SmokeTestRunner()


class SmokeTestRequest(BaseModel):
    """Request model for smoke tests."""

    services: Optional[List[str]] = Field(
        None,
        description="Specific services to test (leave empty for all)",
        example=["snowflake", "abuseipdb", "virustotal"],
    )
    parallel: bool = Field(
        True, description="Run tests in parallel for faster execution"
    )
    timeout_seconds: int = Field(
        300, description="Overall timeout in seconds", ge=30, le=600
    )


class HealthCheckResponse(BaseModel):
    """Response model for health check."""

    status: str = Field(..., description="Overall health status", example="healthy")
    message: str = Field(..., description="Health status message")
    timestamp: str = Field(..., description="Check timestamp")
    healthy_services: List[str] = Field(..., description="List of healthy services")
    critical_failures: List[dict] = Field(..., description="List of critical failures")
    should_block_investigations: bool = Field(
        ..., description="Whether investigations should be blocked"
    )


@router.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """
    Quick health check of critical services only.

    Returns a fast assessment of whether investigations can proceed.
    Only tests services marked as critical (Snowflake, Splunk).
    """
    try:
        logger.info("API health check requested")
        health_status = await smoke_test_runner.run_quick_health_check()

        return HealthCheckResponse(**health_status)

    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=408,
            detail="Health check timed out - services may be slow to respond",
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")


@router.post("/run")
async def run_smoke_tests(request: SmokeTestRequest, background_tasks: BackgroundTasks):
    """
    Run comprehensive smoke tests for external API services.

    This endpoint runs full smoke tests for the specified services (or all services
    if none specified). Tests include connectivity, authentication, and basic
    functionality verification.

    - **services**: List of services to test (snowflake, abuseipdb, virustotal, shodan, splunk)
    - **parallel**: Whether to run tests in parallel for faster execution
    - **timeout_seconds**: Maximum time to wait for all tests to complete
    """
    try:
        logger.info(f"Smoke tests requested for services: {request.services or 'all'}")

        # Validate services if specified
        if request.services:
            valid_services = {
                "snowflake",
                "abuseipdb",
                "virustotal",
                "shodan",
                "splunk",
            }
            invalid_services = set(request.services) - valid_services
            if invalid_services:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid services specified: {list(invalid_services)}. "
                    f"Valid services: {list(valid_services)}",
                )

        # Run smoke tests with timeout
        report = await asyncio.wait_for(
            smoke_test_runner.run_all_smoke_tests(
                services=request.services, parallel=request.parallel
            ),
            timeout=request.timeout_seconds,
        )

        # Return comprehensive report
        return JSONResponse(
            content=report.to_dict(),
            status_code=(
                200 if not report.has_critical_failures else 206
            ),  # 206 = Partial Content for warnings
        )

    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=408,
            detail=f"Smoke tests timed out after {request.timeout_seconds} seconds",
        )
    except Exception as e:
        logger.error(f"Smoke tests failed: {e}")
        raise HTTPException(status_code=500, detail=f"Smoke tests failed: {str(e)}")


@router.get("/status")
async def get_test_status():
    """
    Get the status of the last smoke test run.

    Returns the cached results from the most recent smoke test execution.
    If no tests have been run, returns a message indicating this.
    """
    try:
        last_report = smoke_test_runner.get_last_report()

        if not last_report:
            return JSONResponse(
                content={
                    "message": "No smoke tests have been run yet",
                    "timestamp": datetime.utcnow().isoformat(),
                },
                status_code=204,  # No Content
            )

        return JSONResponse(
            content=last_report.to_dict(),
            status_code=200 if not last_report.has_critical_failures else 206,
        )

    except Exception as e:
        logger.error(f"Failed to get test status: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get test status: {str(e)}"
        )


@router.get("/services")
async def list_services():
    """
    List all available services and their configuration status.

    Returns information about which services are enabled/disabled
    and their importance level for investigations.
    """
    try:
        runner = SmokeTestRunner()
        service_configs = runner.service_configs

        services = []
        for service_name, config in service_configs.items():
            services.append(
                {
                    "name": service_name,
                    "display_name": service_name.title(),
                    "enabled": config["enabled"],
                    "severity": config["severity"].value,
                    "description": config["description"],
                }
            )

        return {
            "services": services,
            "total_services": len(services),
            "enabled_services": len([s for s in services if s["enabled"]]),
            "critical_services": len(
                [s for s in services if s["severity"] == "critical" and s["enabled"]]
            ),
        }

    except Exception as e:
        logger.error(f"Failed to list services: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to list services: {str(e)}"
        )


@router.post("/validate-configuration")
async def validate_configuration():
    """
    Validate the configuration of all external services.

    This endpoint checks that required API keys and configuration values
    are present without actually testing the services. Useful for
    configuration validation during deployment.
    """
    try:
        import os

        from app.service.config_loader import get_config_loader

        config_loader = get_config_loader()
        validation_results = []

        # Check Snowflake configuration
        if os.getenv("USE_SNOWFLAKE", "false").lower() == "true":
            snowflake_config = config_loader.load_snowflake_config()
            missing_snowflake = []
            for key, value in snowflake_config.items():
                if key in ["account", "user", "password", "database"] and not value:
                    missing_snowflake.append(f"SNOWFLAKE_{key.upper()}")

            validation_results.append(
                {
                    "service": "snowflake",
                    "enabled": True,
                    "valid": len(missing_snowflake) == 0,
                    "missing_config": missing_snowflake,
                    "message": (
                        "Snowflake configuration valid"
                        if not missing_snowflake
                        else f"Missing: {', '.join(missing_snowflake)}"
                    ),
                }
            )

        # Check threat intelligence API keys
        api_services = [
            (
                "abuseipdb",
                "ABUSEIPDB_API_KEY",
                ["USE_ABUSEIPDB_IP_REPUTATION", "USE_ABUSEIPDB_BULK_ANALYSIS"],
            ),
            (
                "virustotal",
                "VIRUSTOTAL_API_KEY",
                ["USE_VIRUSTOTAL_IP_ANALYSIS", "USE_VIRUSTOTAL_DOMAIN_ANALYSIS"],
            ),
            (
                "shodan",
                "SHODAN_API_KEY",
                ["USE_SHODAN_INFRASTRUCTURE", "USE_SHODAN_SEARCH"],
            ),
        ]

        for service_name, api_key_var, enable_vars in api_services:
            enabled = any(
                os.getenv(var, "false").lower() == "true" for var in enable_vars
            )

            if enabled:
                api_key = os.getenv(api_key_var)
                validation_results.append(
                    {
                        "service": service_name,
                        "enabled": True,
                        "valid": bool(
                            api_key and len(api_key) > 10
                        ),  # Basic length check
                        "missing_config": [] if api_key else [api_key_var],
                        "message": (
                            f"{service_name.title()} API key configured"
                            if api_key
                            else f"Missing {api_key_var}"
                        ),
                    }
                )

        # Check Splunk configuration
        if os.getenv("USE_SPLUNK", "false").lower() == "true":
            splunk_host = os.getenv("SPLUNK_HOST")
            splunk_password = config_loader.load_secret("SPLUNK_PASSWORD")
            missing_splunk = []

            if not splunk_host:
                missing_splunk.append("SPLUNK_HOST")
            if not splunk_password:
                missing_splunk.append("SPLUNK_PASSWORD")

            validation_results.append(
                {
                    "service": "splunk",
                    "enabled": True,
                    "valid": len(missing_splunk) == 0,
                    "missing_config": missing_splunk,
                    "message": (
                        "Splunk configuration valid"
                        if not missing_splunk
                        else f"Missing: {', '.join(missing_splunk)}"
                    ),
                }
            )

        # Calculate summary
        total_services = len(validation_results)
        valid_services = len([r for r in validation_results if r["valid"]])
        invalid_services = total_services - valid_services

        overall_valid = invalid_services == 0

        return {
            "overall_valid": overall_valid,
            "message": f"Configuration validation: {valid_services}/{total_services} services valid",
            "timestamp": datetime.utcnow().isoformat(),
            "summary": {
                "total_services": total_services,
                "valid_services": valid_services,
                "invalid_services": invalid_services,
            },
            "services": validation_results,
        }

    except Exception as e:
        logger.error(f"Configuration validation failed: {e}")
        raise HTTPException(
            status_code=500, detail=f"Configuration validation failed: {str(e)}"
        )
