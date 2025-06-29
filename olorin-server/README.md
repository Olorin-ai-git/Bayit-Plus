# OLORIN - Fraud Investigation System

OLORIN is an advanced fraud investigation system that provides comprehensive risk assessment across multiple domains including network analysis, device fingerprinting, location analysis, and behavioral monitoring.

## 🚀 Quick Start

For detailed documentation, please see the [`/docs`](./docs) folder:

- **[API Documentation](./docs/OLORIN_API_Documentation.md)** - Complete API reference with examples
- **[WebSocket API Guide](./docs/websocket_example_responses.md)** - Real-time investigation monitoring
- **[Autonomous Investigation Guide](./docs/README_autonomous_investigation.md)** - Testing autonomous investigations
- **[Contributing Guide](./docs/CONTRIBUTING.md)** - Development guidelines

## 📚 Documentation

All documentation has been organized in the [`/docs`](./docs) folder:

### Core Documentation
- [`OLORIN_API_Documentation.md`](./docs/OLORIN_API_Documentation.md) - Complete API reference
- [`README.md`](./docs/README.md) - Detailed project overview
- [`CONTRIBUTING.md`](./docs/CONTRIBUTING.md) - Development and contribution guidelines

### WebSocket & Autonomous Investigation
- [`websocket_example_responses.md`](./docs/websocket_example_responses.md) - WebSocket API examples
- [`README_autonomous_investigation.md`](./docs/README_autonomous_investigation.md) - Autonomous investigation testing

### Analysis & Reports
- Domain-specific analysis reports (Network, Device, Location, Logs)
- Risk assessment documentation
- Performance optimization summaries
- LLM integration analysis

## 🔧 Installation & Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Run the application
python -m app.main
```

## 🧪 Testing

```bash
# Run all tests
pytest

# Run autonomous investigation tests
python tests/run_autonomous_investigation_for_user.py
python tests/run_autonomous_investigation_for_device.py
```

## 📊 Features

- **Multi-Domain Risk Assessment**: Network, Device, Location, and Behavioral analysis
- **Autonomous Investigation**: AI-powered investigation workflows with real-time monitoring
- **WebSocket API**: Real-time progress updates with complete API response data
- **Parallel/Sequential Execution**: Configurable investigation execution modes
- **Comprehensive Reporting**: PDF generation and detailed risk assessments

## 🔗 Quick Links

- [API Documentation](./docs/OLORIN_API_Documentation.md)
- [WebSocket Guide](./docs/websocket_example_responses.md)
- [Testing Scripts](./docs/README_autonomous_investigation.md)
- [Contributing](./docs/CONTRIBUTING.md)

<<<<<<< HEAD:back/README.md
For more detailed information, explore the [`/docs`](./docs) directory. 
=======
After running `poetry install` for the first time, [commit your poetry.lock file to version control](https://python-poetry.org/docs/basic-usage/#commit-your-poetrylock-file-to-version-control).

## Pre-requisites for running your Agent

#### Step 1: Onboard to the following downstream services

- [Identity API](https://devportal.olorin.com/app/dp/resource/7929730636945325359/overview)
  - Set up connectivity to Identity API to be able to connect to other services using your credentials
- [LLM Execution Service - LXS](https://devportal.olorin.com/app/dp/resource/5768002816048966459/overview)
  - LXS is the proxy to various LLMs hosted on the GenOS platform. Discover the list of LLMs supported on the [Model Catalog](https://ai-workbench.app.olorin.com/wb/model-discovery) page in AI Workbench

#### Step 2: Create or Reuse an Experience ID

- Experience ID is used to track an AI experience end to end. It also enables access to LLMs hosted on the GenOS Platform. Eval, tracing, RAI also depend on Experience ID. Follow the steps below to create a new Experience ID. If you already have one created in the same DevPortal Project, you may reuse that. If you choose to reuse, jump to the [Running the Server](#running-the-server) section.

  1. Navigate to your project on [AI Workbench](https://ai-workbench.app.olorin.com/wb/my-projects) and use the "Launch project as" drop down to select "GenAI"
  2. Click the "Create Use Case"
     - Fill in the details to create your new use-case
     - Once the use-case is created, the UUID generated here is the Experience ID

  This is described in detail with screenshots on Autura documentation [here](https://devportal.olorin.com/app/dp/capability/CAP-2297/capabilityDocs/main/docs/usecases/genos-registry/register-use-case.md)

  Once you've obtained your Experience ID, update the following locations

  - [agents_and_tools.yaml](https://github.olorin.com/cas-hri/olorin/blob/master/agents_and_tools.yaml)
  - [eval_config.json](https://github.olorin.com/cas-hri/olorin/blob/master/evaluation/eval_config.json)
  - [config.py](https://github.olorin.com/cas-hri/olorin/blob/master/app/service/config.py)

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
See [How to install Rancher Desktop?](https://devportal.olorin.com/app/dp/capability/1337/capabilityDocs/main/docs/rancher-desktop/install-rancher-desktop.md) for details.

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

1. Test Client - Follow the steps to create a Test Client on [DevPortal](https://devportal.olorin.com/app/dp/publish/select-type)
   - Once you have your Test Client, connect it to this Agent service. This connection setup is self-serve on DevPortal using the Downstream Services on the DevPortal asset page.
2. Authorization Headers - You can use the [auth-tool](https://devportal.olorin.com/app/dp/api-explorer/rest/landing/auth-tool) to generate the Authorization headers.

### Agent Spec

Please refer the OpenAPI spec for the Agent [here](api/openapi/openapi.json)

### Call the endpoint

You can invoke the curl command:

**Important:** Replace the placeholder values (like `<YOUR_APP_ID>`, `<YOUR_IAM_TICKET>`, etc.) with your actual credentials and specific identifiers.

**agent name is a fully qualified name of this format** `devportal_asset_alias:agent_name`

```bash
curl -X POST \
  -H 'Authorization: Olorin_IAM_Authentication olorin_appid=<YOUR_APP_ID>, olorin_app_secret=<YOUR_APP_SECRET>, olorin_token_type=IAM-Ticket, olorin_token=<YOUR_IAM_TICKET>, olorin_userid=<YOUR_USER_ID>, olorin_realmid=<YOUR_REALM_ID>' \
  -H 'Content-Type: application/json' \
  -H 'X-Forwarded-Port: 8090' \
  -H 'olorin_experience_id: <YOUR_EXPERIENCE_ID>' \
  -H 'olorin_originating_assetalias: <YOUR_ASSET_ALIAS>' \
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

