"""
Comprehensive tests for ML/AI Enhancement Tools (Phase 7)

Tests all five ML/AI tools: BehavioralAnalysisTool, AnomalyDetectionTool, 
PatternRecognitionTool, FraudDetectionTool, and RiskScoringTool.
"""

import pytest
from unittest.mock import patch, MagicMock
import json

from app.service.agent.tools.ml_ai_tools.behavioral_analysis import BehavioralAnalysisTool
from app.service.agent.tools.ml_ai_tools.anomaly_detection import AnomalyDetectionTool
from app.service.agent.tools.ml_ai_tools.pattern_recognition import PatternRecognitionTool
from app.service.agent.tools.ml_ai_tools.fraud_detection import FraudDetectionTool
from app.service.agent.tools.ml_ai_tools.risk_scoring import RiskScoringTool


class TestBehavioralAnalysisTool:
    """Test the BehavioralAnalysisTool class."""

    @pytest.fixture
    def tool(self):
        """Create a BehavioralAnalysisTool instance."""
        return BehavioralAnalysisTool()

    @pytest.fixture
    def sample_behavioral_data(self):
        """Create sample behavioral data for testing."""
        return {
            "user_id": "test_user_123",
            "typing_patterns": [
                {"char": "h", "dwell_time": 120, "flight_time": 80},
                {"char": "e", "dwell_time": 95, "flight_time": 110},
                {"char": "l", "dwell_time": 105, "flight_time": 90}
            ],
            "mouse_dynamics": [
                {"x": 100, "y": 200, "timestamp": 1640995200000, "click": False},
                {"x": 150, "y": 180, "timestamp": 1640995201000, "click": True}
            ],
            "session_behavior": {
                "login_time": "2024-01-01T10:00:00Z",
                "pages_visited": ["home", "profile", "settings"],
                "actions_per_minute": 12,
                "idle_periods": [30, 45, 120]
            },
            "navigation_patterns": [
                {"page": "home", "time_spent": 45, "scroll_depth": 75},
                {"page": "profile", "time_spent": 120, "scroll_depth": 100}
            ]
        }

    def test_tool_name_and_description(self, tool):
        """Test tool name and description are properly set."""
        assert tool.name == "behavioral_analysis_ml"
        assert "behavioral analysis" in tool.description.lower()
        assert "machine learning" in tool.description.lower()

    @pytest.mark.asyncio
    async def test_behavioral_analysis_basic(self, tool, sample_behavioral_data):
        """Test basic behavioral analysis functionality."""
        result = await tool._arun(**sample_behavioral_data)
        
        assert isinstance(result, dict)
        assert "analysis_summary" in result
        assert "typing_analysis" in result
        assert "mouse_analysis" in result
        assert "session_analysis" in result
        assert "navigation_analysis" in result
        assert "risk_indicators" in result
        assert "confidence_score" in result

    @pytest.mark.asyncio
    async def test_typing_pattern_analysis(self, tool, sample_behavioral_data):
        """Test typing pattern analysis component."""
        result = await tool._arun(**sample_behavioral_data)
        
        typing_analysis = result["typing_analysis"]
        assert "avg_dwell_time" in typing_analysis
        assert "avg_flight_time" in typing_analysis
        assert "rhythm_consistency" in typing_analysis
        assert isinstance(typing_analysis["avg_dwell_time"], (int, float))

    @pytest.mark.asyncio
    async def test_mouse_dynamics_analysis(self, tool, sample_behavioral_data):
        """Test mouse dynamics analysis component."""
        result = await tool._arun(**sample_behavioral_data)
        
        mouse_analysis = result["mouse_analysis"]
        assert "movement_patterns" in mouse_analysis
        assert "velocity_analysis" in mouse_analysis
        assert "click_patterns" in mouse_analysis

    @pytest.mark.asyncio
    async def test_session_behavior_analysis(self, tool, sample_behavioral_data):
        """Test session behavior analysis component."""
        result = await tool._arun(**sample_behavioral_data)
        
        session_analysis = result["session_analysis"]
        assert "activity_level" in session_analysis
        assert "engagement_score" in session_analysis
        assert "anomaly_flags" in session_analysis

    @pytest.mark.asyncio
    async def test_empty_data_handling(self, tool):
        """Test handling of empty or minimal data."""
        minimal_data = {
            "user_id": "test_user",
            "typing_patterns": [],
            "mouse_dynamics": [],
            "session_behavior": {},
            "navigation_patterns": []
        }
        
        result = await tool._arun(**minimal_data)
        assert "error" not in result
        assert "analysis_summary" in result

    @pytest.mark.asyncio
    async def test_error_handling(self, tool):
        """Test error handling with invalid input."""
        with pytest.raises((ValueError, TypeError)):
            await tool._arun(user_id=None)


