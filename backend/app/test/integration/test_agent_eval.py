import datetime
import uuid

import pandas as pd
import pytest
import requests
from fastapi import status
from fastapi.testclient import TestClient
from langfuse import Langfuse
from sentence_transformers import CrossEncoder

from app.models.agent_request import (
    Agent,
    AgentInput,
    AgentRequest,
    ContentItem,
    Context,
    Metadata,
)
from app.router.agent_router import router
from app.service import SvcSettings, create_app
from app.service.agent.agent import create_and_get_agent_graph
from app.service.config import get_settings_for_env
from app.utils.firebase_secrets import get_app_secret

pytest.skip("reason for skipping the entire file", allow_module_level=True)


@pytest.fixture
def settings_for_env():
    return get_settings_for_env()


@pytest.fixture
def settings():
    return SvcSettings(expose_metrics=False)


@pytest.fixture
def app(settings):
    app = create_app(settings)
    app.state.graph_parallel = create_and_get_agent_graph(parallel=True)
    app.state.graph_sequential = create_and_get_agent_graph(parallel=False)
    app.include_router(router)
    return app


@pytest.fixture
def client(app, settings):
    return TestClient(
        app,
        headers={"X-Forwarded-Port": str(settings.mesh_port)},
        base_url=f"http://testserver:{settings.mesh_port}",
    )


@pytest.fixture
def get_ius_token_and_user(settings_for_env):
    url = settings_for_env.identity_url
    payload = settings_for_env.identity_payload
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Olorin_IAM_Authentication olorin_appid={settings_for_env.app_id}, olorin_app_secret={get_app_secret(settings_for_env.app_secret)}",
    }

    response = requests.request("POST", url, headers=headers, data=payload)

    ius = response.json()
    return (
        ius["data"]["identityTestSignInWithPassword"]["accessToken"],
        ius["data"]["identityTestSignInWithPassword"]["legacyAuthId"],
    )


class SampleDataset:
    def __init__(self, settings_for_env):
        self.trigger_time = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
        self.test_agent_dataset_name = (
            f"{settings_for_env.app_id}-eval-{self.trigger_time}"
        )
        self.langfuse = Langfuse(
            public_key=get_app_secret(settings_for_env.langfuse_public_key),
            secret_key=get_app_secret(settings_for_env.langfuse_secret_key),
            host=settings_for_env.langfuse_host,
        )

    def create_dataset(
        self, test_eval_dataset, input_col, expected_output_col, tool_col
    ):
        self.langfuse.create_dataset(
            name=self.test_agent_dataset_name,
            description="Sample dataset to test the agent starter kit",
            metadata={
                "date": self.trigger_time,
                "type": "benchmark",
            },
        )

        for idx, row in test_eval_dataset.iterrows():
            self.langfuse.create_dataset_item(
                dataset_name=self.test_agent_dataset_name,
                input={"text": row[input_col]},
                expected_output={"text": row[expected_output_col]},
                metadata={"source_index": str(idx), "tool": row[tool_col]},
            )

    def get_dataset(self):
        return self.langfuse.get_dataset(self.test_agent_dataset_name)


@pytest.fixture
def sample_dataset(settings_for_env):
    return SampleDataset(settings_for_env)


@pytest.fixture
def cross_encoder_model():
    return CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")


def cross_encoder_score(cross_encoder_model, output: str, expected_output: str):
    scores = cross_encoder_model.predict([[output, expected_output]])
    return scores[0]


# Utility Functions
def construct_headers(token, userid, settings_for_env):
    return {
        "Authorization": f"Olorin_IAM_Authentication olorin_appid = {settings_for_env.app_id}, olorin_app_secret = {get_app_secret(settings_for_env.app_secret)}, olorin_token_type=IAM-Ticket, olorin_token={token}, olorin_userid={userid}",
        "Content-Type": "application/json",
        "olorin_experience_id": settings_for_env.olorin_experience_id,
        "olorin_originating_assetalias": settings_for_env.app_id,
        "X-Forwarded-Port": str(settings_for_env.mesh_port),
    }


def agent_request(question):
    return AgentRequest(
        agent=Agent(name="chat_agent"),
        agentInput=AgentInput(content=[ContentItem(text=question, type="text")]),
        metadata=Metadata(
            interactionGroupId=uuid.uuid4().hex,
            supportedOutputFormats=[],
            additionalMetadata={},
        ),
        context=Context(
            interactionType="sample_interaction_type",
            platform="sample_platform",
            additionalContext={},
        ),
    )


def run_agent(client, question, get_ius_token_and_user, settings_for_env):
    token, userid = get_ius_token_and_user
    headers = construct_headers(token, userid, settings_for_env)
    request_json = agent_request(question).model_dump(by_alias=True)
    output = client.post(
        "/v1/agent/invoke",
        json=request_json,
        headers=headers,
    )
    return output.json()


def check_for_tool_call(observations, tool):
    for observation in observations:
        if isinstance(observation.input, dict) and "messages" in observation.input:
            for msg in observation.input["messages"]:
                if "tool_calls" in msg:
                    for tool_call in msg["tool_calls"]:
                        if tool_call["name"] == tool:
                            return True
    return False


# Tests
def test_health_check(client):
    response = client.get("/health/full")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"status": "Healthy"}


def test_run_agent(
    client,
    sample_dataset,
    cross_encoder_model,
    get_ius_token_and_user,
    settings_for_env,
):
    test_eval_dataset = pd.read_csv(
        "app/test/integration/data/test-agent-eval-dataset.csv"
    )

    sample_dataset.create_dataset(
        test_eval_dataset,
        input_col="question",
        expected_output_col="user_provided_answer",
        tool_col="tool",
    )

    run_name = f"test_run_{sample_dataset.trigger_time}"
    dataset = sample_dataset.get_dataset()

    for item in dataset.items:
        output = run_agent(
            client,
            item.input["text"],
            get_ius_token_and_user,
            settings_for_env,
        )

        trace_id = output["agentMetadata"]["agentTraceId"]
        observations = sample_dataset.langfuse.fetch_observations(
            trace_id=trace_id
        ).data

        item.link(
            trace_or_observation=None,
            run_name=run_name,
            trace_id=trace_id,
        )

        if item.metadata["tool"] != "no_tool":
            sample_dataset.langfuse.score(
                name="correct_tool_called",
                value=str(check_for_tool_call(observations, item.metadata["tool"])),
                trace_id=trace_id,
            )
        else:
            sample_dataset.langfuse.score(
                name="correct_tool_called", value="Not Applicable", trace_id=trace_id
            )

        sample_dataset.langfuse.score(
            name="eval_cross_encoder_score",
            value=cross_encoder_score(
                cross_encoder_model,
                output["agentOutput"]["plainText"],
                item.expected_output["text"],
            ),
            comment="Cross Encoder Score",
            trace_id=trace_id,
        )

    sample_dataset.langfuse.flush()
