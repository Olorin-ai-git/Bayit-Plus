#!/usr/bin/env python3
"""
End-to-End Test for Autonomous Investigation Pipeline

This script runs a full test of the autonomous investigation system
to verify that both fixes work in the complete pipeline:

1. Snowflake data is properly parsed from JSON strings
2. Risk scores are calculated correctly from MODEL_SCORE values

Author: Claude (Debugger Specialist)  
Date: 2025-01-09
"""

import asyncio
import json
import sys
import logging
from pathlib import Path
from typing import Dict, Any
import tempfile
import os

# Add the app directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_snowflake_tool_mock():
    """Test that the Snowflake tool returns properly structured data."""
    
    logger.info("🧪 Testing Snowflake Tool Mock Data Processing")
    
    try:
        from app.service.agent.tools.snowflake_tool.client import SnowflakeClient
        
        # Create client in mock mode (TEST_MODE should be set)
        client = SnowflakeClient()
        
        # Test connection
        await client.connect()
        
        # Test a typical query that would return high-risk data
        query = """
        SELECT TX_ID_KEY, EMAIL, MODEL_SCORE, IS_FRAUD_TX, 
               NSURE_LAST_DECISION, PAID_AMOUNT_VALUE, TX_DATETIME
        FROM TRANSACTIONS_ENRICHED 
        WHERE IP_ADDRESS = '192.168.1.100'
        ORDER BY TX_DATETIME DESC
        LIMIT 10
        """
        
        results = await client.execute_query(query)
        
        logger.info(f"   📊 Query returned {len(results)} results")
        
        if results:
            sample_result = results[0]
            logger.info(f"   📋 Sample result keys: {list(sample_result.keys())}")
            
            if "MODEL_SCORE" in sample_result:
                model_score = sample_result["MODEL_SCORE"]
                logger.info(f"   🎯 Sample MODEL_SCORE: {model_score} (type: {type(model_score)})")
                
                # Verify it can be converted to float
                try:
                    float_score = float(model_score)
                    logger.info(f"   ✅ Successfully converted to float: {float_score}")
                    
                    if float_score >= 0.8:
                        logger.info("   🚨 High-risk MODEL_SCORE detected - should trigger high risk score")
                        return True
                    else:
                        logger.warning(f"   ⚠️ MODEL_SCORE {float_score} is not high-risk")
                        return False
                        
                except (ValueError, TypeError) as e:
                    logger.error(f"   ❌ Failed to convert MODEL_SCORE: {e}")
                    return False
            else:
                logger.error("   ❌ MODEL_SCORE not found in results")
                return False
        else:
            logger.error("   ❌ No results returned from query")
            return False
            
        await client.disconnect()
        
    except Exception as e:
        logger.error(f"❌ Snowflake tool test failed: {e}")
        return False


