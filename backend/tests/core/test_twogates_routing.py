from __future__ import annotations

from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import importlib
import select
import socket
import socketserver
import ssl
import threading
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import ExtendedKeyUsageOID, NameOID
import httpx
from pydantic import SecretStr, ValidationError
import pytest

from app.core.ai_clients import (
    EREBOR_REQUEST_ID_HEADER,
    EREBOR_TASK_CLASS_HEADER,
    ProviderOperationTimeouts,
    RoutingTransportConfig,
    _async_request_hook,
    _sync_request_hook,
    build_async_provider_http_client,
    build_sync_provider_http_client,
    build_tls_context,
    close_ai_clients,
    get_anthropic_client,
    get_openai_client,
    get_provider_http_client,
    get_sync_anthropic_client,
)
from app.core.config import PROTECTED_PROVIDER_HEADER_NAMES, Settings, settings


def _ca_pem(common_name: str = "TwoGates Test Root") -> str:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, common_name)])
    now = datetime.now(timezone.utc)
    certificate = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(minutes=1))
        .not_valid_after(now + timedelta(days=1))
        .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
        .sign(key, hashes.SHA256())
    )
    return certificate.public_bytes(serialization.Encoding.PEM).decode()


def _certificate_authority() -> tuple[rsa.RSAPrivateKey, x509.Certificate]:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "Erebor Probe Root")])
    now = datetime.now(timezone.utc)
    certificate = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(minutes=1))
        .not_valid_after(now + timedelta(days=1))
        .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
        .sign(key, hashes.SHA256())
    )
    return key, certificate


def _server_certificate(
    ca_key: rsa.RSAPrivateKey,
    ca_certificate: x509.Certificate,
) -> tuple[rsa.RSAPrivateKey, x509.Certificate]:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "localhost")])
    now = datetime.now(timezone.utc)
    certificate = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(ca_certificate.subject)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(minutes=1))
        .not_valid_after(now + timedelta(days=1))
        .add_extension(
            x509.SubjectAlternativeName([x509.DNSName("localhost")]),
            critical=False,
        )
        .add_extension(
            x509.ExtendedKeyUsage([ExtendedKeyUsageOID.SERVER_AUTH]),
            critical=False,
        )
        .sign(ca_key, hashes.SHA256())
    )
    return key, certificate


def _write_key_pair(
    directory: Path,
    name: str,
    key: rsa.RSAPrivateKey,
    certificate: x509.Certificate,
) -> tuple[Path, Path]:
    certificate_path = directory / f"{name}-certificate.pem"
    key_path = directory / f"{name}-key.pem"
    certificate_path.write_bytes(certificate.public_bytes(serialization.Encoding.PEM))
    key_path.write_bytes(
        key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
    )
    return certificate_path, key_path


class _ProviderHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        self.server.received_headers = dict(self.headers.items())
        body = b'{"data":[]}'
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: object) -> None:
        return


class _RedirectSourceHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        self.send_response(302)
        self.send_header("Location", self.server.redirect_target)
        self.end_headers()

    def log_message(self, format: str, *args: object) -> None:
        return


class _RedirectSinkHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        self.server.received_headers = dict(self.headers.items())
        self.server.request_count += 1
        self.send_response(200)
        self.end_headers()

    def log_message(self, format: str, *args: object) -> None:
        return


class _ConnectProxyHandler(socketserver.StreamRequestHandler):
    def handle(self) -> None:
        request_line = self.rfile.readline().decode("ascii").strip()
        headers: dict[str, str] = {}
        while True:
            line = self.rfile.readline()
            if line in (b"\r\n", b"\n", b""):
                break
            name, value = line.decode("ascii").split(":", 1)
            headers[name.lower()] = value.strip()

        self.server.connect_request_line = request_line
        self.server.connect_headers = headers
        upstream = socket.create_connection(self.server.provider_address)
        try:
            self.wfile.write(b"HTTP/1.1 200 Connection Established\r\n\r\n")
            self.wfile.flush()
            sockets = [self.connection, upstream]
            while True:
                readable, _, _ = select.select(sockets, [], [], 1.0)
                if not readable:
                    continue
                for source in readable:
                    data = source.recv(65536)
                    if not data:
                        return
                    destination = upstream if source is self.connection else self.connection
                    destination.sendall(data)
        finally:
            upstream.close()


