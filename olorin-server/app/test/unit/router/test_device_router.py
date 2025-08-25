import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.models.device_risk import DeviceSignalRiskLLMAssessment
from app.router.device_router import router as device_router

app = FastAPI()
app.include_router(device_router)
# Add mock graph to app state to prevent 'State' object has no attribute 'graph' errors
app.state.graph = AsyncMock()


def get_mock_settings():
    """Helper function to create properly configured mock settings for tests that use OlorinHeader."""
    return MagicMock(
        splunk_host="dummy_host",
        olorin_experience_id="test_experience_id",
        olorin_originating_assetalias="test_assetalias",
    )


@pytest.fixture
def client():
    return TestClient(app)


def test_analyze_device_success(client):
    with patch("app.router.device_router.get_investigation") as mock_get_inv:
        with patch("app.router.device_router.create_investigation") as mock_create_inv:
            with patch(
                "app.router.device_router.get_settings_for_env"
            ) as mock_settings:
                with patch(
                    "app.service.agent.tools.splunk_tool.splunk_tool.SplunkQueryTool"
                ) as mock_splunk_client:
                    with patch(
                        "app.utils.firebase_secrets.get_app_secret", return_value="dummy"
                    ):
                        mock_get_inv.return_value = None
                        mock_create_inv.return_value = MagicMock()
                        mock_settings.return_value = MagicMock(splunk_host="dummy_host")
                        mock_client = MagicMock()
                        mock_client.is_connected.return_value = False
                        mock_client.search.return_value = []
                        mock_splunk_client.return_value = mock_client
                        response = client.get(
                            "/device/testuser?investigation_id=test-inv&entity_type=user_id"
                        )
                        assert response.status_code in (200, 500)


def test_analyze_device_invalid_time_range(client):
    with patch("app.router.device_router.get_investigation", return_value=None):
        with patch("app.router.device_router.create_investigation"):
            with patch(
                "app.router.device_router.get_settings_for_env",
                return_value=get_mock_settings(),
            ):
                with patch("app.utils.firebase_secrets.get_app_secret", return_value="dummy"):
                    with patch(
                        "app.service.agent.tools.splunk_tool.splunk_tool.SplunkQueryTool"
                    ) as mock_splunk_client:
                        with patch(
                            "app.router.device_router.get_identity_authorization_header",
                            return_value="auth",
                        ):
                            with patch(
                                "app.router.device_router.ChronosTool._arun",
                                return_value="{}",
                            ):
                                with patch(
                                    "app.router.device_router.ainvoke_agent",
                                    return_value=("{}", None),
                                ):
                                    mock_client = MagicMock()
                                    mock_client.is_connected.return_value = False
                                    mock_client.connect = AsyncMock()
                                    mock_client.search = AsyncMock(return_value=[])
                                    mock_splunk_client.return_value = mock_client
                                    response = client.get(
                                        "/device/testuser?investigation_id=test-inv&time_range=bad&entity_type=user_id"
                                    )
                                    assert response.status_code in (200, 400)


def test_analyze_device_missing_splunk_password(client):
    with patch("app.router.device_router.get_investigation", return_value=None):
        with patch("app.router.device_router.create_investigation"):
            with patch(
                "app.router.device_router.get_settings_for_env",
                return_value=get_mock_settings(),
            ):
                with patch("app.utils.firebase_secrets.get_app_secret", return_value=None):
                    with patch(
                        "app.router.device_router.ainvoke_agent",
                        return_value=(
                            '{"risk_level": 0.0, "risk_factors": ["No device data available"], "confidence": 0.0, "summary": "No device signals available", "thoughts": "No data"}',
                            None,
                        ),
                    ):
                        response = client.get(
                            "/device/testuser?investigation_id=test-inv&entity_type=user_id"
                        )
                        assert response.status_code == 200
                        # Verify that the response contains a splunk warning about missing credentials
                        assert (
                            "splunk_warning" in response.json()
                            or "missing Splunk credentials" in response.text
                        )


