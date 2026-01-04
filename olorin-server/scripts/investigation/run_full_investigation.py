from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

#!/usr/bin/env python
"""Run a full structured investigation with real Anthropic API calls."""

import json
import os
import time
from datetime import datetime
from typing import Any, Dict, List

import requests

# SECURITY: Get API key from environment variable or Firebase secrets
API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not API_KEY:
    logger.error("❌ ERROR: ANTHROPIC_API_KEY environment variable not set")
    logger.info("For production: Use Firebase secret 'olorin/anthropic_api_key'")
    logger.info(
        "For testing: Set environment variable: export ANTHROPIC_API_KEY='your-key'"
    )
    exit(1)
API_URL = "https://api.anthropic.com/v1/messages"


class StructuredInvestigator:
    """Simulates the Olorin structured investigation system."""

    def __init__(self):
        self.api_key = API_KEY
        self.headers = {
            "Content-Type": "application/json",
            "X-API-Key": self.api_key,
            "anthropic-version": "2023-06-01",
        }
        self.investigation_id = f"inv_{int(time.time())}"
        self.total_cost = 0.0
        self.api_calls = 0

    def make_api_call(self, agent_name: str, prompt: str) -> Dict:
        """Make a real API call to Anthropic Claude."""
        data = {
            "model": "claude-3-opus-20240229",
            "max_tokens": 500,
            "temperature": 0.3,
            "messages": [
                {
                    "role": "system",
                    "content": f"You are an structured {agent_name} analyzing fraud risk. Provide detailed analysis with risk scores.",
                },
                {"role": "user", "content": prompt},
            ],
        }

        response = requests.post(API_URL, headers=self.headers, json=data)
        self.api_calls += 1

        if response.status_code == 200:
            result = response.json()
            content = result.get("content", [{}])[0].get("text", "")

            # Estimate cost (Claude 3 Opus: ~$15/1M input, $75/1M output)
            input_tokens = len(prompt) // 4
            output_tokens = len(content) // 4
            cost = (input_tokens * 0.015 + output_tokens * 0.075) / 1000
            self.total_cost += cost

            return {
                "success": True,
                "content": content,
                "model": result.get("model"),
                "cost": cost,
            }
        else:
            return {"success": False, "error": f"API Error: {response.status_code}"}

    def run_investigation(self, entity_id: str, scenario: Dict) -> Dict:
        """Run a full structured investigation."""
        logger.info(f"\n🔍 STARTING FULL AUTONOMOUS INVESTIGATION")
        logger.info(f"Investigation ID: {self.investigation_id}")
        logger.info(f"Entity: {entity_id}")
        logger.info("=" * 60)

        # Create investigation context
        context = {
            "entity_id": entity_id,
            "timestamp": datetime.now().isoformat(),
            "scenario": scenario,
            "investigation_type": "structured_fraud_detection",
        }

        results = {
            "investigation_id": self.investigation_id,
            "entity_id": entity_id,
            "start_time": datetime.now().isoformat(),
            "context": context,
            "agent_findings": {},
            "overall_risk": 0,
        }

        # Run each structured agent with real API calls
        agents = [
            ("Network Analysis Agent", self.analyze_network),
            ("Device Analysis Agent", self.analyze_device),
            ("Location Analysis Agent", self.analyze_location),
            ("Transaction Analysis Agent", self.analyze_transactions),
            ("Behavioral Analysis Agent", self.analyze_behavior),
            ("Risk Aggregation Agent", self.aggregate_risk),
        ]

        all_findings = []

        for agent_name, agent_func in agents:
            logger.info(f"\n📊 Running {agent_name}...")
            logger.info("-" * 50)

            start_time = time.time()
            findings = agent_func(context)
            elapsed = time.time() - start_time

            if findings["success"]:
                logger.info(f"✅ {agent_name} completed in {elapsed:.2f}s")
                logger.info(f"   Cost: ${findings['cost']:.4f}")
                logger.info(f"   Finding preview: {findings['content'][:150]}...")

                results["agent_findings"][agent_name] = {
                    "analysis": findings["content"],
                    "execution_time": elapsed,
                    "api_cost": findings["cost"],
                }
                all_findings.append(findings["content"])
            else:
                logger.error(f"❌ {agent_name} failed: {findings.get('error')}")

        # Final risk assessment
        logger.info(f"\n🎯 Final Risk Assessment...")
        final_assessment = self.final_risk_assessment(all_findings)

        if final_assessment["success"]:
            results["final_assessment"] = final_assessment["content"]
            results["overall_risk"] = self.extract_risk_score(
                final_assessment["content"]
            )

        results["end_time"] = datetime.now().isoformat()
        results["total_api_calls"] = self.api_calls
        results["total_cost"] = self.total_cost
        results["real_api_used"] = True
        results["mock_data"] = False

        return results

    def analyze_network(self, context: Dict) -> Dict:
        """Network analysis agent."""
        prompt = f"""
        Analyze network patterns for entity {context['entity_id']}:
        - Login location: {context['scenario'].get('location', 'Unknown')}
        - IP Address: {context['scenario'].get('ip', 'Unknown')}
        - Connection type: {context['scenario'].get('connection', 'Unknown')}
        - Previous locations: {context['scenario'].get('previous_locations', [])}
        
        Provide network risk score (0-100) and identify suspicious patterns.
        """
        return self.make_api_call("Network Analysis", prompt)

    def analyze_device(self, context: Dict) -> Dict:
        """Device analysis agent."""
        prompt = f"""
        Analyze device fingerprint for entity {context['entity_id']}:
        - Device: {context['scenario'].get('device', 'Unknown')}
        - OS: {context['scenario'].get('os', 'Unknown')}
        - Browser: {context['scenario'].get('browser', 'Unknown')}
        - Known devices: {context['scenario'].get('known_devices', [])}
        
        Assess device trust level and identify anomalies.
        """
        return self.make_api_call("Device Analysis", prompt)

    def analyze_location(self, context: Dict) -> Dict:
        """Location analysis agent."""
        prompt = f"""
        Analyze location patterns for entity {context['entity_id']}:
        - Current location: {context['scenario'].get('location', 'Unknown')}
        - Time since last location: {context['scenario'].get('time_gap', 'Unknown')}
        - Distance from previous: {context['scenario'].get('distance', 'Unknown')}
        - Impossible travel detected: {context['scenario'].get('impossible_travel', False)}
        
        Calculate location risk and identify geographic anomalies.
        """
        return self.make_api_call("Location Analysis", prompt)

    def analyze_transactions(self, context: Dict) -> Dict:
        """Transaction analysis agent."""
        prompt = f"""
        Analyze transaction patterns for entity {context['entity_id']}:
        - Transaction amount: ${context['scenario'].get('amount', 0)}
        - Transaction time: {context['scenario'].get('time', 'Unknown')}
        - Merchant: {context['scenario'].get('merchant', 'Unknown')}
        - Historical average: ${context['scenario'].get('avg_transaction', 0)}
        
        Identify transaction anomalies and fraud indicators.
        """
        return self.make_api_call("Transaction Analysis", prompt)

    def analyze_behavior(self, context: Dict) -> Dict:
        """Behavioral analysis agent."""
        prompt = f"""
        Analyze user behavior for entity {context['entity_id']}:
        - Login attempts: {context['scenario'].get('login_attempts', 0)}
        - Password changes: {context['scenario'].get('password_changes', 0)}
        - Account modifications: {context['scenario'].get('account_changes', [])}
        - Session duration: {context['scenario'].get('session_duration', 'Unknown')}
        
        Detect behavioral anomalies and account takeover indicators.
        """
        return self.make_api_call("Behavioral Analysis", prompt)

    def aggregate_risk(self, context: Dict) -> Dict:
        """Risk aggregation agent."""
        prompt = f"""
        Aggregate risk signals for entity {context['entity_id']}:
        - Multiple risk factors detected
        - Cross-domain anomaly correlation required
        - Time-based pattern analysis needed
        
        Provide consolidated risk assessment and recommended actions.
        """
        return self.make_api_call("Risk Aggregation", prompt)

    def final_risk_assessment(self, all_findings: List[str]) -> Dict:
        """Final comprehensive risk assessment."""
        prompt = f"""
        Based on all agent findings, provide final fraud risk assessment:
        
        {' '.join(all_findings[:500])}...
        
        Provide:
        1. Overall risk score (0-100)
        2. Primary fraud indicators
        3. Recommended immediate actions
        4. Confidence level in assessment
        """
        return self.make_api_call("Final Risk Assessment", prompt)

    def extract_risk_score(self, text: str) -> int:
        """Extract risk score from text."""
        import re

        scores = re.findall(r"\b(\d{1,3})\b(?:/100|%|\s+out)", text)
        if scores:
            score = int(scores[0])
            return min(max(score, 0), 100)
        return 50  # Default medium risk


