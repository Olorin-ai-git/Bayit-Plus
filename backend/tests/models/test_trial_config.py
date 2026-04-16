from datetime import datetime, timezone, timedelta
import pytest
from app.models.trial_config import TrialConfig


def test_trial_config_defaults_for_new_signup():
    started = datetime.now(timezone.utc)
    tc = TrialConfig(
        state="active",
        started_at=started,
        expires_at=started + timedelta(days=14),
        selected_tier="organization",
        stripe_customer_id="cus_test",
        stripe_subscription_id="sub_test",
        eval_credits_remaining=50,
        byoc_uploads_remaining=5,
        xapi_exports_remaining=1,
        assignments_remaining=3,
        branding_uploads_remaining=1,
    )
    assert tc.state == "active"
    assert tc.sent_emails == {}
    assert tc.extension_days_total == 0
    assert tc.locked_at is None


def test_trial_config_rejects_invalid_state():
    with pytest.raises(ValueError):
        TrialConfig(
            state="whatever",
            started_at=datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc),
            selected_tier="team",
            stripe_customer_id="c",
            stripe_subscription_id="s",
            eval_credits_remaining=0,
            byoc_uploads_remaining=0,
            xapi_exports_remaining=0,
            assignments_remaining=0,
            branding_uploads_remaining=0,
        )
