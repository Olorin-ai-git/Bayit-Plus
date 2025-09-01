#!/usr/bin/env python3
"""
Validate Firebase Secrets Manager Integration
Comprehensive validation script for Firebase Secrets Manager integration
in the Olorin AI project.

This script validates:
1. Firebase connectivity and authentication
2. Secret accessibility and integrity
3. Application configuration compliance
4. Performance and latency metrics
5. Fallback mechanisms and error handling

Usage:
    python validate-secrets.py --all
    python validate-secrets.py --secret DATABASE_PASSWORD
    python validate-secrets.py --config-validation
    python validate-secrets.py --performance-test
    python validate-secrets.py --integration-test
    python validate-secrets.py --fallback-test

Examples:
    python validate-secrets.py --all --verbose
    python validate-secrets.py --secret ANTHROPIC_API_KEY
    python validate-secrets.py --performance-test --iterations 100
    python validate-secrets.py --integration-test --env local
"""

import argparse
import json
import os
import sys
import logging
import time
import statistics
from typing import Dict, List, Optional, Tuple, Any
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

# Add firebase-secrets-manager to path
sys.path.append(os.path.dirname(__file__))
sys.path.append(os.path.join(os.path.dirname(__file__), '../../olorin-server'))

from firebase_secrets_manager import FirebaseSecretsManager

try:
    from app.utils.firebase_secrets import get_firebase_secret, clear_secrets_cache, get_app_secret
    from app.service.config import get_settings_for_env
    HAS_OLORIN_CONFIG = True
except ImportError as e:
    logging.warning(f"Olorin configuration not available: {e}")
    HAS_OLORIN_CONFIG = False

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Required secrets for the Olorin AI application
REQUIRED_SECRETS = [
    # Core application secrets
    "APP_SECRET",
    
    # AI/ML API keys
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
    
    # Database and infrastructure
    "DATABASE_PASSWORD",
    "REDIS_PASSWORD",
    "JWT_SECRET_KEY",
    
    # Log analysis services
    "SPLUNK_USERNAME",
    "SPLUNK_PASSWORD",
    "SUMO_LOGIC_ACCESS_ID",
    "SUMO_LOGIC_ACCESS_KEY",
    
    # Data sources
    "SNOWFLAKE_ACCOUNT",
    "SNOWFLAKE_USER",
    "SNOWFLAKE_PASSWORD",
    "SNOWFLAKE_PRIVATE_KEY",
    
    # External APIs
    "OLORIN_API_KEY",
    "DATABRICKS_TOKEN",
    
    # Observability and tracing
    "LANGFUSE_PUBLIC_KEY",
    "LANGFUSE_SECRET_KEY",
    
    # Testing and development
    "TEST_USER_PWD",
]

# Performance thresholds
PERFORMANCE_THRESHOLDS = {
    "max_latency_ms": 500,  # Maximum acceptable latency for secret retrieval
    "p95_latency_ms": 200,  # 95th percentile latency threshold
    "success_rate": 99.0,   # Minimum success rate percentage
    "concurrent_requests": 10,  # Number of concurrent requests to test
}

