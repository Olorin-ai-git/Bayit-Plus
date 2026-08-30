"""Provider client factories with opt-in, client-scoped TwoGates routing."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from functools import lru_cache
import ssl
from threading import Lock
from typing import Any
import uuid

import anthropic
import httpx
from openai import AsyncOpenAI

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

EREBOR_REQUEST_ID_HEADER = "x-erebor-request-id"
EREBOR_TASK_CLASS_HEADER = "x-erebor-task-class"

RequestIdFactory = Callable[[], uuid.UUID | str]
CorrelationIdProvider = Callable[[], str | None]


@dataclass(frozen=True)
class RoutingTransportConfig:
    """Typed transport settings shared by every provider client."""

    enabled: bool
    proxy_url: str
    proxy_credential: str
    ca_cert_pem: str
    task_class: str
    correlation_header: str
    connect_timeout_seconds: float
    request_timeout_seconds: float
    provider_max_attempts: int
    max_connections: int
    max_keepalive_connections: int
    keepalive_expiry_seconds: float

    @classmethod
    def from_settings(cls, app_settings: Any = settings) -> "RoutingTransportConfig":
        return cls(
            enabled=app_settings.TWOGATES_ROUTING_ENABLED,
            proxy_url=app_settings.TWOGATES_PROXY_URL.get_secret_value().strip(),
            proxy_credential=(
                app_settings.TWOGATES_PROXY_CREDENTIAL.get_secret_value().strip()
            ),
            ca_cert_pem=app_settings.TWOGATES_CA_CERT_PEM.get_secret_value().strip(),
            task_class=app_settings.TWOGATES_TASK_CLASS,
            correlation_header=app_settings.CORRELATION_ID_HEADER,
            connect_timeout_seconds=app_settings.TWOGATES_CONNECT_TIMEOUT_SECONDS,
            request_timeout_seconds=app_settings.TWOGATES_REQUEST_TIMEOUT_SECONDS,
            provider_max_attempts=app_settings.TWOGATES_PROVIDER_MAX_ATTEMPTS,
            max_connections=app_settings.TWOGATES_MAX_CONNECTIONS,
            max_keepalive_connections=app_settings.TWOGATES_MAX_KEEPALIVE_CONNECTIONS,
            keepalive_expiry_seconds=app_settings.TWOGATES_KEEPALIVE_EXPIRY_SECONDS,
        )


def _current_correlation_id() -> str | None:
    from app.middleware.correlation_id import get_correlation_id

    return get_correlation_id()


def build_tls_context(config: RoutingTransportConfig) -> ssl.SSLContext:
    """Augment system trust with the private CA for proxy and tunneled TLS."""
    context = ssl.create_default_context()
    context.load_verify_locations(cadata=config.ca_cert_pem)
    return context


def _sync_request_hook(
    config: RoutingTransportConfig,
    request_id_factory: RequestIdFactory,
    correlation_id_provider: CorrelationIdProvider,
) -> Callable[[httpx.Request], None]:
    def add_routing_metadata(request: httpx.Request) -> None:
        request.headers[EREBOR_REQUEST_ID_HEADER] = str(request_id_factory())
        request.headers[EREBOR_TASK_CLASS_HEADER] = config.task_class
        correlation_id = correlation_id_provider()
        if correlation_id:
            request.headers[config.correlation_header] = correlation_id

    return add_routing_metadata


def _async_request_hook(
    config: RoutingTransportConfig,
    request_id_factory: RequestIdFactory,
    correlation_id_provider: CorrelationIdProvider,
) -> Callable[[httpx.Request], object]:
    async def add_routing_metadata(request: httpx.Request) -> None:
        request.headers[EREBOR_REQUEST_ID_HEADER] = str(request_id_factory())
        request.headers[EREBOR_TASK_CLASS_HEADER] = config.task_class
        correlation_id = correlation_id_provider()
        if correlation_id:
            request.headers[config.correlation_header] = correlation_id

    return add_routing_metadata


def _timeout(config: RoutingTransportConfig) -> httpx.Timeout:
    return httpx.Timeout(
        config.request_timeout_seconds,
        connect=config.connect_timeout_seconds,
    )


def _limits(config: RoutingTransportConfig) -> httpx.Limits:
    return httpx.Limits(
        max_connections=config.max_connections,
        max_keepalive_connections=config.max_keepalive_connections,
        keepalive_expiry=config.keepalive_expiry_seconds,
    )


def _proxy(
    config: RoutingTransportConfig,
    tls_context: ssl.SSLContext,
) -> httpx.Proxy:
    return httpx.Proxy(
        config.proxy_url,
        ssl_context=tls_context,
        headers={"Proxy-Authorization": f"Bearer {config.proxy_credential}"},
    )


def build_sync_provider_http_client(
    config: RoutingTransportConfig,
    *,
    request_id_factory: RequestIdFactory = uuid.uuid4,
    correlation_id_provider: CorrelationIdProvider = _current_correlation_id,
) -> httpx.Client:
    """Build a sync provider client that never consumes process proxy variables."""
    kwargs: dict[str, object] = {
        "timeout": _timeout(config),
        "limits": _limits(config),
        "follow_redirects": True,
        "trust_env": False,
    }
    if config.enabled:
        tls_context = build_tls_context(config)
        kwargs.update(
            proxy=_proxy(config, tls_context),
            verify=tls_context,
            event_hooks={
                "request": [
                    _sync_request_hook(
                        config,
                        request_id_factory,
                        correlation_id_provider,
                    )
                ]
            },
        )
    return httpx.Client(**kwargs)


def build_async_provider_http_client(
    config: RoutingTransportConfig,
    *,
    request_id_factory: RequestIdFactory = uuid.uuid4,
    correlation_id_provider: CorrelationIdProvider = _current_correlation_id,
) -> httpx.AsyncClient:
    """Build an async provider client that never consumes process proxy variables."""
    kwargs: dict[str, object] = {
        "timeout": _timeout(config),
        "limits": _limits(config),
        "follow_redirects": True,
        "trust_env": False,
    }
    if config.enabled:
        tls_context = build_tls_context(config)
        kwargs.update(
            proxy=_proxy(config, tls_context),
            verify=tls_context,
            event_hooks={
                "request": [
                    _async_request_hook(
                        config,
                        request_id_factory,
                        correlation_id_provider,
                    )
                ]
            },
        )
    return httpx.AsyncClient(**kwargs)


_sync_clients: list[Any] = []
_async_clients: list[Any] = []
_client_registry_lock = Lock()


def _register_sync_client(client: Any) -> Any:
    with _client_registry_lock:
        _sync_clients.append(client)
    return client


def _register_async_client(client: Any) -> Any:
    with _client_registry_lock:
        _async_clients.append(client)
    return client


@lru_cache(maxsize=None)
def get_sync_anthropic_client(api_key: str | None = None) -> anthropic.Anthropic:
    """Return a pooled sync Anthropic client on its vendor-native URL."""
    resolved_api_key = settings.ANTHROPIC_API_KEY if api_key is None else api_key
    if not resolved_api_key:
        logger.warning("ANTHROPIC_API_KEY not configured, AI features will fail")
    config = RoutingTransportConfig.from_settings()
    client = anthropic.Anthropic(
        api_key=resolved_api_key,
        http_client=build_sync_provider_http_client(config),
        max_retries=config.provider_max_attempts - 1,
        timeout=config.request_timeout_seconds,
    )
    return _register_sync_client(client)


@lru_cache(maxsize=None)
def get_anthropic_client(api_key: str | None = None) -> anthropic.AsyncAnthropic:
    """Return a pooled async Anthropic client on its vendor-native URL."""
    resolved_api_key = settings.ANTHROPIC_API_KEY if api_key is None else api_key
    if not resolved_api_key:
        logger.warning("ANTHROPIC_API_KEY not configured, AI features will fail")
    config = RoutingTransportConfig.from_settings()
    client = anthropic.AsyncAnthropic(
        api_key=resolved_api_key,
        http_client=build_async_provider_http_client(config),
        max_retries=config.provider_max_attempts - 1,
        timeout=config.request_timeout_seconds,
    )
    return _register_async_client(client)


@lru_cache(maxsize=None)
def get_openai_client(api_key: str | None = None) -> AsyncOpenAI:
    """Return a pooled async OpenAI client on its vendor-native URL."""
    resolved_api_key = settings.OPENAI_API_KEY if api_key is None else api_key
    if not resolved_api_key:
        logger.warning("OPENAI_API_KEY not configured, OpenAI features will fail")
    config = RoutingTransportConfig.from_settings()
    client = AsyncOpenAI(
        api_key=resolved_api_key,
        http_client=build_async_provider_http_client(config),
        max_retries=config.provider_max_attempts - 1,
        timeout=config.request_timeout_seconds,
    )
    return _register_async_client(client)


@lru_cache(maxsize=1)
def get_provider_http_client() -> httpx.AsyncClient:
    """Return the client for native provider REST calls."""
    return _register_async_client(
        build_async_provider_http_client(RoutingTransportConfig.from_settings())
    )


async def close_ai_clients() -> None:
    """Close every pooled provider client and clear factory state safely."""
    with _client_registry_lock:
        sync_clients = list(_sync_clients)
        async_clients = list(_async_clients)
        _sync_clients.clear()
        _async_clients.clear()

    try:
        for client in sync_clients:
            try:
                client.close()
            except Exception as exc:
                logger.warning(
                    "ai_provider_sync_client_close_failed",
                    client_type=type(client).__name__,
                    error=str(exc),
                )
        for client in async_clients:
            try:
                if hasattr(client, "aclose"):
                    await client.aclose()
                    continue
                await client.close()
            except Exception as exc:
                logger.warning(
                    "ai_provider_async_client_close_failed",
                    client_type=type(client).__name__,
                    error=str(exc),
                )
    finally:
        get_sync_anthropic_client.cache_clear()
        get_anthropic_client.cache_clear()
        get_openai_client.cache_clear()
        get_provider_http_client.cache_clear()


def get_subtitle_ai_config() -> dict[str, object]:
    """Return model and transport limits for subtitle AI calls."""
    return {
        "model": settings.SUBTITLE_AI_MODEL,
        "max_retries": settings.TWOGATES_PROVIDER_MAX_ATTEMPTS - 1,
        "timeout": settings.TWOGATES_REQUEST_TIMEOUT_SECONDS,
    }
