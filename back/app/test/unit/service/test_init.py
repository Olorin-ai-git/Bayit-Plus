import logging
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI, Request, Response
from starlette.datastructures import Headers

from app.service import (
    E2ESettings,
    LocalSettings,
    PRDSettings,
    PRFSettings,
    QALSettings,
    STGSettings,
    _settings_factory,
    configure_logger,
    create_app,
    inject_transaction_id,
    on_shutdown,
    on_startup,
)


@pytest.fixture
def mock_request():
    """Fixture for a mocked Request object."""
    request = MagicMock(spec=Request)
    request.headers = Headers({"host": "testserver"})
    request.state = MagicMock()
    return request


@pytest.fixture
def mock_response():
    """Fixture for a mocked Response object."""
    response = MagicMock(spec=Response)
    response.headers = {}
    return response


@pytest.fixture
def mock_call_next(mock_response):
    """Fixture for a mocked call_next function that returns the mock_response."""

    async def mock_call_next_func(request):
        return mock_response

    return AsyncMock(side_effect=mock_call_next_func)


@pytest.mark.asyncio
async def test_inject_transaction_id_with_existing_tid(
    mock_request, mock_call_next, mock_response
):
    """Test inject_transaction_id middleware when a transaction ID is already present."""
    # Setup
    tid_value = "existing-tid-value"
    mock_request.headers = Headers({"intuit_tid": tid_value})

    # Call the middleware
    response = await inject_transaction_id(mock_request, mock_call_next)

    # Assertions
    assert mock_request.state.intuit_tid == tid_value
    mock_call_next.assert_called_once_with(mock_request)
    assert response.headers["intuit_tid"] == tid_value


@pytest.mark.asyncio
async def test_inject_transaction_id_without_tid(
    mock_request, mock_call_next, mock_response
):
    """Test inject_transaction_id middleware when no transaction ID is provided."""
    # Call the middleware
    response = await inject_transaction_id(mock_request, mock_call_next)

    # Assertions
    assert mock_request.state.intuit_tid is not None
    assert isinstance(mock_request.state.intuit_tid, str)
    mock_call_next.assert_called_once_with(mock_request)
    assert response.headers["intuit_tid"] == mock_request.state.intuit_tid


@patch("app.service.logging.StreamHandler")
@patch("app.service.RequestFormatter")
def test_configure_logger(mock_formatter_class, mock_stream_handler):
    """Test configure_logger function."""
    # Setup
    mock_app = MagicMock()
    mock_app.state.config.log_level = "info"

    mock_handler = MagicMock()
    mock_stream_handler.return_value = mock_handler

    mock_formatter = MagicMock()
    mock_formatter_class.return_value = mock_formatter

    # Call the function
    with patch("app.service.logging.getLogger") as mock_get_logger:
        mock_root_logger = MagicMock()
        mock_root_logger.handlers = [MagicMock()]
        mock_get_logger.return_value = mock_root_logger

        configure_logger(mock_app)

        # Assertions
        mock_formatter_class.assert_called_once_with(
            "[%(asctime)s] %(levelname)s [%(context)s] module=%(module)s: %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S%z",
        )
        mock_handler.setFormatter.assert_called_once_with(mock_formatter)
        assert len(mock_root_logger.removeHandler.mock_calls) == 1
        mock_root_logger.addHandler.assert_called_once_with(mock_handler)
        mock_root_logger.setLevel.assert_called_once_with(logging.INFO)


@patch("app.service.os.getenv")
def test_settings_factory_local(mock_getenv):
    """Test _settings_factory for local environment."""
    mock_getenv.return_value = "local"
    settings = _settings_factory()
    assert isinstance(settings, LocalSettings)


@patch("app.service.os.getenv")
def test_settings_factory_qal(mock_getenv):
    """Test _settings_factory for qal environment."""
    mock_getenv.return_value = "qal"
    settings = _settings_factory()
    assert isinstance(settings, QALSettings)


@patch("app.service.os.getenv")
def test_settings_factory_e2e(mock_getenv):
    """Test _settings_factory for e2e environment."""
    mock_getenv.return_value = "e2e"
    settings = _settings_factory()
    assert isinstance(settings, E2ESettings)


@patch("app.service.os.getenv")
def test_settings_factory_prf(mock_getenv):
    """Test _settings_factory for prf environment."""
    mock_getenv.return_value = "prf"
    settings = _settings_factory()
    assert isinstance(settings, PRFSettings)


@patch("app.service.os.getenv")
def test_settings_factory_stg(mock_getenv):
    """Test _settings_factory for stg environment."""
    mock_getenv.return_value = "stg"
    settings = _settings_factory()
    assert isinstance(settings, STGSettings)