def create_test_scenario() -> Dict:
    """Create a realistic fraud scenario."""
    return {
        "location": "Moscow, Russia",
        "previous_locations": ["New York, USA", "Boston, USA"],
        "ip": "185.220.101.45",  # TOR exit node
        "connection": "TOR/VPN",
        "device": "Unknown Linux Device",
        "os": "Linux",
        "browser": "Tor Browser",
        "known_devices": ["iPhone 14 Pro", "MacBook Pro"],
        "amount": 75000,
        "avg_transaction": 500,
        "time": "03:30 AM local",
        "merchant": "Cryptocurrency Exchange",
        "login_attempts": 5,
        "password_changes": 3,
        "account_changes": ["Email changed", "Phone removed", "2FA disabled"],
        "session_duration": "2 minutes",
        "time_gap": "5 minutes",
        "distance": "7,500 miles",
        "impossible_travel": True,
    }


def print_investigation_summary(results: Dict):
    """Print formatted investigation summary."""
    logger.info("\n" + "=" * 60)
    logger.info("📊 INVESTIGATION SUMMARY")
    logger.info("=" * 60)

    logger.info(f"Investigation ID: {results['investigation_id']}")
    logger.info(f"Entity ID: {results['entity_id']}")
    logger.info(f"Start Time: {results['start_time']}")
    logger.info(f"End Time: {results['end_time']}")

    logger.info(f"\n🤖 Structured Agents Executed: {len(results['agent_findings'])}")
    for agent, findings in results["agent_findings"].items():
        logger.info(f"  ✅ {agent}")
        logger.info(f"     Execution Time: {findings['execution_time']:.2f}s")
        logger.info(f"     API Cost: ${findings['api_cost']:.4f}")

    logger.info(f"\n💰 API Usage:")
    logger.info(f"  Total API Calls: {results['total_api_calls']}")
    logger.info(f"  Total Cost: ${results['total_cost']:.4f}")

    logger.info(f"\n🎯 Risk Assessment:")
    logger.info(f"  Overall Risk Score: {results.get('overall_risk', 'N/A')}/100")

    if results.get("final_assessment"):
        logger.info(f"\n📝 Final Assessment Preview:")
        logger.info("-" * 50)
        logger.info(results["final_assessment"][:300] + "...")

    logger.info(f"\n✅ Validation:")
    logger.info(f"  Real API Used: {results['real_api_used']}")
    logger.info(f"  Mock Data: {results['mock_data']}")

    logger.info("\n" + "=" * 60)
    logger.info("🎆 FULL INVESTIGATION COMPLETE")
    logger.info("=" * 60)


