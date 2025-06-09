import pytest
from pydantic import ValidationError

from app.service.agent.ato_agents.splunk_agent import fraud_response


def test_behavior_patterns_defaults():
    bp = fraud_response.BehaviorPatterns()
    assert bp.login_times == []
    assert bp.usual_locations == []
    assert bp.common_devices == []


def test_behavior_patterns_values():
    bp = fraud_response.BehaviorPatterns(
        login_times=["08:00"], usual_locations=["US"], common_devices=["laptop"]
    )
    assert bp.login_times == ["08:00"]
    assert bp.usual_locations == ["US"]
    assert bp.common_devices == ["laptop"]


def test_anomaly_creation():
    a = fraud_response.Anomaly(
        type="ip", timestamp="2024-01-01T00:00:00Z", details="suspicious"
    )
    assert a.type == "ip"
    assert a.timestamp == "2024-01-01T00:00:00Z"
    assert a.details == "suspicious"


def test_risk_assessment_valid():
    ra = fraud_response.RiskAssessment(
        risk_level=0.5,
        risk_factors=["vpn"],
        confidence=0.9,
        timestamp="2024-01-01T00:00:00Z",
    )
    assert ra.risk_level == 0.5
    assert ra.risk_factors == ["vpn"]
    assert ra.confidence == 0.9
    assert ra.timestamp == "2024-01-01T00:00:00Z"


def test_risk_assessment_min_max():
    fraud_response.RiskAssessment(
        risk_level=0.0, risk_factors=[], confidence=0.0, timestamp="t"
    )
    fraud_response.RiskAssessment(
        risk_level=1.0, risk_factors=[], confidence=1.0, timestamp="t"
    )
    with pytest.raises(ValidationError):
        fraud_response.RiskAssessment(
            risk_level=-0.1, risk_factors=[], confidence=0.5, timestamp="t"
        )
    with pytest.raises(ValidationError):
        fraud_response.RiskAssessment(
            risk_level=0.5, risk_factors=[], confidence=1.1, timestamp="t"
        )


def test_fraud_response_full():
    bp = fraud_response.BehaviorPatterns(
        login_times=["08:00"], usual_locations=["US"], common_devices=["laptop"]
    )
    an = fraud_response.Anomaly(
        type="ip", timestamp="2024-01-01T00:00:00Z", details="suspicious"
    )
    ra = fraud_response.RiskAssessment(
        risk_level=0.5,
        risk_factors=["vpn"],
        confidence=0.9,
        timestamp="2024-01-01T00:00:00Z",
    )
    fr = fraud_response.FraudResponse(
        behavior_patterns=bp, anomalies=[an], risk_assessment=ra
    )
    assert fr.behavior_patterns == bp
    assert fr.anomalies == [an]
    assert fr.risk_assessment == ra


def test_fraud_response_missing_fields():
    bp = fraud_response.BehaviorPatterns()
    ra = fraud_response.RiskAssessment(
        risk_level=0.1, risk_factors=[], confidence=0.1, timestamp="t"
    )
    with pytest.raises(ValidationError):
        fraud_response.FraudResponse(
            behavior_patterns=bp, anomalies=[], risk_assessment=None
        )
    with pytest.raises(ValidationError):
        fraud_response.FraudResponse(anomalies=[], risk_assessment=ra)


def test_fraud_response_extra_fields():
    bp = fraud_response.BehaviorPatterns()
    an = fraud_response.Anomaly(type="ip", timestamp="t", details="d")
    ra = fraud_response.RiskAssessment(
        risk_level=0.1, risk_factors=[], confidence=0.1, timestamp="t"
    )
    fr = fraud_response.FraudResponse(
        behavior_patterns=bp, anomalies=[an], risk_assessment=ra, extra_field=123
    )
    assert hasattr(fr, "behavior_patterns")
    assert hasattr(fr, "anomalies")
    assert hasattr(fr, "risk_assessment")