class TestAnomalyDetectionTool:
    """Test the AnomalyDetectionTool class."""

    @pytest.fixture
    def tool(self):
        """Create an AnomalyDetectionTool instance."""
        return AnomalyDetectionTool()

    @pytest.fixture
    def sample_transaction_data(self):
        """Create sample transaction data for anomaly detection."""
        return [
            {"amount": 100.0, "location": "US", "time": "2024-01-01T10:00:00Z", "merchant": "Store A"},
            {"amount": 150.0, "location": "US", "time": "2024-01-01T11:00:00Z", "merchant": "Store B"},
            {"amount": 5000.0, "location": "RU", "time": "2024-01-01T12:00:00Z", "merchant": "Unknown"},  # Anomaly
            {"amount": 80.0, "location": "US", "time": "2024-01-01T13:00:00Z", "merchant": "Store C"}
        ]

    def test_tool_name_and_description(self, tool):
        """Test tool name and description are properly set."""
        assert tool.name == "anomaly_detection_ml"
        assert "anomaly detection" in tool.description.lower()
        assert "machine learning" in tool.description.lower()

    @pytest.mark.asyncio
    async def test_anomaly_detection_basic(self, tool, sample_transaction_data):
        """Test basic anomaly detection functionality."""
        result = await tool._arun(
            data=sample_transaction_data,
            detection_methods=["isolation_forest", "z_score"]
        )
        
        assert isinstance(result, dict)
        assert "anomalies_detected" in result
        assert "total_data_points" in result
        assert "anomaly_scores" in result
        assert "detection_summary" in result
        assert "method_results" in result

    @pytest.mark.asyncio
    async def test_isolation_forest_method(self, tool, sample_transaction_data):
        """Test Isolation Forest anomaly detection method."""
        result = await tool._arun(
            data=sample_transaction_data,
            detection_methods=["isolation_forest"],
            contamination_rate=0.1
        )
        
        assert "method_results" in result
        assert "isolation_forest" in result["method_results"]
        assert len(result["anomaly_scores"]) == len(sample_transaction_data)

    @pytest.mark.asyncio
    async def test_z_score_method(self, tool, sample_transaction_data):
        """Test Z-Score anomaly detection method."""
        result = await tool._arun(
            data=sample_transaction_data,
            detection_methods=["z_score"],
            z_threshold=2.0
        )
        
        assert "method_results" in result
        assert "z_score" in result["method_results"]

    @pytest.mark.asyncio
    async def test_multiple_methods(self, tool, sample_transaction_data):
        """Test using multiple detection methods."""
        result = await tool._arun(
            data=sample_transaction_data,
            detection_methods=["isolation_forest", "lof", "z_score"],
            ensemble_voting=True
        )
        
        method_results = result["method_results"]
        assert len(method_results) == 3
        assert "ensemble_result" in result

    @pytest.mark.asyncio
    async def test_empty_data_handling(self, tool):
        """Test handling of empty data."""
        result = await tool._arun(data=[], detection_methods=["z_score"])
        assert "error" in result or result["total_data_points"] == 0

    @pytest.mark.asyncio
    async def test_single_data_point(self, tool):
        """Test handling of single data point."""
        single_point = [{"amount": 100.0, "location": "US"}]
        result = await tool._arun(data=single_point, detection_methods=["z_score"])
        assert isinstance(result, dict)