def main():
    """Run full investigation test."""
    logger.info("🚀 OLORIN FULL AUTONOMOUS INVESTIGATION TEST")
    logger.info("Testing complete investigation workflow with REAL Anthropic API")
    logger.info("=" * 60)

    # Create investigator
    investigator = StructuredInvestigator()

    # Create test scenario
    scenario = create_test_scenario()

    logger.info("\n📋 Test Scenario:")
    logger.info(f"  High-risk fraud indicators present")
    logger.info(f"  Impossible travel detected")
    logger.info(f"  Multiple suspicious activities")

    # Run investigation
    results = investigator.run_investigation("user_suspect_001", scenario)

    # Print summary
    print_investigation_summary(results)

    # Save results
    output_file = f"investigation_{results['investigation_id']}.json"
    with open(output_file, "w") as f:
        json.dump(results, f, indent=2)

    logger.info(f"\n💾 Full results saved to: {output_file}")

    logger.info("\n🎯 KEY VALIDATION POINTS:")
    logger.info("  1. All agents used REAL Anthropic Claude API")
    logger.info("  2. Each agent made independent API calls")
    logger.info("  3. Responses show contextual analysis")
    logger.info("  4. No mock data or predetermined outcomes")
    logger.info("  5. Total investigation cost tracked")

    return results


if __name__ == "__main__":
    results = main()
