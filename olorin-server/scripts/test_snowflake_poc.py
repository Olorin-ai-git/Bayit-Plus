#!/usr/bin/env python
"""
Test script for Snowflake POC implementation.
Verifies configuration, connectivity, and analytics functionality.
"""

import os
import sys
import asyncio
import json
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.logging import get_bridge_logger
from app.service.config_loader import get_config_loader
from app.service.analytics.risk_analyzer import get_risk_analyzer
from app.service.agent.tools.snowflake_tool.client import SnowflakeClient

logger = get_bridge_logger(__name__)


class SnowflakePOCTester:
    """Test harness for Snowflake POC functionality."""
    
    def __init__(self):
        self.config_loader = get_config_loader()
        self.passed_tests = []
        self.failed_tests = []
        
    def print_header(self, title: str):
        """Print a formatted section header."""
        print("\n" + "=" * 60)
        print(f" {title}")
        print("=" * 60)
    
    def print_test(self, name: str, passed: bool, details: str = ""):
        """Print test result."""
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{status}: {name}")
        if details:
            print(f"  Details: {details}")
        
        if passed:
            self.passed_tests.append(name)
        else:
            self.failed_tests.append(name)
    
    def test_environment_config(self):
        """Test environment configuration."""
        self.print_header("Testing Environment Configuration")
        
        # Check if Snowflake is enabled
        snowflake_enabled = os.getenv('USE_SNOWFLAKE', 'false').lower() == 'true'
        self.print_test(
            "Snowflake Enable Flag",
            True,
            f"USE_SNOWFLAKE={snowflake_enabled}"
        )
        
        # Check other tools are disabled
        tools_status = {
            'SPLUNK': os.getenv('USE_SPLUNK', 'false'),
            'DATABRICKS': os.getenv('USE_DATABRICKS', 'false'),
            'SUMO_LOGIC': os.getenv('USE_SUMO_LOGIC', 'false')
        }
        
        all_disabled = all(v.lower() == 'false' for v in tools_status.values())
        self.print_test(
            "Other Tools Disabled",
            all_disabled,
            f"Tool statuses: {tools_status}"
        )
        
        # Check analytics configuration
        analyzer_hours = int(os.getenv('ANALYZER_TIME_WINDOW_HOURS', '24'))
        analytics_config = {
            'time_window': f"{analyzer_hours}h",
            'group_by': os.getenv('ANALYTICS_DEFAULT_GROUP_BY', 'email'),
            'top_percentage': os.getenv('ANALYTICS_DEFAULT_TOP_PERCENTAGE', '10'),
            'cache_ttl': os.getenv('ANALYTICS_CACHE_TTL', '300')
        }
        
        self.print_test(
            "Analytics Configuration",
            True,
            f"Config: {analytics_config}"
        )
        
        return snowflake_enabled
    
    def test_snowflake_config(self):
        """Test Snowflake configuration loading."""
        self.print_header("Testing Snowflake Configuration")
        
        config = self.config_loader.load_snowflake_config()
        
        # Check critical fields
        critical_fields = ['account', 'user', 'password', 'database']
        missing = [f for f in critical_fields if not config.get(f)]
        
        self.print_test(
            "Critical Configuration Fields",
            len(missing) == 0,
            f"Missing: {missing}" if missing else "All critical fields present"
        )
        
        # Check optional fields
        optional_fields = ['warehouse', 'schema', 'role']
        present_optional = [f for f in optional_fields if config.get(f)]
        
        self.print_test(
            "Optional Configuration Fields",
            True,
            f"Present: {present_optional}"
        )
        
        # Display configuration (hide password)
        safe_config = {k: ('***' if 'password' in k.lower() else v) 
                      for k, v in config.items()}
        print(f"\n  Loaded configuration: {json.dumps(safe_config, indent=2)}")
        
        return len(missing) == 0
    
    async def test_snowflake_connection(self):
        """Test Snowflake connection."""
        self.print_header("Testing Snowflake Connection")
        
        client = SnowflakeClient()
        
        # Check if using real or mock client
        is_real = getattr(client, 'is_real', False)
        self.print_test(
            "Client Type",
            True,
            f"Using {'REAL' if is_real else 'MOCK'} Snowflake client"
        )
        
        if not is_real:
            print("  ⚠️  Mock client active - set USE_SNOWFLAKE=true for real connection")
            return True
        
        try:
            # Test connection
            await client.connect()
            
            # Test simple query
            test_query = "SELECT CURRENT_VERSION() as version, CURRENT_DATABASE() as db"
            results = await client.execute_query(test_query)
            
            self.print_test(
                "Connection Test",
                len(results) > 0,
                f"Query returned {len(results)} rows"
            )
            
            if results:
                print(f"  Snowflake version: {results[0].get('VERSION', 'Unknown')}")
                print(f"  Database: {results[0].get('DB', 'Unknown')}")
            
            await client.disconnect()
            return True
            
        except Exception as e:
            self.print_test(
                "Connection Test",
                False,
                str(e)
            )
            return False
    
    async def test_risk_analyzer(self):
        """Test risk analyzer functionality."""
        self.print_header("Testing Risk Analyzer")
        
        analyzer = get_risk_analyzer()
        
        # Test configuration loading
        self.print_test(
            "Analyzer Configuration",
            True,
            f"Time window: {analyzer.default_time_window}, "
            f"Group by: {analyzer.default_group_by}, "
            f"Top: {analyzer.default_top_percentage}%"
        )
        
        try:
            # Test risk analysis
            print("\n  Running risk analysis (this may take a moment)...")
            results = await analyzer.get_top_risk_entities(
                time_window='24h',
                group_by='email',
                top_percentage=10
            )
            
            success = results.get('status') == 'success'
            entity_count = len(results.get('entities', []))
            
            self.print_test(
                "Risk Analysis Execution",
                success,
                f"Status: {results.get('status')}, Entities: {entity_count}"
            )
            
            if success and entity_count > 0:
                # Display top 3 entities
                print("\n  Top 3 Risk Entities:")
                for i, entity in enumerate(results['entities'][:3], 1):
                    print(f"    {i}. {entity['entity']}")
                    print(f"       Risk Score: {entity['risk_score']}")
                    print(f"       Risk Value: ${entity['risk_weighted_value']:,.2f}")
                    print(f"       Transactions: {entity['transaction_count']}")
            
            # Test summary statistics
            if 'summary' in results:
                summary = results['summary']
                print("\n  Summary Statistics:")
                print(f"    Total Entities: {summary.get('total_entities', 0)}")
                print(f"    Total Risk Value: ${summary.get('total_risk_value', 0):,.2f}")
                print(f"    Total Transactions: {summary.get('total_transactions', 0)}")
                print(f"    Fraud Rate: {summary.get('fraud_rate', 0):.2f}%")
            
            return success
            
        except Exception as e:
            self.print_test(
                "Risk Analysis Execution",
                False,
                str(e)
            )
            return False
    
    async def test_entity_analysis(self):
        """Test individual entity analysis."""
        self.print_header("Testing Entity Analysis")
        
        analyzer = get_risk_analyzer()
        
        # Use a test entity
        test_entity = "test@example.com"
        
        try:
            print(f"\n  Analyzing entity: {test_entity}")
            results = await analyzer.analyze_entity(
                entity_value=test_entity,
                entity_type='email',
                time_window='30d'
            )
            
            success = results.get('status') == 'success'
            
            self.print_test(
                "Entity Analysis Execution",
                success,
                f"Status: {results.get('status')}"
            )
            
            if success and 'profile' in results:
                profile = results['profile']
                print("\n  Entity Profile:")
                print(f"    Transaction Count: {profile.get('transaction_count', 0)}")
                print(f"    Total Amount: ${profile.get('total_amount', 0):,.2f}")
                print(f"    Avg Risk Score: {profile.get('avg_risk_score', 0):.3f}")
                print(f"    Fraud Count: {profile.get('fraud_count', 0)}")
                
                if 'risk_assessment' in results:
                    risk = results['risk_assessment']
                    print(f"\n  Risk Assessment:")
                    print(f"    Risk Level: {risk.get('risk_level', 'Unknown')}")
                    print(f"    Risk Score: {risk.get('risk_score', 0):.3f}")
                    print(f"    Fraud Rate: {risk.get('fraud_rate', 0):.2f}%")
            
            return success
            
        except Exception as e:
            self.print_test(
                "Entity Analysis Execution",
                False,
                str(e)
            )
            return False
    
    async def test_api_endpoints(self):
        """Test API endpoints (requires running server)."""
        self.print_header("Testing API Endpoints")
        
        import httpx
        
        base_url = "http://localhost:8090/api/v1/analytics"
        
        try:
            async with httpx.AsyncClient() as client:
                # Test health endpoint
                response = await client.get(f"{base_url}/health")
                health_ok = response.status_code == 200
                
                self.print_test(
                    "Health Endpoint",
                    health_ok,
                    f"Status: {response.status_code}"
                )
                
                if health_ok:
                    data = response.json()
                    print(f"    Snowflake Enabled: {data.get('snowflake_enabled')}")
                    print(f"    Message: {data.get('message')}")
                
                # Test config endpoint
                response = await client.get(f"{base_url}/config")
                config_ok = response.status_code == 200
                
                self.print_test(
                    "Config Endpoint",
                    config_ok,
                    f"Status: {response.status_code}"
                )
                
                if config_ok:
                    data = response.json()
                    print(f"    Default Time Window: {data.get('default_time_window')}")
                    print(f"    Default Group By: {data.get('default_group_by')}")
                
                return health_ok and config_ok
                
        except httpx.ConnectError:
            print("  ⚠️  Server not running. Start with: poetry run python -m app.local_server")
            return False
        except Exception as e:
            self.print_test(
                "API Endpoint Test",
                False,
                str(e)
            )
            return False
    
    async def run_all_tests(self):
        """Run all tests."""
        print("\n" + "🏔️ " * 20)
        print(" SNOWFLAKE POC TEST SUITE")
        print("🏔️ " * 20)
        
        # Test environment configuration
        snowflake_enabled = self.test_environment_config()
        
        if not snowflake_enabled:
            print("\n⚠️  WARNING: Snowflake is disabled (USE_SNOWFLAKE=false)")
            print("   Set USE_SNOWFLAKE=true in .env to test real Snowflake connection")
        
        # Test Snowflake configuration
        config_ok = self.test_snowflake_config()
        
        # Test Snowflake connection
        if config_ok:
            await self.test_snowflake_connection()
        
        # Test risk analyzer
        await self.test_risk_analyzer()
        
        # Test entity analysis
        await self.test_entity_analysis()
        
        # Test API endpoints
        await self.test_api_endpoints()
        
        # Print summary
        self.print_header("Test Summary")
        print(f"\n  ✅ Passed: {len(self.passed_tests)} tests")
        print(f"  ❌ Failed: {len(self.failed_tests)} tests")
        
        if self.failed_tests:
            print("\n  Failed tests:")
            for test in self.failed_tests:
                print(f"    - {test}")
        
        print("\n" + "🏔️ " * 20)
        print(" TEST SUITE COMPLETE")
        print("🏔️ " * 20)
        
        return len(self.failed_tests) == 0


async def main():
    """Main test execution."""
    tester = SnowflakePOCTester()
    success = await tester.run_all_tests()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())