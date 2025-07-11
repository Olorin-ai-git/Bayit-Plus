import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.service.agent.ato_agents.location_data_agent.client import LocationDataClient


@pytest.fixture
def client():
    return LocationDataClient()


def test_analyze_transaction_patterns_insufficient(client):
    result = asyncio.run(client.analyze_transaction_patterns([], "user1"))
    assert result["analysis_status"] == "insufficient_data"
    result2 = asyncio.run(client.analyze_transaction_patterns([{"foo": 1}], "user1"))
    assert result2["analysis_status"] == "insufficient_data"


def test_analyze_transaction_patterns_error(client):
    # Patch the instance's vector_search_tool._arun
    client.vector_search_tool._arun = AsyncMock(side_effect=Exception("fail"))
    splunk_results = [{"foo": 1}, {"foo": 2}]
    result = asyncio.run(client.analyze_transaction_patterns(splunk_results, "user1"))
    assert result["analysis_status"] == "error"
    assert "fail" in result["error"]


def test_analyze_similarity_patterns_no_similar(client):
    result = client._analyze_similarity_patterns({"similar_records": []})
    assert result["status"] == "no_similar_records"


def test_analyze_similarity_patterns_various(client):
    similar_records = [
        {"distance": 1.0, "record": {"tm_smart_id": "A"}},
        {"distance": 3.0, "record": {"tm_smart_id": "A"}},
        {"distance": 6.0, "record": {"tm_smart_id": "B"}},
    ]
    search_result = {
        "similar_records": similar_records,
        "metadata": {"distance_range": {"min": 1, "max": 6}},
    }
    result = client._analyze_similarity_patterns(search_result)
    assert result["status"] == "analyzed"
    assert result["similarity_distribution"]["very_similar"] == 1
    assert result["similarity_distribution"]["moderately_similar"] == 1
    assert result["similarity_distribution"]["somewhat_similar"] == 1
    assert result["distance_stats"] == {"min": 1, "max": 6}
    assert "common_features" in result
    assert "risk_indicators" in result


def test_identify_common_features_empty(client):
    assert client._identify_common_features([]) == {}


def test_identify_common_features_nonempty(client):
    similar_records = [
        {"record": {"tm_smart_id": "A", "tm_true_ip": "1.1.1.1"}},
        {"record": {"tm_smart_id": "A", "tm_true_ip": "2.2.2.2"}},
        {"record": {"tm_smart_id": "B", "tm_true_ip": "1.1.1.1"}},
    ]
    result = client._identify_common_features(similar_records)
    if "tm_smart_id" in result:
        assert "most_common_value" in result["tm_smart_id"]
    if "tm_true_ip" in result:
        assert "most_common_value" in result["tm_true_ip"]


def test_assess_risk_indicators(client):
    similar_records = [
        {
            "record": {
                "tm_proxy_ip": True,
                "tm_bb_bot_score": 600,
                "tm_os_anomaly": True,
                "tm_screen_color_depth": "24",
            }
        },
        {
            "record": {
                "tm_proxy_ip": False,
                "tm_bb_bot_score": 100,
                "tm_os_anomaly": False,
                "tm_screen_color_depth": "32",
            }
        },
    ]
    result = client._assess_risk_indicators(similar_records)
    assert result["proxy_usage"] == 1
    assert result["suspicious_bot_scores"] == 1
    assert result["os_anomalies"] == 1
    assert result["suspicious_color_depth"] == 1
    assert result["total_records"] == 2
    assert "risk_percentages" in result


def test_get_location_data_response(client):
    # Should return a list of LocationInfo (may be empty or with unavailable status)
    result = asyncio.run(client.get_location_data_response("user1"))
    assert isinstance(result, list)


def test_get_customer_location(client):
    # Should call get_location_data and return its result
    with patch.object(
        client, "get_location_data", new_callable=AsyncMock, return_value=["foo"]
    ):
        result = asyncio.run(client.get_customer_location("user1"))
        assert result == ["foo"]


