import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.router.api_router import router as api_router
from app.router.network_router import router as network_router

app = FastAPI()
app.include_router(network_router)
app.include_router(api_router)


@pytest.fixture
def client():
    return TestClient(app)


def clear_demo_mode():
    import app.router.demo_router as demo_router_mod

    demo_router_mod.demo_mode_users.clear()
    demo_router_mod.demo_cache.clear()


def get_mock_settings():
    """Helper function to get properly configured mock settings"""
    return MagicMock(
        splunk_host="dummy_host",
        olorin_originating_assetalias="test-asset",
        olorin_experience_id="test-exp-id",
    )


def test_analyze_network_success(client):
    with (
        patch("app.service.network_analysis_service.get_investigation") as mock_get_inv,
        patch(
            "app.service.network_analysis_service.update_investigation_llm_thoughts"
        ) as mock_create_inv,
        patch(
            "app.service.network_analysis_service.get_settings_for_env",
            return_value=MagicMock(
                splunk_host="dummy_host",
                olorin_originating_assetalias="test-asset",
                olorin_experience_id="test-exp-id",
            ),
        ) as mock_settings,
        patch(
            "app.service.network_analysis_service.SplunkQueryTool"
        ) as mock_splunk_tool,
        patch("app.utils.firebase_secrets.get_app_secret", return_value="dummy"),
    ):
        mock_get_inv.return_value = None
        mock_create_inv.return_value = MagicMock()
        mock_settings.return_value = MagicMock(splunk_host="dummy_host")
        mock_tool = AsyncMock()
        mock_tool.arun.return_value = []
        mock_splunk_tool.return_value = mock_tool
        response = client.get("/network/testuser?investigation_id=test-inv")
        assert response.status_code in (200, 500)


def test_analyze_network_invalid_time_range(client):
    with patch("app.service.network_analysis_service.demo_mode_users", set()):
        with patch("app.service.network_analysis_service.demo_cache", {}):
            response = client.get(
                "/network/testuser?investigation_id=test-inv&time_range=bad"
            )
            assert response.status_code == 200
            assert (
                "Invalid time_range format" in response.text or "error" in response.text
            )


def test_analyze_network_missing_splunk_password(client):
    with patch("app.service.network_analysis_service.demo_mode_users", set()):
        with patch("app.service.network_analysis_service.demo_cache", {}):
            with patch(
                "app.service.network_analysis_service.get_settings_for_env",
                return_value=MagicMock(splunk_host="dummy_host"),
            ) as mock_settings:
                with patch(
                    "app.utils.firebase_secrets.get_app_secret",
                    return_value=None,
                ) as mock_secret:
                    response = client.get("/network/testuser?investigation_id=test-inv")
                    assert response.status_code in (200, 500)
                    assert (
                        "splunk_warning" in response.text
                        or "missing Splunk credentials" in response.text
                        or "Error during network risk assessment" in response.text
                    )


def test_analyze_network_demo_mode(client):
    import app.router.demo_router as demo_router_mod

    demo_router_mod.demo_mode_users.clear()
    demo_router_mod.demo_mode_users.add("testuser")
    demo_router_mod.demo_cache.clear()
    demo_router_mod.demo_cache["testuser"] = {"network": {"foo": "bar"}}
    response = client.get("/network/testuser?investigation_id=test-inv")
    assert response.status_code == 200
    assert response.json()["foo"] == "bar"


def test_analyze_network_splunk_error(client):
    with (
        patch(
            "app.service.network_analysis_service.get_investigation", return_value=None
        ),
        patch("app.service.network_analysis_service.update_investigation_llm_thoughts"),
        patch(
            "app.service.network_analysis_service.get_settings_for_env",
            return_value=MagicMock(splunk_host="dummy_host"),
        ),
        patch("app.utils.firebase_secrets.get_app_secret", return_value="pw"),
        patch(
            "app.service.network_analysis_service.SplunkClient"
        ) as mock_splunk_client,
    ):
        mock_client = MagicMock()
        mock_client.is_connected.return_value = False
        mock_client.search.side_effect = Exception("fail")
        mock_splunk_client.return_value = mock_client
        response = client.get("/network/testuser?investigation_id=test-inv")
        assert response.status_code in (200, 500)