def _config(**overrides: object) -> RoutingTransportConfig:
    values: dict[str, object] = {
        "enabled": True,
        "proxy_url": "https://twogates.invalid:8443",
        "proxy_credential": "tg_0123456789abcdef_0123456789abcdef0123456789abcdef0123456789abcdef",
        "ca_cert_pem": _ca_pem(),
        "task_class": "standard",
        "correlation_header": "X-Correlation-ID",
        "correlation_id_max_length": 128,
        "connect_timeout_seconds": 5.0,
        "request_timeout_seconds": 30.0,
        "provider_max_attempts": 3,
        "max_connections": 20,
        "max_keepalive_connections": 10,
        "keepalive_expiry_seconds": 5.0,
    }
    values.update(overrides)
    return RoutingTransportConfig(**values)


def _settings_values(**overrides: object) -> dict[str, object]:
    values: dict[str, object] = {
        "SECRET_KEY": "routing-test-secret-key-with-at-least-32-characters",
        "MONGODB_URI": "mongodb://localhost:27017/test_bayit_plus",
        "TWOGATES_ROUTING_ENABLED": True,
        "TWOGATES_PROXY_URL": SecretStr("https://twogates.invalid:8443"),
        "TWOGATES_PROXY_CREDENTIAL": SecretStr(
            "tg_0123456789abcdef_0123456789abcdef0123456789abcdef0123456789abcdef"
        ),
        "TWOGATES_CA_CERT_PEM": SecretStr(_ca_pem()),
        "TWOGATES_TASK_CLASS": "standard",
        "TWOGATES_CORRELATION_ID_MAX_LENGTH": 128,
        "TWOGATES_CONNECT_TIMEOUT_SECONDS": 5,
        "TWOGATES_REQUEST_TIMEOUT_SECONDS": 30,
        "TWOGATES_PROVIDER_MAX_ATTEMPTS": 3,
        "TWOGATES_MAX_CONNECTIONS": 20,
        "TWOGATES_MAX_KEEPALIVE_CONNECTIONS": 10,
        "TWOGATES_KEEPALIVE_EXPIRY_SECONDS": 5,
    }
    values.update(overrides)
    return values


def test_settings_allow_inactive_unconfigured_routing() -> None:
    app_settings = Settings(
        _env_file=None,
        SECRET_KEY="routing-test-secret-key-with-at-least-32-characters",
        MONGODB_URI="mongodb://localhost:27017/test_bayit_plus",
        TWOGATES_ROUTING_ENABLED=False,
        TWOGATES_PROXY_URL=SecretStr(""),
        TWOGATES_PROXY_CREDENTIAL=SecretStr(""),
        TWOGATES_CA_CERT_PEM=SecretStr(""),
        TWOGATES_TASK_CLASS="",
    )

    assert app_settings.TWOGATES_ROUTING_ENABLED is False


def test_settings_allow_complete_configuration_while_inactive() -> None:
    app_settings = Settings(
        _env_file=None,
        **_settings_values(TWOGATES_ROUTING_ENABLED=False),
    )

    assert app_settings.TWOGATES_ROUTING_ENABLED is False


def test_native_provider_operation_timeouts_preserve_distinct_contracts() -> None:
    app_settings = Settings(
        _env_file=None,
        **_settings_values(TWOGATES_CONNECT_TIMEOUT_SECONDS=2.5),
    )

    timeouts = ProviderOperationTimeouts.from_settings(app_settings)

    expected_operation_timeouts = {
        "openai_health": 5.0,
        "openai_billing": 30.0,
        "openai_billing_health": 10.0,
        "anthropic_trivia": 60.0,
        "imagen_generation": 120.0,
    }
    for field_name, expected_seconds in expected_operation_timeouts.items():
        timeout = getattr(timeouts, field_name)
        assert timeout.connect == 2.5
        assert timeout.read == expected_seconds
        assert timeout.write == expected_seconds
        assert timeout.pool == expected_seconds