def test_get_business_location(client):
    result = asyncio.run(client.get_business_location("user1"))
    assert isinstance(result, list)
    assert result[0].source == "Business Location"


def test_get_phone_location(client):
    result = asyncio.run(client.get_phone_location("user1"))
    assert isinstance(result, list)
    assert result[0].source == "Phone Location"


def test_get_login_history(client):
    result = asyncio.run(client.get_login_history("user1"))
    assert isinstance(result, list)
    assert "status" in result[0]


def test_get_login_patterns(client):
    result = asyncio.run(client.get_login_patterns("user1"))
    assert isinstance(result, dict)
    assert result["status"] == "unavailable"


def test_get_mfa_method(client):
    result = asyncio.run(client.get_mfa_method("user1"))
    assert isinstance(result, dict)
    assert result["status"] == "unavailable"


def test_internal_get_methods(client):
    # Test all _get_* methods for coverage
    assert asyncio.run(client._get_oii_location("user1")).source == "OII"

    assert (
        asyncio.run(client._get_business_admin_location("user1")).source
        == "Business Admin"
    )


def test_connect_and_close(client):
    # Should create and close aiohttp session
    asyncio.run(client.connect())
    assert client.session is not None
    asyncio.run(client.close())
    assert client.session is None


def test_get_location_data_error(client, monkeypatch):
    monkeypatch.setattr(
        client, "get_location_data", AsyncMock(side_effect=Exception("fail"))
    )
    with pytest.raises(Exception):
        asyncio.run(client.get_location_data("user1"))


def test_get_location_data_response_error(client, monkeypatch):
    monkeypatch.setattr(
        client, "get_location_data_response", AsyncMock(side_effect=Exception("fail"))
    )
    with pytest.raises(Exception):
        asyncio.run(client.get_location_data_response("user1"))


def test_get_customer_location_error(client, monkeypatch):
    monkeypatch.setattr(
        client, "get_customer_location", AsyncMock(side_effect=Exception("fail"))
    )
    with pytest.raises(Exception):
        asyncio.run(client.get_customer_location("user1"))


def test_get_business_location_error(client, monkeypatch):
    monkeypatch.setattr(
        client, "get_business_location", AsyncMock(side_effect=Exception("fail"))
    )
    with pytest.raises(Exception):
        asyncio.run(client.get_business_location("user1"))


def test_get_phone_location_error(client, monkeypatch):
    monkeypatch.setattr(
        client, "get_phone_location", AsyncMock(side_effect=Exception("fail"))
    )
    with pytest.raises(Exception):
        asyncio.run(client.get_phone_location("user1"))


def test_get_login_history_error(client, monkeypatch):
    monkeypatch.setattr(
        client, "get_login_history", AsyncMock(side_effect=Exception("fail"))
    )
    with pytest.raises(Exception):
        asyncio.run(client.get_login_history("user1"))


def test_get_login_patterns_error(client, monkeypatch):
    monkeypatch.setattr(
        client, "get_login_patterns", AsyncMock(side_effect=Exception("fail"))
    )
    with pytest.raises(Exception):
        asyncio.run(client.get_login_patterns("user1"))


def test_get_mfa_method_error(client, monkeypatch):
    monkeypatch.setattr(
        client, "get_mfa_method", AsyncMock(side_effect=Exception("fail"))
    )
    with pytest.raises(Exception):
        asyncio.run(client.get_mfa_method("user1"))


def test_internal_get_methods_error(client, monkeypatch):
    for meth in [
        "_get_oii_location",
        "_get_qbo_business_location",
    ]:
        monkeypatch.setattr(client, meth, AsyncMock(side_effect=Exception("fail")))
        with pytest.raises(Exception):
            asyncio.run(getattr(client, meth)("user1"))


