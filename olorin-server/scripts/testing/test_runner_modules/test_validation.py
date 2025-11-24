"""
Test Runner Validation Module

Extracted validation methods from unified_ai_investigation_test_runner.py
"""

from typing import Dict, Any


class TestValidation:
    """Validation utilities for test results"""
    
    @staticmethod
    def validate_risk_score_accuracy(risk_score: float, scenario_type: str) -> float:
        """
        Validate risk score accuracy based on scenario type.
        Returns confidence score (0.0-1.0).
        """
        # Risk score should be between 0 and 100
        if not (0 <= risk_score <= 100):
            return 0.0
        
        # Different scenario types have different expected risk ranges
        expected_ranges = {
            'high_risk': (70, 100),
            'medium_risk': (30, 70),
            'low_risk': (0, 30),
            'suspicious': (50, 100),
            'normal': (0, 40),
        }
        
        expected_range = expected_ranges.get(scenario_type.lower(), (0, 100))
        min_score, max_score = expected_range
        
        if min_score <= risk_score <= max_score:
            # Score is in expected range - high confidence
            return 1.0
        elif risk_score < min_score:
            # Score is lower than expected - medium confidence
            distance = min_score - risk_score
            return max(0.0, 1.0 - (distance / 50.0))
        else:
            # Score is higher than expected - medium confidence
            distance = risk_score - max_score
            return max(0.0, 1.0 - (distance / 50.0))
    
    @staticmethod
    def validate_agent_response_quality(agent_results: Dict[str, Any]) -> float:
        """
        Validate the quality of agent responses.
        Returns confidence score (0.0-1.0).
        """
        if not agent_results:
            return 0.0
        
        quality_score = 0.0
        checks = 0
        
        # Check for required fields
        required_fields = ['risk_score', 'confidence', 'findings']
        for field in required_fields:
            checks += 1
            if field in agent_results and agent_results[field] is not None:
                quality_score += 1.0
        
        # Check for non-empty findings
        if 'findings' in agent_results:
            checks += 1
            findings = agent_results.get('findings', [])
            if isinstance(findings, list) and len(findings) > 0:
                quality_score += 1.0
        
        # Check for reasonable confidence values
        if 'confidence' in agent_results:
            checks += 1
            confidence = agent_results.get('confidence', 0.0)
            if isinstance(confidence, (int, float)) and 0 <= confidence <= 100:
                quality_score += 1.0
        
        return quality_score / checks if checks > 0 else 0.0
    
    @staticmethod
    def validate_cross_domain_correlation(agent_results: Dict[str, Any]) -> float:
        """
        Validate cross-domain correlation between different agent results.
        Returns confidence score (0.0-1.0).
        """
        if not agent_results:
            return 0.0
        
        # Check if multiple agents agree on risk assessment
        risk_scores = []
        for agent_name, results in agent_results.items():
            if isinstance(results, dict) and 'risk_score' in results:
                risk_scores.append(results['risk_score'])
        
        if len(risk_scores) < 2:
            return 0.5  # Not enough data for correlation
        
        # Calculate variance in risk scores
        avg_score = sum(risk_scores) / len(risk_scores)
        variance = sum((score - avg_score) ** 2 for score in risk_scores) / len(risk_scores)
        
        # Lower variance = higher correlation = higher confidence
        # Normalize variance (assuming max variance is 2500 for scores 0-100)
        normalized_variance = min(1.0, variance / 2500.0)
        correlation_score = 1.0 - normalized_variance
        
        return max(0.0, min(1.0, correlation_score))
    
    @staticmethod
    def validate_business_logic(agent_results: Dict[str, Any], scenario_type: str) -> float:
        """
        Validate business logic consistency in agent results.
        Returns confidence score (0.0-1.0).
        """
        if not agent_results:
            return 0.0
        
        logic_score = 0.0
        checks = 0
        
        # Check for logical consistency in findings
        for agent_name, results in agent_results.items():
            if not isinstance(results, dict):
                continue
            
            checks += 1
            
            # Check if risk score matches findings severity
            risk_score = results.get('risk_score', 0)
            findings = results.get('findings', [])
            
            if isinstance(findings, list):
                high_severity_count = sum(
                    1 for f in findings 
                    if isinstance(f, dict) and f.get('severity', '').lower() in ['high', 'critical']
                )
                
                # High risk scores should have high severity findings
                if risk_score > 70:
                    if high_severity_count > 0:
                        logic_score += 1.0
                elif risk_score < 30:
                    if high_severity_count == 0:
                        logic_score += 1.0
                else:
                    # Medium risk - partial credit
                    logic_score += 0.5
        
        return logic_score / checks if checks > 0 else 0.0
    
    @staticmethod
    def calculate_execution_confidence(
        risk_score_confidence: float,
        agent_quality_confidence: float,
        correlation_confidence: float,
        business_logic_confidence: float
    ) -> float:
        """Calculate overall execution confidence from individual confidence scores"""
        weights = {
            'risk_score': 0.3,
            'agent_quality': 0.25,
            'correlation': 0.25,
            'business_logic': 0.2,
        }
        
        weighted_sum = (
            risk_score_confidence * weights['risk_score'] +
            agent_quality_confidence * weights['agent_quality'] +
            correlation_confidence * weights['correlation'] +
            business_logic_confidence * weights['business_logic']
        )
        
        return max(0.0, min(1.0, weighted_sum))

