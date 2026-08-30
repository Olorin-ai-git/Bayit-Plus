from __future__ import annotations

import ast
from pathlib import Path
import re

import yaml


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
PRODUCTION_ROOTS = (
    REPOSITORY_ROOT / "backend" / "app",
    REPOSITORY_ROOT / "bayit-admin" / "app",
    REPOSITORY_ROOT / "bayit-ai" / "app",
    REPOSITORY_ROOT / "bayit-auth" / "app",
    REPOSITORY_ROOT / "bayit-community" / "app",
    REPOSITORY_ROOT / "bayit-content" / "app",
    REPOSITORY_ROOT / "bayit-media-pipeline" / "app",
    REPOSITORY_ROOT / "bayit-payments" / "app",
    REPOSITORY_ROOT / "bayit-search" / "app",
    REPOSITORY_ROOT / "bayit-social" / "app",
    REPOSITORY_ROOT / "bayit-training" / "app",
    REPOSITORY_ROOT / "bayit-user" / "app",
    REPOSITORY_ROOT / "bayit-workers" / "app",
    REPOSITORY_ROOT / "bayit-ws-gateway" / "app",
    REPOSITORY_ROOT / "olorin-b2b-api" / "app",
    REPOSITORY_ROOT / "packages",
)
IGNORED_PARTS = {"__pycache__", "demo", "demos", "test", "tests"}
PROVIDER_CONSTRUCTORS = {
    "anthropic.Anthropic",
    "anthropic.AsyncAnthropic",
    "openai.OpenAI",
    "openai.AsyncOpenAI",
    "google.genai.Client",
    "google.generativeai.GenerativeModel",
    "vertexai.generative_models.GenerativeModel",
}
PROVIDER_FACTORY_PATHS = {
    Path("backend/app/core/ai_clients.py"),
    Path("packages/bayit-translation/bayit_translation/service.py"),
}
PROVIDER_API_HOSTS = (
    "api.anthropic.com",
    "api.openai.com",
    "aiplatform.googleapis.com",
    "generativelanguage.googleapis.com",
)
NATIVE_PROVIDER_TIMEOUT_FIELDS = {
    Path("backend/app/core/health_checks.py"): {"openai_health"},
    Path("backend/app/api/routes/olorin/free_trivia.py"): {"anthropic_trivia"},
    Path("backend/app/services/olorin/cost/providers/openai_billing.py"): {
        "openai_billing",
        "openai_billing_health",
    },
    Path("backend/app/services/star_story/avatar_generation_service.py"): {
        "imagen_generation"
    },
}
SHARED_SDK_TIMEOUT_CONSTRUCTORS = {
    "anthropic.Anthropic",
    "anthropic.AsyncAnthropic",
    "openai.AsyncOpenAI",
}
DEPLOYMENT_MANIFESTS = (
    REPOSITORY_ROOT / "cloudbuild.yaml",
    REPOSITORY_ROOT / "backend" / "cloudbuild.yaml",
    REPOSITORY_ROOT / "bayit-admin" / "cloudbuild-admin.yaml",
    REPOSITORY_ROOT / "bayit-ai" / "cloudbuild-ai.yaml",
    REPOSITORY_ROOT / "bayit-auth" / "cloudbuild-auth.yaml",
    REPOSITORY_ROOT / "bayit-community" / "cloudbuild-community.yaml",
    REPOSITORY_ROOT / "bayit-content" / "cloudbuild-content.yaml",
    REPOSITORY_ROOT / "bayit-media-pipeline" / "cloudbuild-media.yaml",
    REPOSITORY_ROOT / "bayit-payments" / "cloudbuild-payments.yaml",
    REPOSITORY_ROOT / "bayit-search" / "cloudbuild-search.yaml",
    REPOSITORY_ROOT / "bayit-social" / "cloudbuild-social.yaml",
    REPOSITORY_ROOT / "bayit-training" / "cloudbuild-training.yaml",
    REPOSITORY_ROOT / "bayit-user" / "cloudbuild-user.yaml",
    REPOSITORY_ROOT / "bayit-workers" / "cloudbuild-workers.yaml",
    REPOSITORY_ROOT / "bayit-ws-gateway" / "cloudbuild-ws-gateway.yaml",
    REPOSITORY_ROOT / "olorin-b2b-api" / "cloudbuild-b2b.yaml",
)
JOB_BUILD_MANIFEST = REPOSITORY_ROOT / "bayit-workers" / "cloudbuild-jobs.yaml"
ALL_CLOUDBUILD_MANIFESTS = DEPLOYMENT_MANIFESTS + (JOB_BUILD_MANIFEST,)
JOB_DOCKERFILE = REPOSITORY_ROOT / "bayit-workers" / "Dockerfile.jobs"
JOB_ENTRYPOINT = REPOSITORY_ROOT / "bayit-workers" / "jobs" / "cost_rollup.py"
JOB_DEPLOYMENT_SCRIPT = REPOSITORY_ROOT / "infrastructure" / "setup-cron-jobs.sh"
JOB_IMAGE_DEPLOYMENT_SCRIPT = (
    REPOSITORY_ROOT / "scripts" / "deployment" / "deploy_workers.sh"
)
BACKEND_DEPLOYMENT_WORKFLOWS = (
    REPOSITORY_ROOT / ".github" / "workflows" / "deploy-production.yml",
    REPOSITORY_ROOT / ".github" / "workflows" / "scene-search-deploy.yml",
    REPOSITORY_ROOT / ".github" / "workflows" / "beta-500-deploy.yml",
)
PODCAST_TRANSLATION_WORKFLOW = (
    REPOSITORY_ROOT / ".github" / "workflows" / "deploy-translation-worker.yml"
)
PODCAST_TRANSLATION_DOCKERFILE = (
    REPOSITORY_ROOT / "backend" / "Dockerfile.translation-worker"
)
PODCAST_TRANSLATION_TERRAFORM = (
    REPOSITORY_ROOT / "infrastructure" / "terraform" / "cloud_run_jobs.tf"
)
PODCAST_TRANSLATION_VARIABLES = (
    REPOSITORY_ROOT / "infrastructure" / "terraform" / "variables.tf"
)
ROUTING_SECRET_BINDINGS = {
    "TWOGATES_PROXY_URL": "bayit-twogates-proxy-url:latest",
    "TWOGATES_PROXY_CREDENTIAL": "bayit-twogates-proxy-credential:latest",
    "TWOGATES_CA_CERT_PEM": "bayit-twogates-ca-cert-pem:latest",
    "TWOGATES_TASK_CLASS": "bayit-twogates-task-class:latest",
    "TWOGATES_CONNECT_TIMEOUT_SECONDS": (
        "bayit-twogates-connect-timeout-seconds:latest"
    ),
    "TWOGATES_REQUEST_TIMEOUT_SECONDS": (
        "bayit-twogates-request-timeout-seconds:latest"
    ),
    "TWOGATES_PROVIDER_MAX_ATTEMPTS": (
        "bayit-twogates-provider-max-attempts:latest"
    ),
    "TWOGATES_MAX_CONNECTIONS": "bayit-twogates-max-connections:latest",
    "TWOGATES_MAX_KEEPALIVE_CONNECTIONS": (
        "bayit-twogates-max-keepalive-connections:latest"
    ),
    "TWOGATES_KEEPALIVE_EXPIRY_SECONDS": (
        "bayit-twogates-keepalive-expiry-seconds:latest"
    ),
}
SERVICE_ENTRYPOINTS = tuple(
    root / "main.py" for root in PRODUCTION_ROOTS if root.name == "app" and root != PRODUCTION_ROOTS[0]
) + (REPOSITORY_ROOT / "backend" / "app" / "main.py",)
NON_DEPLOYED_OVERLAY_DIRECTORIES = {REPOSITORY_ROOT / "service-template"}


