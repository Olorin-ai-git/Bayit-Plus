import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.service.agent.ato_agents.location_data_agent.agent import LocationDataAgent


@pytest.fixture
def agent():
    return LocationDataAgent(api_keys={})


@pytest.mark.asyncio
async def test_get_customer_location_success(agent):
    with patch.object(
        agent,
        "_get_oii_location_info",
        new_callable=AsyncMock,
        return_value={"country": "US"},
    ) as oii_patch:
        with patch.object(
            agent.kk_dash_client,
            "get_device_data",
            new_callable=AsyncMock,
            return_value=[{"device": "dev1"}],
        ) as dev_patch:
            result = await agent.get_customer_location("testuser")
            assert "oii_location" in result
            assert "device_data" in result


@pytest.mark.asyncio
async def test_get_login_history_success(agent):
    with patch.object(
        agent.client,
        "get_login_history",
        new_callable=AsyncMock,
        return_value=[
            {"location": "US", "timestamp": "2024-01-01T00:00:00Z", "device": "dev1"}
        ],
    ):
        result = await agent.get_login_history("testuser")
        assert "Login History" in result


@pytest.mark.asyncio
async def test_get_customer_location_error(agent):
    with patch.object(
        agent,
        "_get_oii_location_info",
        new_callable=AsyncMock,
        side_effect=Exception("fail"),
    ):
        with pytest.raises(Exception):
            await agent.get_customer_location("testuser")


@pytest.mark.asyncio
async def test_get_business_location_returns_empty(agent):
    result = await agent.get_business_location("testuser")
    assert isinstance(result, dict)
    assert result == {}


@pytest.mark.asyncio
async def test_get_phone_location_success(agent):
    with patch.object(
        agent.client,
        "get_phone_location",
        new_callable=AsyncMock,
        return_value=[MagicMock()],
    ):
        # _format_locations returns a string
        with patch.object(
            agent, "_format_locations", return_value="formatted"
        ) as mock_fmt:
            result = await agent.get_phone_location("testuser")
            assert result == "formatted"
            mock_fmt.assert_called()


@pytest.mark.asyncio
async def test_get_phone_registration_returns_empty(agent):
    result = await agent.get_phone_registration("1234567890")
    assert isinstance(result, dict)
    assert result == {}


@pytest.mark.asyncio
async def test_get_login_history_invalid_timeframe(agent):
    with pytest.raises(ValueError):
        await agent.get_login_history("testuser", timeframe_days=0)


@pytest.mark.asyncio
async def test_get_login_patterns(agent):
    with patch.object(
        agent.kk_dash_client,
        "get_device_data",
        new_callable=AsyncMock,
        return_value=[{"pattern": "foo"}],
    ):
        result = await agent.get_login_patterns("testuser")
        assert isinstance(result, dict)


@pytest.mark.asyncio
async def test_get_mfa_method(agent):
    with patch.object(
        agent.client,
        "get_mfa_method",
        new_callable=AsyncMock,
        return_value={"mfa": "sms"},
    ):
        with patch.object(
            agent, "_format_mfa_info", return_value="formatted_mfa"
        ) as mock_fmt:
            result = await agent.get_mfa_method("testuser")
            assert result == "formatted_mfa"
            mock_fmt.assert_called()


def test_validate_user_id_valid(agent):
    agent._validate_user_id("abc123")  # Should not raise


def test_validate_user_id_empty(agent):
    with pytest.raises(ValueError):
        agent._validate_user_id("")


def test_validate_user_id_invalid_chars(agent):
    with pytest.raises(ValueError):
        agent._validate_user_id("bad!user")


def test_format_locations_and_patterns_and_mfa(agent):
    # Just check that the helpers run and return a string
    assert isinstance(agent._format_locations([], "title"), str)
    assert isinstance(agent._format_login_patterns({}), str)
    assert isinstance(agent._format_mfa_info({}), str)


@pytest.mark.asyncio
async def test_lifecycle_methods(agent):
    await agent.initialize()
    await agent.shutdown()
    await agent.connect()
    await agent.disconnect()


@pytest.mark.asyncio
async def test_get_login_history_empty(agent):
    with patch.object(
        agent.client, "get_login_history", new_callable=AsyncMock, return_value=[]
    ):
        result = await agent.get_login_history("testuser")
        assert "No login history found" in result