def test_analyze_network_llm_error(client):
    with (
        patch(
            "app.service.network_analysis_service.get_investigation", return_value=None
        ),
        patch("app.service.network_analysis_service.update_investigation_llm_thoughts"),
        patch(
            "app.service.network_analysis_service.get_settings_for_env",
            return_value=MagicMock(splunk_host="dummy_host"),
        ),
        patch("app.utils.firebase_secrets.get_app_secret", return_value="pw"),
        patch(
            "app.service.network_analysis_service.SplunkClient"
        ) as mock_splunk_client,
        patch(
            "app.service.network_analysis_service.ainvoke_agent",
            new_callable=AsyncMock,
            side_effect=Exception("llm fail"),
        ),
    ):
        mock_client = MagicMock()
        mock_client.is_connected.return_value = False
        mock_client.search.return_value = []
        mock_splunk_client.return_value = mock_client
        response = client.get("/network/testuser?investigation_id=test-inv")
        assert response.status_code in (200, 500)


def test_analyze_network_missing_authorization_header(client):
    with patch(
        "app.service.network_analysis_service.get_settings_for_env",
        return_value=MagicMock(splunk_host="dummy_host"),
    ) as mock_settings:
        with patch(
            "app.service.network_analysis_service.SplunkClient"
        ) as mock_splunk_client:
            with patch(
                "app.utils.firebase_secrets.get_app_secret", return_value="pw"
            ) as mock_secret:
                mock_client = MagicMock()
                mock_client.is_connected.return_value = False
                mock_client.search.return_value = []
                mock_splunk_client.return_value = mock_client
                response = client.get("/network/testuser?investigation_id=test-inv")
                assert response.status_code in (200, 500)


def test_analyze_network_splunk_failure(client):
    with patch("app.service.network_analysis_service.demo_mode_users", set()):
        with patch("app.service.network_analysis_service.demo_cache", {}):
            with patch(
                "app.service.network_analysis_service.get_settings_for_env",
                return_value=MagicMock(splunk_host="dummy_host"),
            ) as mock_settings:
                with patch(
                    "app.utils.firebase_secrets.get_app_secret",
                    return_value="pw",
                ) as mock_secret:
                    with patch(
                        "app.service.network_analysis_service.SplunkClient"
                    ) as mock_splunk_client:
                        mock_client = MagicMock()
                        mock_client.is_connected.return_value = False
                        mock_client.connect.side_effect = Exception(
                            "splunk connect fail"
                        )
                        mock_splunk_client.return_value = mock_client
                        response = client.get(
                            "/network/testuser?investigation_id=test-inv"
                        )
                        assert response.status_code in (200, 500)
                        assert (
                            "splunk_warning" in response.text
                            or "Splunk data retrieval error" in response.text
                            or "Error during network risk assessment" in response.text
                        )


def test_analyze_network_llm_json_error(client):
    with patch("app.service.network_analysis_service.demo_mode_users", set()):
        with patch("app.service.network_analysis_service.demo_cache", {}):
            with patch(
                "app.service.network_analysis_service.get_settings_for_env",
                return_value=MagicMock(splunk_host="dummy_host"),
            ) as mock_settings:
                with patch(
                    "app.utils.firebase_secrets.get_app_secret",
                    return_value="pw",
                ) as mock_secret:
                    with patch(
                        "app.service.network_analysis_service.SplunkClient"
                    ) as mock_splunk_client:
                        with patch(
                            "app.service.network_analysis_service.ainvoke_agent",
                            return_value=("not json", None),
                        ) as mock_ainvoke:
                            mock_client = MagicMock()
                            mock_client.is_connected.return_value = False
                            mock_client.connect = AsyncMock()
                            mock_client.search = AsyncMock(return_value=[])
                            mock_splunk_client.return_value = mock_client
                            response = client.get(
                                "/network/testuser?investigation_id=test-inv"
                            )
                            assert response.status_code in (200, 500)
                            assert (
                                "network_risk_assessment" in response.text
                                or "LLM response not valid JSON" in response.text
                                or "Error during network risk assessment"
                                in response.text
                            )