def _production_python_files() -> list[Path]:
    files: list[Path] = []
    for root in PRODUCTION_ROOTS:
        files.extend(
            path
            for path in root.rglob("*.py")
            if not IGNORED_PARTS.intersection(path.relative_to(root).parts)
        )
    return sorted(files)


def _import_aliases(tree: ast.AST) -> dict[str, str]:
    aliases: dict[str, str] = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                local_name = alias.asname or alias.name.split(".")[0]
                aliases[local_name] = alias.name if alias.asname else local_name
        elif isinstance(node, ast.ImportFrom) and node.module:
            for alias in node.names:
                local_name = alias.asname or alias.name
                aliases[local_name] = f"{node.module}.{alias.name}"
    return aliases


def _qualified_name(node: ast.expr, aliases: dict[str, str]) -> str | None:
    if isinstance(node, ast.Name):
        return aliases.get(node.id, node.id)
    if isinstance(node, ast.Attribute):
        parent = _qualified_name(node.value, aliases)
        return f"{parent}.{node.attr}" if parent else None
    return None


def _provider_host_literals(tree: ast.AST) -> set[str]:
    hosts: set[str] = set()
    for node in ast.walk(tree):
        values: list[str] = []
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            values.append(node.value)
        elif isinstance(node, ast.JoinedStr):
            values.extend(
                value.value
                for value in node.values
                if isinstance(value, ast.Constant) and isinstance(value.value, str)
            )
        for value in values:
            hosts.update(host for host in PROVIDER_API_HOSTS if host in value)
    return hosts


