#!/usr/bin/env python3
"""
Multi-Tool LLM Demonstration

This demo shows how the LLM can intelligently use MULTIPLE tools 
(Splunk, SumoLogic, and Snowflake) in a single investigation to gather
comprehensive fraud intelligence from different data sources.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List
from unittest.mock import AsyncMock, patch
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class MockSplunkClient:
    """Mock Splunk client returning security event data."""
    
    def __init__(self, host=None, port=None, username=None, password=None):
        """Accept the same args as real SplunkClient."""
        self.host = host
        self.port = port
        
    async def connect(self):
        logger.info("🔒 Mock Splunk connected (Security Events)")
        
    async def disconnect(self):
        pass
        
    async def search(self, query: str) -> Dict[str, Any]:
        """Return security-focused data from Splunk."""
        return {
            "results": [
                {
                    "_time": "2025-01-15T14:30:25.123Z",
                    "event_type": "failed_login",
                    "ip_address": "198.51.100.42",
                    "location": "Russia",
                    "user_id": "user_fraud_demo",
                    "failure_reason": "invalid_password",
                    "attempt_count": 5
                },
                {
                    "_time": "2025-01-15T14:35:10.456Z",
                    "event_type": "successful_login",
                    "ip_address": "198.51.100.42",
                    "location": "Russia",
                    "user_id": "user_fraud_demo",
                    "device_fingerprint": "unknown_device_xyz",
                    "anomaly_flags": "new_device,suspicious_location"
                }
            ],
            "total_count": 2,
            "source": "splunk_security"
        }


class MockSumoLogicClient:
    """Mock SumoLogic client returning application performance data."""
    
    def __init__(self, access_id: str, access_key: str, endpoint: str):
        self.endpoint = endpoint
        
    async def connect(self):
        logger.info("📊 Mock SumoLogic connected (Application Metrics)")
        
    async def disconnect(self):
        pass
        
    async def search(self, query: str, time_range: str) -> Dict[str, Any]:
        """Return application-focused data from SumoLogic."""
        return {
            "results": [
                {
                    "timestamp": "2025-01-15T14:35:15.789Z",
                    "api_endpoint": "/api/v1/transfer",
                    "user_id": "user_fraud_demo",
                    "response_time_ms": 3500,
                    "status_code": 200,
                    "request_size_bytes": 1024,
                    "user_agent": "suspicious-bot/1.0",
                    "rate_limit_remaining": 2
                },
                {
                    "timestamp": "2025-01-15T14:35:18.234Z",
                    "api_endpoint": "/api/v1/transfer",
                    "user_id": "user_fraud_demo",
                    "response_time_ms": 4200,
                    "status_code": 200,
                    "request_size_bytes": 2048,
                    "anomaly": "rapid_successive_calls"
                }
            ],
            "messages": ["High API usage detected"],
            "fields": ["timestamp", "api_endpoint", "user_id", "response_time_ms"],
            "source": "sumologic_app"
        }


class MockSnowflakeClient:
    """Mock Snowflake client returning transaction and user data."""
    
    def __init__(self, account: str, user: str, password: str, warehouse: str):
        self.account = account
        self.database = None
        self.schema = None
        
    async def connect(self, database: str, schema: str):
        logger.info(f"❄️ Mock Snowflake connected (Transaction Data: {database}.{schema})")
        self.database = database
        self.schema = schema
        
    async def disconnect(self):
        pass
        
    async def execute_query(self, query: str) -> List[Dict[str, Any]]:
        """Return transaction and user profile data from Snowflake."""
        return [
            {
                "transaction_id": "TXN-2025-98765",
                "user_id": "user_fraud_demo",
                "amount": 9999.99,
                "currency": "USD",
                "recipient_account": "ACC-OFFSHORE-123",
                "transaction_date": "2025-01-15",
                "transaction_time": "14:35:20",
                "merchant_category": "WIRE_TRANSFER",
                "risk_flags": "high_amount,new_recipient,offshore_account"
            },
            {
                "user_id": "user_fraud_demo",
                "account_created": "2025-01-14",
                "account_age_days": 1,
                "total_transactions": 3,
                "avg_transaction_amount": 3500.00,
                "linked_accounts": 0,
                "kyc_status": "pending",
                "profile_completeness": 0.3
            }
        ]


class MockMultiToolLLM:
    """Mock LLM that decides to use multiple tools."""
    
    def __init__(self, tools: List[Any]):
        self.tools = tools
        self.tool_names = [tool.name for tool in tools]
        
    async def ainvoke(self, messages: List[Any], config: Any = None) -> 'MockMultiToolResponse':
        """Simulate LLM deciding to use multiple tools."""
        logger.info("🧠 LLM analyzing investigation requirements...")
        logger.info(f"🛠️ Available tools: {', '.join(self.tool_names)}")
        
        # Simulate thinking
        await asyncio.sleep(0.5)
        
        # Return response with multiple tool calls
        return MockMultiToolResponse(self.tool_names)


class MockMultiToolResponse:
    """Mock LLM response with multiple tool calls."""
    
    def __init__(self, tool_names: List[str]):
        self.content = """I need to gather comprehensive fraud intelligence from multiple sources:
1. Security events from Splunk to check for unauthorized access
2. Application behavior from SumoLogic to detect API abuse
3. Transaction history from Snowflake to identify financial fraud patterns

Let me query all three systems to get a complete picture."""
        
        # Generate tool calls for each available tool
        self.tool_calls = []
        
        if 'splunk_query_tool' in tool_names:
            self.tool_calls.append({
                "id": "call_splunk_001",
                "name": "splunk_query_tool",
                "args": {
                    "query": 'search index=security user_id="user_fraud_demo" (failed_login OR successful_login) | stats count by event_type, ip_address'
                }
            })
        
        if 'sumologic_query_tool' in tool_names:
            self.tool_calls.append({
                "id": "call_sumo_001", 
                "name": "sumologic_query_tool",
                "args": {
                    "query": '_sourceCategory=api/fraud user_id="user_fraud_demo" | timeslice 1m | count by _timeslice, api_endpoint',
                    "time_range": "-1h"
                }
            })
        
        if 'snowflake_query_tool' in tool_names:
            self.tool_calls.append({
                "id": "call_snow_001",
                "name": "snowflake_query_tool",
                "args": {
                    "query": """
                    SELECT t.*, u.account_age_days, u.kyc_status
                    FROM transactions t
                    JOIN users u ON t.user_id = u.user_id
                    WHERE t.user_id = 'user_fraud_demo'
                    AND t.amount > 1000
                    ORDER BY t.transaction_date DESC
                    """,
                    "database": "FRAUD_ANALYTICS",
                    "schema": "PUBLIC"
                }
            })
    
    @property
    def additional_content(self):
        """Additional content after tool execution."""
        return """
Based on the comprehensive data from all three sources:

🔒 **SPLUNK (Security Events)**:
- 5 failed login attempts from Russia before successful login
- Login from unknown device with suspicious location flags
- Clear pattern of brute force followed by account compromise

📊 **SUMOLOGIC (Application Behavior)**:
- Rapid API calls to transfer endpoint within seconds
- Abnormal user agent suggesting automated/bot activity  
- Rate limiting nearly exhausted (only 2 requests remaining)

❄️ **SNOWFLAKE (Transaction Data)**:
- $9,999.99 wire transfer to offshore account
- Account created just 1 day ago (brand new account)
- KYC verification still pending
- Multiple high-risk flags on transaction

🚨 **COMPREHENSIVE FRAUD ASSESSMENT**:
- **Risk Score**: 0.98/1.0 (CRITICAL)
- **Fraud Type**: Account Takeover + Money Mule
- **Confidence**: 0.99/1.0 (VERY HIGH)

**Evidence Correlation**:
1. Brute force attack from Russia (Splunk)
2. Successful compromise with new device (Splunk)
3. Immediate automated API activity (SumoLogic)
4. Large wire transfer to offshore account (Snowflake)
5. New account with pending KYC (Snowflake)