def test_sync_anthropic_sdk_request_preserves_transport_timeout_phases() -> None:
    observed_timeouts: list[dict[str, float]] = []

    def handle_request(request: httpx.Request) -> httpx.Response:
        observed_timeouts.append(request.extensions["timeout"])
        return httpx.Response(
            200,
            json={
                "id": "msg_timeout_probe",
                "type": "message",
                "role": "assistant",
                "model": "claude-timeout-probe",
                "content": [{"type": "text", "text": "ok"}],
                "stop_reason": "end_turn",
                "stop_sequence": None,
                "usage": {"input_tokens": 1, "output_tokens": 1},
            },
            request=request,
        )

    transport_client = httpx.Client(
        transport=httpx.MockTransport(handle_request),
        timeout=httpx.Timeout(90, connect=90),
        trust_env=False,
    )
    config = _config(
        enabled=False,
        connect_timeout_seconds=2.5,
        request_timeout_seconds=47,
    )
    get_sync_anthropic_client.cache_clear()
    try:
        with (
            patch("app.core.ai_clients._sync_clients", []),
            patch.object(
                RoutingTransportConfig,
                "from_settings",
                return_value=config,
            ),
            patch(
                "app.core.ai_clients.build_sync_provider_http_client",
                return_value=transport_client,
            ),
        ):
            client = get_sync_anthropic_client("sdk-timeout-test-key")
            client.messages.create(
                model="claude-timeout-probe",
                max_tokens=1,
                messages=[{"role": "user", "content": "timeout probe"}],
            )
            client.close()
    finally:
        get_sync_anthropic_client.cache_clear()

    assert observed_timeouts == [
        {"connect": 2.5, "read": 47, "write": 47, "pool": 47}
    ]


@pytest.mark.asyncio
async def test_async_anthropic_sdk_request_preserves_transport_timeout_phases() -> None:
    observed_timeouts: list[dict[str, float]] = []

    async def handle_request(request: httpx.Request) -> httpx.Response:
        observed_timeouts.append(request.extensions["timeout"])
        return httpx.Response(
            200,
            json={
                "id": "msg_timeout_probe",
                "type": "message",
                "role": "assistant",
                "model": "claude-timeout-probe",
                "content": [{"type": "text", "text": "ok"}],
                "stop_reason": "end_turn",
                "stop_sequence": None,
                "usage": {"input_tokens": 1, "output_tokens": 1},
            },
            request=request,
        )

    transport_client = httpx.AsyncClient(
        transport=httpx.MockTransport(handle_request),
        timeout=httpx.Timeout(90, connect=90),
        trust_env=False,
    )
    config = _config(
        enabled=False,
        connect_timeout_seconds=2.5,
        request_timeout_seconds=47,
    )
    get_anthropic_client.cache_clear()
    try:
        with (
            patch("app.core.ai_clients._async_clients", []),
            patch.object(
                RoutingTransportConfig,
                "from_settings",
                return_value=config,
            ),
            patch(
                "app.core.ai_clients.build_async_provider_http_client",
                return_value=transport_client,
            ),
        ):
            client = get_anthropic_client("sdk-timeout-test-key")
            await client.messages.create(
                model="claude-timeout-probe",
                max_tokens=1,
                messages=[{"role": "user", "content": "timeout probe"}],
            )
            await client.close()
    finally:
        get_anthropic_client.cache_clear()

    assert observed_timeouts == [
        {"connect": 2.5, "read": 47, "write": 47, "pool": 47}
    ]


@pytest.mark.asyncio
async def test_async_openai_sdk_request_preserves_transport_timeout_phases() -> None:
    observed_timeouts: list[dict[str, float]] = []

    async def handle_request(request: httpx.Request) -> httpx.Response:
        observed_timeouts.append(request.extensions["timeout"])
        return httpx.Response(
            200,
            json={
                "id": "chatcmpl_timeout_probe",
                "object": "chat.completion",
                "created": 0,
                "model": "openai-timeout-probe",
                "choices": [
                    {
                        "index": 0,
                        "message": {"role": "assistant", "content": "ok"},
                        "finish_reason": "stop",
                    }
                ],
                "usage": {
                    "prompt_tokens": 1,
                    "completion_tokens": 1,
                    "total_tokens": 2,
                },
            },
            request=request,
        )

    transport_client = httpx.AsyncClient(
        transport=httpx.MockTransport(handle_request),
        timeout=httpx.Timeout(90, connect=90),
        trust_env=False,
    )
    config = _config(
        enabled=False,
        connect_timeout_seconds=2.5,
        request_timeout_seconds=47,
    )
    get_openai_client.cache_clear()
    try:
        with (
            patch("app.core.ai_clients._async_clients", []),
            patch.object(
                RoutingTransportConfig,
                "from_settings",
                return_value=config,
            ),
            patch(
                "app.core.ai_clients.build_async_provider_http_client",
                return_value=transport_client,
            ),
        ):
            client = get_openai_client("sdk-timeout-test-key")
            await client.chat.completions.create(
                model="openai-timeout-probe",
                messages=[{"role": "user", "content": "timeout probe"}],
            )
            await client.close()
    finally:
        get_openai_client.cache_clear()

    assert observed_timeouts == [
        {"connect": 2.5, "read": 47, "write": 47, "pool": 47}
    ]


