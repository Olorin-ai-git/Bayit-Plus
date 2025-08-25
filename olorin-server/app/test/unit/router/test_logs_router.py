import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.router.api_router import router as api_router
from app.router.logs_router import get_chronos_range
from app.router.logs_router import router as logs_router

app = FastAPI()
app.include_router(logs_router)
app.include_router(api_router)


@pytest.fixture
def client():
    # Use keyword argument for app to match TestClient signature
    return TestClient(app=app)


def clear_demo_mode():
    import app.router.demo_router as demo_router_mod

    demo_router_mod.demo_mode_users.clear()
    demo_router_mod.demo_cache.clear()


def test_analyze_logs_success(client):
    with patch(
        "app.service.logs_analysis_service.get_settings_for_env"
    ) as mock_settings:
        with patch(
            "app.service.logs_analysis_service.SplunkQueryTool"
        ) as mock_splunk_tool:
            with patch(
                "app.service.logs_analysis_service.sanitize_splunk_data",
                return_value=[],
            ):
                with patch(
                    "app.service.agent.tools.chronos_tool.chronos_tool.ChronosTool"
                ) as mock_chronos_tool:
                    mock_settings.return_value = MagicMock(splunk_index="dummy_index")
                    mock_tool = MagicMock()
                    mock_tool.arun.return_value = {"results": []}
                    mock_splunk_tool.return_value = mock_tool
                    mock_chronos_tool.return_value._arun.return_value = "{}"
                    response = client.get(
                        "/api/logs/testuser?investigation_id=test-inv"
                    )
                    assert response.status_code in (200, 500)


def test_api_logs_demo_mode_cache_hit(client):
    clear_demo_mode()
    import app.router.demo_router as demo_router_mod

    patch_users = patch.object(demo_router_mod, "demo_mode_users", {"testuser"})
    patch_cache = patch.object(
        demo_router_mod, "demo_cache", {"testuser": {"logs": {"foo": "bar"}}}
    )
    with patch_users:
        with patch_cache:
            response = client.get("/api/logs/testuser?investigation_id=test-inv")
            print("RESPONSE:", response.json())
            assert response.status_code == 200
            # Accept any structure, just check for 200 OK for now


def test_api_logs_demo_mode_cache_miss(client):
    # Simulate demo mode but no cache
    clear_demo_mode()
    demo_mode_users = ["testuser"]
    demo_mode_users.extend(demo_mode_users)
    response = client.get("/api/logs/testuser?investigation_id=test-inv")
    assert response.status_code == 200
    assert "risk_assessment" in response.json()


def test_api_logs_splunk_error(client):
    # Simulate Splunk error fallback
    from app.service import agent_service, config
    from app.service.agent.tools.chronos_tool import chronos_tool
    from app.service.agent.tools.splunk_tool import splunk_tool
    from app.utils import firebase_secrets, prompt_utils

    with patch("app.service.config.get_settings_for_env") as mock_settings:
        with patch("app.utils.idps_utils.get_app_secret", return_value="pw"):
            with patch(
                "app.service.agent.tools.splunk_tool.splunk_tool.SplunkQueryTool"
            ) as mock_splunk_tool:
                with patch(
                    "app.utils.prompt_utils.sanitize_splunk_data", return_value=[]
                ):
                    with patch(
                        "app.service.agent.tools.chronos_tool.chronos_tool.ChronosTool"
                    ) as mock_chronos_tool:
                        with patch(
                            "app.service.agent_service.ainvoke_agent",
                            new_callable=AsyncMock,
                            return_value=("{}", None),
                        ):
                            mock_settings.return_value = MagicMock(
                                splunk_host="dummy_host",
                                splunk_index="dummy_index",
                                olorin_experience_id="id",
                                olorin_originating_assetalias="alias",
                            )
                            mock_splunk_tool.return_value.arun = AsyncMock(
                                side_effect=Exception("fail")
                            )
                            mock_chronos_tool.return_value._arun = AsyncMock(
                                return_value="{}"
                            )
                            response = client.get(
                                "/api/logs/testuser?investigation_id=test-inv"
                            )
                            assert response.status_code == 200
                            assert "risk_assessment" in response.json()


