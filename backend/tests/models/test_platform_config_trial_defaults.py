import pytest
from app.models.platform_config import PlatformConfig


@pytest.mark.asyncio
async def test_platform_config_has_trial_defaults(olorin_db_client):
    pc = await PlatformConfig.get_singleton()
    assert pc.trial_defaults.duration_days == 14
    assert pc.trial_defaults.eval_credits == 50
    assert pc.trial_defaults.byoc_uploads == 5
    assert pc.trial_defaults.xapi_exports == 1
    assert pc.trial_defaults.assignments == 3
    assert pc.trial_defaults.branding_uploads == 1
    assert pc.trial_defaults.grace_days == 3
    assert pc.trial_defaults.lock_days == 30
    assert pc.trial_defaults.extension_max_days == 30
    assert "gmail.com" in pc.public_email_domains
    assert "acme.corp" not in pc.public_email_domains
