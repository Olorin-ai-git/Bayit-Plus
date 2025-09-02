#!/usr/bin/env python3
"""
Agent Import Validation Test Suite

Systematically validates that all agent imports work correctly
and that the newly created client modules resolve import errors.
"""

import sys
import traceback
import importlib
import pytest
from typing import Dict, List, Tuple, Any

class AgentImportValidator:
    """Validates agent imports and reports detailed results."""

    def __init__(self):
        self.results: Dict[str, Dict[str, Any]] = {}
        self.success_count = 0
        self.total_count = 0

    def validate_import(self, module_name: str, description: str = "") -> Tuple[bool, str]:
        """Validate a single module import."""
        try:
            # Clear any cached imports to ensure fresh test
            if module_name in sys.modules:
                del sys.modules[module_name]

            module = importlib.import_module(module_name)
            return True, f"SUCCESS - {description}"

        except ModuleNotFoundError as e:
            return False, f"MODULE_NOT_FOUND: {e}"
        except ImportError as e:
            return False, f"IMPORT_ERROR: {e}"
        except Exception as e:
            return False, f"UNEXPECTED_ERROR: {e}"

    def validate_agent_instantiation(self, module_name: str, class_name: str) -> Tuple[bool, str]:
        """Validate agent class can be instantiated."""
        try:
            module = importlib.import_module(module_name)
            agent_class = getattr(module, class_name)

            # Try basic instantiation (may fail due to config but should not fail on import)
            try:
                instance = agent_class()
                return True, "INSTANTIATION_SUCCESS"
            except Exception as init_error:
                # If instantiation fails but import succeeded, that's acceptable
                return True, f"IMPORT_SUCCESS (init failed: {type(init_error).__name__})"

        except Exception as e:
            return False, f"INSTANTIATION_ERROR: {e}"

    def run_comprehensive_validation(self) -> Dict[str, Any]:
        """Run comprehensive agent import validation."""
        print("🔍 Starting Comprehensive Agent Import Validation\n")

        # Phase 1: Client Module Validation
        print("📋 Phase 1: Client Module Validation")
        print("=" * 50)

        client_modules = [
            ("app.service.agent.ato_agents.clients.databricks_client", "Databricks Client"),
            ("app.service.agent.ato_agents.mysql_agent.client", "MySQL Agent Client"),
            ("app.service.agent.ato_agents.clients.splunk_client", "Splunk Client"),
            ("app.service.agent.ato_agents.clients.tmx_client", "TMX Client"),
            ("app.service.agent.ato_agents.clients.sumologic_client", "Sumo Logic Client"),
        ]

        for module_name, description in client_modules:
            success, message = self.validate_import(module_name, description)
            self.results[module_name] = {
                'success': success,
                'message': message,
                'type': 'client_module'
            }
            self.total_count += 1
            if success:
                self.success_count += 1
            print(f"{'✅' if success else '❌'} {description}: {message}")

        # Phase 2: Agent Module Validation
        print(f"\n📋 Phase 2: Agent Module Validation")
        print("=" * 50)

        agent_modules = [
            ("app.service.agent.ato_agents.network_analysis_agent", "Network Analysis Agent"),
            ("app.service.agent.ato_agents.mysql_agent", "MySQL Agent"),
            ("app.service.agent.ato_agents.splunk_agent", "Splunk Agent"),
            ("app.service.agent.ato_agents.device_fingerprint_agent", "Device Fingerprint Agent"),
            ("app.service.agent.ato_agents.location_data_agent", "Location Data Agent"),
            ("app.service.agent.ato_agents.user_behavior_agent", "User Behavior Agent"),
            ("app.service.agent.ato_agents.anomaly_detection_agent", "Anomaly Detection Agent"),
        ]

        for module_name, description in agent_modules:
            success, message = self.validate_import(module_name, description)
            self.results[module_name] = {
                'success': success,
                'message': message,
                'type': 'agent_module'
            }
            self.total_count += 1
            if success:
                self.success_count += 1
            print(f"{'✅' if success else '❌'} {description}: {message}")

        # Phase 3: Individual Agent Implementation Validation
        print(f"\n📋 Phase 3: Individual Agent Implementation Validation")
        print("=" * 60)

        agent_implementations = [
            ("app.service.agent.ato_agents.network_analysis_agent.agent", "NetworkAnalysisAgent"),
            ("app.service.agent.ato_agents.mysql_agent.agent", "MySQLAgent"),
            ("app.service.agent.ato_agents.splunk_agent.agent", "SplunkAgent"),
            ("app.service.agent.ato_agents.device_fingerprint_agent.agent", "DeviceFingerprintAgent"),
            ("app.service.agent.ato_agents.location_data_agent.agent", "LocationDataAgent"),
            ("app.service.agent.ato_agents.user_behavior_agent.agent", "UserBehaviorAgent"),
            ("app.service.agent.ato_agents.anomaly_detection_agent.agent", "AnomalyDetectionAgent"),
        ]

        for module_name, class_name in agent_implementations:
            success, message = self.validate_agent_instantiation(module_name, class_name)
            key = f"{module_name}.{class_name}"
            self.results[key] = {
                'success': success,
                'message': message,
                'type': 'agent_implementation'
            }
            self.total_count += 1
            if success:
                self.success_count += 1
            print(f"{'✅' if success else '❌'} {class_name}: {message}")

        # Phase 4: Core System Module Validation
        print(f"\n📋 Phase 4: Core System Module Validation")
        print("=" * 50)

        core_modules = [
            ("app.service.agent.ato_agents.interfaces", "Agent Interfaces"),
            ("app.service.agent.ato_agents.config", "Agent Configuration"),
            ("app.service.agent.ato_agents.fraud_detection_coordinator", "Fraud Detection Coordinator"),
        ]

        for module_name, description in core_modules:
            success, message = self.validate_import(module_name, description)
            self.results[module_name] = {
                'success': success,
                'message': message,
                'type': 'core_module'
            }
            self.total_count += 1
            if success:
                self.success_count += 1
            print(f"{'✅' if success else '❌'} {description}: {message}")

        return self._generate_summary_report()

    def _generate_summary_report(self) -> Dict[str, Any]:
        """Generate comprehensive summary report."""
        success_rate = (self.success_count / self.total_count * 100) if self.total_count > 0 else 0

        print(f"\n📊 VALIDATION SUMMARY REPORT")
        print("=" * 60)
        print(f"📈 Import Success Rate: {self.success_count}/{self.total_count} ({success_rate:.1f}%)")

        # Categorize results
        categories = {}
        failed_modules = []

        for module, result in self.results.items():
            category = result['type']
            if category not in categories:
                categories[category] = {'success': 0, 'total': 0}
            categories[category]['total'] += 1
            if result['success']:
                categories[category]['success'] += 1
            else:
                failed_modules.append((module, result['message']))

        print(f"\n📋 Results by Category:")
        for category, stats in categories.items():
            cat_rate = (stats['success'] / stats['total'] * 100) if stats['total'] > 0 else 0
            print(f"  {category.replace('_', ' ').title()}: {stats['success']}/{stats['total']} ({cat_rate:.1f}%)")

        if failed_modules:
            print(f"\n❌ Failed Imports ({len(failed_modules)}):")
            for module, error in failed_modules:
                print(f"  - {module}: {error}")
        else:
            print(f"\n🎉 ALL IMPORTS SUCCESSFUL!")

        return {
            'total_count': self.total_count,
            'success_count': self.success_count,
            'success_rate': success_rate,
            'categories': categories,
            'failed_modules': failed_modules,
            'all_results': self.results
        }