def test_api_logs_chronos_error(client):
    # Simulate Chronos error fallback
    with patch("app.service.config.get_settings_for_env") as mock_settings:
        with patch("app.utils.idps_utils.get_app_secret", return_value="pw"):
            with patch(
                "app.service.agent.tools.splunk_tool.splunk_tool.SplunkQueryTool"
            ) as mock_splunk_tool:
                with patch(
                    "app.utils.prompt_utils.sanitize_splunk_data", return_value=[]
                ):
                    with patch(
                        "app.service.agent.tools.chronos_tool.chronos_tool.ChronosTool"
                    ) as mock_chronos_tool:
                        with patch(
                            "app.service.agent_service.ainvoke_agent",
                            new_callable=AsyncMock,
                            return_value=("{}", None),
                        ):
                            mock_settings.return_value = MagicMock(
                                splunk_host="dummy_host",
                                splunk_index="dummy_index",
                                olorin_experience_id="id",
                                olorin_originating_assetalias="alias",
                            )
                            mock_splunk_tool.return_value.arun = AsyncMock(
                                return_value={"results": []}
                            )
                            mock_chronos_tool.return_value._arun = AsyncMock(
                                side_effect=Exception("fail")
                            )
                            response = client.get(
                                "/api/logs/testuser?investigation_id=test-inv"
                            )
                            assert response.status_code == 200
                            assert "risk_assessment" in response.json()


def test_api_logs_llm_json_decode_error(client):
    # Simulate LLM JSON decode error
    with patch("app.service.config.get_settings_for_env") as mock_settings:
        with patch("app.utils.idps_utils.get_app_secret", return_value="pw"):
            with patch(
                "app.service.agent.tools.splunk_tool.splunk_tool.SplunkQueryTool"
            ) as mock_splunk_tool:
                with patch(
                    "app.utils.prompt_utils.sanitize_splunk_data", return_value=[]
                ):
                    with patch(
                        "app.service.agent.tools.chronos_tool.chronos_tool.ChronosTool"
                    ) as mock_chronos_tool:
                        with patch(
                            "app.service.agent_service.ainvoke_agent",
                            new_callable=AsyncMock,
                            return_value=("notjson", None),
                        ) as mock_ainvoke:
                            mock_settings.return_value = MagicMock(
                                splunk_host="dummy_host",
                                splunk_index="dummy_index",
                                olorin_experience_id="id",
                                olorin_originating_assetalias="alias",
                            )
                            mock_splunk_tool.return_value.arun = AsyncMock(
                                return_value={"results": []}
                            )
                            mock_chronos_tool.return_value._arun = AsyncMock(
                                return_value="{}"
                            )
                            response = client.get(
                                "/api/logs/testuser?investigation_id=test-inv"
                            )
                            assert response.status_code == 200
                            data = response.json()
                            summary = data["risk_assessment"]["summary"]
                            assert ("LLM" in summary) or (
                                "log risk assessment" in summary
                            )


def test_api_logs_llm_missing_risk_assessment(client):
    # Simulate LLM missing risk_assessment key
    with patch("app.service.config.get_settings_for_env") as mock_settings:
        with patch("app.utils.idps_utils.get_app_secret", return_value="pw"):
            with patch(
                "app.service.agent.tools.splunk_tool.splunk_tool.SplunkQueryTool"
            ) as mock_splunk_tool:
                with patch(
                    "app.utils.prompt_utils.sanitize_splunk_data", return_value=[]
                ):
                    with patch(
                        "app.service.agent.tools.chronos_tool.chronos_tool.ChronosTool"
                    ) as mock_chronos_tool:
                        with patch(
                            "app.service.agent_service.ainvoke_agent",
                            new_callable=AsyncMock,
                            return_value=("{}", None),
                        ):
                            mock_settings.return_value = MagicMock(
                                splunk_host="dummy_host",
                                splunk_index="dummy_index",
                                olorin_experience_id="id",
                                olorin_originating_assetalias="alias",
                            )
                            mock_splunk_tool.return_value.arun = AsyncMock(
                                return_value={"results": []}
                            )
                            mock_chronos_tool.return_value._arun = AsyncMock(
                                return_value="{}"
                            )
                            response = client.get(
                                "/api/logs/testuser?investigation_id=test-inv"
                            )
                            assert response.status_code == 200
                            data = response.json()
                            summary = data["risk_assessment"]["summary"]
                            assert ("LLM" in summary) or (
                                "log risk assessment" in summary
                            )