@pytest.mark.asyncio
async def test_google_imagen_request_preserves_operation_timeout_phases() -> None:
    from app.services.star_story.avatar_generation_service import (
        avatar_generation_service,
    )

    observed_timeouts: list[dict[str, float]] = []

    async def handle_request(request: httpx.Request) -> httpx.Response:
        observed_timeouts.append(request.extensions["timeout"])
        return httpx.Response(
            200,
            json={"predictions": [{"bytesBase64Encoded": "aW1hZ2U="}]},
            request=request,
        )

    transport_client = httpx.AsyncClient(
        transport=httpx.MockTransport(handle_request),
        timeout=httpx.Timeout(90, connect=90),
        trust_env=False,
    )
    operation_settings = MagicMock()
    operation_settings.TWOGATES_CONNECT_TIMEOUT_SECONDS = 2.5
    operation_settings.PROVIDER_OPENAI_HEALTH_TIMEOUT_SECONDS = 5
    operation_settings.PROVIDER_OPENAI_BILLING_TIMEOUT_SECONDS = 30
    operation_settings.PROVIDER_OPENAI_BILLING_HEALTH_TIMEOUT_SECONDS = 10
    operation_settings.PROVIDER_ANTHROPIC_TRIVIA_TIMEOUT_SECONDS = 60
    operation_settings.PROVIDER_IMAGEN_GENERATION_TIMEOUT_SECONDS = 120
    operation_timeouts = ProviderOperationTimeouts.from_settings(operation_settings)
    credentials = MagicMock(token="google-timeout-test-token")
    try:
        with (
            patch("google.auth.default", return_value=(credentials, None)),
            patch.object(settings, "GCP_REGION", "us-central1"),
            patch.object(settings, "GCP_PROJECT_ID", "google-timeout-test-project"),
            patch(
                "app.services.star_story.avatar_generation_service.get_provider_http_client",
                return_value=transport_client,
            ),
            patch(
                "app.services.star_story.avatar_generation_service.ProviderOperationTimeouts.from_settings",
                return_value=operation_timeouts,
            ),
        ):
            image_bytes = await avatar_generation_service._generate_image(
                "timeout contract probe"
            )
    finally:
        await transport_client.aclose()

    assert image_bytes == b"image"
    assert observed_timeouts == [
        {"connect": 2.5, "read": 120, "write": 120, "pool": 120}
    ]


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("TWOGATES_PROXY_URL", SecretStr("http://twogates.invalid:8443")),
        (
            "TWOGATES_PROXY_URL",
            SecretStr("https://agent:token@twogates.invalid:8443"),
        ),
        ("TWOGATES_PROXY_CREDENTIAL", SecretStr("invalid credential")),
        ("TWOGATES_PROXY_CREDENTIAL", SecretStr("tg_test_bad\x00token")),
        ("TWOGATES_PROXY_CREDENTIAL", SecretStr("tg_test_bad\x7ftoken")),
        (
            "TWOGATES_PROXY_CREDENTIAL",
            SecretStr("tg_0123456789abcdef_0123456789abcdef"),
        ),
        (
            "TWOGATES_PROXY_CREDENTIAL",
            SecretStr(
                "tg_0123456789ABCDEF_0123456789abcdef0123456789abcdef0123456789abcdef"
            ),
        ),
        ("TWOGATES_CA_CERT_PEM", SecretStr("invalid certificate")),
        ("TWOGATES_TASK_CLASS", "unknown"),
        ("CORRELATION_ID_HEADER", "X-Correlation-ID\x00Injected"),
        ("TWOGATES_CORRELATION_ID_MAX_LENGTH", 0),
        ("TWOGATES_PROVIDER_MAX_ATTEMPTS", 0),
    ],
)
def test_settings_reject_invalid_routing_configuration(
    field: str,
    value: object,
) -> None:
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **_settings_values(**{field: value}))