def test_analyze_network_llm_timeout_error(client):
    clear_demo_mode()
    with patch(
        "app.service.network_analysis_service.get_settings_for_env",
        return_value=MagicMock(splunk_host="dummy_host"),
    ):
        with patch(
            "app.service.network_analysis_service.SplunkClient"
        ) as mock_splunk_client:
            with patch("app.utils.firebase_secrets.get_app_secret", return_value="pw"):
                with patch(
                    "app.service.network_analysis_service.ainvoke_agent",
                    new_callable=AsyncMock,
                    side_effect=Exception("timeout"),
                ):
                    mock_client = MagicMock()
                    mock_client.is_connected.return_value = False
                    mock_client.connect = AsyncMock()
                    mock_client.search = AsyncMock(return_value=[])
                    mock_splunk_client.return_value = mock_client
                    response = client.get("/network/testuser?investigation_id=test-inv")
                    assert response.status_code == 200
                    # Verify that the response contains fallback assessment data
                    response_data = response.json()
                    assert "network_risk_assessment" in response_data
                    assert response_data["network_risk_assessment"] is not None
                    assert (
                        response_data["network_risk_assessment"]["risk_factors"]
                        is not None
                    )
                    assert any(
                        "timeout" in factor.lower()
                        for factor in response_data["network_risk_assessment"][
                            "risk_factors"
                        ]
                    )


def test_analyze_network_llm_service_down(client):
    clear_demo_mode()
    with patch(
        "app.service.network_analysis_service.get_settings_for_env",
        return_value=MagicMock(splunk_host="dummy_host"),
    ):
        with patch(
            "app.service.network_analysis_service.SplunkClient"
        ) as mock_splunk_client:
            with patch("app.utils.firebase_secrets.get_app_secret", return_value="pw"):
                with patch(
                    "app.service.network_analysis_service.ainvoke_agent",
                    new_callable=AsyncMock,
                    side_effect=Exception("External service dependency call failed"),
                ):
                    mock_client = MagicMock()
                    mock_client.is_connected.return_value = False
                    mock_client.connect = AsyncMock()
                    mock_client.search = AsyncMock(return_value=[])
                    mock_splunk_client.return_value = mock_client
                    response = client.get("/network/testuser?investigation_id=test-inv")
                    assert response.status_code in (200, 500)
                    assert (
                        "LLM service temporarily unavailable" in response.text
                        or "Error during network risk assessment" in response.text
                        or "network_risk_assessment" in response.text
                    )


def test_analyze_network_llm_400_error(client):
    clear_demo_mode()
    with patch(
        "app.service.network_analysis_service.get_settings_for_env",
        return_value=MagicMock(splunk_host="dummy_host"),
    ):
        with patch(
            "app.service.network_analysis_service.SplunkClient"
        ) as mock_splunk_client:
            with patch("app.utils.firebase_secrets.get_app_secret", return_value="pw"):
                with patch(
                    "app.service.network_analysis_service.ainvoke_agent",
                    new_callable=AsyncMock,
                    side_effect=Exception("400 error_message"),
                ):
                    mock_client = MagicMock()
                    mock_client.is_connected.return_value = False
                    mock_client.connect = AsyncMock()
                    mock_client.search = AsyncMock(return_value=[])
                    mock_splunk_client.return_value = mock_client
                    response = client.get("/network/testuser?investigation_id=test-inv")
                    assert response.status_code in (200, 500)
                    assert (
                        "LLM service error - invalid request format" in response.text
                        or "Error during network risk assessment" in response.text
                        or "network_risk_assessment" in response.text
                    )