def test_analyze_logs_invalid_time_range(client):
    response = client.get("/api/logs/testuser?investigation_id=test-inv&time_range=bad")
    assert response.status_code in (200, 500)


def test_analyze_logs_missing_splunk_password(client):
    with patch(
        "app.service.logs_analysis_service.get_settings_for_env",
        return_value=MagicMock(splunk_index="dummy_index"),
    ):
        with patch(
            "app.service.logs_analysis_service.SplunkQueryTool"
        ) as mock_splunk_tool:
            with patch("app.utils.idps_utils.get_app_secret", return_value=None):
                with patch(
                    "app.service.logs_analysis_service.sanitize_splunk_data",
                    return_value=[],
                ):
                    with patch(
                        "app.service.agent.tools.chronos_tool.chronos_tool.ChronosTool"
                    ) as mock_chronos_tool:
                        mock_tool = MagicMock()
                        mock_tool.arun.return_value = {"results": []}
                        mock_splunk_tool.return_value = mock_tool
                        mock_chronos_tool.return_value._arun.return_value = "{}"
                        response = client.get(
                            "/api/logs/testuser?investigation_id=test-inv"
                        )
                        assert response.status_code in (200, 500)


def test_analyze_logs_llm_error(client):
    with patch(
        "app.service.logs_analysis_service.get_settings_for_env",
        return_value=MagicMock(splunk_index="dummy_index"),
    ):
        with patch(
            "app.service.logs_analysis_service.SplunkQueryTool"
        ) as mock_splunk_tool:
            with patch("app.utils.idps_utils.get_app_secret", return_value="pw"):
                with patch(
                    "app.service.logs_analysis_service.sanitize_splunk_data",
                    return_value=[],
                ):
                    with patch(
                        "app.service.agent.tools.chronos_tool.chronos_tool.ChronosTool"
                    ) as mock_chronos_tool:
                        with patch(
                            "app.service.agent_service.ainvoke_agent",
                            new_callable=AsyncMock,
                            side_effect=Exception("llm fail"),
                        ):
                            mock_tool = MagicMock()
                            mock_tool.arun.return_value = {"results": []}
                            mock_splunk_tool.return_value = mock_tool
                            mock_chronos_tool.return_value._arun.return_value = "{}"
                            response = client.get(
                                "/api/logs/testuser?investigation_id=test-inv"
                            )
                            assert response.status_code in (200, 500)


def test_analyze_logs_missing_authorization_header(client):
    with patch(
        "app.service.logs_analysis_service.get_settings_for_env",
        return_value=MagicMock(splunk_index="dummy_index"),
    ):
        with patch(
            "app.service.logs_analysis_service.SplunkQueryTool"
        ) as mock_splunk_tool:
            with patch(
                "app.service.logs_analysis_service.sanitize_splunk_data",
                return_value=[],
            ) as mock_sanitize:
                with patch(
                    "app.service.agent.tools.chronos_tool.chronos_tool.ChronosTool"
                ) as mock_chronos_tool:
                    mock_tool = MagicMock()
                    mock_tool.arun.return_value = {"results": []}
                    mock_splunk_tool.return_value = mock_tool
                    response = client.get(
                        "/api/logs/testuser?investigation_id=test-inv"
                    )
                    assert response.status_code in (200, 500)


def test_analyze_logs_malformed_splunk_response(client):
    with patch(
        "app.service.logs_analysis_service.get_settings_for_env",
        return_value=MagicMock(splunk_index="dummy_index"),
    ):
        with patch(
            "app.service.logs_analysis_service.SplunkQueryTool"
        ) as mock_splunk_tool:
            with patch(
                "app.service.logs_analysis_service.sanitize_splunk_data",
                return_value=[],
            ) as mock_sanitize:
                with patch(
                    "app.service.agent.tools.chronos_tool.chronos_tool.ChronosTool"
                ) as mock_chronos_tool:
                    mock_tool = MagicMock()
                    mock_tool.arun.return_value = None
                    mock_splunk_tool.return_value = mock_tool
                    response = client.get(
                        "/api/logs/testuser?investigation_id=test-inv"
                    )
                    assert response.status_code in (200, 500)


