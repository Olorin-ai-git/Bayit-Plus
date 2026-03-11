"""
Local dev launcher for the Bayit+ WebSocket Gateway.

Replicates the Docker overlay strategy: patches the gateway's main.py and
router_registry.py into the backend's app module, then starts uvicorn.

Must be run from the backend/ directory with the backend's Poetry venv active.

Usage:
    cd backend && poetry run python ../scripts/start-ws-gateway.py --port 8001
"""

import argparse
import importlib.util
import os
import sys


def patch_module(module_name: str, file_path: str):
    """Load a Python file and inject it into sys.modules under the given name."""
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


def main():
    parser = argparse.ArgumentParser(description="Start WS gateway locally")
    parser.add_argument("--port", type=int, default=8001)
    parser.add_argument(
        "--gateway-dir",
        default=os.path.join(os.path.dirname(__file__), "..", "bayit-ws-gateway"),
    )
    args = parser.parse_args()

    gateway_dir = os.path.abspath(args.gateway_dir)

    # Use shorter connect timeout so the driver quickly skips unreachable
    # Atlas shards and falls back to reachable ones (default 30s is too long
    # when a specific shard is network-unreachable locally).
    os.environ.setdefault("MONGODB_CONNECT_TIMEOUT_MS", "5000")
    os.environ.setdefault("MONGODB_SERVER_SELECTION_TIMEOUT_MS", "10000")

    # Add CWD (backend/) to sys.path so the app package is importable
    backend_dir = os.getcwd()
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)

    # Ensure the backend's app package is loaded first (needed by gateway imports)
    import app  # noqa: F401
    import app.core.config  # noqa: F401
    import app.api  # noqa: F401

    # Patch the gateway's router_registry before importing main
    registry_path = os.path.join(gateway_dir, "app", "api", "router_registry.py")
    patch_module("app.api.router_registry", registry_path)

    # Patch the gateway's main.py
    main_path = os.path.join(gateway_dir, "app", "main.py")
    gateway_main = patch_module("app.ws_gateway_main", main_path)

    import uvicorn

    uvicorn.run(
        gateway_main.app,
        host="0.0.0.0",
        port=args.port,
        log_level=os.getenv("LOG_LEVEL", "warning").lower(),
    )


if __name__ == "__main__":
    main()