def _direct_deploy_commands(workflow_text: str) -> list[str]:
    lines = workflow_text.splitlines()
    commands: list[str] = []
    index = 0
    while index < len(lines):
        if "gcloud run deploy" not in lines[index]:
            index += 1
            continue
        command_lines = [lines[index].strip()]
        while command_lines[-1].endswith("\\") and index + 1 < len(lines):
            index += 1
            command_lines.append(lines[index].strip())
        commands.append("\n".join(command_lines))
        index += 1
    return commands


def test_production_provider_constructors_are_confined_to_factory() -> None:
    violations: list[str] = []
    for path in _production_python_files():
        tree = ast.parse(path.read_text(), filename=str(path))
        aliases = _import_aliases(tree)
        relative_path = path.relative_to(REPOSITORY_ROOT)
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call):
                continue
            qualified_name = _qualified_name(node.func, aliases)
            if (
                qualified_name in PROVIDER_CONSTRUCTORS
                and relative_path not in PROVIDER_FACTORY_PATHS
            ):
                violations.append(
                    f"{relative_path}:{node.lineno}: {qualified_name}"
                )

    assert violations == [], "Unrouted provider constructors:\n" + "\n".join(
        violations
    )


def test_native_provider_rest_calls_use_shared_transport() -> None:
    violations: list[str] = []
    for path in _production_python_files():
        tree = ast.parse(path.read_text(), filename=str(path))
        provider_hosts = _provider_host_literals(tree)
        if not provider_hosts:
            continue
        aliases = _import_aliases(tree)
        uses_shared_transport = any(
            isinstance(node, ast.Call)
            and _qualified_name(node.func, aliases)
            == "app.core.ai_clients.get_provider_http_client"
            for node in ast.walk(tree)
        )
        if not uses_shared_transport:
            relative_path = path.relative_to(REPOSITORY_ROOT)
            violations.append(f"{relative_path}: {', '.join(sorted(provider_hosts))}")

    assert violations == [], "Unrouted native provider REST calls:\n" + "\n".join(
        violations
    )


def test_native_provider_rest_calls_keep_operation_specific_timeouts() -> None:
    actual: dict[Path, set[str]] = {}
    for path in _production_python_files():
        tree = ast.parse(path.read_text(), filename=str(path))
        if not _provider_host_literals(tree):
            continue
        relative_path = path.relative_to(REPOSITORY_ROOT)
        timeout_fields = {
            keyword.value.attr
            for node in ast.walk(tree)
            if isinstance(node, ast.Call)
            for keyword in node.keywords
            if keyword.arg == "timeout" and isinstance(keyword.value, ast.Attribute)
        }
        if timeout_fields:
            actual[relative_path] = timeout_fields

    assert actual == NATIVE_PROVIDER_TIMEOUT_FIELDS


def test_shared_provider_sdk_defaults_keep_typed_transport_timeout() -> None:
    factory_path = REPOSITORY_ROOT / "backend" / "app" / "core" / "ai_clients.py"
    tree = ast.parse(factory_path.read_text(), filename=str(factory_path))
    aliases = _import_aliases(tree)
    actual: dict[str, str | None] = {}

    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        qualified_name = _qualified_name(node.func, aliases)
        if qualified_name not in SHARED_SDK_TIMEOUT_CONSTRUCTORS:
            continue
        timeout_keyword = next(
            (keyword for keyword in node.keywords if keyword.arg == "timeout"),
            None,
        )
        actual[qualified_name] = (
            ast.unparse(timeout_keyword.value) if timeout_keyword else None
        )

    assert actual == {
        constructor: "_timeout(config)"
        for constructor in SHARED_SDK_TIMEOUT_CONSTRUCTORS
    }


