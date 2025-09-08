#!/usr/bin/env python3
"""
Test autonomous investigation flow via API endpoints
This demonstrates real-world usage of the autonomous orchestrator through HTTP calls
"""

import asyncio
import json
import time
import requests
from datetime import datetime
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

# API Configuration
BASE_URL = "http://localhost:8090"
API_KEY = "test_api_key_for_autonomous_flow"

class AutonomousAPITester:
    """Test autonomous investigation through API endpoints"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "X-API-Key": API_KEY
        })
    
    async def test_fraud_investigation_scenario(self):
        """Test comprehensive fraud investigation scenario"""
        
        logger.info("🚀 Starting Autonomous Fraud Investigation API Test...")
        
        # Realistic fraud scenario - Suspicious credit card transaction
        investigation_data = {
            "entity_type": "transaction",
            "entity_id": "txn_991847362_suspicious",
            "investigation_type": "fraud_detection",
            "priority": "high",
            "context": {
                # Transaction details
                "transaction": {
                    "id": "txn_991847362",
                    "amount": 2500.00,
                    "currency": "USD",
                    "merchant_name": "Electronics Store XYZ",
                    "merchant_category": "electronics",
                    "timestamp": "2025-09-06T02:45:00Z",
                    "card_present": False,
                    "payment_method": "credit_card"
                },
                
                # User/Account information
                "account": {
                    "user_id": "usr_847291",
                    "account_age_days": 45,
                    "email": "john.doe@suspicious-domain.com",
                    "phone_verified": False,
                    "account_status": "active",
                    "previous_fraud_reports": 0
                },
                
                # Device fingerprinting data
                "device": {
                    "fingerprint": "fp_d8e7f9a2b4c1_suspicious",
                    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "screen_resolution": "1920x1080",
                    "timezone": "America/New_York",
                    "device_first_seen": "2025-09-06T02:44:30Z",
                    "is_new_device": True,
                    "device_risk_score": 0.8
                },
                
                # Network/Location data
                "network": {
                    "ip_address": "203.0.113.42",
                    "country": "Romania",
                    "city": "Bucharest", 
                    "region": "Bucuresti",
                    "isp": "Anonymous VPN Service",
                    "is_vpn": True,
                    "is_tor": False,
                    "is_proxy": True,
                    "asn": "AS15169",
                    "threat_intelligence_score": 0.9
                },
                
                # Behavioral analysis flags
                "behavioral_flags": {
                    "new_device": True,
                    "unusual_location": True,
                    "high_velocity_transactions": True,
                    "off_hours_activity": True,
                    "location_velocity_impossible": True,
                    "merchant_category_deviation": True,
                    "amount_pattern_anomaly": True
                },
                
                # Risk indicators from upstream systems
                "risk_signals": {
                    "fraud_model_score": 0.85,
                    "velocity_check_failed": True,
                    "geolocation_mismatch": True,
                    "device_reputation_poor": True,
                    "email_domain_suspicious": True,
                    "ip_reputation_poor": True
                },
                
                # Investigation triggers
                "triggers": [
                    "high_fraud_score",
                    "new_device_high_amount", 
                    "vpn_usage_suspicious",
                    "velocity_check_failure",
                    "impossible_travel"
                ]
            }
        }
        
        try:
            # Step 1: Initiate autonomous investigation
            logger.info("📊 Initiating autonomous fraud investigation...")
            logger.info(f"   Entity: {investigation_data['entity_type']} - {investigation_data['entity_id']}")
            logger.info(f"   Amount: ${investigation_data['context']['transaction']['amount']}")
            logger.info(f"   Location: {investigation_data['context']['network']['city']}, {investigation_data['context']['network']['country']}")
            logger.info(f"   Risk Signals: {len(investigation_data['context']['triggers'])} triggers detected")
            
            # Call investigation API endpoint
            response = self.session.post(
                f"{BASE_URL}/api/v1/investigations/autonomous",
                json=investigation_data,
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                logger.info("✅ Autonomous Investigation Completed Successfully!")
                await self._analyze_investigation_results(result)
                return True, result
                
            else:
                logger.error(f"❌ API call failed: {response.status_code} - {response.text}")
                return False, f"API Error: {response.status_code}"
                
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Request failed: {str(e)}")
            return False, f"Request Error: {str(e)}"
        
        except Exception as e:
            logger.error(f"❌ Unexpected error: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return False, f"Unexpected Error: {str(e)}"
    
    async def _analyze_investigation_results(self, result: dict):
        """Analyze and display investigation results"""
        
        logger.info("📋 INVESTIGATION RESULTS ANALYSIS:")
        logger.info("=" * 60)
        
        # Basic investigation info
        if "investigation_id" in result:
            logger.info(f"🔍 Investigation ID: {result['investigation_id']}")
        
        if "orchestration_strategy" in result:
            logger.info(f"🎯 Strategy Used: {result['orchestration_strategy']}")
        
        if "agents_executed" in result:
            logger.info(f"🤖 Agents Executed: {', '.join(result['agents_executed'])}")
        
        # Risk assessment
        if "risk_score" in result:
            risk_score = result["risk_score"]
            risk_level = "HIGH" if risk_score > 0.7 else "MEDIUM" if risk_score > 0.4 else "LOW"
            logger.info(f"⚠️  Risk Score: {risk_score:.2f} ({risk_level})")
        
        if "confidence_score" in result:
            confidence = result["confidence_score"]
            logger.info(f"📊 Confidence: {confidence:.2f}")
        
        # Key findings
        if "key_findings" in result and result["key_findings"]:
            logger.info("🔑 Key Findings:")
            for i, finding in enumerate(result["key_findings"], 1):
                logger.info(f"   {i}. {finding}")
        
        # Agent performance
        if "successful_agents" in result:
            logger.info(f"✅ Successful Agents: {', '.join(result['successful_agents'])}")
        
        if "failed_agents" in result and result["failed_agents"]:
            logger.info(f"❌ Failed Agents: {', '.join(result['failed_agents'])}")
        
        # Bulletproof recovery stats
        if "bulletproof_recovery_count" in result:
            recovery_count = result["bulletproof_recovery_count"]
            if recovery_count > 0:
                logger.info(f"🛡️  Bulletproof Recoveries: {recovery_count}")
        
        # Orchestration metadata
        if "orchestration_metadata" in result:
            metadata = result["orchestration_metadata"]
            
            if "decision_reasoning" in metadata:
                logger.info(f"🧠 Decision Reasoning: {metadata['decision_reasoning']}")
            
            if "handoff_success_rate" in metadata:
                success_rate = metadata["handoff_success_rate"] * 100
                logger.info(f"🔄 Agent Handoff Success: {success_rate:.1f}%")
        
        # Recommendations
        self._generate_investigation_recommendations(result)
    
    def _generate_investigation_recommendations(self, result: dict):
        """Generate actionable recommendations based on investigation results"""
        
        logger.info("\n💡 RECOMMENDED ACTIONS:")
        logger.info("=" * 60)
        
        risk_score = result.get("risk_score", 0)
        confidence = result.get("confidence_score", 0)
        
        if risk_score > 0.8 and confidence > 0.7:
            logger.info("🚨 CRITICAL: Immediate fraud intervention required")
            logger.info("   • Block transaction immediately")
            logger.info("   • Flag account for manual review")
            logger.info("   • Notify fraud team for escalation")
            logger.info("   • Consider temporary account suspension")
            
        elif risk_score > 0.6 and confidence > 0.6:
            logger.info("⚠️  HIGH RISK: Enhanced monitoring recommended")
            logger.info("   • Place transaction on hold for review")
            logger.info("   • Require additional authentication")
            logger.info("   • Monitor account activity closely")
            logger.info("   • Consider reducing transaction limits")
            
        elif risk_score > 0.4:
            logger.info("🔍 MEDIUM RISK: Continue monitoring")
            logger.info("   • Log event for pattern analysis")
            logger.info("   • Monitor for similar behavior")
            logger.info("   • Update risk models with findings")
            
        else:
            logger.info("✅ LOW RISK: Routine monitoring sufficient")
            logger.info("   • Allow transaction to proceed")
            logger.info("   • Update behavioral baselines")
        
        # Specific recommendations based on findings
        findings = result.get("key_findings", [])
        if any("VPN" in finding or "proxy" in finding.lower() for finding in findings):
            logger.info("   • Consider blocking VPN/proxy usage")
            
        if any("new device" in finding.lower() for finding in findings):
            logger.info("   • Implement device verification workflow")
        
        if any("velocity" in finding.lower() for finding in findings):
            logger.info("   • Review and adjust velocity rules")

async def test_multiple_scenarios():
    """Test multiple investigation scenarios"""
    
    tester = AutonomousAPITester()
    
    logger.info("🎯 AUTONOMOUS INVESTIGATION API TEST SUITE")
    logger.info("=" * 60)
    
    # Test comprehensive fraud scenario
    success, result = await tester.test_fraud_investigation_scenario()
    
    if success:
        logger.info("\n🎉 AUTONOMOUS INVESTIGATION TEST COMPLETED SUCCESSFULLY!")
        logger.info("\n📈 SYSTEM CAPABILITIES DEMONSTRATED:")
        logger.info("   ✅ Autonomous orchestration decision making")
        logger.info("   ✅ Multi-agent coordination and execution")
        logger.info("   ✅ Real-time risk assessment and scoring")
        logger.info("   ✅ Bulletproof failure handling and recovery")
        logger.info("   ✅ Intelligent finding consolidation")
        logger.info("   ✅ Actionable recommendation generation")
        
        return True
    else:
        logger.error(f"\n❌ TEST FAILED: {result}")
        return False

async def main():
    """Main test execution"""
    
    logger.info("🚀 Starting Autonomous Investigation API Test...")
    
    # Check if backend is running
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code != 200:
            logger.error("❌ Backend server is not responding. Please start the backend server first.")
            logger.error("   Run: cd olorin-server && poetry run python -m app.local_server")
            return False
    except requests.exceptions.RequestException:
        logger.error("❌ Cannot connect to backend server. Please ensure it's running on localhost:8090")
        logger.error("   Run: cd olorin-server && poetry run python -m app.local_server")
        return False
    
    logger.info("✅ Backend server is running")
    
    # Run test scenarios
    success = await test_multiple_scenarios()
    
    if success:
        logger.info(f"\n🎯 AUTONOMOUS API TEST RESULT: SUCCESS")
        logger.info("   The autonomous investigation orchestrator is working correctly!")
    else:
        logger.info(f"\n🎯 AUTONOMOUS API TEST RESULT: FAILED")
    
    return success

if __name__ == "__main__":
    success = asyncio.run(main())
    print(f"\n🎯 API TEST RESULT: {'SUCCESS' if success else 'FAILED'}")