@pytest.mark.parametrize("header_name", sorted(PROTECTED_PROVIDER_HEADER_NAMES))
def test_settings_reject_protected_correlation_headers_case_insensitively(
    header_name: str,
) -> None:
    mixed_case_name = "".join(
        character.upper() if index % 2 else character
        for index, character in enumerate(header_name)
    )

    with pytest.raises(ValidationError, match="protected provider header"):
        Settings(
            _env_file=None,
            **_settings_values(CORRELATION_ID_HEADER=mixed_case_name),
        )


@pytest.mark.parametrize("header_name", sorted(PROTECTED_PROVIDER_HEADER_NAMES))
def test_direct_transport_config_rejects_protected_correlation_headers(
    header_name: str,
) -> None:
    with pytest.raises(ValueError, match="protected provider header"):
        _config(correlation_header=header_name.upper())


def test_settings_reject_partial_configuration_even_when_inactive() -> None:
    with pytest.raises(ValidationError, match="all-or-none"):
        Settings(
            _env_file=None,
            **_settings_values(
                TWOGATES_ROUTING_ENABLED=False,
                TWOGATES_CA_CERT_PEM=SecretStr(""),
            ),
        )


def test_settings_reject_enabled_without_connection_settings() -> None:
    with pytest.raises(ValidationError, match="cannot be enabled"):
        Settings(
            _env_file=None,
            SECRET_KEY="routing-test-secret-key-with-at-least-32-characters",
            MONGODB_URI="mongodb://localhost:27017/test_bayit_plus",
            TWOGATES_ROUTING_ENABLED=True,
            TWOGATES_PROXY_URL=SecretStr(""),
            TWOGATES_PROXY_CREDENTIAL=SecretStr(""),
            TWOGATES_CA_CERT_PEM=SecretStr(""),
            TWOGATES_TASK_CLASS="",
        )


def test_tls_context_keeps_public_roots_and_adds_private_ca() -> None:
    baseline = ssl.create_default_context().cert_store_stats()["x509_ca"]
    context = build_tls_context(_config())

    assert context.verify_mode == ssl.CERT_REQUIRED
    assert context.check_hostname is True
    assert context.cert_store_stats()["x509_ca"] > baseline


def test_sync_hook_adds_fresh_metadata_and_optional_correlation() -> None:
    identifiers = iter([uuid.UUID(int=1), uuid.UUID(int=2)])
    hook = _sync_request_hook(
        _config(),
        lambda: next(identifiers),
        lambda: "correlation-id",
    )
    first = httpx.Request("POST", "https://api.anthropic.com/v1/messages")
    second = httpx.Request("POST", "https://api.openai.com/v1/chat/completions")

    hook(first)
    hook(second)

    assert first.headers[EREBOR_REQUEST_ID_HEADER] == str(uuid.UUID(int=1))
    assert second.headers[EREBOR_REQUEST_ID_HEADER] == str(uuid.UUID(int=2))
    assert first.headers[EREBOR_TASK_CLASS_HEADER] == "standard"
    assert second.headers[EREBOR_TASK_CLASS_HEADER] == "standard"
    assert first.headers["X-Correlation-ID"] == "correlation-id"


@pytest.mark.asyncio
async def test_async_hook_omits_absent_optional_correlation() -> None:
    hook = _async_request_hook(
        _config(task_class="heavy"),
        lambda: uuid.UUID(int=3),
        lambda: None,
    )
    request = httpx.Request("POST", "https://api.anthropic.com/v1/messages")

    await hook(request)

    assert request.headers[EREBOR_REQUEST_ID_HEADER] == str(uuid.UUID(int=3))
    assert request.headers[EREBOR_TASK_CLASS_HEADER] == "heavy"
    assert "X-Correlation-ID" not in request.headers


@pytest.mark.asyncio
@pytest.mark.parametrize("correlation_id", ["bad\x00id", "bad\x7fid", "bad-é-id"])
async def test_async_hook_omits_unsafe_optional_correlation(
    correlation_id: str,
) -> None:
    hook = _async_request_hook(
        _config(),
        lambda: uuid.UUID(int=3),
        lambda: correlation_id,
    )
    request = httpx.Request("POST", "https://api.anthropic.com/v1/messages")

    await hook(request)

    assert "X-Correlation-ID" not in request.headers