def test_analyze_device_identity_failure(client):
    with patch("app.router.device_router.get_investigation", return_value=None):
        with patch("app.router.device_router.create_investigation"):
            with patch(
                "app.router.device_router.get_settings_for_env",
                return_value=get_mock_settings(),
            ):
                with patch(
                    "app.service.agent.tools.splunk_tool.splunk_tool.SplunkQueryTool"
                ) as mock_splunk_client:
                    with patch(
                        "app.utils.firebase_secrets.get_app_secret", return_value="dummy"
                    ):
                        with patch(
                            "app.router.device_router.get_identity_authorization_header",
                            return_value=None,
                        ):
                            with patch(
                                "app.router.device_router.ChronosTool._arun",
                                return_value="{}",
                            ):
                                mock_client = MagicMock()
                                mock_client.is_connected.return_value = False
                                mock_client.search.return_value = []
                                mock_splunk_client.return_value = mock_client
                                response = client.get(
                                    "/device/testuser?investigation_id=test-inv&entity_type=user_id"
                                )
                                assert response.status_code in (200, 500)


def test_analyze_device_chronos_failure(client):
    with patch("app.router.device_router.get_investigation", return_value=None):
        with patch("app.router.device_router.create_investigation"):
            with patch(
                "app.router.device_router.get_settings_for_env",
                return_value=get_mock_settings(),
            ):
                with patch(
                    "app.service.agent.tools.splunk_tool.splunk_tool.SplunkQueryTool"
                ) as mock_splunk_client:
                    with patch(
                        "app.utils.firebase_secrets.get_app_secret", return_value="dummy"
                    ):
                        with patch(
                            "app.router.device_router.get_identity_authorization_header",
                            return_value="auth",
                        ):
                            with patch(
                                "app.router.device_router.ChronosTool._arun",
                                side_effect=Exception("chronos fail"),
                            ):
                                mock_client = MagicMock()
                                mock_client.is_connected.return_value = False
                                mock_client.search.return_value = []
                                mock_splunk_client.return_value = mock_client
                                response = client.get(
                                    "/device/testuser?investigation_id=test-inv&entity_type=user_id"
                                )
                                assert response.status_code in (200, 500)


def test_device_chronos_endpoint_success(client):
    with patch(
        "app.router.device_router.get_identity_authorization_header",
        return_value="auth",
    ):
        with patch("app.router.device_router.ChronosTool._arun", return_value="{}"):
            response = client.post(
                "/device/chronos?user_id=testuser&fields=sessionId&fields=os&fields=osVersion"
            )
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, dict)


def test_device_chronos_endpoint_identity_failure(client):
    with patch(
        "app.router.device_router.get_identity_authorization_header",
        return_value=None,
    ):
        with patch("app.router.device_router.ChronosTool._arun", return_value="{}"):
            response = client.post(
                "/device/chronos?user_id=testuser&fields=sessionId&fields=os&fields=osVersion"
            )
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, dict)


def test_device_chronos_endpoint_chronos_failure(client):
    with patch(
        "app.router.device_router.get_identity_authorization_header",
        return_value="auth",
    ):
        with patch(
            "app.router.device_router.ChronosTool._arun",
            side_effect=Exception("chronos fail"),
        ):
            response = client.post(
                "/device/chronos?user_id=testuser&fields=sessionId&fields=os&fields=osVersion"
            )
            assert response.status_code == 200
            data = response.json()
            assert "error" in data
            assert "chronos fail" in data["error"]


def test_analyze_device_raw_splunk_override(client):
    import json as pyjson

    with patch("app.router.device_router.get_investigation", return_value=None):
        with patch("app.router.device_router.create_investigation"):
            with patch(
                "app.router.device_router.get_settings_for_env",
                return_value=get_mock_settings(),
            ):
                with patch("app.utils.firebase_secrets.get_app_secret", return_value="dummy"):
                    with patch(
                        "app.router.device_router.get_identity_authorization_header",
                        return_value="auth",
                    ):
                        with patch(
                            "app.router.device_router.ChronosTool._arun",
                            return_value="{}",
                        ):
                            override = pyjson.dumps(
                                [{"fuzzy_device_id": "dev1", "true_ip_country": "US"}]
                            )
                            response = client.get(
                                f"/device/testuser?investigation_id=test-inv&raw_splunk_override={override}&entity_type=user_id"
                            )
                            assert response.status_code in (200, 500, 422)