class TestPatternRecognitionTool:
    """Test the PatternRecognitionTool class."""

    @pytest.fixture
    def tool(self):
        """Create a PatternRecognitionTool instance."""
        return PatternRecognitionTool()

    @pytest.fixture
    def sample_sequence_data(self):
        """Create sample sequence data for pattern recognition."""
        return [
            {"event": "login", "timestamp": "2024-01-01T09:00:00Z", "user": "user1"},
            {"event": "view_page", "timestamp": "2024-01-01T09:05:00Z", "user": "user1", "page": "home"},
            {"event": "click_button", "timestamp": "2024-01-01T09:10:00Z", "user": "user1", "button": "buy"},
            {"event": "logout", "timestamp": "2024-01-01T09:15:00Z", "user": "user1"},
            {"event": "login", "timestamp": "2024-01-01T10:00:00Z", "user": "user2"},
            {"event": "view_page", "timestamp": "2024-01-01T10:05:00Z", "user": "user2", "page": "home"},
            {"event": "click_button", "timestamp": "2024-01-01T10:10:00Z", "user": "user2", "button": "buy"}
        ]

    def test_tool_name_and_description(self, tool):
        """Test tool name and description are properly set."""
        assert tool.name == "pattern_recognition_ml"
        assert "pattern recognition" in tool.description.lower()
        assert "machine learning" in tool.description.lower()

    @pytest.mark.asyncio
    async def test_pattern_recognition_basic(self, tool, sample_sequence_data):
        """Test basic pattern recognition functionality."""
        result = await tool._arun(
            data=sample_sequence_data,
            analysis_types=["sequence_patterns", "behavioral_patterns"]
        )
        
        assert isinstance(result, dict)
        assert "patterns_found" in result
        assert "total_sequences" in result
        assert "pattern_types" in result
        assert "confidence_scores" in result

    @pytest.mark.asyncio
    async def test_sequence_pattern_analysis(self, tool, sample_sequence_data):
        """Test sequence pattern analysis."""
        result = await tool._arun(
            data=sample_sequence_data,
            analysis_types=["sequence_patterns"],
            min_pattern_length=2
        )
        
        assert "sequence_patterns" in result["pattern_types"]
        assert len(result["patterns_found"]) > 0

    @pytest.mark.asyncio
    async def test_behavioral_pattern_analysis(self, tool, sample_sequence_data):
        """Test behavioral pattern analysis."""
        result = await tool._arun(
            data=sample_sequence_data,
            analysis_types=["behavioral_patterns"],
            cluster_method="kmeans"
        )
        
        assert "behavioral_patterns" in result["pattern_types"]

    @pytest.mark.asyncio
    async def test_fraud_pattern_detection(self, tool, sample_sequence_data):
        """Test fraud-specific pattern detection."""
        result = await tool._arun(
            data=sample_sequence_data,
            analysis_types=["fraud_patterns"],
            fraud_indicators=["rapid_succession", "unusual_timing"]
        )
        
        assert "fraud_patterns" in result["pattern_types"]
        assert "fraud_risk_score" in result

    @pytest.mark.asyncio
    async def test_empty_data_handling(self, tool):
        """Test handling of empty data."""
        result = await tool._arun(data=[], analysis_types=["sequence_patterns"])
        assert result["total_sequences"] == 0