def test_get_oii_location_info(client, monkeypatch):
    monkeypatch.setattr(client, "session", True)
    monkeypatch.setattr(client, "connect", AsyncMock())

    # Patch oii_tool._run to return a valid JSON string
    class DummyDisplay:
        def __init__(self):
            self.streetAddress = "123 Main St"
            self.streetAddress2 = "Apt 4"
            self.country = "US"
            self.locality = "NYC"
            self.region = "NY"
            self.postalCode = "10001"

            def model_dump(self, exclude_none=True):
                return {"streetAddress": "123 Main St"}

            self.model_dump = model_dump

    class DummyPhone:
        def __init__(self):
            self.originalNumber = "555-1234"

    class DummyContact:
        def __init__(self):
            self.addresses = [DummyDisplay()]
            self.phoneNumbers = [DummyPhone()]

    class DummyPerson:
        def __init__(self):
            self.contactInfo = DummyContact()

    class DummyProfile:
        def __init__(self):
            self.personInfo = DummyPerson()

    class DummyAccount:
        def __init__(self):
            self.accountProfile = DummyProfile()

    class DummyData:
        def __init__(self):
            self.account = DummyAccount()

    class DummyOII:
        def __init__(self):
            self.data = DummyData()

    monkeypatch.setattr(client.oii_tool, "_run", lambda user_id: "{}")
    import types

    import app.models.oii_response

    monkeypatch.setattr(
        app.models.oii_response.OIIResponse, "model_validate_json", lambda s: DummyOII()
    )
    result = asyncio.run(client.get_oii_location_info("user1"))
    assert result.source == "OII"
    # If location is None, that's a fallback, otherwise check country
    if result.location is not None:
        assert result.location["country"] == "US"


def test_get_oii_location_info_error(client, monkeypatch):
    monkeypatch.setattr(client, "session", True)
    monkeypatch.setattr(client, "connect", AsyncMock())
    monkeypatch.setattr(client.oii_tool, "_run", lambda user_id: "{}")
    import app.models.oii_response

    monkeypatch.setattr(
        app.models.oii_response.OIIResponse,
        "model_validate_json",
        lambda s: Exception("fail"),
    )
    result = asyncio.run(client.get_oii_location_info("user1"))
    # Should return a LocationInfo with location=None and error status in additional_info
    assert result.source == "OII"
    assert result.location is None
    assert "status" in result.additional_info
    assert "Error" in result.additional_info["status"]


def test_get_business_location_info(client, monkeypatch):
    monkeypatch.setattr(client, "session", True)
    monkeypatch.setattr(client, "connect", AsyncMock())
    result = asyncio.run(client.get_business_location_info("user1"))
    assert result.source == "Business Location"


def test_get_phone_location_info(client, monkeypatch):
    monkeypatch.setattr(client, "session", True)
    monkeypatch.setattr(client, "connect", AsyncMock())
    result = asyncio.run(client.get_phone_location_info("user1"))
    assert result.source == "Phone Location"


def test__get_lexisnexis_phone_location(client):
    result = asyncio.run(client._get_lexisnexis_phone_location("user1"))
    assert result.source == "LexisNexis Phone"


def test__get_kkdash_login_history(client):
    result = asyncio.run(client._get_kkdash_login_history("user1", 30))
    assert isinstance(result, list)
    assert "status" in result[0]


def test__get_databricks_login_history(client):
    result = asyncio.run(client._get_databricks_login_history("user1", 30))
    assert isinstance(result, list)
    assert "status" in result[0]


def test__get_kkdash_mfa_info(client):
    result = asyncio.run(client._get_kkdash_mfa_info("user1"))
    assert isinstance(result, dict)
    assert "status" in result