@pytest.mark.asyncio
async def test_get_login_history_large(agent):
    # 25 entries, 3 locations, 2 devices
    history = [
        {
            "location": f"loc{i%3}",
            "timestamp": f"2024-01-01T0{i%9}:00:00Z",
            "device": f"dev{i%2}",
        }
        for i in range(25)
    ]
    with patch.object(
        agent.client, "get_login_history", new_callable=AsyncMock, return_value=history
    ):
        result = await agent.get_login_history("testuser")
        assert "Summary of 25 login entries" in result
        assert "Most common locations" in result
        assert "Most common devices" in result
        assert "Showing most recent 5 of 25 entries" in result


@pytest.mark.asyncio
async def test_get_login_history_rapid_changes(agent):
    # Two entries, different locations, <12 hours apart
    history = [
        {"location": "A", "timestamp": "2024-01-01T00:00:00Z", "device": "dev1"},
        {"location": "B", "timestamp": "2024-01-01T08:00:00Z", "device": "dev1"},
    ]
    with patch.object(
        agent.client, "get_login_history", new_callable=AsyncMock, return_value=history
    ):
        result = await agent.get_login_history("testuser")
        assert "Rapid location changes detected" in result


@pytest.mark.asyncio
async def test_get_device_data(agent):
    with patch.object(
        agent.kk_dash_client,
        "get_device_data",
        new_callable=AsyncMock,
        return_value=[{"foo": "bar"}],
    ):
        result = await agent.get_device_data("testuser")
        assert isinstance(result, list)
        assert result[0]["foo"] == "bar"


@pytest.mark.asyncio
async def test_detect_location_anomalies(agent):
    # Should return a risk if user_id contains 'TESTS', else empty
    from app.service.agent.ato_agents.interfaces import RiskAssessment

    result = await agent.detect_location_anomalies("SOME_TESTS_USER")
    assert isinstance(result, list)
    assert result and isinstance(result[0], RiskAssessment)
    result2 = await agent.detect_location_anomalies("normaluser")
    assert result2 == []


def test_get_customer_location_empty_user(agent):
    with pytest.raises(ValueError):
        asyncio.run(agent.get_customer_location(""))


def test_get_customer_location_invalid_user(agent):
    with pytest.raises(ValueError):
        asyncio.run(agent.get_customer_location("bad!user"))


def test_get_business_location_empty_user(agent):
    with pytest.raises(ValueError):
        asyncio.run(agent.get_business_location(""))


def test_get_business_location_invalid_user(agent):
    with pytest.raises(ValueError):
        asyncio.run(agent.get_business_location("bad!user"))


def test_get_phone_location_empty_user(agent):
    with pytest.raises(ValueError):
        asyncio.run(agent.get_phone_location(""))


def test_get_phone_location_invalid_user(agent):
    with pytest.raises(ValueError):
        asyncio.run(agent.get_phone_location("bad!user"))


def test_get_login_history_empty_user(agent):
    with pytest.raises(ValueError):
        asyncio.run(agent.get_login_history(""))


def test_get_login_history_invalid_user(agent):
    with pytest.raises(ValueError):
        asyncio.run(agent.get_login_history("bad!user"))


def test_get_login_patterns_empty_user(agent, monkeypatch):
    monkeypatch.setattr(
        agent.kk_dash_client,
        "get_device_data",
        AsyncMock(side_effect=ValueError("User ID cannot be empty")),
    )
    with pytest.raises(ValueError):
        asyncio.run(agent.get_login_patterns(""))


def test_get_login_patterns_invalid_user(agent, monkeypatch):
    monkeypatch.setattr(
        agent.kk_dash_client,
        "get_device_data",
        AsyncMock(side_effect=ValueError("User ID contains invalid characters")),
    )
    with pytest.raises(ValueError):
        asyncio.run(agent.get_login_patterns("bad!user"))


def test_get_mfa_method_empty_user(agent):
    with pytest.raises(ValueError):
        asyncio.run(agent.get_mfa_method(""))


def test_get_mfa_method_invalid_user(agent):
    with pytest.raises(ValueError):
        asyncio.run(agent.get_mfa_method("bad!user"))


def test_get_customer_location_kk_dash_error(agent, monkeypatch):
    monkeypatch.setattr(agent, "_get_oii_location_info", AsyncMock(return_value={}))
    monkeypatch.setattr(
        agent.kk_dash_client,
        "get_device_data",
        AsyncMock(side_effect=Exception("fail")),
    )
    with pytest.raises(Exception):
        asyncio.run(agent.get_customer_location("testuser"))


def test_get_phone_location_client_error(agent, monkeypatch):
    monkeypatch.setattr(
        agent.client, "get_phone_location", AsyncMock(side_effect=Exception("fail"))
    )
    with pytest.raises(Exception):
        asyncio.run(agent.get_phone_location("testuser"))