class TestFraudDetectionTool:
    """Test the FraudDetectionTool class."""

    @pytest.fixture
    def tool(self):
        """Create a FraudDetectionTool instance."""
        return FraudDetectionTool()

    @pytest.fixture
    def sample_transaction_data(self):
        """Create sample transaction data for fraud detection."""
        return {
            "transaction_id": "txn_123456",
            "amount": 5000.0,
            "currency": "USD",
            "merchant": "Unknown Merchant",
            "location": "Unknown Location",
            "timestamp": "2024-01-01T02:00:00Z",  # Unusual hour
            "user_id": "user_123",
            "payment_method": "credit_card",
            "device_info": {
                "ip_address": "192.168.1.100",
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "device_id": "device_456"
            },
            "user_history": {
                "avg_transaction_amount": 150.0,
                "usual_locations": ["US", "CA"],
                "usual_merchants": ["Store A", "Store B"],
                "account_age_days": 365
            }
        }

    def test_tool_name_and_description(self, tool):
        """Test tool name and description are properly set."""
        assert tool.name == "fraud_detection_ml"
        assert "fraud detection" in tool.description.lower()
        assert "machine learning" in tool.description.lower()

    @pytest.mark.asyncio
    async def test_fraud_detection_basic(self, tool, sample_transaction_data):
        """Test basic fraud detection functionality."""
        result = await tool._arun(**sample_transaction_data)
        
        assert isinstance(result, dict)
        assert "fraud_probability" in result
        assert "fraud_indicators" in result
        assert "risk_factors" in result
        assert "detection_methods" in result
        assert "recommendation" in result

    @pytest.mark.asyncio
    async def test_fraud_probability_range(self, tool, sample_transaction_data):
        """Test fraud probability is in valid range."""
        result = await tool._arun(**sample_transaction_data)
        
        fraud_prob = result["fraud_probability"]
        assert isinstance(fraud_prob, (int, float))
        assert 0.0 <= fraud_prob <= 1.0

    @pytest.mark.asyncio
    async def test_payment_fraud_detection(self, tool, sample_transaction_data):
        """Test payment fraud-specific detection."""
        result = await tool._arun(
            fraud_types=["payment_fraud"],
            **sample_transaction_data
        )
        
        assert "payment_fraud_analysis" in result["detection_methods"]

    @pytest.mark.asyncio
    async def test_identity_fraud_detection(self, tool, sample_transaction_data):
        """Test identity fraud detection."""
        result = await tool._arun(
            fraud_types=["identity_fraud"],
            **sample_transaction_data
        )
        
        assert "identity_fraud_analysis" in result["detection_methods"]

    @pytest.mark.asyncio
    async def test_low_risk_transaction(self, tool):
        """Test detection with low-risk transaction."""
        low_risk_data = {
            "transaction_id": "txn_safe_123",
            "amount": 50.0,
            "currency": "USD",
            "merchant": "Store A",
            "location": "US",
            "timestamp": "2024-01-01T14:00:00Z",
            "user_id": "user_123",
            "payment_method": "credit_card",
            "device_info": {"ip_address": "192.168.1.1"},
            "user_history": {
                "avg_transaction_amount": 45.0,
                "usual_locations": ["US"],
                "usual_merchants": ["Store A", "Store B"],
                "account_age_days": 1000
            }
        }
        
        result = await tool._arun(**low_risk_data)
        # Low risk should have lower fraud probability
        assert result["fraud_probability"] < 0.5