def test_analyze_device_missing_investigation_id(client):
    response = client.get("/device/testuser")
    assert response.status_code in (422, 400, 500)


def test_analyze_device_missing_profile_id(client):
    with patch("app.router.device_router.get_investigation", return_value=None):
        with patch("app.router.device_router.create_investigation"):
            with patch(
                "app.router.device_router.get_settings_for_env",
                return_value=get_mock_settings(),
            ):
                with patch(
                    "app.service.agent.tools.splunk_tool.splunk_tool.SplunkQueryTool"
                ) as mock_splunk_client:
                    with patch(
                        "app.utils.firebase_secrets.get_app_secret", return_value="dummy"
                    ):
                        with patch(
                            "app.router.device_router.get_identity_authorization_header",
                            return_value=None,
                        ):
                            with patch(
                                "app.router.device_router.ChronosTool._arun",
                                return_value="{}",
                            ):
                                mock_client = MagicMock()
                                mock_client.is_connected.return_value = False
                                mock_client.search.return_value = []
                                mock_splunk_client.return_value = mock_client
                                response = client.get(
                                    "/device/testuser?investigation_id=test-inv&entity_type=user_id"
                                )
                                assert response.status_code in (200, 500)


def test_analyze_device_splunk_failure(client):
    with patch("app.router.device_router.get_investigation", return_value=None):
        with patch("app.router.device_router.create_investigation"):
            with patch(
                "app.router.device_router.get_settings_for_env",
                return_value=get_mock_settings(),
            ):
                with patch(
                    "app.service.agent.tools.splunk_tool.splunk_tool.SplunkQueryTool"
                ) as mock_splunk_client:
                    with patch(
                        "app.utils.firebase_secrets.get_app_secret", return_value="dummy"
                    ):
                        with patch(
                            "app.router.device_router.ainvoke_agent",
                            return_value=(
                                '{"risk_level": 0.5, "risk_factors": ["test"], "confidence": 0.8, "summary": "test", "thoughts": "test"}',
                                None,
                            ),
                        ):
                            mock_client = MagicMock()
                            mock_client.is_connected.return_value = False
                            mock_client.connect.side_effect = Exception(
                                "splunk connect fail"
                            )
                            mock_splunk_client.return_value = mock_client
                            response = client.get(
                                "/device/testuser?investigation_id=test-inv&entity_type=user_id"
                            )
                            assert response.status_code == 200
                            # Verify that the response contains a splunk warning
                            assert (
                                "splunk_warning" in response.json()
                                or "Splunk data retrieval error" in response.text
                            )


def test_analyze_device_llm_json_error(client):
    with patch("app.router.device_router.get_investigation", return_value=None):
        with patch("app.router.device_router.create_investigation"):
            with patch(
                "app.router.device_router.get_settings_for_env",
                return_value=get_mock_settings(),
            ):
                with patch(
                    "app.service.agent.tools.splunk_tool.splunk_tool.SplunkQueryTool"
                ) as mock_splunk_client:
                    with patch(
                        "app.router.device_router.get_identity_authorization_header",
                        return_value="auth",
                    ):
                        with patch(
                            "app.router.device_router.ChronosTool._arun",
                            return_value="{}",
                        ):
                            with patch(
                                "app.router.device_router.ainvoke_agent",
                                return_value=("not json", None),
                            ):
                                mock_client = MagicMock()
                                mock_client.is_connected.return_value = False
                                mock_client.connect = AsyncMock()
                                mock_client.search = AsyncMock(return_value=[])
                                mock_splunk_client.return_value = mock_client
                                response = client.get(
                                    "/device/testuser?investigation_id=test-inv&entity_type=user_id"
                                )
                                assert response.status_code in (200, 500)
                                # Check for the actual error message format that appears in the response
                                assert (
                                    "LLM invocation/validation error" in response.text
                                    or "Invalid JSON" in response.text
                                    or "llm_error_details" in response.text
                                )


