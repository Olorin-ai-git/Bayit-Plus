import argparse
import uvicorn

from app.service.logging.cli import add_unified_logging_arguments, normalize_logging_args
from app.service.logging.integration_bridge import configure_unified_bridge_from_args


def server(args=None):
    """Start the Olorin server with unified logging configuration."""
    # Initialize unified logging from command-line arguments
    if args:
        configure_unified_bridge_from_args(args)

    # Get host and port from args or use defaults
    host = getattr(args, 'host', '127.0.0.1')
    port = getattr(args, 'port', 8090)

    # Use uvicorn.run() instead of Server().run() to match CLI behavior
    uvicorn.run(
        "app.service.server:app",
        host=host,
        port=port,
        log_level="info",
        reload=True  # Enable reload for development
    )


def _run_server_process(args_dict):
    """Run server in separate process - must be module-level function for pickling."""
    # Reconstruct args from dictionary
    import argparse
    args = argparse.Namespace(**args_dict)
    
    # Re-configure logging in subprocess (multiprocessing doesn't inherit logging config)
    configure_unified_bridge_from_args(args)
    
    # Import app after logging is configured
    from app.service.server import app
    
    config = uvicorn.Config(
        app=app,
        host=args.host,
        port=args.port,
        reload=not args.no_reload,
    )
    server = uvicorn.Server(config)
    server.run()


def main():
    """Main entry point with unified logging command-line support."""
    parser = argparse.ArgumentParser(
        description='Olorin Server with Unified Logging',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    # Add server arguments
    parser.add_argument('--host', default='127.0.0.1', help='Server host (default: 127.0.0.1)')
    parser.add_argument('--port', type=int, default=8090, help='Server port (default: 8090)')
    parser.add_argument('--no-reload', action='store_true', help='Disable auto-reload')
    
    # Add unified logging arguments
    add_unified_logging_arguments(parser)
    
    # Parse arguments
    args = parser.parse_args()
    args = normalize_logging_args(args)
    
    # CRITICAL: Initialize unified logging BEFORE importing the app
    # This ensures all loggers get the correct level from the start
    configure_unified_bridge_from_args(args)
    
    # Show logging configuration if requested
    if hasattr(args, 'logging_stats') and args.logging_stats:
        from app.service.logging.cli import show_logging_configuration_summary
        show_logging_configuration_summary()
    
    # Start the server directly (no multiprocessing needed)
    server(args)


if __name__ == "__main__":
    main()
