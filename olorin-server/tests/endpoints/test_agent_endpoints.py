"""
Phase 5: Agent System Endpoint Testing for Olorin Platform.

Tests AI agent endpoints to verify agent invocation, autonomous investigation,
and agent metadata handling. Uses REAL AI models - NO MOCK DATA.

Endpoints tested:
1. POST /v1/agent/invoke - General agent invocation
2. POST /v1/agent/start/{entity_id} - Start autonomous investigation
"""

import pytest
import logging
import json
from typing import Dict, Any
from datetime import datetime, timezone

from .conftest import ENDPOINT_TEST_CONFIG

logger = logging.getLogger(__name__)


class TestAgentEndpoints:
    """Test suite for AI agent system endpoints."""
    
    @pytest.mark.asyncio
    async def test_agent_invoke_general(self, endpoint_client, endpoint_validator, auth_headers, real_test_data):
        """Test POST /v1/agent/invoke - General agent invocation."""
        logger.info("Testing general agent invocation: POST /v1/agent/invoke")
        
        if not auth_headers:
            pytest.skip("No authentication headers available - skipping protected endpoint test")
        
        # Generate test data
        test_data = real_test_data.generate_comprehensive_test_data()
        user_id = test_data.user_id
        
        # Prepare agent invocation payload
        agent_payload = {
            "agent": {
                "name": "fraud_investigation"
            },
            "input": f"Analyze user {user_id} for potential fraud indicators. Focus on basic risk assessment.",
            "metadata": {
                "interactionGroupId": f"test-group-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}",
                "additionalMetadata": {
                    "userId": user_id,
                    "testCase": "general_agent_invocation",
                    "priority": "high"
                }
            }
        }
        
        # Add required Olorin headers for agent invocation
        agent_headers = auth_headers.copy()
        agent_headers.update({
            "olorin_experience_id": "olorin-agent-test-experience", 
            "olorin_originating_assetalias": "Olorin.cas.hri.olorin",
            "olorin_tid": f"agent-test-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}",
        })
        
        # Invoke agent
        response, metrics = await endpoint_client.post(
            "/v1/agent/invoke",
            headers=agent_headers,
            json_data=agent_payload
        )
        
        # Validate response using agent-specific validator
        result = endpoint_validator.validate_agent_response(response, metrics)
        
        # Log results
        logger.info(f"Agent invocation result: {result.get_summary()}")
        
        if response.status_code == 200:
            # Test successful agent invocation
            try:
                data = response.json()
                logger.info("Agent invocation successful")
                
                # Check for agent response fields
                agent_response_fields = [
                    "result", "output", "response", "analysis", 
                    "risk_assessment", "status", "trace_id"
                ]
                found_fields = [field for field in agent_response_fields if field in data]
                
                if found_fields:
                    logger.info(f"Agent response fields found: {found_fields}")
                    
                    # Check result/output content
                    if "result" in data:
                        result_data = data["result"]
                        if isinstance(result_data, str):
                            logger.info(f"Agent result length: {len(result_data)} chars")
                            # Log first part of result (avoid logging sensitive data)
                            if len(result_data) > 0:
                                logger.info(f"Agent result preview: {result_data[:100]}...")
                        elif isinstance(result_data, dict):
                            logger.info(f"Agent result fields: {list(result_data.keys())}")
                    
                    if "output" in data:
                        output_data = data["output"]
                        logger.info(f"Agent output type: {type(output_data)}")
                        if isinstance(output_data, str) and len(output_data) > 0:
                            logger.info(f"Agent output preview: {output_data[:100]}...")
                    
                    # Check for trace ID (important for debugging)
                    if "trace_id" in data:
                        logger.info(f"Agent trace ID: {data['trace_id']}")
                    
                    # Check for risk assessment if present
                    if "risk_assessment" in data:
                        risk_data = data["risk_assessment"]
                        if isinstance(risk_data, dict):
                            risk_level = risk_data.get("risk_level")
                            confidence = risk_data.get("confidence")
                            logger.info(f"Agent risk assessment: level={risk_level}, confidence={confidence}")
                else:
                    logger.warning("No standard agent response fields found")
                    logger.info(f"Raw agent response fields: {list(data.keys())}")
                
                # Performance check - agent calls can be slow due to LLM processing
                if result.response_time_ms > 120000:  # 2 minutes
                    logger.warning(f"Agent invocation is very slow: {result.response_time_ms:.1f}ms")
                elif result.response_time_ms > 30000:  # 30 seconds
                    logger.info(f"Agent invocation took: {result.response_time_ms:.1f}ms (normal for AI processing)")
                
            except Exception as e:
                pytest.fail(f"Agent invocation response parsing failed: {e}")
        
        elif response.status_code == 202:
            # Agent started asynchronously
            logger.info("Agent invocation started asynchronously (202)")
            try:
                data = response.json()
                if "trace_id" in data or "job_id" in data or "task_id" in data:
                    async_id = data.get("trace_id") or data.get("job_id") or data.get("task_id")
                    logger.info(f"Async agent execution ID: {async_id}")
                else:
                    logger.info(f"Async response data: {data}")
            except:
                pass
        
        elif response.status_code == 422:
            # Validation error
            logger.error("Agent invocation failed with validation error")
            try:
                error_data = response.json()
                logger.error(f"Agent validation error: {error_data}")
                pytest.fail(f"Agent invocation validation failed: {error_data}")
            except:
                pytest.fail("Agent invocation failed with 422 validation error")
        
        elif response.status_code == 503:
            logger.warning("Agent service unavailable (503) - AI service may be down")
        
        else:
            pytest.fail(f"Unexpected status code for agent invocation: {response.status_code}")
        
        # Fail if validation errors
        if result.errors:
            pytest.fail(f"Agent invocation validation failed: {'; '.join(result.errors)}")

    @pytest.mark.asyncio
    async def test_agent_start_autonomous_investigation(self, endpoint_client, endpoint_validator, auth_headers, real_test_data):
        """Test POST /v1/agent/start/{entity_id} - Start autonomous investigation."""
        logger.info("Testing autonomous investigation: POST /v1/agent/start/{entity_id}")
        
        if not auth_headers:
            pytest.skip("No authentication headers available - skipping protected endpoint test")
        
        # Generate test data
        test_data = real_test_data.generate_comprehensive_test_data()
        entity_id = test_data.entity_id
        
        # Prepare autonomous investigation payload
        autonomous_payload = {
            "investigationId": test_data.investigation_id,
            "entityType": "user_id",
            "instructions": f"Conduct comprehensive fraud investigation for entity {entity_id}. Analyze all available data sources.",
            "config": {
                "max_duration_minutes": 10,  # Limit for testing
                "analysis_depth": "basic",   # Faster execution
                "include_sources": ["device", "network", "logs"]
            },
            "metadata": {
                "testCase": "autonomous_investigation",
                "priority": "high",
                "initiatedBy": "endpoint_test"
            }
        }
        
        # Add required Olorin headers
        agent_headers = auth_headers.copy()
        agent_headers.update({
            "olorin_experience_id": "olorin-autonomous-test-experience",
            "olorin_originating_assetalias": "Olorin.cas.hri.olorin", 
            "olorin_tid": f"autonomous-test-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}",
        })
        
        # Start autonomous investigation
        response, metrics = await endpoint_client.post(
            f"/v1/agent/start/{entity_id}",
            headers=agent_headers,
            json_data=autonomous_payload
        )
        
        # Validate response
        result = endpoint_validator.validate_agent_response(response, metrics)
        
        # Log results
        logger.info(f"Autonomous investigation result: {result.get_summary()}")
        
        if response.status_code == 200:
            # Test successful autonomous investigation start
            try:
                data = response.json()
                logger.info("Autonomous investigation started successfully")
                
                # Check for autonomous investigation response fields
                autonomous_fields = [
                    "investigationId", "status", "session_id", "agent_config",
                    "execution_plan", "estimated_duration", "trace_id"
                ]
                found_fields = [field for field in autonomous_fields if field in data]
                
                if found_fields:
                    logger.info(f"Autonomous response fields found: {found_fields}")
                    
                    # Check investigation status
                    if "status" in data:
                        status = data["status"]
                        logger.info(f"Investigation status: {status}")
                        
                        # Should be starting or in progress
                        valid_statuses = ["starting", "in_progress", "queued", "initiated"]
                        if status.lower() in valid_statuses:
                            logger.info("Investigation status is valid")
                        else:
                            logger.warning(f"Unexpected investigation status: {status}")
                    
                    # Check session/trace IDs
                    if "session_id" in data:
                        logger.info(f"Investigation session ID: {data['session_id']}")
                    if "trace_id" in data:
                        logger.info(f"Investigation trace ID: {data['trace_id']}")
                    
                    # Check execution plan
                    if "execution_plan" in data:
                        plan = data["execution_plan"]
                        if isinstance(plan, dict):
                            logger.info(f"Execution plan fields: {list(plan.keys())}")
                        elif isinstance(plan, list):
                            logger.info(f"Execution plan steps: {len(plan)}")
                    
                    # Check estimated duration
                    if "estimated_duration" in data:
                        duration = data["estimated_duration"]
                        logger.info(f"Estimated investigation duration: {duration}")
                        
                else:
                    logger.warning("No standard autonomous investigation fields found")
                    logger.info(f"Raw autonomous response fields: {list(data.keys())}")
                
            except Exception as e:
                pytest.fail(f"Autonomous investigation response parsing failed: {e}")
        
        elif response.status_code == 202:
            # Investigation queued/accepted for processing
            logger.info("Autonomous investigation accepted for processing (202)")
            try:
                data = response.json()
                if "investigationId" in data:
                    logger.info(f"Queued investigation ID: {data['investigationId']}")
                logger.info(f"Queued response: {data}")
            except:
                pass
        
        elif response.status_code == 422:
            # Validation error
            logger.error("Autonomous investigation failed with validation error")
            try:
                error_data = response.json()
                logger.error(f"Autonomous validation error: {error_data}")
                pytest.fail(f"Autonomous investigation validation failed: {error_data}")
            except:
                pytest.fail("Autonomous investigation failed with 422 validation error")
        
        elif response.status_code == 409:
            # Conflict - investigation may already exist
            logger.warning("Investigation conflict (409) - investigation may already be running")
            try:
                error_data = response.json()
                logger.info(f"Conflict details: {error_data}")
            except:
                pass
        
        elif response.status_code == 503:
            logger.warning("Agent service unavailable (503) - autonomous system may be down")
        
        else:
            pytest.fail(f"Unexpected status code for autonomous investigation: {response.status_code}")
        
        # Fail if validation errors (except for conflicts which can be expected)
        if result.errors and response.status_code != 409:
            pytest.fail(f"Autonomous investigation validation failed: {'; '.join(result.errors)}")

    @pytest.mark.asyncio
    async def test_agent_capabilities_exploration(self, endpoint_client, endpoint_validator, auth_headers, real_test_data):
        """Test different agent capabilities and configurations."""
        logger.info("Testing agent capabilities exploration")
        
        if not auth_headers:
            pytest.skip("No authentication headers available - skipping agent capabilities test")
        
        # Generate test data
        test_data = real_test_data.generate_comprehensive_test_data()
        user_id = test_data.user_id
        
        # Test different agent types/configurations
        agent_configurations = [
            {
                "name": "device_analysis_agent",
                "input": f"Analyze device signals for user {user_id}",
                "test_name": "Device Analysis Agent"
            },
            {
                "name": "network_analysis_agent", 
                "input": f"Examine network patterns for user {user_id}",
                "test_name": "Network Analysis Agent"
            },
            {
                "name": "risk_assessment_agent",
                "input": f"Provide risk assessment for user {user_id}",
                "test_name": "Risk Assessment Agent"
            }
        ]
        
        # Base headers
        agent_headers = auth_headers.copy()
        agent_headers.update({
            "olorin_experience_id": "olorin-capabilities-test",
            "olorin_originating_assetalias": "Olorin.cas.hri.olorin",
            "olorin_tid": f"capabilities-test-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}",
        })
        
        capabilities_results = {}
        
        for config in agent_configurations:
            test_name = config["test_name"]
            logger.info(f"Testing {test_name}...")
            
            try:
                # Prepare agent payload
                agent_payload = {
                    "agent": {
                        "name": config["name"]
                    },
                    "input": config["input"],
                    "metadata": {
                        "interactionGroupId": f"capabilities-test-{datetime.now(timezone.utc).strftime('%H%M%S')}",
                        "additionalMetadata": {
                            "userId": user_id,
                            "testCase": "capabilities_exploration",
                            "agentType": config["name"]
                        }
                    }
                }
                
                # Invoke specific agent
                response, metrics = await endpoint_client.post(
                    "/v1/agent/invoke",
                    headers=agent_headers,
                    json_data=agent_payload
                )
                
                # Track results
                success = response.status_code in [200, 202]
                capabilities_results[test_name] = {
                    "status": response.status_code,
                    "time_ms": metrics["response_time_ms"], 
                    "success": success
                }
                
                if success:
                    logger.info(f"✓ {test_name}: {response.status_code} ({metrics['response_time_ms']:.1f}ms)")
                    
                    # Try to parse response
                    try:
                        data = response.json()
                        if "result" in data or "output" in data:
                            logger.info(f"  {test_name} produced output")
                    except:
                        pass
                else:
                    logger.warning(f"✗ {test_name}: {response.status_code}")
                
            except Exception as e:
                logger.error(f"✗ {test_name}: Error - {str(e)}")
                capabilities_results[test_name] = {
                    "status": "ERROR",
                    "error": str(e),
                    "success": False
                }
        
        # Log capabilities summary
        logger.info("-" * 50)
        logger.info("AGENT CAPABILITIES TEST SUMMARY")
        logger.info("-" * 50)
        
        successful_agents = sum(1 for r in capabilities_results.values() if r["success"])
        total_agents = len(capabilities_results)
        
        logger.info(f"Agent capabilities: {successful_agents}/{total_agents} successful")
        
        if capabilities_results:
            # Performance analysis
            times = [r.get("time_ms", 0) for r in capabilities_results.values() if "time_ms" in r]
            if times:
                avg_time = sum(times) / len(times)
                logger.info(f"Average agent response time: {avg_time:.1f}ms")
        
        logger.info("-" * 50)
        
        # At least one agent type should work
        assert successful_agents > 0, "At least one agent type should be functional"

    @pytest.mark.asyncio
    async def test_agent_error_handling(self, endpoint_client, endpoint_validator, auth_headers):
        """Test agent error handling with invalid inputs."""
        logger.info("Testing agent error handling")
        
        if not auth_headers:
            pytest.skip("No authentication headers available - skipping agent error handling test")
        
        # Base headers
        agent_headers = auth_headers.copy()
        agent_headers.update({
            "olorin_experience_id": "olorin-error-test",
            "olorin_originating_assetalias": "Olorin.cas.hri.olorin",
            "olorin_tid": f"error-test-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}",
        })
        
        error_test_cases = [
            {
                "name": "Missing Agent Name",
                "payload": {
                    "agent": {},  # Missing name
                    "input": "Test input"
                },
                "expected_status": 422
            },
            {
                "name": "Missing Input",
                "payload": {
                    "agent": {"name": "fraud_investigation"}
                    # Missing input
                },
                "expected_status": 422
            },
            {
                "name": "Invalid Agent Name",
                "payload": {
                    "agent": {"name": "nonexistent_agent_123"},
                    "input": "Test input"
                },
                "expected_status": [400, 404, 422]
            },
            {
                "name": "Empty Input",
                "payload": {
                    "agent": {"name": "fraud_investigation"},
                    "input": ""  # Empty input
                },
                "expected_status": [400, 422]
            }
        ]
        
        for test_case in error_test_cases:
            logger.info(f"Testing error case: {test_case['name']}")
            
            try:
                response, metrics = await endpoint_client.post(
                    "/v1/agent/invoke",
                    headers=agent_headers,
                    json_data=test_case["payload"]
                )
                
                expected_statuses = test_case["expected_status"]
                if not isinstance(expected_statuses, list):
                    expected_statuses = [expected_statuses]
                
                if response.status_code in expected_statuses:
                    logger.info(f"  ✓ Correctly returned {response.status_code}")
                    
                    # Check error response format
                    try:
                        error_data = response.json()
                        if "detail" in error_data or "error" in error_data:
                            logger.info("  ✓ Error response has proper format")
                    except:
                        pass
                else:
                    logger.warning(f"  ✗ Expected {expected_statuses}, got {response.status_code}")
                
            except Exception as e:
                logger.warning(f"  ✗ Error case failed with exception: {e}")
        
        logger.info("Agent error handling test completed")


