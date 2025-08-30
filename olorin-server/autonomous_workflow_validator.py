#!/usr/bin/env python3
"""
Autonomous Investigation Workflow Validator

Comprehensive end-to-end validation of the autonomous investigation workflow
to ensure it uses real APIs and LLM calls throughout.

This script:
1. Tests the complete frontend -> backend -> LLM flow
2. Monitors API calls being made
3. Validates real responses vs mock data
4. Creates a detailed validation report

Author: Gil Klainert  
Created: 2025-08-30
"""

import asyncio
import json
import logging
import os
import sys
import time
from datetime import datetime
from typing import Dict, List, Any, Optional
from urllib.parse import urljoin
import aiohttp
import websockets
from pprint import pformat

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class AutonomousWorkflowValidator:
    """Validates the autonomous investigation workflow end-to-end"""
    
    def __init__(self):
        self.base_url = "http://localhost:8090"
        self.api_base_url = f"{self.base_url}/v1"
        self.ws_base_url = "ws://localhost:8090"
        
        # Test configuration
        self.entity_id = "test_user_123456"
        self.entity_type = "user_id"
        self.parallel = True
        
        # Headers for API calls
        self.headers = {
            "Authorization": "Bearer test_token_12345",
            "Content-Type": "application/json",
            "olorin_tid": "validator_test_001",
            "olorin_experience_id": "validator_experience_001",
            "olorin_originating_assetalias": "Validator.Test.System",
        }
        
        # Tracking data
        self.api_calls_made: List[Dict[str, Any]] = []
        self.websocket_messages: List[Dict[str, Any]] = []
        self.llm_responses: List[Dict[str, Any]] = []
        self.investigation_id: Optional[str] = None
        self.validation_results: Dict[str, Any] = {}
        
    async def validate_complete_workflow(self) -> Dict[str, Any]:
        """Run complete end-to-end workflow validation"""
        logger.info("🔍 Starting Autonomous Investigation Workflow Validation")
        
        try:
            # Step 1: Test server availability
            await self._validate_server_availability()
            
            # Step 2: Start investigation via REST API
            await self._start_investigation()
            
            # Step 3: Monitor WebSocket communication
            await self._monitor_websocket_flow()
            
            # Step 4: Validate API calls and responses
            self._validate_api_responses()
            
            # Step 5: Check for real LLM usage
            self._validate_llm_usage()
            
            # Step 6: Generate validation report
            return self._generate_validation_report()
            
        except Exception as e:
            logger.error(f"❌ Workflow validation failed: {str(e)}")
            return {
                "status": "failed",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def _validate_server_availability(self):
        """Validate that both REST API and WebSocket servers are available"""
        logger.info("📡 Checking server availability...")
        
        async with aiohttp.ClientSession() as session:
            try:
                # Test REST API health
                async with session.get(f"{self.base_url}/health") as response:
                    if response.status == 200:
                        logger.info("✅ REST API server is available")
                    else:
                        logger.warning(f"⚠️ REST API returned status {response.status}")
                        
            except Exception as e:
                logger.error(f"❌ REST API unavailable: {str(e)}")
                raise
    
    async def _start_investigation(self):
        """Start the autonomous investigation via REST API"""
        logger.info(f"🚀 Starting investigation for {self.entity_type}: {self.entity_id}")
        
        async with aiohttp.ClientSession() as session:
            url = f"{self.api_base_url}/agent/start/{self.entity_id}"
            params = {"entity_type": self.entity_type}
            
            # Record API call
            api_call = {
                "timestamp": datetime.now().isoformat(),
                "method": "POST",
                "url": url,
                "params": params,
                "headers": dict(self.headers)
            }
            self.api_calls_made.append(api_call)
            
            try:
                async with session.post(url, headers=self.headers, params=params) as response:
                    response_data = await response.json()
                    
                    # Record response
                    api_call["response"] = {
                        "status": response.status,
                        "data": response_data
                    }
                    
                    if response.status == 200:
                        # Extract investigation ID from response
                        plain_text = response_data.get("agentOutput", {}).get("plainText", "")
                        self.investigation_id = self._extract_investigation_id(plain_text)
                        
                        logger.info(f"✅ Investigation started successfully: {self.investigation_id}")
                        return response_data
                    else:
                        logger.error(f"❌ Failed to start investigation: {response.status}")
                        raise Exception(f"Investigation start failed: {response.status}")
                        
            except Exception as e:
                api_call["error"] = str(e)
                logger.error(f"❌ API call failed: {str(e)}")
                raise
    
    def _extract_investigation_id(self, plain_text: str) -> Optional[str]:
        """Extract investigation ID from API response text"""
        import re
        
        # Look for investigation ID pattern
        patterns = [
            r"investigation[_\s]+([a-f0-9-]{36})",  # UUID format
            r"investigation[_\s]+([a-zA-Z0-9-]+)",  # General ID format
        ]
        
        for pattern in patterns:
            match = re.search(pattern, plain_text, re.IGNORECASE)
            if match:
                return match.group(1)
        
        return None
    
    async def _monitor_websocket_flow(self):
        """Monitor WebSocket communication for real-time updates"""
        if not self.investigation_id:
            logger.error("❌ No investigation ID available for WebSocket monitoring")
            return
            
        logger.info(f"🔗 Connecting to WebSocket for investigation: {self.investigation_id}")
        
        ws_url = f"{self.ws_base_url}/ws/{self.investigation_id}"
        if self.parallel:
            ws_url += "?parallel=true"
            
        try:
            timeout_seconds = 300  # 5 minutes timeout
            start_time = time.time()
            
            async with websockets.connect(ws_url, timeout=30) as websocket:
                logger.info("✅ WebSocket connected successfully")
                
                while time.time() - start_time < timeout_seconds:
                    try:
                        # Wait for message with timeout
                        message = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                        data = json.loads(message)
                        
                        # Store message
                        message_record = {
                            "timestamp": datetime.now().isoformat(),
                            "data": data,
                            "message_type": data.get("type", "unknown"),
                            "phase": data.get("phase", "unknown")
                        }
                        self.websocket_messages.append(message_record)
                        
                        # Log key information
                        phase = data.get("phase", "unknown")
                        progress = data.get("progress", 0)
                        message_text = data.get("message", "")
                        
                        logger.info(f"📡 [{phase.upper()}] {progress*100:.1f}% - {message_text}")
                        
                        # Look for LLM response data
                        if "agent_response" in data:
                            llm_response = {
                                "timestamp": datetime.now().isoformat(),
                                "phase": phase,
                                "response": data["agent_response"]
                            }
                            self.llm_responses.append(llm_response)
                            logger.info(f"🤖 LLM response captured for {phase}")
                        
                        # Check for completion
                        if phase == "completed":
                            logger.info("🎉 Investigation completed successfully")
                            break
                            
                    except asyncio.TimeoutError:
                        # Continue waiting - this is normal for long investigations
                        logger.debug("⏱️ WebSocket message timeout - continuing to wait...")
                        continue
                        
        except Exception as e:
            logger.error(f"❌ WebSocket monitoring failed: {str(e)}")
            raise
    
    def _validate_api_responses(self):
        """Validate that API calls received real responses, not mock data"""
        logger.info("🔍 Validating API responses...")
        
        self.validation_results["api_validation"] = {
            "total_api_calls": len(self.api_calls_made),
            "successful_calls": 0,
            "failed_calls": 0,
            "mock_data_detected": False,
            "real_data_confirmed": False
        }
        
        for call in self.api_calls_made:
            if "error" in call:
                self.validation_results["api_validation"]["failed_calls"] += 1
                continue
                
            if "response" in call and call["response"]["status"] == 200:
                self.validation_results["api_validation"]["successful_calls"] += 1
                
                # Check for signs of real vs mock data
                response_data = call["response"]["data"]
                
                # Real indicators:
                # - Unique IDs/timestamps
                # - Variable response times
                # - Natural language in responses
                # - Complex nested data structures
                
                if self._contains_real_data_indicators(response_data):
                    self.validation_results["api_validation"]["real_data_confirmed"] = True
                    
                if self._contains_mock_data_indicators(response_data):
                    self.validation_results["api_validation"]["mock_data_detected"] = True
    
    def _contains_real_data_indicators(self, data: Any) -> bool:
        """Check if response contains indicators of real data"""
        if isinstance(data, dict):
            # Look for unique identifiers, timestamps, trace IDs
            for key, value in data.items():
                if any(indicator in key.lower() for indicator in ["trace", "id", "timestamp"]):
                    if isinstance(value, str) and len(value) > 10:
                        return True
                        
            # Check for natural language responses
            if "agentOutput" in data and "plainText" in data["agentOutput"]:
                text = data["agentOutput"]["plainText"]
                if len(text) > 50 and not any(mock_word in text.lower() for mock_word in ["mock", "demo", "test", "example"]):
                    return True
                    
        return False
    
    def _contains_mock_data_indicators(self, data: Any) -> bool:
        """Check if response contains indicators of mock data"""
        data_str = json.dumps(data).lower()
        mock_indicators = ["mock", "demo", "test_", "example", "fake", "placeholder"]
        
        return any(indicator in data_str for indicator in mock_indicators)
    
    def _validate_llm_usage(self):
        """Validate that real LLM calls were made"""
        logger.info("🤖 Validating LLM usage...")
        
        self.validation_results["llm_validation"] = {
            "llm_responses_captured": len(self.llm_responses),
            "real_llm_confirmed": False,
            "response_quality_indicators": []
        }
        
        for response in self.llm_responses:
            # Check for signs of real LLM responses:
            # - Variable response lengths
            # - Complex reasoning patterns
            # - Natural language
            # - Confidence scores
            
            response_data = response.get("response", {})
            
            # Look for LLM-specific fields
            if any(field in response_data for field in ["confidence", "reasoning", "analysis", "risk_score"]):
                self.validation_results["llm_validation"]["real_llm_confirmed"] = True
                self.validation_results["llm_validation"]["response_quality_indicators"].append(
                    f"Phase {response['phase']}: Contains LLM analysis fields"
                )
    
    def _generate_validation_report(self) -> Dict[str, Any]:
        """Generate comprehensive validation report"""
        logger.info("📊 Generating validation report...")
        
        report = {
            "validation_timestamp": datetime.now().isoformat(),
            "test_configuration": {
                "entity_id": self.entity_id,
                "entity_type": self.entity_type,
                "parallel_execution": self.parallel,
                "investigation_id": self.investigation_id
            },
            "workflow_validation": {
                "rest_api_calls": len(self.api_calls_made),
                "websocket_messages": len(self.websocket_messages),
                "llm_responses": len(self.llm_responses),
                "investigation_completed": any(msg["data"].get("phase") == "completed" for msg in self.websocket_messages)
            },
            "api_validation": self.validation_results.get("api_validation", {}),
            "llm_validation": self.validation_results.get("llm_validation", {}),
            "detailed_data": {
                "api_calls": self.api_calls_made,
                "websocket_messages": [msg["data"] for msg in self.websocket_messages],
                "llm_responses": self.llm_responses
            }
        }
        
        # Determine overall validation status
        api_success = report["api_validation"].get("real_data_confirmed", False)
        llm_success = report["llm_validation"].get("real_llm_confirmed", False)
        workflow_success = report["workflow_validation"]["investigation_completed"]
        
        report["overall_status"] = "PASSED" if (api_success and llm_success and workflow_success) else "FAILED"
        
        # Save report to file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_filename = f"autonomous_workflow_validation_report_{timestamp}.json"
        
        with open(report_filename, 'w') as f:
            json.dump(report, f, indent=2)
            
        logger.info(f"📄 Validation report saved: {report_filename}")
        
        return report

async def main():
    """Main execution function"""
    logger.info("🚀 Starting Autonomous Investigation Workflow Validation")
    
    validator = AutonomousWorkflowValidator()
    
    try:
        report = await validator.validate_complete_workflow()
        
        # Print summary
        print("\n" + "="*80)
        print("AUTONOMOUS INVESTIGATION WORKFLOW VALIDATION RESULTS")
        print("="*80)
        print(f"Overall Status: {report.get('overall_status', 'UNKNOWN')}")
        print(f"Investigation ID: {report['test_configuration']['investigation_id']}")
        print(f"API Calls Made: {report['workflow_validation']['rest_api_calls']}")
        print(f"WebSocket Messages: {report['workflow_validation']['websocket_messages']}")
        print(f"LLM Responses: {report['workflow_validation']['llm_responses']}")
        print(f"Investigation Completed: {report['workflow_validation']['investigation_completed']}")
        
        if report.get("overall_status") == "PASSED":
            print("\n✅ VALIDATION PASSED - Real APIs and LLM confirmed in workflow")
        else:
            print("\n❌ VALIDATION FAILED - Issues detected in workflow")
            
        print("\nFor detailed results, check the generated JSON report.")
        print("="*80)
        
    except KeyboardInterrupt:
        logger.info("🛑 Validation interrupted by user")
    except Exception as e:
        logger.error(f"❌ Validation failed with error: {str(e)}")
        
if __name__ == "__main__":
    asyncio.run(main())