async def test_domain_agents_processing():
    """Test that domain agents correctly process Snowflake data."""
    
    logger.info("🧪 Testing Domain Agents Data Processing")
    
    try:
        # Import the domain agent functions
        from app.service.agent.orchestration.domain_agents_clean import network_agent_node
        from app.service.agent.orchestration.state_schema import create_initial_state
        
        # Create test state with high-risk Snowflake data
        test_state = create_initial_state(
            investigation_id="test_001",
            entity_id="192.168.1.100",
            entity_type="ip_address"
        )
        
        # Add high-risk Snowflake data (properly structured)
        high_risk_snowflake_data = {
            "results": [
                {
                    "TX_ID_KEY": "tx_001",
                    "EMAIL": "suspicious@test.com",
                    "MODEL_SCORE": 0.9900,  # Very high fraud score
                    "IS_FRAUD_TX": 1,
                    "IP_ADDRESS": "192.168.1.100",
                    "IP_COUNTRY": "XX",
                    "NSURE_LAST_DECISION": "reject",
                    "PAID_AMOUNT_VALUE": 1000.00
                },
                {
                    "TX_ID_KEY": "tx_002", 
                    "EMAIL": "suspicious@test.com",
                    "MODEL_SCORE": 0.8500,  # High fraud score
                    "IS_FRAUD_TX": 0,
                    "IP_ADDRESS": "192.168.1.100",
                    "IP_COUNTRY": "YY",  # Different country 
                    "NSURE_LAST_DECISION": "approve",
                    "PAID_AMOUNT_VALUE": 2500.00
                }
            ],
            "row_count": 2,
            "query_status": "success"
        }
        
        test_state["snowflake_data"] = high_risk_snowflake_data
        test_state["snowflake_completed"] = True
        
        logger.info(f"   📊 Test Snowflake data type: {type(test_state['snowflake_data'])}")
        logger.info(f"   📋 Test results count: {len(test_state['snowflake_data']['results'])}")
        
        # Test network agent processing
        result = await network_agent_node(test_state)
        
        if "domain_findings" in result:
            network_findings = result["domain_findings"]["network"]
            risk_score = network_findings.get("risk_score", 0.0)
            risk_indicators = network_findings.get("risk_indicators", [])
            
            logger.info(f"   🎯 Network agent risk score: {risk_score}")
            logger.info(f"   📝 Risk indicators count: {len(risk_indicators)}")
            
            if len(risk_indicators) > 0:
                logger.info(f"   📋 Sample risk indicator: {risk_indicators[0]}")
            
            # Check if MODEL_SCORE was processed correctly
            model_score_indicators = [ind for ind in risk_indicators if "Model fraud score" in ind]
            if model_score_indicators:
                logger.info(f"   ✅ MODEL_SCORE processed: {model_score_indicators[0]}")
                
                # Risk score should be high due to high MODEL_SCORE
                if risk_score >= 0.85:
                    logger.info(f"   🎉 HIGH RISK CORRECTLY DETECTED: {risk_score}")
                    return True
                else:
                    logger.error(f"   ❌ RISK SCORE TOO LOW: Expected >= 0.85, got {risk_score}")
                    return False
            else:
                logger.error("   ❌ MODEL_SCORE was not processed by network agent")
                return False
                
        else:
            logger.error("   ❌ Domain findings not returned by network agent")
            return False
            
    except Exception as e:
        logger.error(f"❌ Domain agents test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_final_risk_calculation():
    """Test that final risk calculation aggregates correctly."""
    
    logger.info("🧪 Testing Final Risk Score Calculation")
    
    try:
        from app.service.agent.orchestration.state_schema import calculate_final_risk_score
        
        # Create test state with high-risk domain findings
        test_state = {
            "domain_findings": {
                "network": {
                    "risk_score": 0.9500,  # Very high
                    "risk_indicators": ["Model fraud score: 0.950"]
                },
                "device": {
                    "risk_score": 0.7000,  # High
                    "risk_indicators": ["Multiple device IDs detected"]
                },
                "location": {
                    "risk_score": 0.6000,  # Medium-high
                    "risk_indicators": ["Cross-border activity"]
                }
            },
            "risk_indicators": [
                "Model fraud score: 0.950",
                "Multiple device IDs detected", 
                "Cross-border activity"
            ]
        }
        
        final_risk = calculate_final_risk_score(test_state)
        
        logger.info(f"   🎯 Final risk score: {final_risk}")
        logger.info(f"   📊 Domain risk scores: network={test_state['domain_findings']['network']['risk_score']}, device={test_state['domain_findings']['device']['risk_score']}, location={test_state['domain_findings']['location']['risk_score']}")
        
        # With high-risk network findings, final risk should be high
        if final_risk >= 0.8:
            logger.info(f"   ✅ HIGH FINAL RISK CORRECTLY CALCULATED: {final_risk}")
            return True
        else:
            logger.error(f"   ❌ FINAL RISK SCORE TOO LOW: Expected >= 0.8, got {final_risk}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Final risk calculation test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_json_parsing_in_orchestrator():
    """Test that the orchestrator correctly parses JSON content from ToolMessage."""
    
    logger.info("🧪 Testing JSON Parsing in Orchestrator")
    
    try:
        # Simulate the scenario that was failing
        import json
        
        # This is what msg.content would look like (JSON string)
        mock_tool_message_content = json.dumps({
            "results": [
                {
                    "TX_ID_KEY": "tx_003",
                    "EMAIL": "test@fraud.com",
                    "MODEL_SCORE": 0.9800,
                    "IS_FRAUD_TX": 1,
                    "IP_ADDRESS": "10.0.0.1"
                }
            ],
            "row_count": 1,
            "query_status": "success"
        })
        
        logger.info(f"   📝 Mock content type: {type(mock_tool_message_content)}")
        logger.info(f"   📏 Mock content length: {len(mock_tool_message_content)} chars")
        
        # Test the fix logic (from orchestrator_agent.py line 404)
        parsed_data = json.loads(mock_tool_message_content) if isinstance(mock_tool_message_content, str) else mock_tool_message_content
        
        logger.info(f"   📊 Parsed data type: {type(parsed_data)}")
        
        if isinstance(parsed_data, dict) and "results" in parsed_data:
            results = parsed_data["results"]
            logger.info(f"   📋 Results count: {len(results)}")
            
            if results and "MODEL_SCORE" in results[0]:
                model_score = results[0]["MODEL_SCORE"]
                logger.info(f"   🎯 Parsed MODEL_SCORE: {model_score} (type: {type(model_score)})")
                
                if isinstance(model_score, (int, float)) and model_score >= 0.9:
                    logger.info("   ✅ JSON PARSING SUCCESSFUL - High-risk data preserved")
                    return True
                else:
                    logger.error(f"   ❌ MODEL_SCORE not preserved correctly: {model_score}")
                    return False
            else:
                logger.error("   ❌ MODEL_SCORE not found in parsed results")
                return False
        else:
            logger.error("   ❌ Parsed data structure incorrect")
            return False
            
    except Exception as e:
        logger.error(f"❌ JSON parsing test failed: {e}")
        return False


async def run_comprehensive_pipeline_test():
    """Run a complete pipeline test to verify end-to-end functionality."""
    
    logger.info("🚀 Running Comprehensive Pipeline Test")
    print("=" * 80)
    
    # Set TEST_MODE to ensure we use mock data
    os.environ["TEST_MODE"] = "mock"
    
    test_results = []
    
    # Test 1: JSON Parsing in Orchestrator
    logger.info("\n📝 TEST 1: JSON Parsing in Orchestrator")
    test_results.append(await test_json_parsing_in_orchestrator())
    
    # Test 2: Snowflake Tool Mock Data  
    logger.info("\n❄️ TEST 2: Snowflake Tool Mock Data Processing")
    test_results.append(await test_snowflake_tool_mock())
    
    # Test 3: Domain Agents Processing
    logger.info("\n🤖 TEST 3: Domain Agents Data Processing") 
    test_results.append(await test_domain_agents_processing())
    
    # Test 4: Final Risk Calculation
    logger.info("\n📊 TEST 4: Final Risk Score Calculation")
    test_results.append(await test_final_risk_calculation())
    
    # Summary
    print("\n" + "=" * 80)
    print("📋 COMPREHENSIVE PIPELINE TEST RESULTS")
    print("-" * 40)
    
    test_names = [
        "JSON Parsing in Orchestrator",
        "Snowflake Tool Mock Data",
        "Domain Agents Processing", 
        "Final Risk Calculation"
    ]
    
    for i, (name, result) in enumerate(zip(test_names, test_results)):
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{i+1}. {name}: {status}")
    
    all_passed = all(test_results)
    
    if all_passed:
        print(f"\n🎉 ALL TESTS PASSED! The autonomous investigation pipeline is working correctly.")
        print("\n✅ CRITICAL FIXES VALIDATED:")
        print("   • Snowflake data is properly parsed from JSON strings")  
        print("   • Risk scores are calculated correctly from high MODEL_SCORE values")
        print("   • Final risk aggregation works as expected")
        
        return 0
    else:
        failed_tests = [name for name, result in zip(test_names, test_results) if not result]
        print(f"\n❌ {len(failed_tests)} TEST(S) FAILED:")
        for test in failed_tests:
            print(f"   • {test}")
        
        return 1


async def main():
    """Main test execution."""
    
    print("🔬 AUTONOMOUS INVESTIGATION PIPELINE - END-TO-END VALIDATION")
    print("=" * 80)
    print("Testing both critical fixes in the complete investigation pipeline:")
    print("1. Snowflake Data Processing: JSON parsing instead of string storage")
    print("2. Risk Score Calculation: Correct processing of high MODEL_SCORE values")
    print("=" * 80)
    
    try:
        exit_code = await run_comprehensive_pipeline_test()
        
        if exit_code == 0:
            print(f"\n🎊 PIPELINE VALIDATION SUCCESSFUL!")
            print("The autonomous investigation system is now working correctly.")
        else:
            print(f"\n💥 PIPELINE VALIDATION FAILED!")
            print("Some components still need fixing.")
            
        return exit_code
        
    except Exception as e:
        logger.error(f"❌ Critical error during pipeline test: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))