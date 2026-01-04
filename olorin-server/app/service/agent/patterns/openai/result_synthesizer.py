"""
Result Synthesizer

Synthesizes results from multiple domain agents into comprehensive analysis.
"""

from typing import Any, Dict, List


class ResultSynthesizer:
    """Synthesizes results from multiple domain agents into comprehensive analysis"""

    def __init__(self):
        self.risk_weights = {
            "network": 0.25,
            "device": 0.25,
            "location": 0.20,
            "logs": 0.30,
        }

    async def synthesize_results(self, agent_results: Dict[str, Any]) -> Dict[str, Any]:
        """Combine and correlate results from multiple agents"""

        synthesis = {
            "overall_risk_score": 0.0,
            "confidence_score": 0.0,
            "risk_factors": [],
            "correlated_findings": [],
            "agent_consensus": {},
            "investigation_summary": "",
        }

        # Calculate weighted risk score
        total_weight = 0
        total_confidence = 0

        for agent, result in agent_results.items():
            if agent in self.risk_weights and result.get("success"):
                weight = self.risk_weights[agent]
                risk_score = result.get("risk_score", 0.0)
                confidence = result.get("confidence", 0.0)

                synthesis["overall_risk_score"] += risk_score * weight
                total_confidence += confidence * weight
                total_weight += weight

                synthesis["risk_factors"].extend(result.get("risk_factors", []))

        if total_weight > 0:
            synthesis["confidence_score"] = total_confidence / total_weight

        # Find correlated findings
        synthesis["correlated_findings"] = self._find_correlations(agent_results)

        # Generate summary
        synthesis["investigation_summary"] = self._generate_summary(
            agent_results, synthesis
        )

        return synthesis

    def _find_correlations(self, results: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Find correlations between agent findings"""
        correlations = []

        # Example correlations
        network_vpn = (
            results.get("network", {}).get("findings", {}).get("vpn_detected", False)
        )
        device_new = (
            results.get("device", {}).get("findings", {}).get("new_device", False)
        )
        location_anomaly = (
            results.get("location", {})
            .get("findings", {})
            .get("location_anomaly", False)
        )

        if network_vpn and device_new and location_anomaly:
            correlations.append(
                {
                    "pattern": "suspicious_trinity",
                    "description": "VPN usage with new device and location anomaly",
                    "risk_multiplier": 1.5,
                }
            )

        return correlations

    def _generate_summary(
        self, results: Dict[str, Any], synthesis: Dict[str, Any]
    ) -> str:
        """Generate human-readable investigation summary"""
        risk_level = (
            "LOW"
            if synthesis["overall_risk_score"] < 0.3
            else "MEDIUM" if synthesis["overall_risk_score"] < 0.7 else "HIGH"
        )

        return (
            f"Multi-agent fraud investigation completed with {risk_level} risk assessment. "
            f"Overall risk score: {synthesis['overall_risk_score']:.2f} "
            f"(confidence: {synthesis['confidence_score']:.2f})"
        )
