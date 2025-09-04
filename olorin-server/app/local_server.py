import multiprocessing
import argparse
import sys

import uvicorn

from app.service.server import app
from app.service.logging.cli import add_unified_logging_arguments, normalize_logging_args
from app.service.logging.integration_bridge import configure_unified_bridge_from_args


def server(args=None):
    """Start the Olorin server with unified logging configuration."""
    # Initialize unified logging from command-line arguments
    if args:
        configure_unified_bridge_from_args(args)
    
    config = uvicorn.Config(
        app=app,
        host="127.0.0.1",  # default host
        port=8090,  # default port
        reload=True,  # equivalent to use_reloader=True
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
    
    # Show logging configuration if requested
    if hasattr(args, 'logging_stats') and args.logging_stats:
        from app.service.logging.cli import show_logging_configuration_summary
        show_logging_configuration_summary()
    
    # Update server function to accept parsed arguments
    def server_with_args():
        # Initialize unified logging from command-line arguments
        configure_unified_bridge_from_args(args)
        
        config = uvicorn.Config(
            app=app,
            host=args.host,
            port=args.port,
            reload=not args.no_reload,
        )
        server = uvicorn.Server(config)
        server.run()
    
    srv_proc = multiprocessing.Process(target=server_with_args)
    srv_proc.start()
    srv_proc.join()


if __name__ == "__main__":
    main()
