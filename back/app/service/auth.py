import logging

from fastapi import Depends, Request
from typing_extensions import Annotated

from .config import LocalSettings, SvcSettings, get_settings
from .error_handling import AuthorizationError

logger = logging.getLogger(__name__)


# Routes that are allowed outside of mesh
MESH_SKIPPED_ROUTES = {
    "/health/full",
    "/actuator/loggers/ROOT",
    "/actuator/threaddump",
    "/metrics",
    "/api/demo/{user_id}",  # Allow demo endpoint without mesh auth
    "/api/demo/{user_id}/off",  # Allow demo endpoint without mesh auth
    "/api/demo/{user_id}/all",  # Allow demo endpoint without mesh auth
}


async def check_route_allowed(
    request: Request, settings: Annotated[SvcSettings, Depends(get_settings)]
) -> None:
    """
    Raises an AuthorizationError if the route is not allowed.
    """
    # Bypass for local development
    if isinstance(settings, LocalSettings):
        return
    # X-Forwarded-Port header indicates the port on which Nginx received request.
    forwarded_port = request.headers.get("X-Forwarded-Port")
    if forwarded_port and int(forwarded_port) == settings.mesh_port:
        return

    path = request.url.path
    # Kubernetes health checks must be allowed outside of mesh
    if path in MESH_SKIPPED_ROUTES:
        return

    raise AuthorizationError("This route requires Service Mesh for auth")