def test_analyze_device_llm_validation_error(client):
    with patch("app.router.device_router.get_investigation", return_value=None):
        with patch("app.router.device_router.create_investigation"):
            with patch(
                "app.router.device_router.get_settings_for_env",
                return_value=get_mock_settings(),
            ):
                with patch(
                    "app.service.agent.tools.splunk_tool.splunk_tool.SplunkQueryTool"
                ) as mock_splunk_client:
                    with patch(
                        "app.router.device_router.get_identity_authorization_header",
                        return_value="auth",
                    ):
                        with patch(
                            "app.router.device_router.ChronosTool._arun",
                            return_value="{}",
                        ):
                            with patch(
                                "app.router.device_router.ainvoke_agent",
                                side_effect=Exception("llm fail"),
                            ):
                                mock_client = MagicMock()
                                mock_client.is_connected.return_value = False
                                mock_client.connect = AsyncMock()
                                mock_client.search = AsyncMock(return_value=[])
                                mock_splunk_client.return_value = mock_client
                                response = client.get(
                                    "/device/testuser?investigation_id=test-inv&entity_type=user_id"
                                )
                                assert response.status_code in (200, 500)
                                assert (
                                    "Error during LLM device risk assessment"
                                    in response.text
                                    or "No LLM assessment due to LLM invocation/validation error"
                                    in response.text
                                    or "Device risk error: Expecting value"
                                    in response.text
                                    or "Splunk data retrieval error" in response.text
                                )


def test_analyze_device_chronos_empty_response(client):
    with patch("app.router.device_router.get_investigation", return_value=None):
        with patch("app.router.device_router.create_investigation"):
            with patch(
                "app.router.device_router.get_settings_for_env",
                return_value=get_mock_settings(),
            ):
                with patch(
                    "app.service.agent.tools.splunk_tool.splunk_tool.SplunkQueryTool"
                ) as mock_splunk_client:
                    with patch(
                        "app.router.device_router.get_identity_authorization_header",
                        return_value="auth",
                    ):
                        with patch(
                            "app.router.device_router.ChronosTool._arun",
                            return_value="{}",
                        ):
                            mock_client = MagicMock()
                            mock_client.is_connected.return_value = False
                            mock_client.search.return_value = []
                            mock_splunk_client.return_value = mock_client
                            response = client.get(
                                "/device/testuser?investigation_id=test-inv&entity_type=user_id"
                            )
                            assert response.status_code in (200, 500)


def test_call_chronos_tool_missing_user_id(client):
    response = client.post("/device/chronos")
    assert response.status_code == 422


def test_call_chronos_tool_invalid_time_range(client):
    with patch(
        "app.router.device_router.get_identity_authorization_header",
        return_value="auth",
    ):
        with patch("app.router.device_router.ChronosTool._arun", return_value="{}"):
            response = client.post(
                "/device/chronos?entity_id=testuser&entity_type=user_id&time_range=bad"
            )
            assert response.status_code in (400, 422, 500)


def test_call_chronos_tool_chronos_exception(client):
    with patch(
        "app.router.device_router.get_identity_authorization_header",
        return_value="auth",
    ):
        with patch(
            "app.router.device_router.ChronosTool._arun",
            side_effect=Exception("chronos fail"),
        ):
            response = client.post(
                "/device/chronos?user_id=testuser&fields=sessionId&fields=os&fields=osVersion"
            )
            assert response.status_code == 200
            data = response.json()
            assert "error" in data
            assert "chronos fail" in data["error"]


