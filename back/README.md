# Python Agent Service: `gaia`

[![Build Status](https://build.intuit.com/fps/buildStatus/buildIcon?job=cas-hri/gaia/gaia/master)](https://build.intuit.com/fps/job/cas-hri/job/gaia/job/gaia/job/master/)
[![Code Coverage](https://build.intuit.com/fps/buildStatus/coverageIcon?job=cas-hri/gaia/gaia/master)](https://build.intuit.com/fps/job/cas-hri/job/gaia/job/gaia/job/master/)

## Table of Contents

- [Python Agent Starter Kit](#python-agent-starter-kit)
  - [Introduction](#introduction)
  - [Quickstart](#quickstart)
    - [Initial Setup](#initial-setup)
  - [Pre-requisites for running your Agent](#pre-requisites-for-running-your-agent)
    - [Step 1: Onboard to the following downstream services](#step-1-onboard-to-the-following-downstream-services)
    - [Step 2: Setup IDPS credentials](#step-2-setup-idps-credentials)
    - [Step 3: Create or Reuse an Experience ID](#step-3-create-or-reuse-an-experience-id)
  - [Running the Server](#running-the-server)
    - [Option 1: Using Command Line](#option-1-using-command-line)
    - [Option 2: Using Docker via the provided script](#option-2-using-docker-via-the-provided-script)
  - [Local Testing](#local-testing)
  - [Testing Agent Endpoint](#testing-agent-endpoint)
    - [Creating a Test Client + Auth Headers](#creating-a-test-client--auth-headers)
    - [Agent Spec](#agent-spec)
    - [Call the endpoint](#call-the-endpoint)
    - [Response](#response)
  - [Next Steps](#next-steps)
    - [Enable additional capabilities](#enable-additional-capabilities)
    - [Sample UI App For testing the Starter Kit](#sample-ui-app-for-testing-the-starter-kit)
    - [Code Formatting](#code-formatting)
  - [Support](#support)
  - [Contributing](#contributing)

## Introduction

This repository serves as an Agent starter kit, containing reference code for building Agentic AI experiences in Python within Intuit. It features built-in integration with GenOS capabilities, providing access to LLMs, Eval, Registry, RAG, and Tracing(using Langfuse). Additionally, it includes integration with other capabilities like the Customer Data Cloud 360 (CDC) and Intuit Persistence Service (IPS). The goal of the starter kit is to address key agent development needs related to memory (conversation history, checkpointing, etc.), knowledge (RAG), personalization, observability, debugging, identity & authorization, agent evaluation, and governance.

The reference implementation in this repository utilizes LangGraph as the agent orchestration framework and includes a chat agent that can assist with various tasks using specific tools:

- Answer help queries related to QuickBooks and taxes by retrieving content from the knowledge base.
- Retrieve user and company profile data by leveraging the Customer Data Cloud 360 (CDC).
- Respond to questions concerning a QuickBooks user's customers.

> [!NOTE]  
> While this reference implementation demonstrates the use of LangGraph, it also highlights the use of GenOS capabilities such as LLMs, Eval, Registry, RAG, and Tracing. You can adopt these capabilities in other Agent Frameworks.

Comprehensive documentation for building AI Agents on the Paved Path can be found [here](https://devportal.intuit.com/app/dp/capability/CAP-2297/capabilityDocs/main/docs/agents/agent.md)

## Quickstart

> [!NOTE]  
> The compatible python versions are **3.11 or 3.12**. Use `python --version` to determine your python version.

This service is built on the [FastAPI framework](https://fastapi.tiangolo.com/). If you are not familiar with Python's asyncio, we strongly recommend reading the [Concurrency and async / await](https://fastapi.tiangolo.com/async/) docs first! Or, \"If you just don't know, use normal `def`.\"

### Initial Setup

Clone this repository and set up your development environment:

> [!TIP]
> If you're using a M1 Mac, you may need to install the `arm64` version of brew and python.
> Follow the instructions [here](https://stackoverflow.intuit.com/a/26573/34906) to setup the `arm64` version of brew and python.

```bash
git clone https://github.intuit.com/cas-hri/gaia.git
```

```bash
cd gaia
```

```bash
python -m venv .venv && source .venv/bin/activate
```

Run `poetry lock` to generate the lock file.
This library uses [poetry](https://python-poetry.org/docs/basic-usage/#specifying-dependencies) to manage Python dependencies.

```bash
poetry lock
```

```bash
poetry install
```

After running `poetry install` for the first time, [commit your poetry.lock file to version control](https://python-poetry.org/docs/basic-usage/#commit-your-poetrylock-file-to-version-control).

## Pre-requisites for running your Agent

#### Step 1: Onboard to the following downstream services

- [Identity API](https://devportal.intuit.com/app/dp/resource/7929730636945325359/overview)
  - Set up connectivity to Identity API to be able to connect to other services using your credentials
- [LLM Execution Service - LXS](https://devportal.intuit.com/app/dp/resource/5768002816048966459/overview)
  - LXS is the proxy to various LLMs hosted on the GenOS platform. Discover the list of LLMs supported on the [Model Catalog](https://ai-workbench.app.intuit.com/wb/model-discovery) page in AI Workbench

#### Step 2: Setup IDPS credentials

- IDPS is the Intuit service and standard for key management, secret management and data at rest encryption developed by the Security R&D team.
  - Add your app secret to IDPS following the instructions [here](https://devportal.intuit.com/app/dp/capability/CAP-2297/capabilityDocs/main/docs/agents/idps_onboarding.md)

#### Step 3: Create or Reuse an Experience ID

- Experience ID is used to track an AI experience end to end. It also enables access to LLMs hosted on the GenOS Platform. Eval, tracing, RAI also depend on Experience ID. Follow the steps below to create a new Experience ID. If you already have one created in the same DevPortal Project, you may reuse that. If you choose to reuse, jump to the [Running the Server](#running-the-server) section.

  1. Navigate to your project on [AI Workbench](https://ai-workbench.app.intuit.com/wb/my-projects) and use the "Launch project as" drop down to select "GenAI"
  2. Click the "Create Use Case"
     - Fill in the details to create your new use-case
     - Once the use-case is created, the UUID generated here is the Experience ID

  This is described in detail with screenshots on Autura documentation [here](https://devportal.intuit.com/app/dp/capability/CAP-2297/capabilityDocs/main/docs/usecases/genos-registry/register-use-case.md)

  Once you've obtained your Experience ID, update the following locations

  - [agents_and_tools.yaml](https://github.intuit.com/cas-hri/gaia/blob/master/agents_and_tools.yaml)
  - [eval_config.json](https://github.intuit.com/cas-hri/gaia/blob/master/evaluation/eval_config.json)
  - [config.py](https://github.intuit.com/cas-hri/gaia/blob/master/app/service/config.py)

    **Important Note:** The Experience ID must belong to the same project where the Agent asset codebase is located.

> [!NOTE]  
> Many of the capabilities in the starter kit are disabled by default. You can enable them by following the instructions in the [next steps](#next-steps) section.

### Running the Server

You can run the service locally in different ways:

#### Option 1: Using Command Line

```bash
export PYTHONPATH=$(pwd)
```

```
uvicorn app.service.server:app --reload --port 8090
```

To format the file, run

```
poetry run isort .
python -m black <file / folder name, e.g., python -m black app >
```

#### Option 2: Using Docker via the provided script

Make sure you have `docker` (`rancher desktop`) installed.  
See [How to install Rancher Desktop?](https://devportal.intuit.com/app/dp/capability/1337/capabilityDocs/main/docs/rancher-desktop/install-rancher-desktop.md) for details.

```bash
./scripts/run_local.sh
```

Congratulations! With this, you should have an agent with access to an LLM.

### Local Testing

Run tests using pytest:

```bash
poetry run pytest
```

## Testing Agent Endpoint

### Creating a Test Client + Auth Headers

The Agent service created above exposes the API endpoint `/v1/agent/invoke` that you can hit using your Test Client. You will need two things to connect to the endpoint:

1. Test Client - Follow the steps to create a Test Client on [DevPortal](https://devportal.intuit.com/app/dp/publish/select-type)
   - Once you have your Test Client, connect it to this Agent service. This connection setup is self-serve on DevPortal using the Downstream Services on the DevPortal asset page.
2. Authorization Headers - You can use the [auth-tool](https://devportal.intuit.com/app/dp/api-explorer/rest/landing/auth-tool) to generate the Authorization headers.

### Agent Spec

Please refer the OpenAPI spec for the Agent [here](api/openapi/openapi.json)

### Call the endpoint

You can invoke the curl command:

**Important:** Replace the placeholder values (like `<YOUR_APP_ID>`, `<YOUR_IAM_TICKET>`, etc.) with your actual credentials and specific identifiers.

**agent name is a fully qualified name of this format** `devportal_asset_alias:agent_name`

```bash
curl -X POST \
  -H 'Authorization: Intuit_IAM_Authentication intuit_appid=<YOUR_APP_ID>, intuit_app_secret=<YOUR_APP_SECRET>, intuit_token_type=IAM-Ticket, intuit_token=<YOUR_IAM_TICKET>, intuit_userid=<YOUR_USER_ID>, intuit_realmid=<YOUR_REALM_ID>' \
  -H 'Content-Type: application/json' \
  -H 'X-Forwarded-Port: 8090' \
  -H 'intuit_experience_id: <YOUR_EXPERIENCE_ID>' \
  -H 'intuit_originating_assetalias: <YOUR_ASSET_ALIAS>' \
  -d '{
        "agent": {"name": "<AGENT_NAME>"},
        "agentInput": {"content": [{"image": null, "text": "Hello", "type": "text"}]},
        "context": {"additionalContext": {}, "interactionType": "SYSTEM_INITIATED", "platform": "MOBILE_IOS"},
        "metadata": {
          "additionalMetadata": {},
          "interactionGroupId": "<INTERACTION_GROUP_ID>"
        }
      }' \
  http://localhost:8090/v1/agent/invoke

```

### Response

Here is an example of the JSON response you might receive from the API, formatted for readability:

```json
{
  "agentOutput": {
    "plainText": "Hello! How can I assist you today?",
    "outputs": []
  },
  "agentMetadata": {
    "agentTraceId": "44e255f0-b9ac-40df-9b79-9fcee3403dc4"
  }
}
```

## Next Steps

### Enable additional capabilities

Now, that you have setup the repository and can run your agent, explore and learn about the other integrations that are available in the Starter Kit [here](https://devportal.intuit.com/app/dp/capability/CAP-2297/capabilityDocs/main/docs/agents/agent.md). Some of the capabilities are disabled by default. The supporting documents contain pre-requisite information and onboarding details for each of these capabilities.

Here are the few things to get started with:

- [Agent Memory](https://devportal.intuit.com/app/dp/capability/CAP-2297/capabilityDocs/main/docs/agents/memory.md)

- [LangFuse Tracing and Debugging](https://devportal.intuit.com/app/dp/capability/CAP-2297/capabilityDocs/main/docs/agents/tracing.md)

- [Agent Evaluation](https://devportal.intuit.com/app/dp/capability/CAP-2297/capabilityDocs/main/docs/agents/eval.md)

- [Agents and Tools Registry](https://devportal.intuit.com/app/dp/capability/CAP-2297/capabilityDocs/main/docs/agents/registry.md)

- [RAG and Other Tools](https://devportal.intuit.com/app/dp/capability/CAP-2297/capabilityDocs/main/docs/agents/tools.md)

### Sample UI App For testing the Starter Kit

We have a sample streamlit app that you can use for local testing

In a separate directory, clone the following repository containing the UI code sample for testing the app.

```bash
git clone git@github.intuit.com:data-mlplatform/python-genos-agent-demo.git
cd python-genos-agent-demo
python3 -m venv .venv && source .venv/bin/activate
pip install poetry
poetry lock
poetry install
streamlit run app/Home.py
```

### Code Formatting

This repository uses `black` and `isort` for consistent code formatting. To ensure your contributions adhere to these standards, please follow these steps:

1.  **Install `pre-commit`:**

    ```bash
    pip install pre-commit
    ```

2.  **Install the Git hooks:**

    ```bash
    pre-commit install
    ```

    Now, `black` and `isort` will automatically run before each commit.

3.  (Optional) to run the hooks on all files.

    ```bash
    pre-commit run --all-files
    ```

If you need to bypass the hooks for a specific commit (not recommended), use:

```bash
git commit --no-verify -m "Your commit message"
```

## Support

For support with the paved road:

- Check [StackOverflow tag `psk`](https://stackoverflow.intuit.com/posts/tagged/4803) or ask in Slack channel [#cmty-psk](https://intuit-teams.slack.com/archives/C04AR7RF97G)
- For general Service Paved Road support (not Python specific), see [#cmty-services-paved-road](https://intuit-teams.slack.com/archives/C04AFMJ140K)
- For support related to the [Modern SaaS - Services Paved Road capability](https://devportal.intuit.com/app/dp/capability/CAP-1308/capabilityDocs/main/docs/overview.md), check out [StackOverflow](https://stackoverflow.intuit.com/questions/tagged/3).
- For support related to the GenOS Platform, reach out to [#genos-support](https://intuit-teams.slack.com/archives/C0513B18N14)
- [Agentic AI documentation](https://devportal.intuit.com/app/dp/capability/CAP-2297/capabilityDocs/main/docs/agents/agent.md)

## Contributing

Eager to contribute to this service? Check out our [Contribution Guidelines](./CONTRIBUTING.md)!

Learn more about code contributions: [Intuit's InnerSource Guidelines](http://in/innersource).

## GAIA Backend

## AWS Authentication in CI/CD

To fix AWS authentication issues in CI/CD environments, we've implemented a mocking strategy in the root-level `conftest.py` file. This approach (Option 1) avoids AWS account mismatch errors by mocking the IDPS client and related authentication methods.

### How It Works

1. The root-level `conftest.py` file mocks:

   - `idps_client.rest_client.RestClient`
   - `machina_swagger_client.rest.ApiException`
   - `app.utils.idps_utils.IdpsClientFactory.get_instance`
   - `idps_client.rest_client.RestClient._get_temp_creds_with_presigned_url`

2. These mocks prevent the AWS account mismatch error by returning mock credentials and secrets instead of attempting to authenticate with AWS.

### CI/CD Configuration

To ensure this solution works in CI/CD pipelines:

1. Make sure the `conftest.py` file is included in your Docker image and copied to the root of the application.

2. In your tox.ini or pytest configuration, add:

   ```
   --confcutdir=.
   ```

3. If you need to debug AWS mocking issues in CI, the conftest.py includes error logging that will appear in test output.

### Running Tests Locally

With this solution, you can run tests locally without needing actual AWS credentials:

```bash
# Run all tests
python -m pytest

# Run with coverage
python -m pytest --cov=app --cov-report=term-missing --cov-fail-under=50
```

The tests should pass with >70% coverage, exceeding the required 50% threshold.

### Development Setup

1. **Install Dependencies:**
   ```bash
   poetry install
   ```

2. **Run Tests:**
   ```bash
   poetry run pytest
   ```

3. **Start the Server:**
   ```bash
   poetry run uvicorn app.main:app --reload
   ```
