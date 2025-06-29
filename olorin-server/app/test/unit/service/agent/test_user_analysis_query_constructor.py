from unittest.mock import MagicMock, patch

import pytest

import app.service.agent.ato_agents.splunk_agent.user_analysis_query_constructor as constructor


def mock_settings():
    class S:
        splunk_index = "testindex"

    return S()


@pytest.fixture(autouse=True)
def patch_settings(monkeypatch):
    monkeypatch.setattr(constructor, "get_settings_for_env", lambda: mock_settings())
    constructor.settings = mock_settings()
    constructor.rss_index = "testindex"
    constructor.identity_index = "identity-credentialadapter-e2e"


def test_build_auth_device_query():
    q = constructor._build_auth_device_query("foo")
    assert "index=testindex" in q
    assert "intuit_userid=foo" in q
    assert "CHALLENGE" in q


def test_build_email_credentials_query():
    q = constructor._build_email_credentials_query("bar")
    assert "index=testindex" in q
    assert 'CredentialWriteCheck.authId="bar"' in q
    assert "email_address" in q


def test_build_smart_id_query():
    q = constructor._build_smart_id_query("baz")
    assert "index=testindex" in q
    assert "smartId" in q


def test_get_direct_auth_query():
    q = constructor.get_direct_auth_query("foo")
    assert 'index="testindex"' in q
    assert "intuit_userid=foo" in q
    assert "CHALLENGE" in q


def test_get_direct_email_query():
    q = constructor.get_direct_email_query("bar")
    assert 'index="testindex"' in q
    assert 'CredentialWriteCheck.authId="bar"' in q
    assert "email_address" in q


def test_get_direct_smart_id_query():
    q = constructor.get_direct_smart_id_query("baz")
    assert 'index="testindex"' in q
    assert "intuit_userid=baz" in q
    assert "smartId" in q


def test_get_improved_email_query():
    q = constructor.get_improved_email_query("foo")
    assert 'index="identity-credentialadapter-e2e"' in q
    assert 'CredentialWriteCheck.authId="foo"' in q
    assert "email_address" in q


def test_get_simple_email_debug_query():
    q = constructor.get_simple_email_debug_query("bar")
    assert 'index="identity-credentialadapter-e2e"' in q
    assert 'CredentialWriteCheck.authId="bar"' in q


def test_get_simple_smart_id_debug_query():
    q = constructor.get_simple_smart_id_debug_query("baz")
    assert 'index="testindex"' in q
    assert "intuit_userid=baz" in q
    assert "smartId" in q


def test_get_user_analysis_query_all_types():
    for t in ["auth_device", "email_credentials", "smart_id"]:
        q = constructor.get_user_analysis_query("foo", t)
        assert "foo" in q


def test_get_user_analysis_query_invalid_type():
    with pytest.raises(ValueError):
        constructor.get_user_analysis_query("foo", "badtype")


def test_get_direct_user_analysis_query_all_types():
    for t in ["auth_device", "email_credentials", "smart_id"]:
        q = constructor.get_direct_user_analysis_query("foo", t)
        assert "foo" in q


def test_get_direct_user_analysis_query_invalid_type():
    with pytest.raises(ValueError):
        constructor.get_direct_user_analysis_query("foo", "badtype")


def test_get_all_user_analysis_queries():
    out = constructor.get_all_user_analysis_queries("foo")
    assert isinstance(out, dict)
    assert set(out.keys()) == {
        "auth_device_query",
        "email_credentials_query",
        "smart_id_query",
    }


def test_get_all_direct_user_analysis_queries():
    out = constructor.get_all_direct_user_analysis_queries("foo")
    assert isinstance(out, dict)
    assert set(out.keys()) == {
        "auth_device_query",
        "email_credentials_query",
        "smart_id_query",
    }