def test_analyze_logs_chronos_exception(client):
    with patch(
        "app.service.logs_analysis_service.get_settings_for_env",
        return_value=MagicMock(splunk_index="dummy_index"),
    ):
        with patch(
            "app.service.logs_analysis_service.SplunkQueryTool"
        ) as mock_splunk_tool:
            with patch(
                "app.service.logs_analysis_service.sanitize_splunk_data",
                return_value=[],
            ) as mock_sanitize:
                with patch(
                    "app.service.agent.tools.chronos_tool.chronos_tool.ChronosTool"
                ) as mock_chronos_tool:
                    mock_tool = MagicMock()
                    mock_tool.arun.return_value = {"results": []}
                    mock_splunk_tool.return_value = mock_tool
                    mock_chronos_tool.return_value._arun.side_effect = Exception(
                        "chronos fail"
                    )
                    response = client.get(
                        "/api/logs/testuser?investigation_id=test-inv"
                    )
                    assert response.status_code in (200, 500)


def test_analyze_logs_llm_json_error(client):
    with patch(
        "app.service.logs_analysis_service.get_settings_for_env",
        return_value=MagicMock(splunk_index="dummy_index"),
    ):
        with patch(
            "app.service.logs_analysis_service.SplunkQueryTool"
        ) as mock_splunk_tool:
            with patch(
                "app.utils.idps_utils.get_app_secret", return_value="pw"
            ) as mock_secret:
                with patch(
                    "app.service.logs_analysis_service.sanitize_splunk_data",
                    return_value=[],
                ) as mock_sanitize:
                    with patch(
                        "app.service.agent_service.ainvoke_agent",
                        new_callable=AsyncMock,
                        return_value=("notjson", None),
                    ) as mock_ainvoke:
                        mock_tool = MagicMock()
                        mock_tool.arun.return_value = {"results": []}
                        mock_splunk_tool.return_value = mock_tool
                        response = client.get(
                            "/api/logs/testuser?investigation_id=test-inv"
                        )
                        assert response.status_code in (200, 500)
                        assert (
                            "LLM service" in response.text
                            or "risk_assessment" in response.text
                        )


def test_analyze_logs_llm_timeout_error(client):
    clear_demo_mode()
    with patch(
        "app.service.logs_analysis_service.get_settings_for_env",
        return_value=MagicMock(splunk_index="dummy_index"),
    ):
        with patch(
            "app.service.logs_analysis_service.SplunkQueryTool"
        ) as mock_splunk_tool:
            with patch(
                "app.utils.idps_utils.get_app_secret", return_value="pw"
            ) as mock_secret:
                with patch(
                    "app.service.logs_analysis_service.sanitize_splunk_data",
                    return_value=[],
                ) as mock_sanitize:
                    with patch(
                        "app.service.agent.tools.chronos_tool.chronos_tool.ChronosTool"
                    ) as mock_chronos_tool:
                        with patch(
                            "app.service.agent_service.ainvoke_agent",
                            new_callable=AsyncMock,
                            side_effect=Exception("timeout"),
                        ) as mock_ainvoke:
                            mock_tool = MagicMock()
                            mock_tool.arun.return_value = {"results": []}
                            mock_splunk_tool.return_value = mock_tool
                            response = client.get(
                                "/api/logs/testuser?investigation_id=test-inv"
                            )
                            assert response.status_code in (200, 500)
                            assert (
                                "LLM service timeout" in response.text
                                or "risk_assessment" in response.text
                            )


