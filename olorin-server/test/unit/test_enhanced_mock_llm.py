"""
Unit tests for enhanced mock LLM response generator with chain-of-thought reasoning
"""

import pytest

from scripts.testing.enhanced_mock_llm_responses import (
    EnhancedMockLLMResponseGenerator,
    ScenarioType,
    generate_enhanced_mock_response,
)


class TestEnhancedMockLLMGenerator:
    """Test enhanced mock LLM response generation"""

    def setup_method(self):
        """Set up test fixtures"""
        self.generator = EnhancedMockLLMResponseGenerator()

    def test_chain_of_thought_generation(self):
        """Test that chain-of-thought reasoning is generated"""
        thoughts = self.generator.generate_chain_of_thought(
            "network", ScenarioType.DEVICE_SPOOFING
        )

        assert isinstance(thoughts, list)
        assert len(thoughts) >= 3
        assert all(isinstance(t, str) for t in thoughts)
        assert all(len(t) > 0 for t in thoughts)

    def test_component_risk_scores(self):
        """Test component-level risk score calculation"""
        component_risk = self.generator._calculate_component_risk_scores(
            "network", 0.75, entity_risk_score=None
        )

        assert component_risk.score == 0.75
        assert 70 <= component_risk.confidence <= 95
        assert len(component_risk.components) > 0
        assert all(0.0 <= score <= 1.0 for score in component_risk.components.values())
        assert len(component_risk.reasoning) > 0
        assert len(component_risk.evidence) > 0

    def test_enhanced_network_response(self):
        """Test enhanced network analysis response"""
        response = self.generator.generate_enhanced_network_response(
            ScenarioType.DEVICE_SPOOFING,
            "test-investigation-001",
            entity_risk_score=0.85,
        )

        assert isinstance(response, str)
        assert "[CHAIN-OF-THOUGHT REASONING]" in response
        assert "[DETAILED RISK ANALYSIS]" in response
        assert "[EVIDENCE-BASED REASONING]" in response
        assert "Risk Score:" in response
        assert "Confidence:" in response

    def test_enhanced_device_response(self):
        """Test enhanced device analysis response"""
        response = self.generator.generate_enhanced_device_response(
            ScenarioType.DEVICE_SPOOFING,
            "test-investigation-002",
            entity_risk_score=0.75,
        )

        assert isinstance(response, str)
        assert "[CHAIN-OF-THOUGHT REASONING]" in response
        assert "[DEVICE FINGERPRINT ANALYSIS]" in response
        assert "Spoofing Probability:" in response

    def test_enhanced_location_response(self):
        """Test enhanced location analysis response"""
        response = self.generator.generate_enhanced_location_response(
            ScenarioType.IMPOSSIBLE_TRAVEL,
            "test-investigation-003",
            entity_risk_score=0.90,
        )

        assert isinstance(response, str)
        assert "[GEOGRAPHIC ANALYSIS DETAILS]" in response
        assert "Travel Feasibility:" in response

    def test_enhanced_logs_response(self):
        """Test enhanced logs analysis response"""
        response = self.generator.generate_enhanced_logs_response(
            ScenarioType.VELOCITY_ABUSE,
            "test-investigation-004",
            entity_risk_score=0.65,
        )

        assert isinstance(response, str)
        assert "[BEHAVIORAL ANALYSIS SUMMARY]" in response
        assert "Automation Likelihood:" in response

    def test_enhanced_risk_assessment(self):
        """Test enhanced risk assessment response"""
        response = self.generator.generate_enhanced_risk_assessment(
            ScenarioType.ACCOUNT_TAKEOVER,
            "test-investigation-005",
            "[Device analysis sample]",
            "[Location analysis sample]",
            "[Network analysis sample]",
            "[Logs analysis sample]",
        )

        assert isinstance(response, str)
        assert "[CROSS-DOMAIN SYNTHESIS]" in response
        assert "[COMPREHENSIVE RISK ASSESSMENT]" in response
        assert "Overall Risk Score:" in response
        assert "[THREAT INTELLIGENCE]" in response

    def test_generate_enhanced_mock_response_network(self):
        """Test network response generation via public API"""
        response = generate_enhanced_mock_response(
            agent_type="network",
            scenario="device_spoofing",
            investigation_id="test-001",
            entity_risk_score=0.80,
            use_enhanced=True,
        )

        assert isinstance(response, str)
        assert "[CHAIN-OF-THOUGHT REASONING]" in response
        assert "[DETAILED RISK ANALYSIS]" in response

    def test_generate_enhanced_mock_response_device(self):
        """Test device response generation via public API"""
        response = generate_enhanced_mock_response(
            agent_type="device",
            scenario="device_spoofing",
            investigation_id="test-002",
            entity_risk_score=0.75,
            use_enhanced=True,
        )

        assert isinstance(response, str)
        assert len(response) > 500  # Should be substantial response

    def test_generate_enhanced_mock_response_location(self):
        """Test location response generation via public API"""
        response = generate_enhanced_mock_response(
            agent_type="location",
            scenario="impossible_travel",
            investigation_id="test-003",
            use_enhanced=True,
        )

        assert isinstance(response, str)
        assert "[GEOGRAPHIC ANALYSIS DETAILS]" in response

    def test_generate_enhanced_mock_response_logs(self):
        """Test logs response generation via public API"""
        response = generate_enhanced_mock_response(
            agent_type="logs",
            scenario="velocity_abuse",
            investigation_id="test-004",
            use_enhanced=True,
        )

        assert isinstance(response, str)
        assert "[BEHAVIORAL ANALYSIS SUMMARY]" in response

    def test_generate_enhanced_mock_response_risk(self):
        """Test risk assessment response generation via public API"""
        context_data = {
            "device_analysis": "[Device findings]",
            "location_analysis": "[Location findings]",
            "network_analysis": "[Network findings]",
            "logs_analysis": "[Logs findings]",
        }

        response = generate_enhanced_mock_response(
            agent_type="risk",
            scenario="account_takeover",
            investigation_id="test-005",
            context_data=context_data,
            use_enhanced=True,
        )

        assert isinstance(response, str)
        assert "[CROSS-DOMAIN SYNTHESIS]" in response

    def test_fallback_to_standard_response(self):
        """Test fallback to standard mock responses when enhanced disabled"""
        response = generate_enhanced_mock_response(
            agent_type="network",
            scenario="default",
            investigation_id="test-006",
            use_enhanced=False,
        )

        assert isinstance(response, str)
        # Standard responses should not have enhanced markers
        assert "[CHAIN-OF-THOUGHT REASONING]" not in response

    def test_response_consistency_across_scenarios(self):
        """Test that responses are generated for all scenario types"""
        scenarios = [
            ScenarioType.DEVICE_SPOOFING,
            ScenarioType.IMPOSSIBLE_TRAVEL,
            ScenarioType.VELOCITY_ABUSE,
            ScenarioType.ACCOUNT_TAKEOVER,
            ScenarioType.SUSPICIOUS_PAYMENT,
            ScenarioType.LOCATION_FRAUD,
            ScenarioType.BEHAVIORAL_ANOMALY,
        ]

        for scenario in scenarios:
            response = self.generator.generate_enhanced_network_response(
                scenario, f"test-{scenario.value}", entity_risk_score=0.70
            )

            assert isinstance(response, str)
            assert len(response) > 500
            assert "[CHAIN-OF-THOUGHT REASONING]" in response

    def test_component_weights_coverage(self):
        """Test that component weights are defined for all domains"""
        expected_domains = {"network", "device", "location", "logs"}

        actual_domains = set(self.generator.component_weights.keys())

        assert expected_domains.issubset(actual_domains)

        # Each domain should have multiple components
        for domain, weights in self.generator.component_weights.items():
            assert len(weights) >= 4
            assert all(0.0 < w < 1.0 for w in weights.values())
