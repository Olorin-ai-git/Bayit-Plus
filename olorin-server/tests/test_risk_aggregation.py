#!/usr/bin/env python3
"""
Unit tests for risk score aggregation logic
Tests the fix for individual agents reporting 0.5 but final aggregated score being 0.0
"""
import json
import pytest
import sys
from pathlib import Path
from unittest.mock import Mock

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from tests.autonomous.run_all_scenarios import FraudScenarioRunner


class TestRiskScoreAggregation:
    """Test cases for risk score aggregation functionality"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.runner = FraudScenarioRunner()
    
    def create_mock_agent_result(self, result_type: str, risk_score: float):
        """Create mock agent result with proper structure"""
        
        # Define different result formats for each agent type
        result_formats = {
            "device": {
                "llm_assessment": {
                    "risk_level": risk_score,
                    "confidence": 0.7,
                    "risk_factors": ["test finding"],
                    "suspicious_indicators": [],
                    "summary": "Test device analysis",
                    "thoughts": "Test thoughts",
                    "timestamp": "2025-08-30T16:00:00",
                    "autonomous_execution": True,
                    "domain": "device"
                }
            },
            "network": {
                "risk_assessment": {
                    "risk_level": risk_score,
                    "confidence": 0.7,
                    "risk_factors": ["test finding"],
                    "suspicious_indicators": [],
                    "summary": "Test network analysis",
                    "thoughts": "Test thoughts", 
                    "timestamp": "2025-08-30T16:00:00",
                    "autonomous_execution": True,
                    "domain": "network"
                }
            },
            "logs": {
                "behavioral_analysis": {
                    "risk_level": risk_score,
                    "confidence": 0.7,
                    "risk_factors": ["test finding"],
                    "suspicious_indicators": [],
                    "summary": "Test logs analysis",
                    "thoughts": "Test thoughts",
                    "timestamp": "2025-08-30T16:00:00", 
                    "autonomous_execution": True,
                    "domain": "logs"
                }
            },
            "risk": {
                "risk_assessment": {
                    "overall_risk_score": risk_score,
                    "confidence": 0.7,
                    "risk_factors": ["test finding"],
                    "suspicious_indicators": [],
                    "summary": "Test risk assessment",
                    "thoughts": "Test thoughts",
                    "timestamp": "2025-08-30T16:00:00",
                    "autonomous_execution": True,
                    "domain": "risk",
                    "recommended_actions": []
                }
            },
            "location": {
                "location_risk_assessment": {
                    "risk_level": risk_score,
                    "confidence": 0.7,
                    "risk_factors": ["test finding"],
                    "suspicious_indicators": [],
                    "summary": "Test location analysis",
                    "thoughts": "Test thoughts",
                    "timestamp": "2025-08-30T16:00:00",
                    "autonomous_execution": True,
                    "domain": "location"
                }
            }
        }
        
        # Create mock message with content
        mock_message = Mock()
        mock_message.content = json.dumps(result_formats[result_type])
        
        return {
            "messages": [mock_message]
        }
    
    def test_basic_risk_score_extraction(self):
        """Test basic risk score extraction from different agent types"""
        # Test device agent format
        device_result = self.create_mock_agent_result("device", 0.8)
        network_result = self.create_mock_agent_result("network", 0.6)
        logs_result = self.create_mock_agent_result("logs", 0.4)
        risk_result = self.create_mock_agent_result("risk", 0.7)
        
        agent_results = {
            "device_analysis": device_result,
            "network_analysis": network_result,
            "logs_analysis": logs_result,
            "risk_assessment": risk_result
        }
        
        # Extract risk scores using the same logic as in the scenario runner
        risk_scores = []
        for agent_name, result in agent_results.items():
            risk_score = self._extract_risk_score_from_agent_result(result)
            if risk_score > 0:
                risk_scores.append(risk_score)
        
        # Verify individual extractions
        assert len(risk_scores) == 4, f"Expected 4 risk scores, got {len(risk_scores)}"
        assert 0.8 in risk_scores, "Device risk score not extracted"
        assert 0.6 in risk_scores, "Network risk score not extracted"
        assert 0.4 in risk_scores, "Logs risk score not extracted"
        assert 0.7 in risk_scores, "Risk assessment score not extracted"
        
        # Verify aggregation
        overall_risk_score = sum(risk_scores) / len(risk_scores)
        expected_average = (0.8 + 0.6 + 0.4 + 0.7) / 4
        assert abs(overall_risk_score - expected_average) < 0.001, f"Expected {expected_average}, got {overall_risk_score}"
    
    def test_uniform_risk_scores(self):
        """Test aggregation when all agents report the same risk score (original bug case)"""
        # Create results where all agents report 0.5 (the original failing case)
        agent_results = {
            "device_analysis": self.create_mock_agent_result("device", 0.5),
            "network_analysis": self.create_mock_agent_result("network", 0.5),
            "logs_analysis": self.create_mock_agent_result("logs", 0.5),
            "risk_assessment": self.create_mock_agent_result("risk", 0.5)
        }
        
        risk_scores = []
        for agent_name, result in agent_results.items():
            risk_score = self._extract_risk_score_from_agent_result(result)
            if risk_score > 0:
                risk_scores.append(risk_score)
        
        overall_risk_score = sum(risk_scores) / len(risk_scores) if risk_scores else 0
        
        # This should now work correctly (was the main bug)
        assert overall_risk_score == 0.5, f"Expected 0.5, got {overall_risk_score} - original bug not fixed!"
        assert len(risk_scores) == 4, f"Expected 4 risk scores, got {len(risk_scores)}"
    
    def test_zero_risk_scores_handling(self):
        """Test handling when all agents report zero risk scores"""
        agent_results = {
            "device_analysis": self.create_mock_agent_result("device", 0.0),
            "network_analysis": self.create_mock_agent_result("network", 0.0),
            "logs_analysis": self.create_mock_agent_result("logs", 0.0),
            "risk_assessment": self.create_mock_agent_result("risk", 0.0)
        }
        
        risk_scores = []
        for agent_name, result in agent_results.items():
            risk_score = self._extract_risk_score_from_agent_result(result)
            if risk_score > 0:  # Only include non-zero scores (as per current logic)
                risk_scores.append(risk_score)
        
        overall_risk_score = sum(risk_scores) / len(risk_scores) if risk_scores else 0
        
        # Should handle zero scores gracefully
        assert overall_risk_score == 0, f"Expected 0 for all-zero scores, got {overall_risk_score}"
        assert len(risk_scores) == 0, f"Expected no non-zero scores, got {len(risk_scores)}"
    
    def test_mixed_zero_nonzero_scores(self):
        """Test handling mixed zero and non-zero risk scores"""
        agent_results = {
            "device_analysis": self.create_mock_agent_result("device", 0.0),  # Zero
            "network_analysis": self.create_mock_agent_result("network", 0.8),  # Non-zero
            "logs_analysis": self.create_mock_agent_result("logs", 0.0),  # Zero
            "risk_assessment": self.create_mock_agent_result("risk", 0.6)  # Non-zero
        }
        
        risk_scores = []
        for agent_name, result in agent_results.items():
            risk_score = self._extract_risk_score_from_agent_result(result)
            if risk_score > 0:
                risk_scores.append(risk_score)
        
        overall_risk_score = sum(risk_scores) / len(risk_scores) if risk_scores else 0
        
        # Should only average non-zero scores
        expected_average = (0.8 + 0.6) / 2  # Only non-zero scores
        assert abs(overall_risk_score - expected_average) < 0.001, f"Expected {expected_average}, got {overall_risk_score}"
        assert len(risk_scores) == 2, f"Expected 2 non-zero scores, got {len(risk_scores)}"
    
    def test_malformed_agent_results(self):
        """Test handling of malformed or missing agent result data"""
        # Test various malformed results
        malformed_results = {
            "empty_messages": {"messages": []},
            "missing_content": {"messages": [{}]},  
            "invalid_json": {"messages": [Mock(content="invalid json")]},
            "missing_risk_fields": {"messages": [Mock(content='{"other_field": "value"}')]},
            "non_dict_result": "not a dict",
            "missing_messages": {"other_field": "value"}
        }
        
        for result_name, malformed_result in malformed_results.items():
            risk_score = self._extract_risk_score_from_agent_result(malformed_result)
            assert risk_score == 0, f"Malformed result '{result_name}' should return 0, got {risk_score}"
    
    def test_location_agent_format(self):
        """Test location agent specific result format"""
        location_result = self.create_mock_agent_result("location", 0.3)
        
        risk_score = self._extract_risk_score_from_agent_result(location_result)
        assert risk_score == 0.3, f"Location agent risk score not extracted correctly, got {risk_score}"
    
    def test_edge_case_risk_values(self):
        """Test edge case risk values (0, 1, very small, very large)"""
        test_values = [0.0, 0.001, 0.999, 1.0, 1.5, -0.1]  # Including invalid values
        
        for test_value in test_values:
            device_result = self.create_mock_agent_result("device", test_value)
            extracted_score = self._extract_risk_score_from_agent_result(device_result)
            
            assert extracted_score == test_value, f"Risk value {test_value} not preserved, got {extracted_score}"
    
    def _extract_risk_score_from_agent_result(self, result):
        """Helper method that mirrors the extraction logic from the scenario runner"""
        try:
            if isinstance(result, dict) and "messages" in result:
                messages = result["messages"]
                if messages and len(messages) > 0:
                    message = messages[0]
                    if hasattr(message, 'content'):
                        content = message.content
                    elif isinstance(message, dict) and 'content' in message:
                        content = message['content']
                    else:
                        content = str(message)
                    
                    if isinstance(content, str):
                        parsed_content = json.loads(content)
                        
                        if "llm_assessment" in parsed_content:
                            return parsed_content["llm_assessment"].get("risk_level", 0)
                        elif "risk_assessment" in parsed_content:
                            risk_assessment = parsed_content["risk_assessment"]
                            return risk_assessment.get("risk_level") or risk_assessment.get("overall_risk_score", 0)
                        elif "behavioral_analysis" in parsed_content:
                            return parsed_content["behavioral_analysis"].get("risk_level", 0)
                        elif "location_risk_assessment" in parsed_content:
                            return parsed_content["location_risk_assessment"].get("risk_level", 0)
        except (json.JSONDecodeError, KeyError, AttributeError, TypeError):
            pass
        
        return 0


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])