@pytest.mark.asyncio
async def test_async_hook_enforces_correlation_id_size_boundary() -> None:
    config = _config(correlation_id_max_length=8)
    accepted_request = httpx.Request(
        "POST", "https://api.anthropic.com/v1/messages"
    )
    rejected_request = httpx.Request(
        "POST", "https://api.anthropic.com/v1/messages"
    )

    await _async_request_hook(
        config,
        lambda: uuid.UUID(int=4),
        lambda: "12345678",
    )(accepted_request)
    await _async_request_hook(
        config,
        lambda: uuid.UUID(int=5),
        lambda: "123456789",
    )(rejected_request)

    assert accepted_request.headers["X-Correlation-ID"] == "12345678"
    assert "X-Correlation-ID" not in rejected_request.headers


def test_routed_client_uses_same_ca_for_proxy_and_tunneled_tls() -> None:
    tls_context = ssl.create_default_context()
    with (
        patch(
            "app.core.ai_clients.build_tls_context",
            return_value=tls_context,
        ),
        patch("app.core.ai_clients.httpx.Client") as client_constructor,
    ):
        build_sync_provider_http_client(_config())

    kwargs = client_constructor.call_args.kwargs
    assert kwargs["verify"] is tls_context
    assert kwargs["proxy"].ssl_context is tls_context
    assert kwargs["proxy"].headers["Proxy-Authorization"] == (
        "Bearer tg_0123456789abcdef_0123456789abcdef0123456789abcdef0123456789abcdef"
    )
    assert kwargs["trust_env"] is False
    assert kwargs["follow_redirects"] is False
    assert kwargs["timeout"].connect == 5.0
    assert kwargs["timeout"].read == 30.0
    assert kwargs["limits"].max_connections == 20
    assert kwargs["limits"].max_keepalive_connections == 10


def test_inactive_client_has_no_proxy_or_routing_headers() -> None:
    with patch("app.core.ai_clients.httpx.AsyncClient") as client_constructor:
        build_async_provider_http_client(_config(enabled=False))

    kwargs = client_constructor.call_args.kwargs
    assert kwargs["trust_env"] is False
    assert kwargs["follow_redirects"] is False
    assert "proxy" not in kwargs
    assert "event_hooks" not in kwargs


def _redirect_servers() -> tuple[ThreadingHTTPServer, ThreadingHTTPServer]:
    sink = ThreadingHTTPServer(("127.0.0.1", 0), _RedirectSinkHandler)
    sink.request_count = 0
    sink.received_headers = {}
    source = ThreadingHTTPServer(("127.0.0.1", 0), _RedirectSourceHandler)
    source.redirect_target = f"http://127.0.0.1:{sink.server_address[1]}/sink"
    return source, sink


def _start_server(server: ThreadingHTTPServer) -> threading.Thread:
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return thread


def test_sync_client_does_not_forward_provider_credentials_across_redirects() -> None:
    source, sink = _redirect_servers()
    source_thread = _start_server(source)
    sink_thread = _start_server(sink)
    client = build_sync_provider_http_client(_config(enabled=False))
    try:
        response = client.get(
            f"http://127.0.0.1:{source.server_address[1]}/provider",
            headers={
                "Authorization": "Bearer audit-credential",
                "x-api-key": "audit-credential",
            },
        )

        assert response.status_code == 302
        assert sink.request_count == 0
        assert sink.received_headers == {}
    finally:
        client.close()
        source.shutdown()
        sink.shutdown()
        source.server_close()
        sink.server_close()
        source_thread.join()
        sink_thread.join()


@pytest.mark.asyncio
async def test_async_client_does_not_forward_provider_credentials_across_redirects() -> (
    None
):
    source, sink = _redirect_servers()
    source_thread = _start_server(source)
    sink_thread = _start_server(sink)
    client = build_async_provider_http_client(_config(enabled=False))
    try:
        response = await client.get(
            f"http://127.0.0.1:{source.server_address[1]}/provider",
            headers={
                "Authorization": "Bearer audit-credential",
                "x-api-key": "audit-credential",
            },
        )

        assert response.status_code == 302
        assert sink.request_count == 0
        assert sink.received_headers == {}
    finally:
        await client.aclose()
        source.shutdown()
        sink.shutdown()
        source.server_close()
        sink.server_close()
        source_thread.join()
        sink_thread.join()