Now, that you have setup the repository and can run your agent, explore and learn about the other integrations that are available in the Starter Kit [here](https://devportal.olorin.com/app/dp/capability/CAP-2297/capabilityDocs/main/docs/agents/agent.md). Some of the capabilities are disabled by default. The supporting documents contain pre-requisite information and onboarding details for each of these capabilities.

Here are the few things to get started with:

- [Agent Memory](https://devportal.olorin.com/app/dp/capability/CAP-2297/capabilityDocs/main/docs/agents/memory.md)

- [LangFuse Tracing and Debugging](https://devportal.olorin.com/app/dp/capability/CAP-2297/capabilityDocs/main/docs/agents/tracing.md)

- [Agent Evaluation](https://devportal.olorin.com/app/dp/capability/CAP-2297/capabilityDocs/main/docs/agents/eval.md)

- [Agents and Tools Registry](https://devportal.olorin.com/app/dp/capability/CAP-2297/capabilityDocs/main/docs/agents/registry.md)

- [RAG and Other Tools](https://devportal.olorin.com/app/dp/capability/CAP-2297/capabilityDocs/main/docs/agents/tools.md)

### Sample UI App For testing the Starter Kit

We have a sample streamlit app that you can use for local testing

In a separate directory, clone the following repository containing the UI code sample for testing the app.

```bash
git clone git@github.olorin.com:data-mlplatform/python-genos-agent-demo.git
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

- Check [StackOverflow tag `psk`](https://stackoverflow.olorin.com/posts/tagged/4803) or ask in Slack channel [#cmty-psk](https://olorin-teams.slack.com/archives/C04AR7RF97G)
- For general Service Paved Road support (not Python specific), see [#cmty-services-paved-road](https://olorin-teams.slack.com/archives/C04AFMJ140K)
- For support related to the [Modern SaaS - Services Paved Road capability](https://devportal.olorin.com/app/dp/capability/CAP-1308/capabilityDocs/main/docs/overview.md), check out [StackOverflow](https://stackoverflow.olorin.com/questions/tagged/3).
- For support related to the GenOS Platform, reach out to [#genos-support](https://olorin-teams.slack.com/archives/C0513B18N14)
- [Agentic AI documentation](https://devportal.olorin.com/app/dp/capability/CAP-2297/capabilityDocs/main/docs/agents/agent.md)

>>>>>>> 4754e6a98e29d70618eec46458235ae0b8fb1242
## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

<<<<<<< HEAD
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
=======
## OLORIN Backend


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
>>>>>>> 4754e6a98e29d70618eec46458235ae0b8fb1242
>>>>>>> restructure-projects:olorin-server/README.md
