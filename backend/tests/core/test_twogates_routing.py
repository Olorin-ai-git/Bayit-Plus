from __future__ import annotations

from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
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
from app.core.config import Settings


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
        "proxy_credential": "tg_test_test-secret",
        "ca_cert_pem": _ca_pem(),
        "task_class": "standard",
        "correlation_header": "X-Correlation-ID",
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
        "TWOGATES_PROXY_CREDENTIAL": SecretStr("tg_test_test-secret"),
        "TWOGATES_CA_CERT_PEM": SecretStr(_ca_pem()),
        "TWOGATES_TASK_CLASS": "standard",
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


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("TWOGATES_PROXY_URL", SecretStr("http://twogates.invalid:8443")),
        (
            "TWOGATES_PROXY_URL",
            SecretStr("https://agent:token@twogates.invalid:8443"),
        ),
        ("TWOGATES_PROXY_CREDENTIAL", SecretStr("invalid credential")),
        ("TWOGATES_CA_CERT_PEM", SecretStr("invalid certificate")),
        ("TWOGATES_TASK_CLASS", "unknown"),
        ("TWOGATES_PROVIDER_MAX_ATTEMPTS", 0),
    ],
)
def test_settings_reject_invalid_routing_configuration(
    field: str,
    value: object,
) -> None:
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **_settings_values(**{field: value}))


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
        "Bearer tg_test_test-secret"
    )
    assert kwargs["trust_env"] is False
    assert kwargs["timeout"].connect == 5.0
    assert kwargs["timeout"].read == 30.0
    assert kwargs["limits"].max_connections == 20
    assert kwargs["limits"].max_keepalive_connections == 10


def test_inactive_client_has_no_proxy_or_routing_headers() -> None:
    with patch("app.core.ai_clients.httpx.AsyncClient") as client_constructor:
        build_async_provider_http_client(_config(enabled=False))

    kwargs = client_constructor.call_args.kwargs
    assert kwargs["trust_env"] is False
    assert "proxy" not in kwargs
    assert "event_hooks" not in kwargs


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
            "Bearer tg_test_test-secret"
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
async def test_close_ai_clients_closes_registered_clients_and_clears_caches() -> None:
    sync_client = MagicMock()
    async_client = AsyncMock()
    with (
        patch("app.core.ai_clients._sync_clients", [sync_client]),
        patch("app.core.ai_clients._async_clients", [async_client]),
    ):
        await close_ai_clients()

    sync_client.close.assert_called_once_with()
    async_client.aclose.assert_awaited_once_with()
    assert get_sync_anthropic_client.cache_info().currsize == 0
    assert get_anthropic_client.cache_info().currsize == 0
    assert get_openai_client.cache_info().currsize == 0
    assert get_provider_http_client.cache_info().currsize == 0


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
    assert get_sync_anthropic_client.cache_info().currsize == 0
    assert get_anthropic_client.cache_info().currsize == 0
    assert get_openai_client.cache_info().currsize == 0
    assert get_provider_http_client.cache_info().currsize == 0
