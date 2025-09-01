#!/usr/bin/env python3
"""
Test Script for SecretManagerClient Functionality.

This script tests the existing SecretManagerClient implementation to ensure
it works correctly with the Firebase Secret Manager configuration.

Author: Gil Klainert  
Date: 2025-08-31
"""

import os
import sys
import json
import time
from typing import Dict, Any

# Add the app directory to the path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../olorin-server'))

try:
    from app.service.secret_manager import get_secret_manager, SecretManagerClient
    from app.service.config_loader import get_config_loader, ConfigLoader
    CLIENT_AVAILABLE = True
except ImportError as e:
    print(f"ERROR: Cannot import SecretManagerClient: {e}")
    CLIENT_AVAILABLE = False

import structlog

# Configure logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer(colors=True),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)


class SecretManagerTester:
    """Test suite for SecretManagerClient functionality."""
    
    def __init__(self, project_id: str = "olorin-ai"):
        """Initialize the tester."""
        self.project_id = project_id
        self.test_results = {}
        
    def test_client_initialization(self) -> bool:
        """Test SecretManagerClient initialization."""
        logger.info("Testing SecretManagerClient initialization")
        
        try:
            # Test direct client creation
            client = SecretManagerClient(project_id=self.project_id)
            
            # Test global client getter
            global_client = get_secret_manager()
            
            success = client is not None and global_client is not None
            self.test_results['client_initialization'] = {
                'success': success,
                'details': 'SecretManagerClient initialized successfully',
                'cache_stats': client.get_cache_stats() if hasattr(client, 'get_cache_stats') else None
            }
            
            logger.info("Client initialization test completed", success=success)
            return success
            
        except Exception as e:
            self.test_results['client_initialization'] = {
                'success': False,
                'error': str(e),
                'details': 'Failed to initialize SecretManagerClient'
            }
            logger.error("Client initialization test failed", error=str(e))
            return False
    
    def test_secret_retrieval(self) -> bool:
        """Test secret retrieval functionality."""
        logger.info("Testing secret retrieval")
        
        try:
            client = get_secret_manager()
            
            # Test secrets that should exist (or fallback to env vars)
            test_secrets = [
                ("ANTHROPIC_API_KEY", "ANTHROPIC_API_KEY"),
                ("OPENAI_API_KEY", "OPENAI_API_KEY"), 
                ("DATABASE_PASSWORD", "DB_PASSWORD"),
                ("JWT_SECRET_KEY", "JWT_SECRET_KEY"),
            ]
            
            results = {}
            success_count = 0
            
            for secret_path, env_var in test_secrets:
                try:
                    # Test direct secret access
                    value = client.get_secret(secret_path)
                    has_value = value is not None and len(value) > 0
                    
                    # Test with fallback
                    fallback_value = client.get_secret_with_fallback(
                        secret_path, env_var, "default_test_value"
                    )
                    has_fallback = fallback_value is not None
                    
                    results[secret_path] = {
                        'has_secret_manager_value': has_value,
                        'has_fallback_value': has_fallback,
                        'value_length': len(value) if value else 0,
                        'fallback_length': len(fallback_value) if fallback_value else 0,
                        'source': 'secret_manager' if has_value else 'fallback'
                    }
                    
                    if has_value or has_fallback:
                        success_count += 1
                        
                except Exception as e:
                    results[secret_path] = {
                        'error': str(e),
                        'has_secret_manager_value': False,
                        'has_fallback_value': False
                    }
            
            success = success_count > 0
            self.test_results['secret_retrieval'] = {
                'success': success,
                'successful_secrets': success_count,
                'total_tested': len(test_secrets), 
                'details': results
            }
            
            logger.info("Secret retrieval test completed", 
                       success=success, 
                       successful_count=success_count,
                       total_tested=len(test_secrets))
            return success
            
        except Exception as e:
            self.test_results['secret_retrieval'] = {
                'success': False,
                'error': str(e),
                'details': 'Failed during secret retrieval testing'
            }
            logger.error("Secret retrieval test failed", error=str(e))
            return False
    
    def test_config_loader_integration(self) -> bool:
        """Test ConfigLoader integration with SecretManagerClient."""
        logger.info("Testing ConfigLoader integration")
        
        try:
            config_loader = get_config_loader()
            
            # Test configuration loading methods
            tests = {
                'database_config': lambda: config_loader.load_database_config(),
                'redis_config': lambda: config_loader.load_redis_config(),
                'jwt_config': lambda: config_loader.load_jwt_config(),
                'splunk_config': lambda: config_loader.load_splunk_config(),
                'all_secrets': lambda: config_loader.load_all_secrets(),
            }
            
            results = {}
            success_count = 0
            
            for test_name, test_func in tests.items():
                try:
                    config_data = test_func()
                    has_data = config_data is not None
                    
                    # Count non-None values in config
                    if isinstance(config_data, dict):
                        non_none_count = sum(1 for v in config_data.values() if v is not None)
                        total_keys = len(config_data)
                    else:
                        non_none_count = 1 if config_data else 0
                        total_keys = 1
                    
                    results[test_name] = {
                        'success': has_data,
                        'config_keys': list(config_data.keys()) if isinstance(config_data, dict) else [],
                        'populated_values': non_none_count,
                        'total_keys': total_keys,
                        'completion_rate': f"{(non_none_count/total_keys)*100:.1f}%" if total_keys > 0 else "0%"
                    }
                    
                    if has_data:
                        success_count += 1
                        
                except Exception as e:
                    results[test_name] = {
                        'success': False,
                        'error': str(e)
                    }
            
            success = success_count > 0
            self.test_results['config_loader_integration'] = {
                'success': success,
                'successful_configs': success_count,
                'total_tested': len(tests),
                'details': results
            }
            
            logger.info("ConfigLoader integration test completed",
                       success=success,
                       successful_count=success_count)
            return success
            
        except Exception as e:
            self.test_results['config_loader_integration'] = {
                'success': False,
                'error': str(e),
                'details': 'Failed during ConfigLoader integration testing'
            }
            logger.error("ConfigLoader integration test failed", error=str(e))
            return False
    
    def test_caching_functionality(self) -> bool:
        """Test secret caching functionality."""
        logger.info("Testing caching functionality")
        
        try:
            client = get_secret_manager()
            
            # Clear cache to start fresh
            if hasattr(client, 'clear_cache'):
                client.clear_cache()
            
            # Test cache statistics
            initial_stats = client.get_cache_stats() if hasattr(client, 'get_cache_stats') else {}
            
            # Make some requests to populate cache
            test_secret = "ANTHROPIC_API_KEY"
            
            # First request (should populate cache)
            start_time = time.time()
            value1 = client.get_secret(test_secret)
            first_request_time = time.time() - start_time
            
            # Second request (should use cache)
            start_time = time.time()
            value2 = client.get_secret(test_secret)
            second_request_time = time.time() - start_time
            
            # Values should be the same
            values_match = value1 == value2
            
            # Second request should generally be faster (cached)
            cache_faster = second_request_time < first_request_time
            
            # Get final cache stats
            final_stats = client.get_cache_stats() if hasattr(client, 'get_cache_stats') else {}
            
            self.test_results['caching_functionality'] = {
                'success': values_match and hasattr(client, 'get_cache_stats'),
                'values_match': values_match,
                'cache_appears_faster': cache_faster,
                'first_request_ms': round(first_request_time * 1000, 2),
                'second_request_ms': round(second_request_time * 1000, 2),
                'initial_cache_stats': initial_stats,
                'final_cache_stats': final_stats
            }
            
            success = values_match and hasattr(client, 'get_cache_stats')
            logger.info("Caching functionality test completed", success=success)
            return success
            
        except Exception as e:
            self.test_results['caching_functionality'] = {
                'success': False,
                'error': str(e),
                'details': 'Failed during caching functionality testing'
            }
            logger.error("Caching functionality test failed", error=str(e))
            return False
    
    def test_environment_fallback(self) -> bool:
        """Test environment variable fallback functionality."""
        logger.info("Testing environment fallback")
        
        try:
            client = get_secret_manager()
            
            # Set a test environment variable
            test_env_var = "TEST_OLORIN_SECRET"
            test_value = "test_secret_value_12345"
            os.environ[test_env_var] = test_value
            
            # Test non-existent secret with env fallback
            result = client.get_secret_with_fallback(
                "NON_EXISTENT_SECRET",
                test_env_var,
                "default_value"
            )
            
            # Clean up
            del os.environ[test_env_var]
            
            success = result == test_value
            self.test_results['environment_fallback'] = {
                'success': success,
                'returned_value_matches': success,
                'details': 'Environment fallback working correctly' if success else 'Environment fallback failed'
            }
            
            logger.info("Environment fallback test completed", success=success)
            return success
            
        except Exception as e:
            # Clean up on error
            if "TEST_OLORIN_SECRET" in os.environ:
                del os.environ["TEST_OLORIN_SECRET"]
                
            self.test_results['environment_fallback'] = {
                'success': False,
                'error': str(e),
                'details': 'Failed during environment fallback testing'
            }
            logger.error("Environment fallback test failed", error=str(e))
            return False
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all tests and return results."""
        logger.info("Starting comprehensive SecretManagerClient testing")
        
        if not CLIENT_AVAILABLE:
            return {
                'error': 'SecretManagerClient not available for testing',
                'client_available': False
            }
        
        tests = [
            self.test_client_initialization,
            self.test_secret_retrieval,
            self.test_config_loader_integration,
            self.test_caching_functionality,
            self.test_environment_fallback
        ]
        
        passed_tests = 0
        total_tests = len(tests)
        
        for test_func in tests:
            try:
                if test_func():
                    passed_tests += 1
            except Exception as e:
                logger.error(f"Test {test_func.__name__} threw an exception", error=str(e))
        
        # Compile final results
        final_results = {
            'test_summary': {
                'total_tests': total_tests,
                'passed_tests': passed_tests,
                'success_rate': f"{(passed_tests/total_tests)*100:.1f}%",
                'overall_success': passed_tests == total_tests
            },
            'individual_tests': self.test_results,
            'timestamp': time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            'project_id': self.project_id
        }
        
        logger.info("All tests completed",
                   passed=passed_tests,
                   total=total_tests,
                   success_rate=final_results['test_summary']['success_rate'])
        
        return final_results
    
    def print_summary(self):
        """Print human-readable test summary."""
        results = self.run_all_tests() if not self.test_results else {
            'test_summary': {
                'passed_tests': sum(1 for r in self.test_results.values() if r.get('success', False)),
                'total_tests': len(self.test_results),
                'overall_success': all(r.get('success', False) for r in self.test_results.values())
            },
            'individual_tests': self.test_results
        }
        
        print("\n" + "="*70)
        print("🧪 SECRETMANAGER CLIENT TEST RESULTS")
        print("="*70)
        print(f"Project: {self.project_id}")
        print(f"Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}")
        print()
        
        summary = results.get('test_summary', {})
        print("📊 TEST SUMMARY")
        print("-" * 30)
        print(f"Total Tests: {summary.get('total_tests', 0)}")
        print(f"Passed Tests: {summary.get('passed_tests', 0)}")
        print(f"Success Rate: {summary.get('success_rate', '0%')}")
        
        if summary.get('overall_success'):
            print("✅ Overall Result: PASS")
        else:
            print("❌ Overall Result: FAIL")
        print()
        
        # Individual test results
        print("🔍 INDIVIDUAL TEST RESULTS")
        print("-" * 30)
        for test_name, test_result in results.get('individual_tests', {}).items():
            status = "✅ PASS" if test_result.get('success') else "❌ FAIL"
            print(f"{status} {test_name.replace('_', ' ').title()}")
            
            if not test_result.get('success') and test_result.get('error'):
                print(f"    Error: {test_result['error']}")
            elif test_result.get('details'):
                print(f"    Details: {test_result['details']}")
        print()
        
        # Recommendations
        print("💡 RECOMMENDATIONS")
        print("-" * 30)
        if not summary.get('overall_success'):
            print("• Fix failing tests before proceeding with deployment")
            print("• Check Firebase IAM permissions for Secret Manager access")
            print("• Verify Google Cloud SDK authentication")
        else:
            print("✅ SecretManagerClient is working correctly!")
            print("• Ready for production deployment")
        print()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Test SecretManagerClient functionality")
    parser.add_argument("--project", default="olorin-ai", help="Firebase project ID")
    parser.add_argument("--json", action="store_true", help="Output results as JSON")
    
    args = parser.parse_args()
    
    tester = SecretManagerTester(project_id=args.project)
    
    if args.json:
        results = tester.run_all_tests()
        print(json.dumps(results, indent=2))
    else:
        tester.print_summary()
    
    # Exit with non-zero if tests failed
    if not tester.run_all_tests().get('test_summary', {}).get('overall_success', False):
        sys.exit(1)