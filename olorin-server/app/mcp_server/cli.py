"""CLI for running the Olorin MCP Server."""

import argparse
import asyncio
import os
import sys
from pathlib import Path

from .config import MCPConfig
from .server import OlorinMCPServer


def setup_environment():
    """Setup environment for the MCP server."""
    # Add the project root to Python path
    project_root = Path(__file__).parent.parent.parent
    sys.path.insert(0, str(project_root))


def create_parser() -> argparse.ArgumentParser:
    """Create command line argument parser."""
    parser = argparse.ArgumentParser(
        description="Olorin MCP Server - Provides LangGraph agents and LangChain tools via MCP"
    )

    # Configuration options
    parser.add_argument(
        "--config-from-env",
        action="store_true",
        help="Load configuration from environment variables",
    )

    # Server options
    parser.add_argument(
        "--server-name", default="olorin-mcp-server", help="Name of the MCP server"
    )

    parser.add_argument(
        "--server-version", default="1.0.0", help="Version of the MCP server"
    )

    # Tool options
    parser.add_argument(
        "--enable-database-tools", action="store_true", help="Enable database tools"
    )

    parser.add_argument(
        "--database-connection-string", help="Database connection string"
    )

    parser.add_argument(
        "--disable-web-tools",
        action="store_true",
        help="Disable web search and scraping tools",
    )

    parser.add_argument(
        "--disable-file-system-tools",
        action="store_true",
        help="Disable file system tools",
    )

    parser.add_argument(
        "--file-system-base-path",
        help="Base path for file system operations (restricts access)",
    )

    parser.add_argument(
        "--disable-api-tools", action="store_true", help="Disable API tools"
    )

    # Agent options
    parser.add_argument(
        "--disable-agents",
        action="store_true",
        help="Disable LangGraph agent resources",
    )

    # Logging options
    parser.add_argument(
        "--log-level",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        default="INFO",
        help="Logging level",
    )

    parser.add_argument(
        "--transport", default="stdio://", help="Transport URI (default: stdio://)"
    )

    return parser


def main():
    """Main entry point."""
    setup_environment()

    parser = create_parser()
    args = parser.parse_args()

    try:
        # Create configuration
        if args.config_from_env:
            config = MCPConfig.from_env()
        else:
            config = MCPConfig(
                server_name=args.server_name,
                server_version=args.server_version,
                enable_database_tools=args.enable_database_tools,
                database_connection_string=args.database_connection_string,
                enable_web_tools=not args.disable_web_tools,
                enable_file_system_tools=not args.disable_file_system_tools,
                file_system_base_path=args.file_system_base_path,
                enable_api_tools=not args.disable_api_tools,
                enable_agents=not args.disable_agents,
                log_level=args.log_level,
            )

        # Create and run server
        server = OlorinMCPServer(config)

        # Print server info
        info = server.get_server_info()
        print(f"Starting {info['name']} v{info['version']}", file=sys.stderr)
        print(f"Description: {info['description']}", file=sys.stderr)
        print(
            f"Enabled categories: {', '.join(info['enabled_categories'])}",
            file=sys.stderr,
        )
        print(f"Transport: {args.transport}", file=sys.stderr)
        print("", file=sys.stderr)

        # Run the server
        asyncio.run(server.run(args.transport))

    except KeyboardInterrupt:
        print("\nShutting down server...", file=sys.stderr)
        sys.exit(0)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