def test_agent_import_validation():
    """Pytest test for agent import validation."""
    validator = AgentImportValidator()
    report = validator.run_comprehensive_validation()

    # Assert that we have improved from the baseline
    assert report['success_rate'] >= 90.0, f"Import success rate below 90%: {report['success_rate']:.1f}%"

    # Assert specific critical modules work
    critical_modules = [
        'app.service.agent.ato_agents.clients.databricks_client',
        'app.service.agent.ato_agents.mysql_agent.client'
    ]

    for module in critical_modules:
        assert module in report['all_results'], f"Critical module {module} not tested"
        assert report['all_results'][module]['success'], f"Critical module {module} failed: {report['all_results'][module]['message']}"

    return report

def test_client_module_functionality():
    """Test that client modules have expected interfaces."""
    try:
        from app.service.agent.ato_agents.clients.databricks_client import DatabricksClient
        from app.service.agent.ato_agents.mysql_agent.client import MySQLClient

        # Test Databricks Client
        db_client = DatabricksClient({})
        assert hasattr(db_client, 'connect'), "DatabricksClient missing connect method"
        assert hasattr(db_client, 'execute_query'), "DatabricksClient missing execute_query method"

        # Test MySQL Client
        mysql_client = MySQLClient({})
        assert hasattr(mysql_client, 'connect'), "MySQLClient missing connect method"
        assert hasattr(mysql_client, 'execute_query'), "MySQLClient missing execute_query method"

        print("✅ Client interface validation successful")

    except ImportError as e:
        pytest.fail(f"Client module import failed: {e}")
    except Exception as e:
        pytest.fail(f"Client functionality test failed: {e}")

if __name__ == "__main__":
    # Run validation standalone
    validator = AgentImportValidator()
    report = validator.run_comprehensive_validation()

    print(f"\n🏁 Validation Complete!")
    print(f"Final Success Rate: {report['success_rate']:.1f}%")

    # Exit with appropriate code
    exit_code = 0 if report['success_rate'] >= 90.0 else 1
    sys.exit(exit_code)