class TestRiskScoringTool:
    """Test the RiskScoringTool class."""

    @pytest.fixture
    def tool(self):
        """Create a RiskScoringTool instance."""
        return RiskScoringTool()

    @pytest.fixture
    def sample_risk_data(self):
        """Create sample risk assessment data."""
        return {
            "entity_id": "entity_123",
            "entity_type": "user",
            "financial_data": {
                "credit_score": 650,
                "income": 50000,
                "debt_to_income": 0.3,
                "payment_history": "good"
            },
            "behavioral_data": {
                "login_frequency": 12,
                "transaction_patterns": "regular",
                "device_consistency": True,
                "location_consistency": True
            },
            "external_data": {
                "identity_verified": True,
                "phone_verified": True,
                "email_verified": True,
                "social_media_presence": True
            },
            "historical_data": {
                "account_age_days": 730,
                "previous_incidents": 0,
                "complaints_filed": 0,
                "successful_transactions": 500
            }
        }

    def test_tool_name_and_description(self, tool):
        """Test tool name and description are properly set."""
        assert tool.name == "risk_scoring_ml"
        assert "risk scoring" in tool.description.lower()
        assert "machine learning" in tool.description.lower()

    @pytest.mark.asyncio
    async def test_risk_scoring_basic(self, tool, sample_risk_data):
        """Test basic risk scoring functionality."""
        result = await tool._arun(**sample_risk_data)
        
        assert isinstance(result, dict)
        assert "overall_risk_score" in result
        assert "risk_category" in result
        assert "risk_factors" in result
        assert "score_components" in result
        assert "recommendations" in result

    @pytest.mark.asyncio
    async def test_risk_score_range(self, tool, sample_risk_data):
        """Test risk score is in valid range."""
        result = await tool._arun(**sample_risk_data)
        
        risk_score = result["overall_risk_score"]
        assert isinstance(risk_score, (int, float))
        assert 0 <= risk_score <= 100

    @pytest.mark.asyncio
    async def test_risk_category_assignment(self, tool, sample_risk_data):
        """Test risk category assignment."""
        result = await tool._arun(**sample_risk_data)
        
        risk_category = result["risk_category"]
        valid_categories = ["low", "medium", "high", "critical"]
        assert risk_category.lower() in valid_categories

    @pytest.mark.asyncio
    async def test_score_components(self, tool, sample_risk_data):
        """Test individual score components."""
        result = await tool._arun(**sample_risk_data)
        
        components = result["score_components"]
        assert "financial_score" in components
        assert "behavioral_score" in components
        assert "external_score" in components
        assert "historical_score" in components

    @pytest.mark.asyncio
    async def test_high_risk_scenario(self, tool):
        """Test high-risk scenario scoring."""
        high_risk_data = {
            "entity_id": "high_risk_entity",
            "entity_type": "user",
            "financial_data": {
                "credit_score": 400,
                "income": 20000,
                "debt_to_income": 0.8,
                "payment_history": "poor"
            },
            "behavioral_data": {
                "login_frequency": 1,
                "transaction_patterns": "erratic",
                "device_consistency": False,
                "location_consistency": False
            },
            "external_data": {
                "identity_verified": False,
                "phone_verified": False,
                "email_verified": False,
                "social_media_presence": False
            },
            "historical_data": {
                "account_age_days": 10,
                "previous_incidents": 5,
                "complaints_filed": 3,
                "successful_transactions": 2
            }
        }
        
        result = await tool._arun(**high_risk_data)
        # High risk scenario should have high risk score
        assert result["overall_risk_score"] > 70
        assert result["risk_category"].lower() in ["high", "critical"]

    @pytest.mark.asyncio
    async def test_missing_data_handling(self, tool):
        """Test handling of missing or incomplete data."""
        minimal_data = {
            "entity_id": "minimal_entity",
            "entity_type": "user",
            "financial_data": {},
            "behavioral_data": {},
            "external_data": {},
            "historical_data": {}
        }
        
        result = await tool._arun(**minimal_data)
        assert "overall_risk_score" in result
        assert "data_completeness" in result


class TestMLAIToolsIntegration:
    """Test integration between ML/AI tools."""

    @pytest.fixture
    def all_tools(self):
        """Create instances of all ML/AI tools."""
        return {
            "behavioral": BehavioralAnalysisTool(),
            "anomaly": AnomalyDetectionTool(),
            "pattern": PatternRecognitionTool(),
            "fraud": FraudDetectionTool(),
            "risk": RiskScoringTool()
        }

    def test_all_tools_instantiation(self, all_tools):
        """Test that all ML/AI tools can be instantiated."""
        assert len(all_tools) == 5
        for tool_name, tool in all_tools.items():
            assert tool is not None
            assert hasattr(tool, 'name')
            assert hasattr(tool, 'description')

    def test_tool_names_unique(self, all_tools):
        """Test that all tool names are unique."""
        tool_names = [tool.name for tool in all_tools.values()]
        assert len(tool_names) == len(set(tool_names))

    @pytest.mark.asyncio
    async def test_workflow_integration(self, all_tools):
        """Test a basic workflow using multiple ML/AI tools."""
        # This would typically be a more complex integration test
        # For now, just verify tools can be called in sequence
        
        sample_data = {
            "user_id": "integration_test_user",
            "transaction_data": [{"amount": 100, "location": "US"}],
            "behavioral_data": {
                "typing_patterns": [],
                "mouse_dynamics": [],
                "session_behavior": {},
                "navigation_patterns": []
            }
        }
        
        # Test that tools can work with shared data structures
        behavioral_result = await all_tools["behavioral"]._arun(**sample_data["behavioral_data"])
        anomaly_result = await all_tools["anomaly"]._arun(data=sample_data["transaction_data"])
        
        assert isinstance(behavioral_result, dict)
        assert isinstance(anomaly_result, dict)