**IMMEDIATE ACTIONS REQUIRED**:
1. FREEZE account and all pending transactions
2. REVERSE the $9,999.99 wire transfer
3. BLOCK IP address 198.51.100.42
4. INITIATE fraud investigation protocol
5. NOTIFY law enforcement for potential money mule activity
"""


async def demonstrate_multi_tool_execution():
    """Demonstrate how LLM uses multiple tools in parallel."""
    
    print("=" * 80)
    print("🚀 MULTI-TOOL LLM DEMONSTRATION")
    print("=" * 80)
    print("This demo shows how the LLM intelligently uses MULTIPLE data sources\n")
    
    # 1. Setup all three tools
    print("📦 Step 1: Setting Up Multiple Tools")
    
    from app.service.agent.tools.splunk_tool.splunk_tool import SplunkQueryTool
    from app.service.agent.tools.sumologic_tool.sumologic_tool import SumoLogicQueryTool
    from app.service.agent.tools.snowflake_tool.snowflake_tool import SnowflakeQueryTool
    
    tools = [
        SplunkQueryTool(),
        SumoLogicQueryTool(), 
        SnowflakeQueryTool()
    ]
    
    print(f"   ✅ Configured {len(tools)} tools:")
    for tool in tools:
        print(f"      • {tool.name}: {tool.description[:60]}...")
    
    # 2. Create investigation context
    print("\n🔍 Step 2: Creating Fraud Investigation Context")
    print("   User: user_fraud_demo")
    print("   Suspicious Activity: Large wire transfer after account compromise")
    
    # 3. Mock all external clients
    print("\n🎭 Step 3: Mocking External Data Sources")
    
    with patch('app.service.agent.tools.splunk_tool.splunk_tool.SplunkClient', MockSplunkClient), \
         patch('app.service.agent.tools.sumologic_tool.sumologic_tool.SumoLogicClient', MockSumoLogicClient), \
         patch('app.service.agent.tools.snowflake_tool.snowflake_tool.SnowflakeClient', MockSnowflakeClient):
        
        # 4. Create mock LLM that will use all tools
        print("\n🤖 Step 4: LLM Analyzing Investigation Requirements")
        mock_llm = MockMultiToolLLM(tools)
        
        # 5. Simulate LLM deciding to use multiple tools
        messages = [{"role": "user", "content": "Investigate user_fraud_demo for potential fraud"}]
        response = await mock_llm.ainvoke(messages)
        
        print(f"\n💭 LLM Initial Analysis:")
        print(f"   {response.content}\n")
        
        # 6. Show the multiple tool calls
        print(f"🎯 LLM DECIDED TO USE {len(response.tool_calls)} TOOLS:")
        for i, tool_call in enumerate(response.tool_calls, 1):
            print(f"\n   📍 Tool Call #{i}:")
            print(f"      Tool: {tool_call['name']}")
            print(f"      ID: {tool_call['id']}")
            if 'query' in tool_call['args']:
                query_preview = tool_call['args']['query'][:100].replace('\n', ' ')
                print(f"      Query: {query_preview}...")
        
        # 7. Execute all tools (simulating parallel execution)
        print("\n⚡ EXECUTING ALL TOOLS IN PARALLEL...")
        print("=" * 60)
        
        tool_results = {}
        tool_map = {tool.name: tool for tool in tools}
        
        # Create tasks for parallel execution
        tasks = []
        for tool_call in response.tool_calls:
            tool_name = tool_call['name']
            tool = tool_map[tool_name]
            
            if tool_name == 'splunk_query_tool':
                task = tool._arun(tool_call['args']['query'])
            elif tool_name == 'sumologic_query_tool':
                task = tool._arun(
                    tool_call['args']['query'],
                    tool_call['args']['time_range']
                )
            elif tool_name == 'snowflake_query_tool':
                task = tool._arun(
                    tool_call['args']['query'],
                    tool_call['args']['database'],
                    tool_call['args']['schema']
                )
            
            tasks.append((tool_name, task))
        
        # Execute all tools in parallel
        for tool_name, task in tasks:
            print(f"\n🔄 Executing {tool_name}...")
            result = await task
            tool_results[tool_name] = result
            
            # Show summary of results
            if 'results' in result:
                count = len(result['results']) if isinstance(result['results'], list) else result.get('total_count', 0)
                print(f"   ✅ {tool_name} returned {count} results")
                
                # Show sample data
                if result['results'] and isinstance(result['results'], list):
                    first_result = result['results'][0]
                    print(f"   📋 Sample: {json.dumps(first_result, indent=6)[:200]}...")
        
        print("\n" + "=" * 60)
        print("✅ ALL TOOLS EXECUTED SUCCESSFULLY")
        
        # 8. Show combined analysis
        print("\n🧠 LLM FINAL ANALYSIS (After Processing All Tool Results):")
        print("=" * 80)
        print(response.additional_content)
        
        # 9. Summary
        print("\n" + "=" * 80)
        print("📊 DEMONSTRATION SUMMARY")
        print("=" * 80)
        print("✅ The LLM successfully:")
        print("   1. Identified the need for data from MULTIPLE sources")
        print("   2. Generated appropriate queries for EACH data source:")
        print("      • Splunk: Security events and login patterns")
        print("      • SumoLogic: API usage and application behavior")
        print("      • Snowflake: Transaction history and user profile")
        print("   3. Executed all tools to gather comprehensive data")
        print("   4. Correlated findings across all three sources")
        print("   5. Provided unified fraud assessment with 0.98 risk score")
        print("\n🎯 KEY INSIGHT: Multiple tools provide different perspectives:")
        print("   • Splunk → HOW the attack happened (security layer)")
        print("   • SumoLogic → WHAT the attacker did (application layer)")
        print("   • Snowflake → WHERE the money went (business layer)")


if __name__ == "__main__":
    asyncio.run(demonstrate_multi_tool_execution())