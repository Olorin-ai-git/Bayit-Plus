from unittest.mock import MagicMock, patch

import pytest

import app.service.agent.ato_agents.splunk_agent.ato_splunk_query_constructor as constructor


def mock_settings():
    class S:
        splunk_index = "testindex"

    return S()


@pytest.fixture(autouse=True)
def patch_settings(monkeypatch):
    monkeypatch.setattr(constructor, "get_settings_for_env", lambda: mock_settings())
    # Patch global settings/rss_index
    constructor.settings = mock_settings()
    constructor.rss_index = "testindex"


def test_build_auth_id_query():
    q = constructor._build_auth_id_query("foo")
    assert "index=testindex" in q
    assert "olorin_userid=foo" in q
    assert "account_email" in q


def test_build_location_query():
    q = constructor._build_location_query("bar")
    assert "index=testindex" in q
    assert "olorin_userid=bar" in q
    assert "true_ip_city" in q


def test_build_network_query():
    q = constructor._build_network_query("baz")
    assert "index=testindex" in q
    assert "olorin_userid=baz" in q
    assert "proxy_ip" in q


def test_build_device_query():
    q = constructor._build_device_query("dev")
    assert "index=testindex" in q
    assert "olorin_userid=dev" in q
    assert "device_id" in q


def test_build_base_search_all_types():
    for t in ["auth_id", "location", "network", "device"]:
        out = constructor.build_base_search("foo", t)
        assert "index=testindex" in out


def test_build_base_search_invalid_type():
    with pytest.raises(ValueError) as e:
        constructor.build_base_search("foo", "badtype")
    assert "Unsupported id_type" in str(e.value)


def test_build_splunk_query_url():
    base = "index=testindex | search foo"
    url = constructor.build_splunk_query_url(base)
    assert url.startswith("index%3D")
    assert "%0A%7C" in url or "%7C" in url


def test_get_splunk_query_all_types():
    for t in ["auth_id", "location", "network", "device"]:
        url = constructor.get_splunk_query("foo", t)
        assert url.startswith("search%20index%3D")


def test_get_splunk_query_invalid_type():
    with pytest.raises(ValueError):
        constructor.get_splunk_query("foo", "badtype")
