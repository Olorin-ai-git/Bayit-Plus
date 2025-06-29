from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.service import SvcSettings, create_app


@pytest.fixture
def settings():
    return SvcSettings(expose_metrics=False)


@pytest.fixture
def app(settings):
    app = create_app(settings)
    # Patch app.state.graph for agent tests
    app.state.graph = AsyncMock()

    # Patch ainvoke to return a valid string for all agent calls
    async def ainvoke(*args, **kwargs):
        from types import SimpleNamespace

        agent_context = args[0] if args else kwargs.get("agent_context")
        if (
            hasattr(agent_context, "agent_name")
            and "risk-aggregator" in agent_context.agent_name
        ):
            return {
                "messages": [
                    SimpleNamespace(
                        content='{"overall_risk_score": 0.42, "accumulated_llm_thoughts": "Test LLM thoughts"}'
                    )
                ]
            }, "test-trace-id"
        return {
            "messages": [
                SimpleNamespace(
                    content='{"overall_risk_score": 0.42, "accumulated_llm_thoughts": "Test LLM thoughts"}'
                )
            ]
        }, "test-trace-id"

    app.state.graph.ainvoke.side_effect = ainvoke
    return app


@pytest.fixture
def client(app, settings):
    # Mock X-Forwarded-Port header to make it mesh client
    return TestClient(
        app,
        headers={"X-Forwarded-Port": str(settings.mesh_port)},
        base_url=f"http://testserver:{settings.mesh_port}",
    )


@pytest.fixture(autouse=True)
def clean_investigations(client):
    resp = client.delete("/api/investigations/delete_all")
    assert resp.status_code == 200
    yield