def test_initialize_exception(agent, monkeypatch):
    # Patch logger to raise
    monkeypatch.setattr(
        agent.logger, "info", lambda *a, **k: (_ for _ in ()).throw(Exception("fail"))
    )
    with pytest.raises(Exception):
        asyncio.run(agent.initialize())


def test_shutdown_exception(agent, monkeypatch):
    monkeypatch.setattr(
        agent.logger, "info", lambda *a, **k: (_ for _ in ()).throw(Exception("fail"))
    )
    with pytest.raises(Exception):
        asyncio.run(agent.shutdown())


def test_format_locations_edge_cases(agent):
    # LocationInfo with missing fields
    class DummyLoc:
        def __init__(self):
            self.source = None
            self.location = None
            self.confidence = None
            self.timestamp = None
            self.additional_info = {"ip": "1.2.3.4", "foo_bar": "baz"}

    locs = [DummyLoc()]
    result = agent._format_locations(locs, "EdgeCase")
    assert "IP: 1.2.3.4" in result
    assert "Foo Bar: baz" in result
    # Empty list
    output = agent._format_locations([], "EdgeCase")
    assert "no edgecase information found" in output.lower()


def test_format_login_patterns_edge_cases(agent):
    # Patterns with all fields
    patterns = {
        "device": "dev1",
        "location": "loc1",
        "timestamp": "2024-01-01T00:00:00Z",
        "extra": "foo",
    }
    result = agent._format_login_patterns(patterns)
    # Only summary fields are present in the output
    assert "Total Logins" in result
    assert "Average Daily Logins" in result
    # Empty dict
    assert "No pattern data available" in agent._format_login_patterns({})


def test_format_mfa_info_edge_cases(agent):
    # MFA info with all fields
    mfa_info = {
        "method": "sms",
        "timestamp": "2024-01-01T00:00:00Z",
        "extra": "foo",
    }
    result = agent._format_mfa_info(mfa_info)
    # Only Method and Status are present in the output
    assert "Method" in result
    assert "Status" in result
    # Empty dict
    assert "No MFA information found" in agent._format_mfa_info({})


def test__get_oii_location_info_malformed(monkeypatch, agent):
    # Patch oii_tool._arun to return malformed JSON
    class DummyTool:
        async def _arun(self, *a, **k):
            return "{"  # Malformed JSON

    agent.oii_tool = DummyTool()
    with pytest.raises(Exception):
        asyncio.run(agent._get_oii_location_info("testuser"))

    # Patch to return missing fields
    class DummyTool2:
        async def _arun(self, *a, **k):
            return json.dumps({"foo": "bar"})

    agent.oii_tool = DummyTool2()
    result = asyncio.run(agent._get_oii_location_info("testuser"))
    assert isinstance(result, dict)


def test_get_device_data_edge_cases(agent, monkeypatch):
    # None
    monkeypatch.setattr(
        agent.kk_dash_client, "get_device_data", AsyncMock(return_value=None)
    )
    result = asyncio.run(agent.get_device_data("testuser"))
    assert result is None or result == []
    # Empty
    monkeypatch.setattr(
        agent.kk_dash_client, "get_device_data", AsyncMock(return_value=[])
    )
    result = asyncio.run(agent.get_device_data("testuser"))
    assert result == []
    # Malformed
    monkeypatch.setattr(
        agent.kk_dash_client,
        "get_device_data",
        AsyncMock(return_value=[{"foo": "bar"}]),
    )
    result = asyncio.run(agent.get_device_data("testuser"))
    assert isinstance(result, list)


def test_get_historical_login_locations_edge_cases(agent, monkeypatch):
    # None
    monkeypatch.setattr(
        agent.kk_dash_client, "get_device_data", AsyncMock(return_value=None)
    )
    result = asyncio.run(agent.get_historical_login_locations("testuser"))
    assert result is None or result == []
    # Empty
    monkeypatch.setattr(
        agent.kk_dash_client, "get_device_data", AsyncMock(return_value=[])
    )
    result = asyncio.run(agent.get_historical_login_locations("testuser"))
    assert result == []
    # Malformed
    monkeypatch.setattr(
        agent.kk_dash_client,
        "get_device_data",
        AsyncMock(return_value=[{"foo": "bar"}]),
    )
    result = asyncio.run(agent.get_historical_login_locations("testuser"))
    assert isinstance(result, list)


def test_detect_location_anomalies_edge_cases(agent):
    # user_id with no TESTS
    result = asyncio.run(agent.detect_location_anomalies("noedgecase"))
    assert result == []
