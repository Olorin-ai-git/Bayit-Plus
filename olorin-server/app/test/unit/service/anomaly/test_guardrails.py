"""
Unit tests for guardrails logic.

Tests must be written FIRST and FAIL before implementation.
"""

import pytest
from datetime import datetime, timedelta

from app.service.anomaly.guardrails import Guardrails


class TestGuardrails:
    """Test suite for guardrails."""

    def test_persistence_tracking(self):
        """Test persistence tracking across windows."""
        guardrails = Guardrails()
        cohort = {'merchant_id': 'm_01', 'channel': 'web'}
        metric = 'decline_rate'
        
        # First window: score above threshold
        persisted_1 = guardrails.check_persistence(
            cohort, metric, score=4.0, k_threshold=3.5
        )
        assert persisted_1 == 1
        
        # Second window: score still above threshold
        persisted_2 = guardrails.check_persistence(
            cohort, metric, score=4.5, k_threshold=3.5
        )
        assert persisted_2 == 2
        
        # Third window: score drops below threshold
        persisted_3 = guardrails.check_persistence(
            cohort, metric, score=2.0, k_threshold=3.5
        )
        assert persisted_3 == 0  # Reset

    def test_hysteresis_raise_threshold(self):
        """Test hysteresis uses raise threshold when not alerting."""
        guardrails = Guardrails()
        cohort = {'merchant_id': 'm_01'}
        metric = 'decline_rate'
        
        # Score above raise threshold should trigger
        should_raise = guardrails.check_hysteresis(cohort, metric, score=4.0)
        assert should_raise is True

    def test_hysteresis_clear_threshold(self):
        """Test hysteresis uses clear threshold when already alerting."""
        guardrails = Guardrails()
        cohort = {'merchant_id': 'm_01'}
        metric = 'decline_rate'
        
        # First raise alert
        guardrails.check_hysteresis(cohort, metric, score=4.0)
        
        # Score between clear and raise should keep alerting
        should_raise = guardrails.check_hysteresis(cohort, metric, score=3.0)
        assert should_raise is True
        
        # Score below clear threshold should stop alerting
        should_raise = guardrails.check_hysteresis(cohort, metric, score=2.0)
        assert should_raise is False

    def test_cooldown_enforcement(self):
        """Test cooldown prevents alerts too soon."""
        guardrails = Guardrails()
        cohort = {'merchant_id': 'm_01'}
        metric = 'decline_rate'
        now = datetime.now()
        
        # First alert
        guardrails.update_cooldown(cohort, metric, now)
        
        # Check cooldown immediately (should be active)
        can_alert = guardrails.check_cooldown(cohort, metric, now)
        assert can_alert is False
        
        # Check after cooldown period (should pass)
        future_time = now + timedelta(hours=2)
        can_alert = guardrails.check_cooldown(cohort, metric, future_time)
        assert can_alert is True

    def test_should_raise_anomaly_all_guardrails(self):
        """Test should_raise_anomaly considers all guardrails."""
        guardrails = Guardrails()
        cohort = {'merchant_id': 'm_01'}
        metric = 'decline_rate'
        now = datetime.now()
        
        # All conditions met: persistence, hysteresis, cooldown
        should_raise = guardrails.should_raise_anomaly(
            cohort=cohort,
            metric=metric,
            score=4.5,
            persisted_n=2,
            k_threshold=3.5,
            persistence_required=2,
            current_time=now
        )
        assert should_raise is True

    def test_should_raise_anomaly_fails_persistence(self):
        """Test should_raise_anomaly fails if persistence not met."""
        guardrails = Guardrails()
        cohort = {'merchant_id': 'm_01'}
        metric = 'decline_rate'
        now = datetime.now()
        
        # Persistence not met
        should_raise = guardrails.should_raise_anomaly(
            cohort=cohort,
            metric=metric,
            score=4.5,
            persisted_n=1,  # Only 1 window, need 2
            k_threshold=3.5,
            persistence_required=2,
            current_time=now
        )
        assert should_raise is False