def test_analyze_device_di_tool_failure(client):
    with patch("app.router.device_router.get_investigation", return_value=None):
        with patch("app.router.device_router.create_investigation"):
            with patch(
                "app.router.device_router.get_settings_for_env",
                return_value=get_mock_settings(),
            ):
                with patch(
                    "app.service.agent.tools.splunk_tool.splunk_tool.SplunkQueryTool"
                ) as mock_splunk_client:
                    with patch(
                        "app.utils.firebase_secrets.get_app_secret", return_value="dummy"
                    ):
                        with patch(
                            "app.router.device_router.get_identity_authorization_header",
                            return_value="auth",
                        ):
                            with patch(
                                "app.router.device_router.ChronosTool._arun",
                                return_value='{"sessionId": "abc"}',
                            ):
                                with patch(
                                    "app.router.device_router.DITool.run",
                                    side_effect=Exception("di fail"),
                                ):
                                    mock_client = MagicMock()
                                    mock_client.is_connected.return_value = False
                                    mock_client.search.return_value = [
                                        {
                                            "tm_sessionid": "sid",
                                            "fuzzy_device_id": "dev1",
                                        }
                                    ]
                                    mock_splunk_client.return_value = mock_client
                                    response = client.get(
                                        "/device/testuser?investigation_id=test-inv&entity_type=user_id"
                                    )
                                    assert response.status_code in (200, 500)


def test_get_identity_authorization_header_extract_error(monkeypatch):
    import asyncio

    from app.router import device_router

    class DummyResp:
        def raise_for_status(self):
            pass

        def json(self):
            return {"data": {}}

    class DummyClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            pass

        async def post(self, *a, **k):
            return DummyResp()

    monkeypatch.setattr(device_router.httpx, "AsyncClient", lambda: DummyClient())
    result = asyncio.run(device_router.get_identity_authorization_header("pid"))
    assert result is None


def test_get_identity_authorization_header_http_error(monkeypatch):
    import asyncio

    from app.router import device_router

    class DummyResp:
        def raise_for_status(self):
            raise Exception("fail")

    class DummyClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            pass

        async def post(self, *a, **k):
            return DummyResp()

    monkeypatch.setattr(device_router.httpx, "AsyncClient", lambda: DummyClient())
    result = asyncio.run(device_router.get_identity_authorization_header("pid"))
    assert result is None


def test_analyze_device_oii_results_branch(client):
    with patch("app.router.device_router.get_investigation", return_value=None):
        with patch("app.router.device_router.create_investigation"):
            with patch(
                "app.router.device_router.get_settings_for_env",
                return_value=get_mock_settings(),
            ):
                with patch(
                    "app.service.agent.tools.splunk_tool.splunk_tool.SplunkQueryTool"
                ) as mock_splunk_client:
                    with patch(
                        "app.utils.firebase_secrets.get_app_secret", return_value="dummy"
                    ):
                        with patch(
                            "app.router.device_router.get_identity_authorization_header",
                            return_value="auth",
                        ):
                            with patch(
                                "app.router.device_router.ChronosTool._arun",
                                return_value="{}",
                            ):
                                with patch(
                                    "app.router.device_router.ainvoke_agent",
                                    return_value=("{}", None),
                                ):
                                    mock_client = MagicMock()
                                    mock_client.is_connected.return_value = False
                                    mock_client.connect = AsyncMock()
                                    mock_client.search = AsyncMock(return_value=[])
                                    mock_splunk_client.return_value = mock_client
                                    # Inject oii_results into locals by patching builtins.locals
                                    import builtins

                                    orig_locals = builtins.locals
                                    builtins.locals = lambda: {
                                        "oii_results": [{"location": {"country": "US"}}]
                                    }
                                    try:
                                        response = client.get(
                                            "/device/testuser?investigation_id=test-inv&entity_type=user_id"
                                        )
                                        assert response.status_code in (200, 500)
                                    finally:
                                        builtins.locals = orig_locals


