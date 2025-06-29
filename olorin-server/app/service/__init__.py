import logging
import os
import uuid
from typing import Callable, Optional

from fastapi import Depends, FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

# from pskgenos import add_genos_endpoints
try:
    from pskhealth import add_health_endpoint, lifespan_function
except ImportError:
    # Fallback for when pskhealth is not available (e.g., in tests)
    def add_health_endpoint(app):
        pass

    lifespan_function = None

# from pskmetrics import PSKMetrics
# from pskopenapi.fastapi_ import get_app_kwargs
# from pskhealth import add_health_endpoint, lifespan_function
# from pskmetrics import PSKMetrics
# from pskopenapi.fastapi_ import get_app_kwargs
from starlette.middleware.base import BaseHTTPMiddleware

from .auth import check_route_allowed
from .config import (
    E2ESettings,
    LocalSettings,
    PRDSettings,
    PRFSettings,
    QALSettings,
    STGSettings,
    SvcSettings,
    ServiceConfig,
    default_config,
)
from .error_handling import register_error_handlers
from .logging_helper import RequestFormatter, logging_context

# from pskactuator import add_actuator_endpoints


# from pskactuator import add_actuator_endpoints


logger = logging.getLogger(__name__)
module_name = "olorin"
service_name = "olorin"

# Dummy lifespan_function for test patching
lifespan_function = None


async def inject_transaction_id(request: Request, call_next: Callable) -> Response:
    """Middleware that Injects Intuit TID into the request & response

    Something to note is that Gateway automatically injects a tid if there isn't one,
    but it doesn't use UUIDs, it seems to use Amazons Trace ID, which looks like
    '1-61c4fe1f-515d47eb73b71369335f8225'. This has caused issues in the past if you
    assume tid will be a UUID. Consider it a string with any characters allowed.
    """
    # based on https://github.intuit.com/global-core/global-content-service/blob/master/app/api/middleware.py
    intuit_tid = request.headers.get("intuit_tid", str(uuid.uuid4()))
    request.state.intuit_tid = intuit_tid
    with logging_context(intuit_tid=intuit_tid):
        response: Response = await call_next(request)
        response.headers["intuit_tid"] = intuit_tid
        return response


def configure_logger(app):
    handler = logging.StreamHandler()
    formatter = RequestFormatter(
        "[%(asctime)s] %(levelname)s [%(context)s] module=%(module)s: %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S%z",
    )
    handler.setFormatter(formatter)
    level = getattr(logging, app.state.config.log_level.upper())

    # see logs from other libraries
    root = logging.getLogger()
    # remove handlers created by libraries e.g. mlctl
    # copy the list because this mutates it
    for h in root.handlers[:]:
        root.removeHandler(h)
    root.addHandler(handler)
    root.setLevel(level)


_ENV_SETTINGS = {
    "local": LocalSettings,
    "qal": QALSettings,
    "e2e": E2ESettings,
    "prf": PRFSettings,
    "stg": STGSettings,
    "prd": PRDSettings,
}


def _settings_factory() -> SvcSettings:
    env = os.getenv("APP_ENV", "local")
    return _ENV_SETTINGS[env]()


# psk_metrics = PSKMetrics()
# psk_metrics.expose(app)
def expose_metrics(app):
    pass


async def on_startup(app: FastAPI):
    """
    This function is a co-routine and takes only one required argument app.
    It executes at the time of startup of the application.
    Tasks such as establishing a database connection or loading a ML model can be performed here.

    Args:
        app(FastAPI): FastAPI app object.

    Example:
        Create Mongo client during the application startup.

        >>> async def on_startup(app: FastAPI):
        ...     app.state.client = pymongo.MongoClient()
    """
    # Initialize the graph and add a route
    from .agent_init import initialize_agent

    await initialize_agent(app)


async def on_shutdown(app: FastAPI):
    """
    This function is a co-routine and takes only one required argument app.
    It executes at the time of shutdown of the application.
    Tasks such as closing database connection can be performed here.

    Args:
        app(FastAPI): FastAPI app object.

    Example:
        Disconnect from the Mongo client during the application shutdown.

        >>> async def on_shutdown(app: FastAPI):
        ...     app.state.client.close()
    """
    pass


class OlorinApplication:
    """
    Central application orchestrator for Olorin Fraud Detection System.
    Encapsulates agent coordination, risk assessment, and exposes the FastAPI app.
    """

    def __init__(
        self,
        test_config: Optional[SvcSettings] = None,
        lifespan: Optional[Callable] = None,
    ):
        self.config: SvcSettings = (
            _settings_factory() if test_config is None else test_config
        )
        self.lifespan = lifespan
        self.app = self._create_fastapi_app()
        self._configure_app()

    def _create_fastapi_app(self) -> FastAPI:
        async def default_lifespan(app: FastAPI):
            await on_startup(app)
            yield
            await on_shutdown(app)

        app = FastAPI(
            title=service_name,
            description="""TODO: Add description here
            The description SHOULD include a summary of the API, and the key use cases that the API solves.
            Example: https://github.intuit.com/services-java/jsk-v4-service-initializr/blob/8c1d88f60e6fcafea0bc1dc01ba6995462332960/initializr-generator/src/main/resources/templates/spring-mvc-starter/api/openapi/openapi.yaml#L11
            """,
            docs_url="/apidoc/swagger",
            redoc_url="/apidoc/redoc",
            dependencies=[Depends(check_route_allowed)],
            contact={"url": "https://api.contact.info.intuit.com"},
            openapi_tags=[{"name": "example", "description": "Example API endpoints"}],
            lifespan=self.lifespan or default_lifespan,
        )
        return app

    def _configure_app(self):
        app = self.app
        app.state.config = self.config
        configure_logger(app)
        logger.info(f"config: {self.config}")

        from app.router import agent_router, api_router

        from . import example

        app.include_router(example.router)
        app.include_router(agent_router.router)
        app.include_router(api_router.router)

        # Add Intuit TID middleware
        from starlette.middleware.base import BaseHTTPMiddleware

        app.add_middleware(BaseHTTPMiddleware, dispatch=inject_transaction_id)

        # Register error handlers and health/actuator endpoints
        register_error_handlers(app)
        add_health_endpoint(app)
        add_actuator_endpoints(app)

        # Expose metrics if enabled in config
        if getattr(self.config, "expose_metrics", False):
            expose_metrics(app)
            logger.info("Exposed app metrics")

        @app.get("/health")
        async def health_check():
            return {"status": "healthy"}

        @app.get("/health/full")
        async def health_full():
            return {"status": "ok"}

        @app.get("/version")
        async def version():
            return {
                "version": os.environ.get("OLORIN_VERSION", "unknown"),
                "git_sha": os.environ.get("OLORIN_GIT_SHA", "unknown"),
            }


def create_app(config: Optional[SvcSettings] = None) -> FastAPI:
    """Create and configure the Olorin FastAPI application."""
    olorin_app = OlorinApplication(test_config=config)
    return olorin_app.app


# Dummy implementations for test patching


def expose_metrics(app):
    pass


def add_actuator_endpoints(app):
    pass


def get_app_kwargs():
    return {}


def get_app_kwargs(*args, **kwargs):
    return {}