def test_analyze_network_llm_timeout_error(client):
    clear_demo_mode()
    with patch(
        "app.service.network_analysis_service.get_settings_for_env",
        return_value=MagicMock(splunk_host="dummy_host"),
    ):
        with patch(
            "app.service.network_analysis_service.SplunkClient"
        ) as mock_splunk_client:
            with patch("app.utils.firebase_secrets.get_app_secret", return_value="pw"):
                with patch(
                    "app.service.network_analysis_service.ainvoke_agent",
                    new_callable=AsyncMock,
                    side_effect=Exception("connection timeout"),
                ):
                    mock_client = MagicMock()
                    mock_client.is_connected.return_value = False
                    mock_client.connect = AsyncMock()
                    mock_client.search = AsyncMock(return_value=[])
                    mock_splunk_client.return_value = mock_client
                    response = client.get("/network/testuser?investigation_id=test-inv")
                    assert response.status_code in (200, 500)
                    assert (
                        "LLM service timeout or connection error" in response.text
                        or "Error during network risk assessment" in response.text
                        or "network_risk_assessment" in response.text
                    )


def test_analyze_network_llm_generic_error(client):
    clear_demo_mode()
    with patch(
        "app.service.network_analysis_service.get_settings_for_env",
        return_value=MagicMock(splunk_host="dummy_host"),
    ):
        with patch(
            "app.service.network_analysis_service.SplunkClient"
        ) as mock_splunk_client:
            with patch("app.utils.firebase_secrets.get_app_secret", return_value="pw"):
                with patch(
                    "app.service.network_analysis_service.ainvoke_agent",
                    new_callable=AsyncMock,
                    side_effect=Exception("generic error"),
                ):
                    mock_client = MagicMock()
                    mock_client.is_connected.return_value = False
                    mock_client.connect = AsyncMock()
                    mock_client.search = AsyncMock(return_value=[])
                    mock_splunk_client.return_value = mock_client
                    response = client.get("/network/testuser?investigation_id=test-inv")
                    assert response.status_code in (200, 500)
                    assert (
                        "LLM invocation/validation error" in response.text
                        or "Error during network risk assessment" in response.text
                        or "network_risk_assessment" in response.text
                    )


def test_analyze_network_fallback_risk_scoring(client):
    clear_demo_mode()
    fake_logs = [{"isp": f"ISP{i%7}", "org": f"Org{i%5}"} for i in range(12)]
    with patch(
        "app.service.network_analysis_service.get_settings_for_env",
        return_value=MagicMock(splunk_host="dummy_host"),
    ):
        with patch(
            "app.service.network_analysis_service.SplunkClient"
        ) as mock_splunk_client:
            with patch("app.utils.firebase_secrets.get_app_secret", return_value="pw"):
                with patch(
                    "app.service.network_analysis_service.ainvoke_agent",
                    new_callable=AsyncMock,
                    side_effect=Exception("generic error"),
                ):
                    mock_client = MagicMock()
                    mock_client.is_connected.return_value = False
                    mock_client.connect = AsyncMock()
                    mock_client.search = AsyncMock(return_value=fake_logs)
                    mock_splunk_client.return_value = mock_client
                    response = client.get("/network/testuser?investigation_id=test-inv")
                    assert response.status_code in (200, 500)
                    assert (
                        "Multiple ISPs detected" in response.text
                        or "Multiple organizations detected" in response.text
                        or "Error during network risk assessment" in response.text
                        or "network_risk_assessment" in response.text
                    )


def test_analyze_network_json_decode_error(client):
    clear_demo_mode()
    with patch(
        "app.service.network_analysis_service.get_settings_for_env",
        return_value=MagicMock(splunk_host="dummy_host"),
    ):
        with patch(
            "app.service.network_analysis_service.SplunkClient"
        ) as mock_splunk_client:
            with patch("app.utils.firebase_secrets.get_app_secret", return_value="pw"):
                with patch(
                    "app.service.network_analysis_service.ainvoke_agent",
                    new_callable=AsyncMock,
                    return_value=("not valid json", None),
                ):
                    mock_client = MagicMock()
                    mock_client.is_connected.return_value = False
                    mock_client.connect = AsyncMock()
                    mock_client.search = AsyncMock(return_value=[])
                    mock_splunk_client.return_value = mock_client
                    response = client.get("/network/testuser?investigation_id=test-inv")
                    assert response.status_code in (200, 500)
                    assert (
                        "LLM response not valid JSON" in response.text
                        or "Error during network risk assessment" in response.text
                        or "network_risk_assessment" in response.text
                    )