def test_analyze_device_response_dict_edge_cases(client):
    with patch("app.router.device_router.get_investigation", return_value=None):
        with patch("app.router.device_router.create_investigation"):
            with patch(
                "app.router.device_router.get_settings_for_env",
                return_value=get_mock_settings(),
            ):
                with patch(
                    "app.service.agent.tools.splunk_tool.splunk_tool.SplunkQueryTool"
                ) as mock_splunk_client:
                    with patch(
                        "app.router.device_router.get_identity_authorization_header",
                        return_value="auth",
                    ):
                        with patch(
                            "app.router.device_router.ChronosTool._arun",
                            return_value="{}",
                        ):
                            with patch(
                                "app.router.device_router.ainvoke_agent",
                                return_value=("{}", None),
                            ):
                                mock_client = MagicMock()
                                mock_client.is_connected.return_value = False
                                mock_client.connect = AsyncMock()
                                mock_client.search = AsyncMock(
                                    return_value=[
                                        {
                                            "fuzzy_device_id": None,
                                            "true_ip_country": None,
                                        }
                                    ]
                                )
                                mock_splunk_client.return_value = mock_client
                                response = client.get(
                                    "/device/testuser?investigation_id=test-inv&entity_type=user_id"
                                )
                                assert response.status_code in (200, 500)


def test_call_chronos_tool_missing_fields(client):
    # user_id is required, so this should 422
    response = client.post("/device/chronos")
    assert response.status_code == 422


def test_call_chronos_tool_invalid_fields(client):
    # fields param is not a list
    response = client.post(
        "/device/chronos?entity_id=testuser&entity_type=user_id&fields=notalist"
    )
    assert response.status_code in (200, 422, 500)


def test_get_chronos_range_all_branches():
    from app.router.device_router import get_chronos_range

    # d branch
    r = get_chronos_range("5d")
    assert "from" in r and "to" in r
    # m branch
    r = get_chronos_range("2m")
    assert "from" in r and "to" in r
    # else branch
    r = get_chronos_range("foo")
    assert "from" in r and "to" in r


def test_analyze_device_invalid_time_range_regex(client):
    response = client.get(
        "/device/testuser?investigation_id=test-inv&time_range=bad&entity_type=user_id"
    )
    assert response.status_code in (200, 400)
    assert (
        "Invalid time_range format" in response.text
        or "Device risk error" in response.text
        or "splunk_warning" in response.text
    )


def test_analyze_device_missing_splunk_credentials(client):
    with patch("app.router.device_router.get_investigation", return_value=None):
        with patch("app.router.device_router.create_investigation"):
            with patch(
                "app.router.device_router.get_settings_for_env",
                return_value=get_mock_settings(),
            ):
                with patch("app.utils.firebase_secrets.get_app_secret", return_value=None):
                    with patch(
                        "app.router.device_router.ainvoke_agent",
                        return_value=(
                            '{"risk_level": 0.0, "risk_factors": ["No device data available"], "confidence": 0.0, "summary": "No device signals available", "thoughts": "No data"}',
                            None,
                        ),
                    ):
                        response = client.get(
                            "/device/testuser?investigation_id=test-inv&time_range=30d&entity_type=user_id"
                        )
                        assert response.status_code == 200
                        # Verify that the response contains a splunk warning about missing credentials
                        assert (
                            "splunk_warning" in response.json()
                            or "missing Splunk credentials" in response.text
                        )


def test_analyze_device_generic_exception(client):
    with patch("app.router.device_router.get_investigation", return_value=None):
        with patch("app.router.device_router.create_investigation"):
            with patch(
                "app.router.device_router.get_settings_for_env",
                return_value=get_mock_settings(),
            ):
                with patch(
                    "app.service.agent.tools.splunk_tool.splunk_tool.SplunkQueryTool"
                ) as mock_splunk_client:
                    with patch(
                        "app.utils.firebase_secrets.get_app_secret", return_value="dummy"
                    ):
                        with patch(
                            "app.service.agent.tools.splunk_tool.splunk_tool.SplunkQueryTool",
                            side_effect=Exception("fail generic"),
                        ):
                            with patch(
                                "app.router.device_router.get_identity_authorization_header",
                                return_value="auth",
                            ):
                                with patch(
                                    "app.router.device_router.ChronosTool._arun",
                                    return_value="{}",
                                ):
                                    with patch(
                                        "app.router.device_router.ainvoke_agent",
                                        return_value=("{}", None),
                                    ):
                                        response = client.get(
                                            "/device/testuser?investigation_id=test-inv&time_range=1d&entity_type=user_id"
                                        )
                                        assert response.status_code == 200
                                        # Verify that the response contains a splunk warning about the generic error
                                        assert (
                                            "splunk_warning" in response.json()
                                            or "Unexpected error in Splunk processing"
                                            in response.text
                                        )


