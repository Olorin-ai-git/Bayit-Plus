"""
Smoke tests for Snowflake data warehouse connection.
"""

import time
from typing import Dict, Any

from app.service.agent.tools.snowflake_tool.real_client import RealSnowflakeClient
from app.service.logging import get_bridge_logger
from .base_smoke_test import BaseSmokeTest
from .models import SmokeTestResult, SmokeTestSeverity

logger = get_bridge_logger(__name__)


class SnowflakeSmokeTest(BaseSmokeTest):
    """Smoke tests for Snowflake data warehouse."""
    
    def __init__(self, enabled: bool = True):
        """Initialize Snowflake smoke test."""
        super().__init__("Snowflake", enabled)
        self.client = None
        
    async def run_connectivity_test(self) -> SmokeTestResult:
        """Test basic connectivity to Snowflake."""
        start_time = time.time()
        
        try:
            self.client = RealSnowflakeClient()
            
            # Test connection establishment
            await self.client.connect()
            
            response_time = self._measure_time(start_time)
            
            return self._create_success_result(
                "connectivity_test",
                response_time,
                "Successfully connected to Snowflake",
                SmokeTestSeverity.CRITICAL,
                {"connection_established": True}
            )
            
        except ImportError as e:
            response_time = self._measure_time(start_time)
            return self._create_failure_result(
                "connectivity_test",
                response_time,
                "Snowflake connector not installed",
                str(e),
                SmokeTestSeverity.CRITICAL,
                {"missing_dependency": "snowflake-connector-python"}
            )
            
        except Exception as e:
            response_time = self._measure_time(start_time)
            return self._create_failure_result(
                "connectivity_test",
                response_time,
                "Failed to connect to Snowflake",
                str(e),
                SmokeTestSeverity.CRITICAL,
                {"connection_failed": True}
            )
    
    async def run_authentication_test(self) -> SmokeTestResult:
        """Test authentication with Snowflake."""
        start_time = time.time()
        
        try:
            if not self.client:
                self.client = RealSnowflakeClient()
                await self.client.connect()
            
            # Test authentication by querying current user
            query = "SELECT CURRENT_USER() as current_user, CURRENT_ROLE() as current_role"
            results = await self.client.execute_query(query, limit=1)
            
            response_time = self._measure_time(start_time)
            
            if results and len(results) > 0:
                user_info = results[0]
                return self._create_success_result(
                    "authentication_test", 
                    response_time,
                    f"Authentication successful as {user_info.get('CURRENT_USER', 'unknown')}",
                    SmokeTestSeverity.CRITICAL,
                    {
                        "current_user": user_info.get('CURRENT_USER'),
                        "current_role": user_info.get('CURRENT_ROLE'),
                        "authenticated": True
                    }
                )
            else:
                return self._create_failure_result(
                    "authentication_test",
                    response_time,
                    "Authentication test returned no results",
                    "Empty result set",
                    SmokeTestSeverity.CRITICAL
                )
                
        except Exception as e:
            response_time = self._measure_time(start_time)
            return self._create_failure_result(
                "authentication_test",
                response_time,
                "Authentication failed",
                str(e),
                SmokeTestSeverity.CRITICAL
            )
    
    async def run_basic_functionality_test(self) -> SmokeTestResult:
        """Test basic query functionality."""
        start_time = time.time()
        
        try:
            if not self.client:
                self.client = RealSnowflakeClient() 
                await self.client.connect()
            
            # Test basic query functionality
            query = """
            SELECT 
                CURRENT_VERSION() as snowflake_version,
                CURRENT_DATABASE() as database_name,
                CURRENT_SCHEMA() as schema_name,
                CURRENT_WAREHOUSE() as warehouse_name,
                GETDATE() as current_timestamp
            """
            results = await self.client.execute_query(query, limit=1)
            
            response_time = self._measure_time(start_time)
            
            if results and len(results) > 0:
                info = results[0]
                return self._create_success_result(
                    "functionality_test",
                    response_time,
                    "Basic query functionality verified",
                    SmokeTestSeverity.HIGH,
                    {
                        "snowflake_version": info.get('SNOWFLAKE_VERSION'),
                        "database": info.get('DATABASE_NAME'),
                        "schema": info.get('SCHEMA_NAME'),
                        "warehouse": info.get('WAREHOUSE_NAME'),
                        "query_successful": True
                    }
                )
            else:
                return self._create_failure_result(
                    "functionality_test",
                    response_time,
                    "Functionality test returned no results",
                    "Empty result set",
                    SmokeTestSeverity.HIGH
                )
                
        except Exception as e:
            response_time = self._measure_time(start_time)
            return self._create_failure_result(
                "functionality_test",
                response_time,
                "Basic functionality test failed",
                str(e),
                SmokeTestSeverity.HIGH
            )
        finally:
            # Clean up connection
            if self.client:
                try:
                    await self.client.disconnect()
                except:
                    pass  # Ignore cleanup errors
    
    async def run_data_access_test(self) -> SmokeTestResult:
        """Test access to investigation data tables."""
        start_time = time.time()
        
        try:
            if not self.client:
                self.client = RealSnowflakeClient()
                await self.client.connect()
            
            # Test access to main data tables
            query = """
            SELECT COUNT(*) as record_count 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = CURRENT_SCHEMA()
            """
            
            results = await self.client.execute_query(query, limit=1)
            
            response_time = self._measure_time(start_time)
            
            if results and len(results) > 0:
                table_count = results[0].get('RECORD_COUNT', 0)
                return self._create_success_result(
                    "data_access_test",
                    response_time,
                    f"Data access verified - {table_count} tables accessible",
                    SmokeTestSeverity.MEDIUM,
                    {
                        "tables_accessible": table_count,
                        "schema_accessible": True
                    }
                )
            else:
                return self._create_failure_result(
                    "data_access_test",
                    response_time,
                    "Could not verify data access",
                    "No table information returned",
                    SmokeTestSeverity.MEDIUM
                )
                
        except Exception as e:
            response_time = self._measure_time(start_time)
            return self._create_failure_result(
                "data_access_test",
                response_time,
                "Data access test failed",
                str(e),
                SmokeTestSeverity.MEDIUM
            )
    
    async def run_all_tests(self) -> list[SmokeTestResult]:
        """Run all Snowflake smoke tests."""
        base_results = await super().run_all_tests()
        
        # Only run data access test if basic functionality passed
        if (len(base_results) >= 3 and 
            base_results[2].test_name == "functionality_test" and
            base_results[2].status.value == "passed"):
            
            try:
                data_access_result = await self._run_test_with_timeout(
                    self.run_data_access_test(),
                    "data_access_test"
                )
                base_results.append(data_access_result)
            except Exception as e:
                base_results.append(self._create_error_result(
                    f"Data access test failed: {str(e)}", 
                    "data_access_test"
                ))
        
        return base_results