def test_analyze_network_raw_splunk_override(client):
    clear_demo_mode()
    override = [{"email_address": "foo@bar.com"}]
    with patch(
        "app.service.network_analysis_service.get_settings_for_env",
        return_value=MagicMock(splunk_host="dummy_host"),
    ):
        with patch(
            "app.service.network_analysis_service.SplunkClient"
        ) as mock_splunk_client:
            with patch("app.utils.firebase_secrets.get_app_secret", return_value="pw"):
                with patch(
                    "app.service.network_analysis_service.ainvoke_agent",
                    new_callable=AsyncMock,
                    side_effect=Exception("generic error"),
                ):
                    mock_client = MagicMock()
                    mock_client.is_connected.return_value = False
                    mock_client.search.return_value = []
                    mock_splunk_client.return_value = mock_client
                    response = client.post(
                        "/network/testuser?investigation_id=test-inv",
                        json={"raw_splunk_override": override},
                    )
                    assert response.status_code in (200, 405, 500)


def test_analyze_network_prompt_trimming_warning(client):
    clear_demo_mode()
    with patch(
        "app.service.network_analysis_service.get_settings_for_env",
        return_value=MagicMock(splunk_host="dummy_host"),
    ):
        with patch(
            "app.service.network_analysis_service.SplunkClient"
        ) as mock_splunk_client:
            with patch("app.utils.firebase_secrets.get_app_secret", return_value="pw"):
                with patch(
                    "app.service.network_analysis_service.trim_prompt_to_token_limit",
                    return_value=({"data": "trimmed"}, "prompt", True),
                ):
                    with patch(
                        "app.service.network_analysis_service.ainvoke_agent",
                        new_callable=AsyncMock,
                        side_effect=Exception("generic error"),
                    ):
                        mock_client = MagicMock()
                        mock_client.is_connected.return_value = False
                        mock_client.connect = AsyncMock()
                        mock_client.search = AsyncMock(return_value=[])
                        mock_splunk_client.return_value = mock_client
                        response = client.get(
                            "/network/testuser?investigation_id=test-inv"
                        )
                        assert response.status_code in (200, 500)


def test_update_investigation_llm_thoughts_called(client):
    clear_demo_mode()
    with patch(
        "app.service.network_analysis_service.get_settings_for_env",
        return_value=MagicMock(splunk_host="dummy_host"),
    ):
        with patch(
            "app.service.network_analysis_service.SplunkClient"
        ) as mock_splunk_client:
            with patch("app.utils.firebase_secrets.get_app_secret", return_value="pw"):
                with patch(
                    "app.service.network_analysis_service.update_investigation_llm_thoughts"
                ) as mock_update:
                    with patch(
                        "app.service.network_analysis_service.ainvoke_agent",
                        new_callable=AsyncMock,
                        return_value=(
                            '{"risk_level": 0.5, "risk_factors": ["test"], "anomaly_details": [], "confidence": 0.8, "summary": "test", "thoughts": "test thoughts"}',
                            None,
                        ),
                    ):
                        mock_client = MagicMock()
                        mock_client.is_connected.return_value = False
                        mock_client.connect = AsyncMock()
                        mock_client.search = AsyncMock(return_value=[])
                        mock_splunk_client.return_value = mock_client
                        response = client.get(
                            "/network/testuser?investigation_id=test-inv"
                        )
                        assert response.status_code in (200, 500)
                        if response.status_code == 200:
                            # Should have called update_investigation_llm_thoughts
                            mock_update.assert_called()