def test_deployed_services_close_shared_provider_clients() -> None:
    violations: list[str] = []
    for path in SERVICE_ENTRYPOINTS:
        tree = ast.parse(path.read_text(), filename=str(path))
        aliases = _import_aliases(tree)
        closes_clients = any(
            isinstance(node, ast.Call)
            and _qualified_name(node.func, aliases)
            == "app.core.ai_clients.close_ai_clients"
            for node in ast.walk(tree)
        )
        if not closes_clients:
            violations.append(str(path.relative_to(REPOSITORY_ROOT)))

    assert violations == [], "Missing provider-client shutdown hooks:\n" + "\n".join(
        violations
    )


def test_overlay_deploy_surfaces_are_in_routing_inventory() -> None:
    violations: list[str] = []
    for dockerfile in REPOSITORY_ROOT.glob("*/Dockerfile*"):
        if "backend/app ./app" not in dockerfile.read_text():
            continue
        service_directory = dockerfile.parent
        if service_directory in NON_DEPLOYED_OVERLAY_DIRECTORIES:
            continue
        app_root = service_directory / "app"
        if app_root.exists() and app_root not in PRODUCTION_ROOTS:
            violations.append(f"missing production root: {app_root.name}")
        main_path = app_root / "main.py"
        if main_path.exists() and main_path not in SERVICE_ENTRYPOINTS:
            violations.append(f"missing lifecycle entrypoint: {main_path}")
        for manifest in service_directory.glob("cloudbuild*.yaml"):
            if manifest not in ALL_CLOUDBUILD_MANIFESTS:
                violations.append(f"missing deployment manifest: {manifest}")

    assert violations == [], "Incomplete overlay routing inventory:\n" + "\n".join(
        violations
    )


def test_every_cloudbuild_manifest_is_explicitly_inventoried() -> None:
    discovered = set(REPOSITORY_ROOT.rglob("cloudbuild*.yaml"))

    assert discovered == set(ALL_CLOUDBUILD_MANIFESTS)


def test_every_direct_backend_deploy_workflow_is_explicitly_inventoried() -> None:
    workflow_root = REPOSITORY_ROOT / ".github" / "workflows"
    discovered = {
        path
        for pattern in ("*.yml", "*.yaml")
        for path in workflow_root.glob(pattern)
        if "gcloud run deploy" in path.read_text()
    }

    assert discovered == set(BACKEND_DEPLOYMENT_WORKFLOWS)


def test_every_terraform_cloud_run_writer_is_explicitly_inventoried() -> None:
    workflow_root = REPOSITORY_ROOT / ".github" / "workflows"
    terraform_root = REPOSITORY_ROOT / "infrastructure" / "terraform"
    terraform_workflows = {
        path
        for pattern in ("*.yml", "*.yaml")
        for path in workflow_root.glob(pattern)
        if "terraform apply" in path.read_text()
    }
    terraform_cloud_run_files = {
        path
        for path in terraform_root.glob("*.tf")
        if "google_cloud_run_v2_" in path.read_text()
    }

    assert terraform_workflows == {PODCAST_TRANSLATION_WORKFLOW}
    assert terraform_cloud_run_files == {PODCAST_TRANSLATION_TERRAFORM}


def test_direct_backend_deploy_workflows_keep_complete_routing_inactive() -> None:
    violations: list[str] = []
    for path in BACKEND_DEPLOYMENT_WORKFLOWS:
        deploy_commands = _direct_deploy_commands(path.read_text())
        relative_path = path.relative_to(REPOSITORY_ROOT)
        if len(deploy_commands) != 1:
            violations.append(
                f"{relative_path}: expected one direct deploy, found {len(deploy_commands)}"
            )
            continue
        deploy_command = deploy_commands[0]
        if "TWOGATES_ROUTING_ENABLED=false" not in deploy_command:
            violations.append(f"{relative_path}: routing is not explicitly inactive")
        for environment_name, secret_reference in ROUTING_SECRET_BINDINGS.items():
            binding = f"{environment_name}={secret_reference}"
            if binding not in deploy_command:
                violations.append(f"{relative_path}: missing {binding}")
        if "HTTPS_PROXY=" in deploy_command or "ALL_PROXY=" in deploy_command:
            violations.append(f"{relative_path}: blanket proxy environment variable")

    assert violations == [], "Unsafe direct backend deployment routing:\n" + "\n".join(
        violations
    )