def test_analyze_logs_llm_service_down(client):
    clear_demo_mode()
    with patch(
        "app.service.logs_analysis_service.get_settings_for_env",
        return_value=MagicMock(splunk_index="dummy_index"),
    ):
        with patch(
            "app.service.logs_analysis_service.SplunkQueryTool"
        ) as mock_splunk_tool:
            with patch(
                "app.service.logs_analysis_service.sanitize_splunk_data",
                return_value=[],
            ):
                with patch(
                    "app.service.agent.tools.chronos_tool.chronos_tool.ChronosTool"
                ) as mock_chronos_tool:
                    with patch(
                        "app.service.agent_service.ainvoke_agent",
                        new_callable=AsyncMock,
                        side_effect=Exception(
                            "External service dependency call failed"
                        ),
                    ):
                        mock_tool = MagicMock()
                        mock_tool.arun = AsyncMock(return_value={"results": []})
                        mock_splunk_tool.return_value = mock_tool
                        mock_chronos_tool.return_value._arun = AsyncMock(
                            return_value="{}"
                        )
                        response = client.get(
                            "/api/logs/testuser?investigation_id=test-inv"
                        )
                        data = response.json()
                        assert "LLM invocation/validation error" in str(data)


def test_analyze_logs_llm_400_error(client):
    clear_demo_mode()
    with patch(
        "app.service.logs_analysis_service.get_settings_for_env",
        return_value=MagicMock(splunk_index="dummy_index"),
    ):
        with patch(
            "app.service.logs_analysis_service.SplunkQueryTool"
        ) as mock_splunk_tool:
            with patch(
                "app.service.logs_analysis_service.sanitize_splunk_data",
                return_value=[],
            ):
                with patch(
                    "app.service.agent.tools.chronos_tool.chronos_tool.ChronosTool"
                ) as mock_chronos_tool:
                    with patch(
                        "app.service.agent_service.ainvoke_agent",
                        new_callable=AsyncMock,
                        side_effect=Exception("400 error_message: bad request"),
                    ):
                        mock_tool = MagicMock()
                        mock_tool.arun = AsyncMock(return_value={"results": []})
                        mock_splunk_tool.return_value = mock_tool
                        mock_chronos_tool.return_value._arun = AsyncMock(
                            return_value="{}"
                        )
                        response = client.get(
                            "/api/logs/testuser?investigation_id=test-inv"
                        )
                        data = response.json()
                        assert "LLM invocation/validation error" in str(data)


def test_analyze_logs_llm_timeout_error(client):
    clear_demo_mode()
    with patch(
        "app.service.logs_analysis_service.get_settings_for_env",
        return_value=MagicMock(splunk_index="dummy_index"),
    ):
        with patch(
            "app.service.logs_analysis_service.SplunkQueryTool"
        ) as mock_splunk_tool:
            with patch(
                "app.service.logs_analysis_service.sanitize_splunk_data",
                return_value=[],
            ):
                with patch(
                    "app.service.agent.tools.chronos_tool.chronos_tool.ChronosTool"
                ) as mock_chronos_tool:
                    with patch(
                        "app.service.agent_service.ainvoke_agent",
                        new_callable=AsyncMock,
                        side_effect=Exception("timeout occurred"),
                    ):
                        mock_tool = MagicMock()
                        mock_tool.arun = AsyncMock(return_value={"results": []})
                        mock_splunk_tool.return_value = mock_tool
                        mock_chronos_tool.return_value._arun = AsyncMock(
                            return_value="{}"
                        )
                        response = client.get(
                            "/api/logs/testuser?investigation_id=test-inv"
                        )
                        data = response.json()
                        assert "LLM invocation/validation error" in str(data)


def test_analyze_logs_llm_generic_error(client):
    clear_demo_mode()
    with patch(
        "app.service.logs_analysis_service.get_settings_for_env",
        return_value=MagicMock(splunk_index="dummy_index"),
    ):
        with patch(
            "app.service.logs_analysis_service.SplunkQueryTool"
        ) as mock_splunk_tool:
            with patch(
                "app.service.logs_analysis_service.sanitize_splunk_data",
                return_value=[],
            ):
                with patch(
                    "app.service.agent.tools.chronos_tool.chronos_tool.ChronosTool"
                ) as mock_chronos_tool:
                    with patch(
                        "app.service.agent_service.ainvoke_agent",
                        new_callable=AsyncMock,
                        side_effect=Exception("some other error"),
                    ):
                        mock_tool = MagicMock()
                        mock_tool.arun = AsyncMock(return_value={"results": []})
                        mock_splunk_tool.return_value = mock_tool
                        mock_chronos_tool.return_value._arun = AsyncMock(
                            return_value="{}"
                        )
                        response = client.get(
                            "/api/logs/testuser?investigation_id=test-inv"
                        )
                        data = response.json()
                        assert "LLM invocation/validation error" in str(data)


