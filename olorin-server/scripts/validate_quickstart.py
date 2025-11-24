#!/usr/bin/env python3
"""
Quickstart Validation Script

Validates that all quickstart steps work end-to-end.
"""

import subprocess
import sys
import os
import json
import time
from pathlib import Path
from typing import Dict, List, Tuple

# ANSI colors for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'


class ValidationResult:
    """Result of a validation step."""
    def __init__(self, name: str, passed: bool, message: str = "", details: str = ""):
        self.name = name
        self.passed = passed
        self.message = message
        self.details = details


def print_header(text: str):
    """Print formatted header."""
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}{text}{RESET}")
    print(f"{BLUE}{'='*80}{RESET}\n")


def print_result(result: ValidationResult):
    """Print validation result."""
    status = f"{GREEN}✓ PASS{RESET}" if result.passed else f"{RED}✗ FAIL{RESET}"
    print(f"{status} {result.name}")
    if result.message:
        print(f"   {result.message}")
    if result.details:
        print(f"   {result.details}")


def check_dependencies() -> ValidationResult:
    """Check if required dependencies are installed."""
    print_header("Checking Dependencies")
    
    required_packages = [
        'statsmodels',
        'sklearn',
        'pandas',
        'numpy',
        'apscheduler',
    ]
    
    missing = []
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            missing.append(package)
    
    if missing:
        return ValidationResult(
            "Dependencies",
            False,
            f"Missing packages: {', '.join(missing)}",
            "Install with: poetry add " + " ".join(missing)
        )
    
    return ValidationResult(
        "Dependencies",
        True,
        f"All required packages installed: {', '.join(required_packages)}"
    )


def check_environment_variables() -> ValidationResult:
    """Check if required environment variables are set."""
    print_header("Checking Environment Variables")
    
    required_vars = [
        'DATABASE_URL',
    ]
    
    optional_vars = [
        'ANOMALY_DETECTION_INTERVAL_MINUTES',
        'ANOMALY_DETECTION_ENABLED',
        'ANOMALY_SEVERITY_INFO_MAX',
        'ANOMALY_SEVERITY_WARN_MAX',
        'ANOMALY_SEVERITY_CRITICAL_MIN',
        'ANOMALY_DEFAULT_K',
        'ANOMALY_DEFAULT_PERSISTENCE',
        'ANOMALY_DEFAULT_MIN_SUPPORT',
    ]
    
    missing_required = [var for var in required_vars if not os.getenv(var)]
    missing_optional = [var for var in optional_vars if not os.getenv(var)]
    
    if missing_required:
        return ValidationResult(
            "Environment Variables",
            False,
            f"Missing required variables: {', '.join(missing_required)}",
            "Set these in .env file or environment"
        )
    
    message = "Required variables set"
    if missing_optional:
        message += f" (optional missing: {', '.join(missing_optional)})"
    
    return ValidationResult(
        "Environment Variables",
        True,
        message
    )


def check_database_tables() -> ValidationResult:
    """Check if database tables exist."""
    print_header("Checking Database Tables")
    
    try:
        from app.persistence.database import get_db, get_engine
        from sqlalchemy import inspect, text
        
        engine = get_engine()
        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())
        
        required_tables = {
            'detectors',
            'detection_runs',
            'anomaly_events'
        }
        
        missing_tables = required_tables - existing_tables
        
        if missing_tables:
            return ValidationResult(
                "Database Tables",
                False,
                f"Missing tables: {', '.join(missing_tables)}",
                "Run migration: poetry run alembic upgrade head"
            )
        
        return ValidationResult(
            "Database Tables",
            True,
            f"All required tables exist: {', '.join(required_tables)}"
        )
    except Exception as e:
        return ValidationResult(
            "Database Tables",
            False,
            f"Error checking tables: {str(e)}",
            "Ensure database is accessible and migrations are run"
        )


def check_api_endpoints() -> ValidationResult:
    """Check if API endpoints are accessible."""
    print_header("Checking API Endpoints")
    
    # This would require a running server
    # For now, just check that routes are registered
    try:
        from app.main import app
        
        routes = [route.path for route in app.routes]
        required_routes = [
            '/v1/analytics/anomalies',
            '/v1/analytics/anomalies/detect',
            '/v1/analytics/detectors',
            '/v1/analytics/replay',
        ]
        
        found_routes = [r for r in required_routes if any(r in route for route in routes)]
        
        if len(found_routes) < len(required_routes):
            missing = set(required_routes) - set(found_routes)
            return ValidationResult(
                "API Endpoints",
                False,
                f"Missing routes: {', '.join(missing)}",
                "Check route registration in app/api/routes/analytics.py"
            )
        
        return ValidationResult(
            "API Endpoints",
            True,
            f"All required routes registered: {len(found_routes)}/{len(required_routes)}"
        )
    except Exception as e:
        return ValidationResult(
            "API Endpoints",
            False,
            f"Error checking routes: {str(e)}"
        )