def test_podcast_translation_worker_has_complete_inactive_routing() -> None:
    workflow_text = PODCAST_TRANSLATION_WORKFLOW.read_text()
    dockerfile_text = PODCAST_TRANSLATION_DOCKERFILE.read_text()
    terraform_text = PODCAST_TRANSLATION_TERRAFORM.read_text()
    variables_text = PODCAST_TRANSLATION_VARIABLES.read_text()
    expected_secret_ids = {
        environment_name: secret_reference.removesuffix(":latest")
        for environment_name, secret_reference in ROUTING_SECRET_BINDINGS.items()
    }
    actual_secret_ids = dict(
        re.findall(
            r'^\s*(TWOGATES_[A-Z_]+)\s*=\s*"([^"]+)"',
            variables_text,
            re.MULTILINE,
        )
    )

    assert "infrastructure/terraform/**" in workflow_text
    assert "terraform apply -auto-approve tfplan" in workflow_text
    assert "COPY backend/app ./app" in dockerfile_text
    assert 'name  = "TWOGATES_ROUTING_ENABLED"' in terraform_text
    assert 'value = "false"' in terraform_text
    assert 'for_each = var.twogates_secret_ids' in terraform_text
    assert "name = env.key" in terraform_text
    assert "secret  = env.value" in terraform_text
    assert "version = var.twogates_secret_version" in terraform_text
    assert actual_secret_ids == expected_secret_ids
    for configuration_text in (terraform_text, variables_text):
        assert "HTTPS_PROXY" not in configuration_text
        assert "ALL_PROXY" not in configuration_text


def test_deployment_manifests_keep_complete_routing_configuration_inactive() -> None:
    violations: list[str] = []
    for path in DEPLOYMENT_MANIFESTS:
        manifest = yaml.safe_load(path.read_text())
        arguments = [
            argument
            for step in manifest["steps"]
            for argument in step.get("args", [])
            if isinstance(argument, str)
        ]
        combined_arguments = "\n".join(arguments)
        relative_path = path.relative_to(REPOSITORY_ROOT)
        if "--set-env-vars=TWOGATES_ROUTING_ENABLED=false" not in arguments:
            violations.append(f"{relative_path}: routing is not explicitly inactive")
        for environment_name, secret_reference in ROUTING_SECRET_BINDINGS.items():
            binding = f"{environment_name}={secret_reference}"
            if binding not in combined_arguments:
                violations.append(f"{relative_path}: missing {binding}")
        if "HTTPS_PROXY=" in combined_arguments or "ALL_PROXY=" in combined_arguments:
            violations.append(f"{relative_path}: blanket proxy environment variable")

    assert violations == [], "Unsafe or incomplete deployment routing:\n" + "\n".join(
        violations
    )


def test_cost_rollup_job_has_complete_inactive_routing_configuration() -> None:
    manifest_text = JOB_BUILD_MANIFEST.read_text()
    dockerfile_text = JOB_DOCKERFILE.read_text()
    entrypoint_text = JOB_ENTRYPOINT.read_text()
    deployment_text = JOB_DEPLOYMENT_SCRIPT.read_text()
    image_deployment_text = JOB_IMAGE_DEPLOYMENT_SCRIPT.read_text()

    assert "./bayit-workers/Dockerfile.jobs" in manifest_text
    assert "gcr.io/$PROJECT_ID/bayit-jobs" in manifest_text
    assert "COPY --chown=bayit:bayit --from=builder /app/backend/app ./app" in (
        dockerfile_text
    )
    assert "COPY --chown=bayit:bayit bayit-workers/jobs ./jobs" in dockerfile_text
    assert (
        "from app.services.olorin.cost.aggregation import CostAggregationService"
        in (entrypoint_text)
    )
    assert "from app.core.ai_clients import close_ai_clients" in entrypoint_text
    assert "await close_ai_clients()" in entrypoint_text
    assert 'create_job "cost-rollup"             "jobs.cost_rollup"' in (
        deployment_text
    )
    assert (
        'COMMON_ENV="${COMMON_ENV},TWOGATES_ROUTING_ENABLED=false"' in deployment_text
    )
    assert 'if [ "$JOB" = "cost-rollup" ]; then' in image_deployment_text
    assert (
        '--update-env-vars="TWOGATES_ROUTING_ENABLED=false"'
        in image_deployment_text
    )
    for environment_name, secret_reference in ROUTING_SECRET_BINDINGS.items():
        binding = f"{environment_name}={secret_reference}"
        assert binding in deployment_text
        assert binding in image_deployment_text
    for script_text in (deployment_text, image_deployment_text):
        assert "HTTPS_PROXY=" not in script_text
        assert "ALL_PROXY=" not in script_text