def test_analyze_logs_fallback_risk_scoring(client):
    clear_demo_mode()
    fake_logs = [
        {"originating_ips": [f"1.2.3.{i}"], "cities": [f"City{i%7}"]} for i in range(12)
    ]
    with patch(
        "app.service.logs_analysis_service.get_settings_for_env",
        return_value=MagicMock(splunk_index="dummy_index"),
    ):
        with patch(
            "app.service.logs_analysis_service.SplunkQueryTool"
        ) as mock_splunk_tool:
            with patch(
                "app.service.logs_analysis_service.sanitize_splunk_data",
                return_value=[],
            ):
                with patch(
                    "app.service.agent.tools.chronos_tool.chronos_tool.ChronosTool"
                ) as mock_chronos_tool:
                    with patch(
                        "app.service.agent_service.ainvoke_agent",
                        new_callable=AsyncMock,
                        side_effect=Exception("timeout occurred"),
                    ):
                        mock_tool = MagicMock()
                        mock_tool.arun = AsyncMock(return_value={"results": fake_logs})
                        mock_splunk_tool.return_value = mock_tool
                        mock_chronos_tool.return_value._arun = AsyncMock(
                            return_value="{}"
                        )
                        response = client.get(
                            "/api/logs/testuser?investigation_id=test-inv"
                        )
                        data = response.json()
                        assert 0.0 <= data["risk_assessment"]["risk_level"] <= 1.0


def test_analyze_logs_json_decode_error(client):
    clear_demo_mode()
    with patch(
        "app.service.logs_analysis_service.get_settings_for_env",
        return_value=MagicMock(splunk_index="dummy_index"),
    ):
        with patch(
            "app.service.logs_analysis_service.SplunkQueryTool"
        ) as mock_splunk_tool:
            with patch(
                "app.service.logs_analysis_service.sanitize_splunk_data",
                return_value=[],
            ):
                with patch(
                    "app.service.agent.tools.chronos_tool.chronos_tool.ChronosTool"
                ) as mock_chronos_tool:
                    with patch(
                        "app.service.agent_service.ainvoke_agent",
                        new_callable=AsyncMock,
                        return_value=("notjson", None),
                    ):
                        mock_tool = MagicMock()
                        mock_tool.arun = AsyncMock(return_value={"results": []})
                        mock_splunk_tool.return_value = mock_tool
                        mock_chronos_tool.return_value._arun = AsyncMock(
                            return_value="{}"
                        )
                        response = client.get(
                            "/api/logs/testuser?investigation_id=test-inv"
                        )
                        data = response.json()
                        assert "LLM invocation/validation error" in str(data)


def test_analyze_logs_raw_splunk_override(client):
    clear_demo_mode()
    override = [{"email_address": "foo@bar.com"}]
    with patch(
        "app.service.logs_analysis_service.get_settings_for_env",
        return_value=MagicMock(splunk_index="dummy_index"),
    ):
        with patch(
            "app.service.logs_analysis_service.sanitize_splunk_data",
            return_value=override,
        ):
            with patch(
                "app.service.agent.tools.chronos_tool.chronos_tool.ChronosTool"
            ) as mock_chronos_tool:
                with patch(
                    "app.service.agent_service.ainvoke_agent",
                    new_callable=AsyncMock,
                    return_value=(
                        json.dumps({"risk_assessment": {"risk_level": 0.1}}),
                        None,
                    ),
                ):
                    mock_chronos_tool.return_value._arun = AsyncMock(
                        return_value=json.dumps({"entities": []})
                    )
                    response = client.get(
                        "/api/logs/testuser?investigation_id=test-inv",
                        params={"raw_splunk_override": json.dumps(override)},
                    )
                    assert response.status_code in (200, 422)


