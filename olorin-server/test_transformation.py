#!/usr/bin/env python3
"""
Test agent_results to domain_findings transformation
"""
import json
import sys
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

from app.service.logging import get_bridge_logger
logger = get_bridge_logger(__name__)


def test_transformation():
    """Test the agent_results to domain_findings transformation"""

    # Load the investigation result
    result_path = Path("logs/investigations/DEMO_unified_test_device_spoofing_1762398932_20251106_031532/results/investigation_result.json")

    if not result_path.exists():
        print(f"❌ Result file not found: {result_path}")
        return False

    with open(result_path) as f:
        investigation_result = json.load(f)

    print("📋 Loaded investigation result")
    print(f"   Investigation ID: {investigation_result['investigation_id']}")
    print(f"   Status: {investigation_result['status']}")
    print(f"   Final risk score: {investigation_result['final_risk_score']}")
    print()

    # Check agent_results structure
    agent_results = investigation_result.get("agent_results", {})
    print(f"🔍 Agent Results: {len(agent_results)} domains")
    for domain_name, agent_data in agent_results.items():
        risk_score = agent_data.get("risk_score")
        confidence = agent_data.get("confidence")
        print(f"   {domain_name}: risk={risk_score}, confidence={confidence}")
    print()

    # Check if domain_findings exists
    domain_findings = investigation_result.get("domain_findings", {})
    print(f"🔍 Domain Findings: {len(domain_findings)} domains")
    if domain_findings:
        for domain_name, finding_data in domain_findings.items():
            if isinstance(finding_data, dict):
                risk_score = finding_data.get("risk_score")
                confidence = finding_data.get("confidence")
                print(f"   {domain_name}: risk={risk_score}, confidence={confidence}")
    else:
        print("   (empty - needs transformation)")
    print()

    # Apply transformation
    print("🔄 Applying transformation...")
    transformed_domain_findings = {}

    for domain_name in ["device", "network", "location", "logs", "authentication"]:
        if domain_name in agent_results:
            agent_data = agent_results[domain_name]

            # Extract evidence from findings if it exists
            evidence = []
            findings = agent_data.get("findings", {})
            if isinstance(findings, dict):
                if "evidence" in findings:
                    evidence = findings["evidence"]
                elif "indicators" in findings:
                    evidence = findings["indicators"]
                elif "analysis" in findings and isinstance(findings["analysis"], list):
                    evidence = findings["analysis"]

            # Build domain_findings entry
            transformed_domain_findings[domain_name] = {
                "risk_score": agent_data.get("risk_score"),
                "confidence": agent_data.get("confidence", 0.35),
                "evidence": evidence if isinstance(evidence, list) else [],
                "summary": findings.get("summary", f"{domain_name} domain analysis"),
                "status": "OK" if agent_data.get("risk_score") is not None else "INSUFFICIENT_EVIDENCE"
            }

            print(f"   ✅ Transformed {domain_name}: risk={agent_data.get('risk_score')}, evidence={len(evidence) if isinstance(evidence, list) else 0}")

    print()
    print(f"✅ Transformation complete: {len(transformed_domain_findings)} domains")
    print()

    # Test risk aggregation requirements
    print("📊 Risk Aggregation Check:")
    numeric_scores = [df["risk_score"] for df in transformed_domain_findings.values() if df.get("risk_score") is not None]

    # Count signals (evidence points)
    signals = sum(1 for df in transformed_domain_findings.values() if df.get("evidence") and len(df["evidence"]) > 0)

    print(f"   Numeric scores: {len(numeric_scores)} domains have risk scores")
    print(f"   Risk scores: {numeric_scores}")
    print(f"   Signals: {signals} domains have evidence")
    print()

    # Check evidence gating requirements
    enough = (len(numeric_scores) >= 2) or (len(numeric_scores) >= 1 and signals >= 2)

    if enough:
        print(f"✅ Evidence gating PASSES: {len(numeric_scores)} scores, {signals} signals")
        print(f"   Requirement: ≥2 scores OR (≥1 score AND ≥2 signals)")
    else:
        print(f"❌ Evidence gating BLOCKS: {len(numeric_scores)} scores, {signals} signals")
        print(f"   Requirement: ≥2 scores OR (≥1 score AND ≥2 signals)")
    print()

    # Calculate what the final risk would be
    if len(numeric_scores) >= 2:
        # Weight by confidence
        confidences = [transformed_domain_findings[d]["confidence"] for d in transformed_domain_findings if transformed_domain_findings[d].get("risk_score") is not None]
        total_conf = sum(confidences)

        if total_conf > 0:
            weighted_sum = sum(score * conf for score, conf in zip(numeric_scores, confidences))
            final_risk = weighted_sum / total_conf
            print(f"📊 Calculated Final Risk: {final_risk:.3f}")
            print(f"   Weighted by confidences: {confidences}")
        else:
            final_risk = sum(numeric_scores) / len(numeric_scores)
            print(f"📊 Calculated Final Risk (unweighted): {final_risk:.3f}")
    else:
        print(f"📊 Cannot calculate final risk: insufficient scores")

    return True


if __name__ == "__main__":
    test_transformation()