class SecretsValidator:
    """Comprehensive Firebase Secrets validation utility"""
    
    def __init__(self, project_id: Optional[str] = None, verbose: bool = False):
        """Initialize the validator
        
        Args:
            project_id: Firebase project ID
            verbose: Enable verbose logging
        """
        self.project_id = project_id or os.getenv('FIREBASE_PROJECT_ID', 'olorin-ai')
        self.verbose = verbose
        self.secrets_manager = FirebaseSecretsManager(project_id)
        self.validation_results = {}
        
        if verbose:
            logging.getLogger().setLevel(logging.DEBUG)
        
        logger.info(f"Initialized SecretsValidator for project: {self.project_id}")
    
    def validate_single_secret(self, secret_name: str) -> Dict[str, Any]:
        """Validate a single secret
        
        Args:
            secret_name: Name of the secret to validate
            
        Returns:
            Validation result dictionary
        """
        result = {
            "secret_name": secret_name,
            "accessible": False,
            "non_empty": False,
            "latency_ms": None,
            "error": None,
            "timestamp": time.time()
        }
        
        try:
            start_time = time.time()
            secret_value = self.secrets_manager.get_secret(secret_name)
            end_time = time.time()
            
            result["latency_ms"] = (end_time - start_time) * 1000
            
            if secret_value is not None:
                result["accessible"] = True
                
                if len(secret_value.strip()) > 0:
                    result["non_empty"] = True
                    result["length"] = len(secret_value)
                    logger.info(f"✓ {secret_name}: accessible, non-empty ({len(secret_value)} chars)")
                else:
                    logger.warning(f"⚠ {secret_name}: accessible but empty")
            else:
                logger.error(f"✗ {secret_name}: not accessible")
                
        except Exception as e:
            result["error"] = str(e)
            logger.error(f"✗ {secret_name}: validation error - {e}")
        
        return result
    
    def validate_all_secrets(self, required_secrets: Optional[List[str]] = None) -> Dict[str, Any]:
        """Validate all required secrets
        
        Args:
            required_secrets: List of required secret names
            
        Returns:
            Comprehensive validation results
        """
        if required_secrets is None:
            required_secrets = REQUIRED_SECRETS
        
        logger.info(f"Validating {len(required_secrets)} required secrets...")
        
        results = {
            "validation_timestamp": time.time(),
            "project_id": self.project_id,
            "total_secrets": len(required_secrets),
            "successful_validations": 0,
            "failed_validations": 0,
            "validation_details": [],
            "summary": {},
            "performance_metrics": {
                "total_latency_ms": 0,
                "average_latency_ms": 0,
                "max_latency_ms": 0,
                "min_latency_ms": float('inf')
            }
        }
        
        # Validate each secret
        for secret_name in required_secrets:
            validation_result = self.validate_single_secret(secret_name)
            results["validation_details"].append(validation_result)
            
            # Update counters
            if validation_result["accessible"] and validation_result["non_empty"]:
                results["successful_validations"] += 1
            else:
                results["failed_validations"] += 1
            
            # Update performance metrics
            if validation_result["latency_ms"] is not None:
                latency = validation_result["latency_ms"]
                results["performance_metrics"]["total_latency_ms"] += latency
                results["performance_metrics"]["max_latency_ms"] = max(
                    results["performance_metrics"]["max_latency_ms"], latency
                )
                results["performance_metrics"]["min_latency_ms"] = min(
                    results["performance_metrics"]["min_latency_ms"], latency
                )
        
        # Calculate averages
        if results["successful_validations"] > 0:
            results["performance_metrics"]["average_latency_ms"] = (
                results["performance_metrics"]["total_latency_ms"] / 
                len([r for r in results["validation_details"] if r["latency_ms"] is not None])
            )
        
        # Generate summary
        results["summary"] = {
            "success_rate": (results["successful_validations"] / results["total_secrets"]) * 100,
            "all_secrets_valid": results["failed_validations"] == 0,
            "performance_acceptable": results["performance_metrics"]["average_latency_ms"] < PERFORMANCE_THRESHOLDS["max_latency_ms"]
        }
        
        logger.info(f"Validation complete: {results['successful_validations']}/{results['total_secrets']} secrets valid")
        
        return results
    
    def validate_configuration_integration(self) -> Dict[str, Any]:
        """Validate integration with Olorin configuration system
        
        Returns:
            Configuration validation results
        """
        result = {
            "config_integration_available": HAS_OLORIN_CONFIG,
            "secret_retrieval_tests": [],
            "configuration_compliance": {},
            "timestamp": time.time()
        }
        
        if not HAS_OLORIN_CONFIG:
            logger.warning("Olorin configuration not available - skipping config integration tests")
            return result
        
        try:
            # Test configuration system integration
            settings = get_settings_for_env()
            logger.info(f"Testing configuration integration with environment: {getattr(settings, 'app_env', 'unknown')}")
            
            # Test secrets that should be available via configuration
            config_secrets_to_test = [
                ("app_secret", getattr(settings, 'app_secret', None)),
                ("anthropic_api_key_secret", getattr(settings, 'anthropic_api_key_secret', None)),
                ("openai_api_key_secret", getattr(settings, 'openai_api_key_secret', None)),
                ("splunk_username_secret", getattr(settings, 'splunk_username_secret', None)),
                ("splunk_password_secret", getattr(settings, 'splunk_password_secret', None)),
            ]
            
            for config_name, secret_path in config_secrets_to_test:
                if secret_path:
                    test_result = {
                        "config_name": config_name,
                        "secret_path": secret_path,
                        "accessible_via_config": False,
                        "accessible_via_direct": False,
                        "values_match": False
                    }
                    
                    try:
                        # Test via configuration system
                        config_value = get_app_secret(secret_path)
                        if config_value:
                            test_result["accessible_via_config"] = True
                        
                        # Test direct access
                        direct_value = get_firebase_secret(secret_path)
                        if direct_value:
                            test_result["accessible_via_direct"] = True
                        
                        # Compare values
                        if config_value and direct_value and config_value == direct_value:
                            test_result["values_match"] = True
                        
                    except Exception as e:
                        test_result["error"] = str(e)
                    
                    result["secret_retrieval_tests"].append(test_result)
                    
                    status = "✓" if test_result.get("accessible_via_config") and test_result.get("values_match") else "✗"
                    logger.info(f"{status} Config integration test: {config_name}")
            
        except Exception as e:
            result["error"] = str(e)
            logger.error(f"Configuration integration validation failed: {e}")
        
        return result
    
    def performance_test(self, iterations: int = 50, concurrent_requests: int = 5) -> Dict[str, Any]:
        """Perform performance testing of secret retrieval
        
        Args:
            iterations: Number of test iterations
            concurrent_requests: Number of concurrent requests to test
            
        Returns:
            Performance test results
        """
        logger.info(f"Starting performance test: {iterations} iterations, {concurrent_requests} concurrent requests")
        
        test_secrets = REQUIRED_SECRETS[:5]  # Test with first 5 secrets for performance
        results = {
            "test_timestamp": time.time(),
            "iterations": iterations,
            "concurrent_requests": concurrent_requests,
            "test_secrets": test_secrets,
            "latencies": [],
            "success_count": 0,
            "failure_count": 0,
            "performance_metrics": {},
            "threshold_compliance": {}
        }
        
        def single_request_test():
            """Single request test function"""
            secret_name = test_secrets[0]  # Use first secret for consistency
            start_time = time.time()
            
            try:
                secret_value = self.secrets_manager.get_secret(secret_name)
                end_time = time.time()
                latency_ms = (end_time - start_time) * 1000
                
                return {
                    "success": secret_value is not None,
                    "latency_ms": latency_ms
                }
            except Exception as e:
                end_time = time.time()
                return {
                    "success": False,
                    "latency_ms": (end_time - start_time) * 1000,
                    "error": str(e)
                }
        
        # Perform sequential tests
        logger.info("Performing sequential performance tests...")
        for i in range(iterations):
            result = single_request_test()
            results["latencies"].append(result["latency_ms"])
            
            if result["success"]:
                results["success_count"] += 1
            else:
                results["failure_count"] += 1
            
            if (i + 1) % 10 == 0:
                logger.debug(f"Completed {i + 1}/{iterations} iterations")
        
        # Perform concurrent tests
        logger.info(f"Performing concurrent performance tests ({concurrent_requests} concurrent)...")
        concurrent_latencies = []
        
        with ThreadPoolExecutor(max_workers=concurrent_requests) as executor:
            # Submit concurrent requests
            futures = [executor.submit(single_request_test) for _ in range(concurrent_requests)]
            
            for future in as_completed(futures):
                result = future.result()
                concurrent_latencies.append(result["latency_ms"])
        
        # Calculate performance metrics
        all_latencies = results["latencies"]
        
        results["performance_metrics"] = {
            "sequential": {
                "mean_latency_ms": statistics.mean(all_latencies),
                "median_latency_ms": statistics.median(all_latencies),
                "p95_latency_ms": statistics.quantiles(all_latencies, n=20)[18],  # 95th percentile
                "max_latency_ms": max(all_latencies),
                "min_latency_ms": min(all_latencies),
                "std_dev_ms": statistics.stdev(all_latencies) if len(all_latencies) > 1 else 0,
            },
            "concurrent": {
                "mean_latency_ms": statistics.mean(concurrent_latencies),
                "max_latency_ms": max(concurrent_latencies),
                "min_latency_ms": min(concurrent_latencies),
            },
            "success_rate": (results["success_count"] / iterations) * 100,
        }
        
        # Check threshold compliance
        results["threshold_compliance"] = {
            "max_latency_acceptable": results["performance_metrics"]["sequential"]["max_latency_ms"] < PERFORMANCE_THRESHOLDS["max_latency_ms"],
            "p95_latency_acceptable": results["performance_metrics"]["sequential"]["p95_latency_ms"] < PERFORMANCE_THRESHOLDS["p95_latency_ms"],
            "success_rate_acceptable": results["performance_metrics"]["success_rate"] >= PERFORMANCE_THRESHOLDS["success_rate"],
            "concurrent_performance_acceptable": results["performance_metrics"]["concurrent"]["max_latency_ms"] < PERFORMANCE_THRESHOLDS["max_latency_ms"]
        }
        
        # Log results
        seq_metrics = results["performance_metrics"]["sequential"]
        logger.info(f"Performance test results:")
        logger.info(f"  Mean latency: {seq_metrics['mean_latency_ms']:.2f}ms")
        logger.info(f"  P95 latency: {seq_metrics['p95_latency_ms']:.2f}ms")
        logger.info(f"  Max latency: {seq_metrics['max_latency_ms']:.2f}ms")
        logger.info(f"  Success rate: {results['performance_metrics']['success_rate']:.2f}%")
        
        return results
    
    def fallback_test(self) -> Dict[str, Any]:
        """Test fallback mechanisms when Firebase is unavailable
        
        Returns:
            Fallback test results
        """
        logger.info("Testing fallback mechanisms...")
        
        results = {
            "test_timestamp": time.time(),
            "fallback_tests": [],
            "environment_fallback_available": False,
            "cache_behavior": {},
            "error_handling": {}
        }
        
        if not HAS_OLORIN_CONFIG:
            logger.warning("Cannot test fallbacks without Olorin configuration")
            return results
        
        # Test environment variable fallbacks
        test_secrets = ["APP_SECRET", "DATABASE_PASSWORD"]
        
        for secret_name in test_secrets:
            test_result = {
                "secret_name": secret_name,
                "firebase_accessible": False,
                "fallback_available": False,
                "fallback_method": None
            }
            
            try:
                # Test Firebase access
                firebase_value = get_firebase_secret(secret_name)
                if firebase_value:
                    test_result["firebase_accessible"] = True
                
                # Test fallback via environment variable
                env_var_name = secret_name.upper().replace('/', '_')
                env_value = os.getenv(env_var_name)
                
                if env_value:
                    test_result["fallback_available"] = True
                    test_result["fallback_method"] = "environment_variable"
                
                # Test via configuration system fallback
                try:
                    config_value = get_app_secret(secret_name)
                    if config_value and not test_result["firebase_accessible"]:
                        test_result["fallback_available"] = True
                        test_result["fallback_method"] = "configuration_fallback"
                except Exception:
                    pass
                
            except Exception as e:
                test_result["error"] = str(e)
            
            results["fallback_tests"].append(test_result)
            
            status = "✓" if test_result["fallback_available"] else "✗"
            logger.info(f"{status} Fallback test: {secret_name}")
        
        # Test cache clearing behavior
        try:
            logger.info("Testing cache behavior...")
            clear_secrets_cache()
            
            # Time secret retrieval after cache clear
            start_time = time.time()
            test_value = get_firebase_secret("APP_SECRET")
            first_retrieval_time = time.time() - start_time
            
            # Time cached retrieval
            start_time = time.time()
            test_value_cached = get_firebase_secret("APP_SECRET")
            cached_retrieval_time = time.time() - start_time
            
            results["cache_behavior"] = {
                "cache_clear_successful": True,
                "first_retrieval_ms": first_retrieval_time * 1000,
                "cached_retrieval_ms": cached_retrieval_time * 1000,
                "cache_performance_improvement": (first_retrieval_time - cached_retrieval_time) * 1000,
                "values_consistent": test_value == test_value_cached
            }
            
        except Exception as e:
            results["cache_behavior"] = {"error": str(e)}
        
        return results
    
    def integration_test(self, environment: str = "local") -> Dict[str, Any]:
        """Perform integration tests with the application
        
        Args:
            environment: Environment to test (local, qal, e2e, etc.)
            
        Returns:
            Integration test results
        """
        logger.info(f"Performing integration test for environment: {environment}")
        
        results = {
            "test_timestamp": time.time(),
            "environment": environment,
            "configuration_tests": [],
            "service_integration_tests": [],
            "database_connection_test": {},
            "api_client_tests": []
        }
        
        if not HAS_OLORIN_CONFIG:
            logger.warning("Cannot perform integration tests without Olorin configuration")
            return results
        
        try:
            # Set environment for testing
            original_env = os.getenv('APP_ENV')
            os.environ['APP_ENV'] = environment
            
            # Get settings for the environment
            settings = get_settings_for_env()
            logger.info(f"Testing with settings for environment: {environment}")
            
            # Test database connection secrets
            db_test = {
                "database_password_available": False,
                "redis_password_available": False,
                "jwt_secret_available": False
            }
            
            try:
                if hasattr(settings, 'database_password_secret'):
                    db_password = get_app_secret(settings.database_password_secret)
                    db_test["database_password_available"] = bool(db_password)
                
                if hasattr(settings, 'redis_password_secret'):
                    redis_password = get_app_secret(getattr(settings, 'redis_password_secret', 'REDIS_PASSWORD'))
                    db_test["redis_password_available"] = bool(redis_password)
                
                if hasattr(settings, 'jwt_secret_key_secret'):
                    jwt_secret = get_app_secret(getattr(settings, 'jwt_secret_key_secret', 'JWT_SECRET_KEY'))
                    db_test["jwt_secret_available"] = bool(jwt_secret)
                    
            except Exception as e:
                db_test["error"] = str(e)
            
            results["database_connection_test"] = db_test
            
            # Test API client secrets
            api_tests = [
                ("anthropic_api_key", getattr(settings, 'anthropic_api_key_secret', None)),
                ("openai_api_key", getattr(settings, 'openai_api_key_secret', None)),
                ("splunk_credentials", [
                    getattr(settings, 'splunk_username_secret', None),
                    getattr(settings, 'splunk_password_secret', None)
                ]),
            ]
            
            for api_name, secret_paths in api_tests:
                test_result = {
                    "api_name": api_name,
                    "secrets_available": False,
                    "secret_paths": secret_paths if not isinstance(secret_paths, list) else secret_paths
                }
                
                try:
                    if isinstance(secret_paths, list):
                        # Multiple secrets (e.g., username and password)
                        all_available = True
                        for path in secret_paths:
                            if path:
                                value = get_app_secret(path)
                                if not value:
                                    all_available = False
                                    break
                        test_result["secrets_available"] = all_available
                    else:
                        # Single secret
                        if secret_paths:
                            value = get_app_secret(secret_paths)
                            test_result["secrets_available"] = bool(value)
                            
                except Exception as e:
                    test_result["error"] = str(e)
                
                results["api_client_tests"].append(test_result)
                
                status = "✓" if test_result["secrets_available"] else "✗"
                logger.info(f"{status} API integration test: {api_name}")
            
            # Restore original environment
            if original_env:
                os.environ['APP_ENV'] = original_env
            elif 'APP_ENV' in os.environ:
                del os.environ['APP_ENV']
                
        except Exception as e:
            results["error"] = str(e)
            logger.error(f"Integration test failed: {e}")
        
        return results
    
    def generate_comprehensive_report(self, test_results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive validation report
        
        Args:
            test_results: Dictionary containing results from various tests
            
        Returns:
            Comprehensive report
        """
        report = {
            "report_timestamp": time.time(),
            "project_id": self.project_id,
            "validation_summary": {},
            "test_results": test_results,
            "recommendations": [],
            "critical_issues": [],
            "warnings": []
        }
        
        # Analyze results and generate recommendations
        if "secret_validation" in test_results:
            sv_results = test_results["secret_validation"]
            if sv_results["failed_validations"] > 0:
                report["critical_issues"].append({
                    "type": "missing_secrets",
                    "count": sv_results["failed_validations"],
                    "description": f"{sv_results['failed_validations']} required secrets are not accessible"
                })
        
        if "performance_test" in test_results:
            perf_results = test_results["performance_test"]
            if not perf_results["threshold_compliance"]["p95_latency_acceptable"]:
                report["warnings"].append({
                    "type": "performance_degradation",
                    "p95_latency": perf_results["performance_metrics"]["sequential"]["p95_latency_ms"],
                    "description": "Secret retrieval latency exceeds recommended thresholds"
                })
        
        # Generate overall validation summary
        total_tests = len([k for k in test_results.keys() if k.endswith('_test') or k.endswith('_validation')])
        passed_tests = 0
        
        for test_name, test_result in test_results.items():
            if isinstance(test_result, dict):
                # Check if test passed based on common success indicators
                if (test_result.get("all_secrets_valid") or 
                    test_result.get("success_rate", 0) > 90 or
                    test_result.get("successful_validations", 0) > test_result.get("failed_validations", 1)):
                    passed_tests += 1
        
        report["validation_summary"] = {
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "overall_success_rate": (passed_tests / total_tests * 100) if total_tests > 0 else 0,
            "critical_issues_count": len(report["critical_issues"]),
            "warnings_count": len(report["warnings"]),
            "overall_status": "PASS" if len(report["critical_issues"]) == 0 else "FAIL"
        }
        
        return report
    
    def save_report(self, report: Dict[str, Any], output_file: str):
        """Save validation report to JSON file
        
        Args:
            report: Report data to save
            output_file: Output file path
        """
        try:
            with open(output_file, 'w') as f:
                json.dump(report, f, indent=2, default=str)
            logger.info(f"Validation report saved to: {output_file}")
        except Exception as e:
            logger.error(f"Failed to save report: {e}")


def main():
    """Main CLI interface"""
    parser = argparse.ArgumentParser(
        description="Validate Firebase Secrets Manager Integration",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --all --verbose
  %(prog)s --secret DATABASE_PASSWORD
  %(prog)s --performance-test --iterations 100
  %(prog)s --integration-test --env e2e
  %(prog)s --config-validation
        """
    )
    
    parser.add_argument(
        '--project-id',
        default=os.getenv('FIREBASE_PROJECT_ID', 'olorin-ai'),
        help='Firebase project ID (default: olorin-ai)'
    )
    
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose logging'
    )
    
    # Test selection
    parser.add_argument(
        '--all',
        action='store_true',
        help='Run all validation tests'
    )
    
    parser.add_argument(
        '--secret',
        help='Validate a specific secret'
    )
    
    parser.add_argument(
        '--config-validation',
        action='store_true',
        help='Validate configuration integration'
    )
    
    parser.add_argument(
        '--performance-test',
        action='store_true',
        help='Run performance tests'
    )
    
    parser.add_argument(
        '--integration-test',
        action='store_true',
        help='Run integration tests'
    )
    
    parser.add_argument(
        '--fallback-test',
        action='store_true',
        help='Test fallback mechanisms'
    )
    
    # Test parameters
    parser.add_argument(
        '--iterations',
        type=int,
        default=50,
        help='Number of iterations for performance test'
    )
    
    parser.add_argument(
        '--concurrent',
        type=int,
        default=5,
        help='Number of concurrent requests for performance test'
    )
    
    parser.add_argument(
        '--env',
        default='local',
        help='Environment for integration test'
    )
    
    parser.add_argument(
        '--output-report',
        help='Output file for validation report'
    )
    
    args = parser.parse_args()
    
    # Initialize validator
    validator = SecretsValidator(args.project_id, args.verbose)
    test_results = {}
    
    # Run selected tests
    if args.all or args.secret:
        if args.secret:
            logger.info(f"Validating single secret: {args.secret}")
            single_result = validator.validate_single_secret(args.secret)
            test_results["single_secret_validation"] = single_result
            
            print(f"\nSingle Secret Validation Results:")
            print(f"  Secret: {single_result['secret_name']}")
            print(f"  Accessible: {single_result['accessible']}")
            print(f"  Non-empty: {single_result['non_empty']}")
            print(f"  Latency: {single_result['latency_ms']:.2f}ms" if single_result['latency_ms'] else "N/A")
        else:
            logger.info("Running full secret validation...")
            test_results["secret_validation"] = validator.validate_all_secrets()
    
    if args.all or args.config_validation:
        logger.info("Running configuration integration validation...")
        test_results["config_validation"] = validator.validate_configuration_integration()
    
    if args.all or args.performance_test:
        logger.info("Running performance tests...")
        test_results["performance_test"] = validator.performance_test(args.iterations, args.concurrent)
    
    if args.all or args.integration_test:
        logger.info("Running integration tests...")
        test_results["integration_test"] = validator.integration_test(args.env)
    
    if args.all or args.fallback_test:
        logger.info("Running fallback tests...")
        test_results["fallback_test"] = validator.fallback_test()
    
    # Generate comprehensive report
    if test_results:
        comprehensive_report = validator.generate_comprehensive_report(test_results)
        
        # Save report if requested
        if args.output_report:
            validator.save_report(comprehensive_report, args.output_report)
        
        # Print summary
        summary = comprehensive_report["validation_summary"]
        print(f"\n{'='*50}")
        print(f"VALIDATION SUMMARY")
        print(f"{'='*50}")
        print(f"Overall Status: {summary['overall_status']}")
        print(f"Tests Passed: {summary['passed_tests']}/{summary['total_tests']}")
        print(f"Success Rate: {summary['overall_success_rate']:.1f}%")
        print(f"Critical Issues: {summary['critical_issues_count']}")
        print(f"Warnings: {summary['warnings_count']}")
        
        if comprehensive_report["critical_issues"]:
            print(f"\nCRITICAL ISSUES:")
            for issue in comprehensive_report["critical_issues"]:
                print(f"  - {issue['description']}")
        
        if comprehensive_report["warnings"]:
            print(f"\nWARNINGS:")
            for warning in comprehensive_report["warnings"]:
                print(f"  - {warning['description']}")
        
        # Exit with appropriate code
        sys.exit(0 if summary["overall_status"] == "PASS" else 1)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()