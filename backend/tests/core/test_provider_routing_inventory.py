from __future__ import annotations

import ast
from pathlib import Path

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
FACTORY_PATH = Path("backend/app/core/ai_clients.py")
PROVIDER_API_HOSTS = (
    "api.anthropic.com",
    "api.openai.com",
    "aiplatform.googleapis.com",
    "generativelanguage.googleapis.com",
)
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
                and relative_path != FACTORY_PATH
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
            manifest_text = manifest.read_text()
            if "'run'" in manifest_text and "'deploy'" in manifest_text:
                if manifest not in DEPLOYMENT_MANIFESTS:
                    violations.append(f"missing deployment manifest: {manifest}")

    assert violations == [], "Incomplete overlay routing inventory:\n" + "\n".join(
        violations
    )


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