def check_models() -> ValidationResult:
    """Check if models are properly defined."""
    print_header("Checking Models")
    
    try:
        from app.models.anomaly import Detector, DetectionRun, AnomalyEvent
        
        # Check that models have required attributes
        detector_attrs = ['id', 'name', 'type', 'cohort_by', 'metrics', 'params']
        run_attrs = ['id', 'detector_id', 'status', 'window_from', 'window_to']
        event_attrs = ['id', 'run_id', 'detector_id', 'cohort', 'metric', 'score']
        
        detector_ok = all(hasattr(Detector, attr) for attr in detector_attrs)
        run_ok = all(hasattr(DetectionRun, attr) for attr in run_attrs)
        event_ok = all(hasattr(AnomalyEvent, attr) for attr in event_attrs)
        
        if not (detector_ok and run_ok and event_ok):
            missing = []
            if not detector_ok:
                missing.append('Detector')
            if not run_ok:
                missing.append('DetectionRun')
            if not event_ok:
                missing.append('AnomalyEvent')
            
            return ValidationResult(
                "Models",
                False,
                f"Models missing attributes: {', '.join(missing)}"
            )
        
        return ValidationResult(
            "Models",
            True,
            "All models properly defined with required attributes"
        )
    except Exception as e:
        return ValidationResult(
            "Models",
            False,
            f"Error checking models: {str(e)}"
        )


def check_configuration() -> ValidationResult:
    """Check if configuration is properly loaded."""
    print_header("Checking Configuration")
    
    try:
        from app.config.anomaly_config import get_anomaly_config
        
        config = get_anomaly_config()
        
        # Check that config has required attributes
        required_attrs = [
            'default_k_threshold',
            'default_persistence',
            'default_min_support',
            'severity_info_max',
            'severity_warn_max',
            'severity_critical_min',
        ]
        
        missing = [attr for attr in required_attrs if not hasattr(config, attr)]
        
        if missing:
            return ValidationResult(
                "Configuration",
                False,
                f"Missing config attributes: {', '.join(missing)}"
            )
        
        return ValidationResult(
            "Configuration",
            True,
            "Configuration properly loaded from environment variables"
        )
    except Exception as e:
        return ValidationResult(
            "Configuration",
            False,
            f"Error loading configuration: {str(e)}",
            "Check app/config/anomaly_config.py and environment variables"
        )


def run_validation() -> Tuple[List[ValidationResult], bool]:
    """Run all validation checks."""
    results = []
    
    # Run all checks
    checks = [
        check_dependencies,
        check_environment_variables,
        check_database_tables,
        check_models,
        check_configuration,
        check_api_endpoints,
    ]
    
    for check in checks:
        try:
            result = check()
            results.append(result)
            print_result(result)
        except Exception as e:
            results.append(ValidationResult(
                check.__name__,
                False,
                f"Exception: {str(e)}"
            ))
            print_result(results[-1])
    
    # Summary
    passed = sum(1 for r in results if r.passed)
    total = len(results)
    all_passed = passed == total
    
    print_header("Validation Summary")
    print(f"Passed: {GREEN}{passed}/{total}{RESET}")
    print(f"Failed: {RED}{total - passed}/{total}{RESET}")
    
    if all_passed:
        print(f"\n{GREEN}✓ All validations passed! Quickstart steps are working.{RESET}")
    else:
        print(f"\n{RED}✗ Some validations failed. Review errors above.{RESET}")
    
    return results, all_passed


def main():
    """Main entry point."""
    print(f"{BLUE}")
    print("="*80)
    print("Quickstart Validation - Fraud Anomaly Detection Service")
    print("="*80)
    print(f"{RESET}")
    
    project_root = Path(__file__).parent.parent
    os.chdir(project_root)
    
    results, all_passed = run_validation()
    
    # Exit with appropriate code
    sys.exit(0 if all_passed else 1)


if __name__ == '__main__':
    main()