def test_real_https_connect_probe_uses_private_ca_and_routing_headers(
    tmp_path: Path,
) -> None:
    ca_key, ca_certificate = _certificate_authority()
    provider_key, provider_certificate = _server_certificate(
        ca_key,
        ca_certificate,
    )
    proxy_key, proxy_certificate = _server_certificate(ca_key, ca_certificate)
    provider_certificate_path, provider_key_path = _write_key_pair(
        tmp_path,
        "provider",
        provider_key,
        provider_certificate,
    )
    proxy_certificate_path, proxy_key_path = _write_key_pair(
        tmp_path,
        "proxy",
        proxy_key,
        proxy_certificate,
    )
    ca_pem = ca_certificate.public_bytes(serialization.Encoding.PEM).decode()

    provider = ThreadingHTTPServer(("127.0.0.1", 0), _ProviderHandler)
    provider_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    provider_context.load_cert_chain(provider_certificate_path, provider_key_path)
    provider.socket = provider_context.wrap_socket(provider.socket, server_side=True)

    proxy = socketserver.ThreadingTCPServer(
        ("127.0.0.1", 0),
        _ConnectProxyHandler,
    )
    proxy.daemon_threads = True
    proxy.provider_address = provider.server_address
    proxy_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    proxy_context.load_cert_chain(proxy_certificate_path, proxy_key_path)
    proxy.socket = proxy_context.wrap_socket(proxy.socket, server_side=True)

    provider_thread = threading.Thread(target=provider.serve_forever, daemon=True)
    proxy_thread = threading.Thread(target=proxy.serve_forever, daemon=True)
    provider_thread.start()
    proxy_thread.start()

    config = _config(
        proxy_url=f"https://localhost:{proxy.server_address[1]}",
        ca_cert_pem=ca_pem,
    )
    client = build_sync_provider_http_client(
        config,
        request_id_factory=lambda: uuid.UUID(int=4),
        correlation_id_provider=lambda: "probe-correlation",
    )
    try:
        response = client.get(
            f"https://localhost:{provider.server_address[1]}/v1/models"
        )
        assert response.status_code == 200
        assert proxy.connect_request_line.startswith("CONNECT localhost:")
        assert proxy.connect_headers["proxy-authorization"] == (
            "Bearer tg_0123456789abcdef_0123456789abcdef0123456789abcdef0123456789abcdef"
        )
        assert provider.received_headers[EREBOR_REQUEST_ID_HEADER] == str(
            uuid.UUID(int=4)
        )
        assert provider.received_headers[EREBOR_TASK_CLASS_HEADER] == "standard"
        assert provider.received_headers["X-Correlation-ID"] == "probe-correlation"
        assert "Proxy-Authorization" not in provider.received_headers
    finally:
        client.close()
        proxy.shutdown()
        provider.shutdown()
        proxy.server_close()
        provider.server_close()
        proxy_thread.join()
        provider_thread.join()


@pytest.mark.asyncio
async def test_close_ai_clients_closes_every_registered_client() -> None:
    sync_client = MagicMock()
    async_client = AsyncMock()
    with (
        patch("app.core.ai_clients._sync_clients", [sync_client]),
        patch("app.core.ai_clients._async_clients", [async_client]),
    ):
        await close_ai_clients()

    sync_client.close.assert_called_once_with()
    async_client.aclose.assert_awaited_once_with()


@pytest.mark.asyncio
async def test_close_ai_clients_continues_after_individual_close_failures() -> None:
    failing_sync_client = MagicMock()
    failing_sync_client.close.side_effect = RuntimeError("sync close failed")
    healthy_sync_client = MagicMock()
    failing_async_client = AsyncMock()
    failing_async_client.aclose.side_effect = RuntimeError("async close failed")
    healthy_async_client = AsyncMock()
    with (
        patch(
            "app.core.ai_clients._sync_clients",
            [failing_sync_client, healthy_sync_client],
        ),
        patch(
            "app.core.ai_clients._async_clients",
            [failing_async_client, healthy_async_client],
        ),
    ):
        await close_ai_clients()

    healthy_sync_client.close.assert_called_once_with()
    healthy_async_client.aclose.assert_awaited_once_with()