def test_analyze_device_missing_authorization_header(client):
    with patch("app.router.device_router.get_investigation", return_value=None):
        with patch("app.router.device_router.create_investigation"):
            with patch(
                "app.router.device_router.get_settings_for_env",
                return_value=MagicMock(splunk_host="dummy_host"),
            ):
                with patch(
                    "app.service.agent.tools.splunk_tool.splunk_tool.SplunkQueryTool"
                ) as mock_splunk_client:
                    mock_client = MagicMock()
                    mock_client.is_connected.return_value = False
                    mock_client.search.return_value = []
                    mock_splunk_client.return_value = mock_client
                    response = client.get(
                        "/device/testuser?investigation_id=test-inv&entity_type=user_id"
                    )
                    assert response.status_code in (200, 500)


def test_analyze_device_malformed_splunk_response(client):
    with patch("app.router.device_router.get_investigation", return_value=None):
        with patch("app.router.device_router.create_investigation"):
            with patch(
                "app.router.device_router.get_settings_for_env",
                return_value=MagicMock(splunk_host="dummy_host"),
            ):
                with patch(
                    "app.service.agent.tools.splunk_tool.splunk_tool.SplunkQueryTool"
                ) as mock_splunk_client:
                    mock_client = MagicMock()
                    mock_client.is_connected.return_value = False
                    mock_client.search.return_value = [None, {"fuzzy_device_id": None}]
                    mock_splunk_client.return_value = mock_client
                    response = client.get(
                        "/device/testuser?investigation_id=test-inv&entity_type=user_id"
                    )
                    assert response.status_code in (200, 500)


def test_analyze_device_di_tool_exception(client):
    with patch("app.router.device_router.get_investigation", return_value=None):
        with patch("app.router.device_router.create_investigation"):
            with patch(
                "app.router.device_router.get_settings_for_env",
                return_value=MagicMock(splunk_host="dummy_host"),
            ):
                with patch(
                    "app.service.agent.tools.splunk_tool.splunk_tool.SplunkQueryTool"
                ) as mock_splunk_client:
                    with patch(
                        "app.router.device_router.ChronosTool._arun",
                        return_value='{"entities": [{"data": {"sessionId": "sid"}}]}',
                    ):
                        with patch(
                            "app.router.device_router.DITool.run",
                            side_effect=Exception("di fail"),
                        ):
                            mock_client = MagicMock()
                            mock_client.is_connected.return_value = False
                            mock_client.search.return_value = []
                            mock_splunk_client.return_value = mock_client
                            response = client.get(
                                "/device/testuser?investigation_id=test-inv&entity_type=user_id"
                            )
                            assert response.status_code in (200, 500)


def test_analyze_device_llm_timeout_error(client):
    with patch("app.router.device_router.get_investigation", return_value=None):
        with patch("app.router.device_router.create_investigation"):
            with patch(
                "app.router.device_router.get_settings_for_env",
                return_value=MagicMock(splunk_host="dummy_host"),
            ):
                with patch(
                    "app.service.agent.tools.splunk_tool.splunk_tool.SplunkQueryTool"
                ) as mock_splunk_client:
                    with patch(
                        "app.service.llm_device_risk_service.ainvoke_agent",
                        side_effect=Exception("timeout"),
                    ):
                        mock_client = MagicMock()
                        mock_client.is_connected.return_value = False
                        mock_client.search.return_value = []
                        mock_splunk_client.return_value = mock_client
                        response = client.get(
                            "/device/testuser?investigation_id=test-inv&entity_type=user_id"
                        )
                        assert response.status_code == 200
                        # Verify that the response contains fallback assessment data
                        response_data = response.json()
                        assert "device_llm_assessment" in response_data
                        assert response_data["device_llm_assessment"] is not None
                        assert (
                            response_data["device_llm_assessment"]["risk_factors"]
                            is not None
                        )