@patch("app.service.os.getenv")
def test_settings_factory_prd(mock_getenv):
    """Test _settings_factory for prd environment."""
    mock_getenv.return_value = "prd"
    settings = _settings_factory()
    assert isinstance(settings, PRDSettings)


@patch("app.service.os.getenv")
@patch("app.service.FastAPI")
@patch("app.service.get_app_kwargs")
@patch("app.service.add_health_endpoint")
@patch("app.service.add_actuator_endpoints")
@patch("app.service.configure_logger")
@patch("app.service.register_error_handlers")
@patch("app.service.expose_metrics")
@patch("app.service.lifespan_function")
def test_create_app(
    mock_lifespan_function,
    mock_expose_metrics,
    mock_register_error_handlers,
    mock_configure_logger,
    mock_add_actuator_endpoints,
    mock_add_health_endpoint,
    mock_get_app_kwargs,
    mock_fastapi,
    mock_getenv,
):
    """Test create_app function with default configuration."""
    # Setup
    mock_getenv.return_value = "local"
    mock_app = MagicMock()
    mock_fastapi.return_value = mock_app
    mock_kwargs = {"title": "Test API"}
    mock_get_app_kwargs.return_value = mock_kwargs

    mock_config = MagicMock(spec=LocalSettings)
    mock_config.expose_metrics = True

    # Mock lifespan function
    mock_lifespan = MagicMock()
    mock_lifespan_function.return_value = mock_lifespan

    # Patch the example module within the function scope
    with (
        patch("app.router.agent_router.router") as mock_agent_router,
        patch("app.router.api_router.router") as mock_api_router,
        patch("app.service.example.router") as mock_example_router,
    ):
        # Call the function with test config and mock_lifespan
        result = create_app(test_config=mock_config, lifespan=mock_lifespan)

    # Assertions
    assert result == mock_app
    mock_fastapi.assert_called_once()
    assert mock_fastapi.call_args[1]["docs_url"] == "/apidoc/swagger"
    assert mock_fastapi.call_args[1]["redoc_url"] == "/apidoc/redoc"
    assert mock_fastapi.call_args[1]["lifespan"] == mock_lifespan

    mock_configure_logger.assert_called_once_with(mock_app)
    mock_add_health_endpoint.assert_called_once_with(mock_app)
    mock_add_actuator_endpoints.assert_called_once_with(mock_app)
    mock_app.include_router.assert_called()
    # Instead of checking if BaseHTTPMiddleware was called, check if add_middleware was called on the app
    mock_app.add_middleware.assert_called_once()
    mock_register_error_handlers.assert_called_once_with(mock_app)
    mock_expose_metrics.assert_called_once_with(mock_app)


@patch("app.service.os.getenv")
@patch("app.service.FastAPI")
@patch("app.service.get_app_kwargs")
@patch("app.service.add_health_endpoint")
@patch("app.service.add_actuator_endpoints")
@patch("app.service.configure_logger")
@patch("app.service.register_error_handlers")
@patch("app.service.expose_metrics")
@patch("app.service.lifespan_function")
def test_create_app_without_metrics(
    mock_lifespan_function,
    mock_expose_metrics,
    mock_register_error_handlers,
    mock_configure_logger,
    mock_add_actuator_endpoints,
    mock_add_health_endpoint,
    mock_get_app_kwargs,
    mock_fastapi,
    mock_getenv,
):
    """Test create_app function with metrics disabled."""
    # Setup
    mock_getenv.return_value = "local"
    mock_app = MagicMock()
    mock_fastapi.return_value = mock_app
    mock_kwargs = {"title": "Test API"}
    mock_get_app_kwargs.return_value = mock_kwargs

    mock_config = MagicMock(spec=LocalSettings)
    mock_config.expose_metrics = False

    # Mock lifespan function
    mock_lifespan = MagicMock()
    mock_lifespan_function.return_value = mock_lifespan

    # Patch the example module within the function scope
    with (
        patch("app.router.agent_router.router") as mock_agent_router,
        patch("app.router.api_router.router") as mock_api_router,
        patch("app.service.example.router") as mock_example_router,
    ):
        # Call the function with test config
        result = create_app(test_config=mock_config)

    # Assertions
    assert result == mock_app
    mock_expose_metrics.assert_not_called()


@pytest.mark.asyncio
async def test_on_shutdown():
    """Test the on_shutdown function."""
    # Setup
    mock_app = MagicMock()

    # Call the function
    await on_shutdown(mock_app)

    # No assertions needed since function is just a placeholder currently
