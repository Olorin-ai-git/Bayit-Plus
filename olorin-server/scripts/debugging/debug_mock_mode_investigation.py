#!/usr/bin/env python3
"""
Mock Mode Investigation Debugging Script

<<<<<<< HEAD
This script debugs the mock mode autonomous investigation flow to understand
=======
This script debugs the mock mode structured investigation flow to understand
>>>>>>> 001-modify-analyzer-method
why "No results available" is being generated.

SAFETY: This script ONLY runs in TEST_MODE=mock - no real LLM API calls.
"""

import os
import sys
import asyncio
from pathlib import Path

# CRITICAL: Set TEST_MODE before any agent imports
os.environ["TEST_MODE"] = "mock"
os.environ["USE_SNOWFLAKE"] = "false"

# Add paths for imports
sys.path.insert(0, str(Path(__file__).parent))

from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.hybrid.migration_utilities import get_investigation_graph
from app.service.agent.orchestration.state_schema import create_initial_state

logger = get_bridge_logger(__name__)

async def debug_mock_investigation():
    """Debug mock mode investigation flow step by step."""
    
    print("🎭 MOCK MODE INVESTIGATION DEBUG")
    print("=" * 50)
    
    # Step 1: Verify environment
    test_mode = os.getenv("TEST_MODE")
    use_snowflake = os.getenv("USE_SNOWFLAKE")
    print(f"✅ TEST_MODE: {test_mode}")
    print(f"✅ USE_SNOWFLAKE: {use_snowflake}")
    print()
    
    # Step 2: Create test investigation
    investigation_id = "debug_mock_test_123"
    entity_id = "192.168.1.100"
    entity_type = "ip"
    
    print(f"🔍 Creating test investigation:")
    print(f"   Investigation ID: {investigation_id}")
    print(f"   Entity: {entity_type} - {entity_id}")
    print()
    
    # Step 3: Get investigation graph
    try:
        graph = await get_investigation_graph(investigation_id, entity_type)
        print(f"✅ Investigation graph created: {type(graph)}")
        print()
    except Exception as e:
        print(f"❌ Failed to create investigation graph: {e}")
        return
    
    # Step 4: Create initial state
    try:
        initial_state = create_initial_state(
            investigation_id=investigation_id,
            entity_id=entity_id,
            entity_type=entity_type
        )
        print(f"✅ Initial state created")
        print(f"   State keys: {list(initial_state.keys())}")
        print(f"   Entity ID: {initial_state.get('entity_id')}")
        print(f"   Entity Type: {initial_state.get('entity_type')}")
        print()
    except Exception as e:
        print(f"❌ Failed to create initial state: {e}")
        return
    
    # Step 5: Run limited investigation (just network agent)
    try:
        print("🚀 Running limited investigation (1 step only)...")
        
        # Create thread config for LangGraph
        config = {"configurable": {"thread_id": f"debug_{investigation_id}"}}
        
        # Run one step of the graph
        result = await graph.ainvoke(initial_state, config=config)
        
        print(f"✅ Investigation step completed")
        print(f"   Result type: {type(result)}")
        print(f"   Result keys: {list(result.keys())}")
        print()
        
        # Step 6: Analyze results
        print("📊 ANALYSIS RESULTS:")
        print("-" * 30)
        
        # Check domain findings
        domain_findings = result.get("domain_findings", {})
        print(f"Domain findings: {len(domain_findings)} domains")
        for domain, findings in domain_findings.items():
            risk_score = findings.get("risk_score", "N/A")
            print(f"  - {domain}: risk_score = {risk_score}")
        print()
        
        # Check domains completed
        domains_completed = result.get("domains_completed", [])
        print(f"Domains completed: {domains_completed}")
        print()
        
        # Check current phase
        current_phase = result.get("current_phase", "unknown")
        print(f"Current phase: {current_phase}")
        print()
        
        # Check messages
        messages = result.get("messages", [])
        print(f"Messages: {len(messages)} total")
        if messages:
            last_msg = messages[-1]
            print(f"  Last message type: {type(last_msg).__name__}")
            if hasattr(last_msg, 'content'):
                content_preview = str(last_msg.content)[:200] + "..." if len(str(last_msg.content)) > 200 else str(last_msg.content)
                print(f"  Content preview: {content_preview}")
        print()
        
        # Step 7: Test agent result extraction (like the test runner does)
        print("🔧 TESTING AGENT RESULT EXTRACTION:")
        print("-" * 40)
        
        expected_domains = ["network", "device", "location", "logs", "risk_aggregation"]
        agent_results = {}
        
        # Extract domain findings
        for domain in expected_domains:
            if domain in domain_findings:
                findings = domain_findings[domain]
                agent_results[domain] = {
                    "findings": findings,
                    "duration": 1.0,
                    "status": "success" if domain in domains_completed else "partial",
                    "risk_score": findings.get("risk_score", 0.0),
                    "confidence": findings.get("confidence", 0.0)
                }
                print(f"✅ {domain}: SUCCESS (risk: {findings.get('risk_score', 0.0)})")
            else:
                # This is where "no_results" comes from!
                agent_results[domain] = {
                    "findings": {"messages": [{"content": f"No {domain} analysis results available"}]},
                    "duration": 0.0,
                    "status": "no_results",
                    "risk_score": 0.0,
                    "confidence": 0.0
                }
                print(f"❌ {domain}: NO RESULTS")
        
        print()
        print("🎯 DIAGNOSIS:")
        print("-" * 20)
        
        successful_domains = [d for d in expected_domains if d in domain_findings]
        failed_domains = [d for d in expected_domains if d not in domain_findings]
        
        print(f"✅ Successful domains ({len(successful_domains)}): {successful_domains}")
        print(f"❌ Failed domains ({len(failed_domains)}): {failed_domains}")
        print()
        
        if failed_domains:
            print("🚨 ROOT CAUSE IDENTIFIED:")
            print(f"   The clean graph only executed {len(successful_domains)} domains")
            print(f"   But the test runner expects all {len(expected_domains)} domains")
            print(f"   Missing domains get 'no_results' status → validation fails")
            print()
            print("🔧 SOLUTION NEEDED:")
            print("   1. Mock mode should complete all expected domains, OR")
            print("   2. Test runner should not expect all domains in mock mode, OR")
            print("   3. Enhanced validation should accept partial domains in mock mode")
        else:
            print("✅ All domains completed successfully!")
        
    except Exception as e:
        print(f"❌ Investigation execution failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print(f"🎭 Mock Mode Debug - TEST_MODE={os.getenv('TEST_MODE')}")
    asyncio.run(debug_mock_investigation())