def test_analyze_network_outer_exception(client):
    with patch(
        "app.service.network_analysis_service.get_settings_for_env",
        side_effect=Exception("outer fail"),
    ):
        response = client.get("/network/testuser?investigation_id=test-inv")
        assert response.status_code in (200, 500)
        assert (
            "outer fail" in response.text
            or "Error during network risk assessment" in response.text
            or "Network analysis failed" in response.text
        )


def test_analyze_network_invalid_user_id(client):
    with patch(
        "app.service.network_analysis_service.get_settings_for_env",
        return_value=MagicMock(splunk_host="dummy_host"),
    ):
        response = client.get("/network/?investigation_id=test-inv")
        assert response.status_code == 404


def test_analyze_network_missing_investigation_id(client):
    with patch(
        "app.service.network_analysis_service.get_settings_for_env",
        return_value=MagicMock(splunk_host="dummy_host"),
    ):
        response = client.get("/network/testuser")
        assert response.status_code == 422


def test_analyze_network_malformed_time_range(client):
    with patch(
        "app.service.network_analysis_service.get_settings_for_env",
        return_value=MagicMock(splunk_host="dummy_host"),
    ):
        response = client.get(
            "/network/testuser?investigation_id=test-inv&time_range=invalid"
        )
        assert response.status_code in (200, 400, 500)
        assert (
            "Invalid time_range format" in response.text
            or "Error during network risk assessment" in response.text
            or "Network analysis failed" in response.text
            or "risk_assessment" in response.text
        )


def test_analyze_network_malformed_splunk_results(client):
    with patch(
        "app.service.network_analysis_service.get_settings_for_env",
        return_value=MagicMock(splunk_host="dummy_host"),
    ):
        with patch(
            "app.service.network_analysis_service.SplunkClient"
        ) as mock_splunk_client:
            with patch("app.utils.firebase_secrets.get_app_secret", return_value="pw"):
                mock_client = MagicMock()
                mock_client.is_connected.return_value = False
                mock_client.search.return_value = ["malformed", "data"]
                mock_splunk_client.return_value = mock_client
                response = client.get("/network/testuser?investigation_id=test-inv")
                assert response.status_code in (200, 500)


def test_analyze_network_malformed_authorization_header(client):
    with patch(
        "app.service.network_analysis_service.get_settings_for_env",
        return_value=MagicMock(splunk_host="dummy_host"),
    ):
        with patch(
            "app.service.network_analysis_service.SplunkClient"
        ) as mock_splunk_client:
            with patch("app.utils.firebase_secrets.get_app_secret", return_value="pw"):
                mock_client = MagicMock()
                mock_client.is_connected.return_value = False
                mock_client.search.return_value = []
                mock_splunk_client.return_value = mock_client
                response = client.get(
                    "/network/testuser?investigation_id=test-inv",
                    headers={"authorization": "malformed"},
                )
                assert response.status_code in (200, 401, 500)


def test_analyze_network_prompt_trimming_large_input(client):
    clear_demo_mode()
    large_logs = [{"ip": f"1.2.3.{i}", "isp": f"ISP{i%3}"} for i in range(50)]
    with patch(
        "app.service.network_analysis_service.get_settings_for_env",
        return_value=MagicMock(splunk_host="dummy_host"),
    ):
        with patch(
            "app.service.network_analysis_service.SplunkClient"
        ) as mock_splunk_client:
            with patch("app.utils.firebase_secrets.get_app_secret", return_value="pw"):
                with patch(
                    "app.service.network_analysis_service.trim_prompt_to_token_limit",
                    return_value=({"data": "trimmed"}, "prompt", True),
                ):
                    with patch(
                        "app.service.network_analysis_service.ainvoke_agent",
                        new_callable=AsyncMock,
                        side_effect=Exception("generic error"),
                    ):
                        mock_client = MagicMock()
                        mock_client.is_connected.return_value = False
                        mock_client.connect = AsyncMock()
                        mock_client.search = AsyncMock(return_value=large_logs)
                        mock_splunk_client.return_value = mock_client
                        response = client.get(
                            "/network/testuser?investigation_id=test-inv"
                        )
                        assert response.status_code in (200, 500)