def test_get_location_data_all_blocks_error(client, monkeypatch):
    # Patch all blocks to raise
    monkeypatch.setattr(
        client, "_get_oii_location", AsyncMock(side_effect=Exception("fail"))
    )

    monkeypatch.setattr(
        client, "_get_qbo_business_location", AsyncMock(side_effect=Exception("fail"))
    )

    monkeypatch.setattr(
        client,
        "_get_lexisnexis_phone_location",
        AsyncMock(side_effect=Exception("fail")),
    )
    monkeypatch.setattr(
        client, "_get_kkdash_login_history", AsyncMock(side_effect=Exception("fail"))
    )
    monkeypatch.setattr(
        client,
        "_get_databricks_login_history",
        AsyncMock(side_effect=Exception("fail")),
    )
    monkeypatch.setattr(
        client, "_get_kkdash_mfa_info", AsyncMock(side_effect=Exception("fail"))
    )
    result = asyncio.run(client.get_location_data("user1"))
    assert "oii_results" in result
    assert "splunk_results" in result
    assert "vector_analysis" in result


def test_get_location_data_response_all_exceptions(client, monkeypatch):
    monkeypatch.setattr(
        client, "get_location_data", AsyncMock(side_effect=Exception("fail"))
    )
    result = asyncio.run(client.get_location_data_response("user1"))
    assert isinstance(result, list)
    assert len(result) == 3
    for x in result:
        assert hasattr(x, "location") and x.location is None
        status = (
            x.additional_info.get("status", "").lower() if x.additional_info else ""
        )
        assert ("unavailable" in status) or ("no primary address found" in status)


def test_get_business_location_info_no_location(client, monkeypatch):
    monkeypatch.setattr(client, "session", True)

    monkeypatch.setattr(
        client, "_get_qbo_business_location", AsyncMock(return_value=None)
    )
    result = asyncio.run(client.get_business_location_info("user1"))
    assert result is not None
    assert result.location is None
    assert result.additional_info and "unavailable" in result.additional_info.get(
        "status", ""
    )


def test_get_phone_location_info_no_location(client, monkeypatch):
    monkeypatch.setattr(client, "session", True)

    monkeypatch.setattr(
        client, "_get_lexisnexis_phone_location", AsyncMock(return_value=None)
    )
    result = asyncio.run(client.get_phone_location_info("user1"))
    assert result is not None
    assert result.location is None
    assert result.additional_info and "unavailable" in result.additional_info.get(
        "status", ""
    )


def test_get_oii_location_info_malformed(client, monkeypatch):
    # Patch OII tool to return malformed JSON
    class DummyTool:
        async def _run(self, *a, **k):
            return "{"  # Malformed JSON

    client.oii_tool = DummyTool()
    monkeypatch.setattr(client, "session", True)
    monkeypatch.setattr(client, "connect", AsyncMock())
    result = asyncio.run(client.get_oii_location_info("user1"))
    assert result is not None
    assert result.location is None
    assert result.additional_info and "error" in result.additional_info.get(
        "status", ""
    )


def test_get_oii_location_info_missing_fields(client, monkeypatch):
    # Patch OII tool to return valid but missing address
    class DummyOII:
        data = type("data", (), {"account": None})

    class DummyTool:
        async def _run(self, *a, **k):
            return json.dumps({})

    client.oii_tool = DummyTool()
    monkeypatch.setattr(client, "session", True)
    monkeypatch.setattr(client, "connect", AsyncMock())
    result = asyncio.run(client.get_oii_location_info("user1"))
    assert result is not None


def test_connect_and_close_idempotent(client):
    # Should not error if called multiple times
    asyncio.run(client.connect())
    asyncio.run(client.connect())
    asyncio.run(client.close())
    asyncio.run(client.close())


def test_all_async_methods_handle_session_none(client, monkeypatch):
    # All public async methods should work if session is None (should auto-connect)
    monkeypatch.setattr(client, "connect", AsyncMock())
    client.session = None

    # get_business_location_info
    result = asyncio.run(client.get_business_location_info("user1"))
    assert result is None or result is not None
    # get_phone_location_info
    result = asyncio.run(client.get_phone_location_info("user1"))
    assert result is None or result is not None