@pytest.mark.asyncio
async def test_retained_sync_handle_reopens_after_lifespan_shutdown() -> None:
    first_client = MagicMock()
    first_client.messages = object()
    second_client = MagicMock()
    second_client.messages = object()
    get_sync_anthropic_client.cache_clear()
    try:
        with (
            patch("app.core.ai_clients._sync_clients", []),
            patch(
                "app.core.ai_clients.anthropic.Anthropic",
                side_effect=[first_client, second_client],
            ) as constructor,
        ):
            retained_handle = get_sync_anthropic_client("lifecycle-test-key")
            assert retained_handle.messages is first_client.messages

            await close_ai_clients()

            assert first_client.close.call_count == 1
            assert retained_handle is get_sync_anthropic_client("lifecycle-test-key")
            assert retained_handle.messages is second_client.messages
            assert constructor.call_count == 2
    finally:
        get_sync_anthropic_client.cache_clear()


@pytest.mark.asyncio
async def test_retained_async_handles_reopen_after_lifespan_shutdown() -> None:
    first_anthropic = MagicMock(spec=["close", "messages"])
    first_anthropic.close = AsyncMock()
    first_anthropic.messages = object()
    second_anthropic = MagicMock(spec=["close", "messages"])
    second_anthropic.close = AsyncMock()
    second_anthropic.messages = object()
    first_anthropic_transport = AsyncMock()
    second_anthropic_transport = AsyncMock()
    first_http = AsyncMock()
    first_http.get = object()
    second_http = AsyncMock()
    second_http.get = object()
    get_anthropic_client.cache_clear()
    get_provider_http_client.cache_clear()
    try:
        with (
            patch("app.core.ai_clients._async_clients", []),
            patch(
                "app.core.ai_clients.anthropic.AsyncAnthropic",
                side_effect=[first_anthropic, second_anthropic],
            ) as anthropic_constructor,
            patch(
                "app.core.ai_clients.build_async_provider_http_client",
                side_effect=[
                    first_anthropic_transport,
                    first_http,
                    second_anthropic_transport,
                    second_http,
                ],
            ) as http_constructor,
        ):
            retained_anthropic = get_anthropic_client("lifecycle-test-key")
            retained_http = get_provider_http_client()
            assert retained_anthropic.messages is first_anthropic.messages
            assert retained_http.get is first_http.get

            await close_ai_clients()

            first_anthropic.close.assert_awaited_once_with()
            first_http.aclose.assert_awaited_once_with()
            assert retained_anthropic is get_anthropic_client("lifecycle-test-key")
            assert retained_http is get_provider_http_client()
            assert retained_anthropic.messages is second_anthropic.messages
            assert retained_http.get is second_http.get
            assert anthropic_constructor.call_count == 2
            assert http_constructor.call_count == 4
    finally:
        get_anthropic_client.cache_clear()
        get_provider_http_client.cache_clear()


@pytest.mark.asyncio
async def test_production_global_singleton_and_field_handles_survive_reentry() -> None:
    clients = [MagicMock() for _ in range(4)]
    for client in clients:
        client.messages = object()
    get_sync_anthropic_client.cache_clear()
    with (
        patch.object(settings, "ANTHROPIC_API_KEY", "lifecycle-test-key"),
        patch("app.core.ai_clients._sync_clients", []),
        patch(
            "app.core.ai_clients.anthropic.Anthropic",
            side_effect=clients,
        ) as constructor,
    ):
        chat_helpers = importlib.import_module("app.api.routes.chat.helpers")
        chat_helpers = importlib.reload(chat_helpers)
        translation_module = importlib.import_module("app.services.translation_service")
        translation_module = importlib.reload(translation_module)
        wizard_module = importlib.import_module(
            "app.services.voice.wizard_chat_service"
        )

        module_global_handle = chat_helpers.client
        singleton_handle = translation_module.translation_service.client
        instance_field_handle = wizard_module.WizardChatService().client
        assert module_global_handle is instance_field_handle
        first_global_messages = module_global_handle.messages
        first_singleton_messages = singleton_handle.messages

        await close_ai_clients()

        assert chat_helpers.client is module_global_handle
        assert translation_module.translation_service.client is singleton_handle
        assert instance_field_handle is module_global_handle
        assert module_global_handle.messages is not first_global_messages
        assert singleton_handle.messages is not first_singleton_messages
        assert constructor.call_count == 4

    get_sync_anthropic_client.cache_clear()