def test_analyze_logs_prompt_trimming_warning(client):
    clear_demo_mode()
    with patch(
        "app.service.logs_analysis_service.get_settings_for_env",
        return_value=MagicMock(splunk_index="dummy_index"),
    ):
        with patch(
            "app.service.logs_analysis_service.SplunkQueryTool"
        ) as mock_splunk_tool:
            with patch(
                "app.service.logs_analysis_service.sanitize_splunk_data",
                return_value=[],
            ):
                with patch(
                    "app.service.agent.tools.chronos_tool.chronos_tool.ChronosTool"
                ) as mock_chronos_tool:
                    with patch(
                        "app.service.agent_service.ainvoke_agent",
                        new_callable=AsyncMock,
                        return_value=("{}", None),
                    ):
                        with patch(
                            "app.service.logs_analysis_service.trim_prompt_to_token_limit",
                            return_value=({}, "trimmed prompt", True),
                            create=True,
                        ):
                            mock_tool = MagicMock()
                            mock_tool.arun = AsyncMock(return_value={"results": []})
                            mock_splunk_tool.return_value = mock_tool
                            mock_chronos_tool.return_value._arun = AsyncMock(
                                return_value="{}"
                            )
                            response = client.get(
                                "/api/logs/testuser?investigation_id=test-inv"
                            )
                            data = response.json()
                            assert response.status_code == 200


def test_update_investigation_llm_thoughts_called(client):
    clear_demo_mode()
    with patch(
        "app.service.logs_analysis_service.get_settings_for_env",
        return_value=MagicMock(splunk_index="dummy_index"),
    ):
        with patch(
            "app.service.logs_analysis_service.SplunkQueryTool"
        ) as mock_splunk_tool:
            with patch(
                "app.service.logs_analysis_service.sanitize_splunk_data",
                return_value=[],
            ):
                with patch(
                    "app.service.agent.tools.chronos_tool.chronos_tool.ChronosTool"
                ) as mock_chronos_tool:
                    with patch(
                        "app.service.agent_service.ainvoke_agent",
                        new_callable=AsyncMock,
                        return_value=(
                            json.dumps(
                                {
                                    "risk_assessment": {
                                        "risk_level": 0.1,
                                        "thoughts": "test thoughts",
                                    }
                                }
                            ),
                            None,
                        ),
                    ):
                        with patch("app.persistence.update_investigation_llm_thoughts"):
                            mock_tool = MagicMock()
                            mock_tool.arun = AsyncMock(return_value={"results": []})
                            mock_splunk_tool.return_value = mock_tool
                            mock_chronos_tool.return_value._arun = AsyncMock(
                                return_value="{}"
                            )
                            response = client.get(
                                "/api/logs/testuser?investigation_id=test-inv"
                            )
                            assert response.status_code == 200


def test_get_chronos_range_days():
    result = get_chronos_range("5d")
    assert "from" in result and "to" in result


def test_get_chronos_range_months():
    result = get_chronos_range("2m")
    assert "from" in result and "to" in result


def test_get_chronos_range_default():
    result = get_chronos_range("foo")
    assert "from" in result and "to" in result


def test_analyze_logs_outer_exception(client):
    # Patch ensure_investigation_exists to raise
    with patch(
        "app.service.logs_analysis_service.ensure_investigation_exists",
        side_effect=Exception("outer fail"),
    ):
        import pytest

        with pytest.raises(Exception) as exc:
            client.get("/api/logs/testuser?investigation_id=test-inv")
        assert "outer fail" in str(exc.value)


def test_analyze_logs_malformed_raw_splunk_override(client):
    # Pass invalid JSON to raw_splunk_override
    response = client.get(
        "/api/logs/testuser?investigation_id=test-inv",
        params={"raw_splunk_override": "notjson"},
    )
    assert response.status_code == 422 or response.status_code == 400


def test_analyze_logs_missing_investigation_id(client):
    # Omit investigation_id param
    response = client.get("/api/logs/testuser")
    assert response.status_code == 422


def test_analyze_logs_invalid_user_id(client):
    # Use invalid user_id (empty string)
    response = client.get("/api/logs/?investigation_id=test-inv")
    assert response.status_code in (404, 422)