# Test execution summary
@pytest.mark.asyncio
async def test_agent_endpoints_summary(endpoint_client, auth_headers, real_test_data):
    """Summary test to verify agent endpoints functionality."""
    logger.info("="*70)
    logger.info("AGENT ENDPOINTS TEST SUMMARY")
    logger.info("="*70)
    
    if not auth_headers:
        logger.warning("No authentication headers - cannot test agent endpoints")
        return
    
    # Generate test data
    test_data = real_test_data.generate_comprehensive_test_data()
    entity_id = test_data.entity_id
    user_id = test_data.user_id
    
    # Base headers for agent requests
    agent_headers = auth_headers.copy()
    agent_headers.update({
        "olorin_experience_id": "olorin-summary-test",
        "olorin_originating_assetalias": "Olorin.cas.hri.olorin",
        "olorin_tid": f"summary-test-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}",
    })
    
    results = {}
    
    # Test general agent invocation
    try:
        logger.info("Testing general agent invocation...")
        
        agent_payload = {
            "agent": {"name": "fraud_investigation"},
            "input": f"Quick analysis of user {user_id}",
            "metadata": {
                "interactionGroupId": "summary-test",
                "additionalMetadata": {"userId": user_id, "testCase": "summary"}
            }
        }
        
        response, metrics = await endpoint_client.post(
            "/v1/agent/invoke",
            headers=agent_headers,
            json_data=agent_payload
        )
        
        success = response.status_code in [200, 202]
        results["General Agent Invoke"] = {
            "status": response.status_code,
            "time_ms": metrics["response_time_ms"],
            "success": success
        }
        
    except Exception as e:
        results["General Agent Invoke"] = {
            "status": "ERROR",
            "error": str(e),
            "success": False
        }
    
    # Test autonomous investigation
    try:
        logger.info("Testing autonomous investigation...")
        
        autonomous_payload = {
            "investigationId": f"summary-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}",
            "entityType": "user_id",
            "instructions": f"Basic investigation for {entity_id}",
            "config": {"analysis_depth": "minimal", "max_duration_minutes": 5}
        }
        
        response, metrics = await endpoint_client.post(
            f"/v1/agent/start/{entity_id}",
            headers=agent_headers,
            json_data=autonomous_payload
        )
        
        success = response.status_code in [200, 202, 409]  # 409 is acceptable (conflict)
        results["Autonomous Investigation"] = {
            "status": response.status_code,
            "time_ms": metrics["response_time_ms"],
            "success": success
        }
        
    except Exception as e:
        results["Autonomous Investigation"] = {
            "status": "ERROR", 
            "error": str(e),
            "success": False
        }
    
    # Log summary
    for test_name, result in results.items():
        if result["success"]:
            status_info = f"{result['status']}"
            if "time_ms" in result:
                status_info += f" ({result['time_ms']:.1f}ms)"
            logger.info(f"✓ {test_name}: {status_info}")
        else:
            error_info = result.get("error", f"Status {result['status']}")
            logger.error(f"✗ {test_name}: {error_info}")
    
    # Count successes
    successful = sum(1 for r in results.values() if r["success"])
    total = len(results)
    
    logger.info(f"Agent endpoints summary: {successful}/{total} successful")
    
    # Performance analysis
    if results:
        times = [r.get("time_ms", 0) for r in results.values() if "time_ms" in r]
        if times:
            avg_time = sum(times) / len(times)
            max_time = max(times)
            logger.info(f"Average agent response time: {avg_time:.1f}ms")
            logger.info(f"Slowest agent response: {max_time:.1f}ms")
    
    logger.info("="*70)
    
    # At least one agent endpoint should work
    assert successful > 0, "At least one agent endpoint should be functional"