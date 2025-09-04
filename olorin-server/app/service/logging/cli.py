"""
Unified Logging Command Line Interface

This module provides command-line argument parsing for unified logging configuration,
enabling users to configure logging behavior directly from the command line.

Author: Gil Klainert
Date: 2025-01-04
Plan: /docs/plans/2025-01-04-unified-logging-system-plan.md
"""

import argparse
import sys
from typing import Optional

from .logging_config_manager import LoggingConfigManager


def add_unified_logging_arguments(parser: argparse.ArgumentParser) -> None:
    """
    Add unified logging arguments to an argument parser.
    
    Args:
        parser: ArgumentParser instance to enhance
    """
    logging_group = parser.add_argument_group('Unified Logging Configuration')
    
    logging_group.add_argument(
        '--log-level',
        type=str,
        choices=['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'],
        help='Set logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)'
    )
    
    logging_group.add_argument(
        '--log-format',
        type=str,
        choices=['human', 'json', 'structured'],
        help='Set logging format: human (readable), json (compact), structured (detailed)'
    )
    
    logging_group.add_argument(
        '--log-output',
        type=str,
        help='Comma-separated list of outputs: console, file, json_file, structured_file'
    )
    
    logging_group.add_argument(
        '--async-logging',
        action='store_true',
        help='Enable asynchronous logging for high-volume operations'
    )
    
    logging_group.add_argument(
        '--buffer-size',
        type=int,
        help='Set buffer size for async logging (default: 1000)'
    )
    
    logging_group.add_argument(
        '--lazy-init',
        action='store_true',
        help='Enable lazy initialization of loggers'
    )
    
    logging_group.add_argument(
        '--no-lazy-init',
        action='store_true',
        help='Disable lazy initialization of loggers'
    )
    
    logging_group.add_argument(
        '--suppress-noisy',
        action='store_true',
        help='Suppress verbose third-party loggers'
    )
    
    logging_group.add_argument(
        '--no-suppress-noisy',
        action='store_true',
        help='Do not suppress third-party loggers'
    )
    
    logging_group.add_argument(
        '--performance-monitoring',
        action='store_true',
        help='Enable logging performance monitoring'
    )
    
    logging_group.add_argument(
        '--no-performance-monitoring',
        action='store_true',
        help='Disable logging performance monitoring'
    )
    
    logging_group.add_argument(
        '--logging-config',
        type=str,
        help='Path to logging configuration YAML file'
    )
    
    logging_group.add_argument(
        '--logging-stats',
        action='store_true',
        help='Show logging performance statistics on startup'
    )


def create_unified_logging_parser() -> argparse.ArgumentParser:
    """
    Create a standalone argument parser for unified logging configuration.
    
    Returns:
        Configured ArgumentParser instance
    """
    parser = argparse.ArgumentParser(
        description='Unified Logging Configuration',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python -m app.local_server --log-level DEBUG --log-format structured
  python -m app.local_server --log-output "console,file" --async-logging
  python -m app.local_server --logging-config config/custom_logging.yaml
  python -m app.local_server --logging-stats --performance-monitoring

Log Formats:
  human      - Human-readable format for development
  json       - Compact JSON format for production
  structured - Detailed structured format with metadata

Log Outputs:
  console          - Console/terminal output
  file            - Rotating file logs (logs/olorin_server.log)
  json_file       - JSON format file logs (logs/olorin_server.json)
  structured_file - Structured format file logs (logs/olorin_structured.log)

Configuration Priority (highest to lowest):
  1. Command-line arguments
  2. Environment variables (OLORIN_LOG_*)
  3. YAML configuration file
  4. Default settings
        """
    )
    
    add_unified_logging_arguments(parser)
    return parser


def parse_logging_args(args: Optional[list] = None) -> argparse.Namespace:
    """
    Parse command-line arguments for unified logging configuration.
    
    Args:
        args: List of arguments to parse (defaults to sys.argv)
        
    Returns:
        Parsed arguments namespace
    """
    parser = create_unified_logging_parser()
    return parser.parse_args(args)


def normalize_logging_args(args: argparse.Namespace) -> argparse.Namespace:
    """
    Normalize parsed arguments for unified logging configuration.
    
    This function handles argument conflicts and converts string values
    to appropriate types for the logging configuration manager.
    
    Args:
        args: Parsed arguments namespace
        
    Returns:
        Normalized arguments namespace
    """
    # Handle boolean conflicts
    if hasattr(args, 'lazy_init') and hasattr(args, 'no_lazy_init'):
        if args.no_lazy_init:
            args.lazy_init = False
        elif args.lazy_init:
            args.lazy_init = True
        else:
            args.lazy_init = None
            
    if hasattr(args, 'suppress_noisy') and hasattr(args, 'no_suppress_noisy'):
        if args.no_suppress_noisy:
            args.suppress_noisy = False
        elif args.suppress_noisy:
            args.suppress_noisy = True
        else:
            args.suppress_noisy = None
            
    if hasattr(args, 'performance_monitoring') and hasattr(args, 'no_performance_monitoring'):
        if args.no_performance_monitoring:
            args.performance_monitoring = False
        elif args.performance_monitoring:
            args.performance_monitoring = True
        else:
            args.performance_monitoring = None
    
    return args


def show_logging_configuration_summary():
    """Show current logging configuration summary."""
    try:
        config_manager = LoggingConfigManager()
        summary = config_manager.get_configuration_summary()
        
        print("\n" + "="*60)
        print("UNIFIED LOGGING CONFIGURATION SUMMARY")
        print("="*60)
        
        config = summary['configuration']
        print(f"Log Level:              {config['log_level']}")
        print(f"Log Format:             {config['log_format']}")
        print(f"Log Outputs:            {', '.join(config['log_outputs'])}")
        print(f"Async Logging:          {config['async_logging']}")
        print(f"Buffer Size:            {config['buffer_size']}")
        print(f"Lazy Initialization:    {config['lazy_initialization']}")
        print(f"Suppress Noisy:         {config['suppress_noisy_loggers']}")
        print(f"Performance Monitor:    {config['performance_monitoring']}")
        
        print(f"\nConfiguration Sources:")
        sources = summary['sources']
        print(f"Config File:            {sources['config_file']}")
        
        if sources['environment_variables']:
            print(f"Environment Variables:  {', '.join(sources['environment_variables'])}")
        else:
            print(f"Environment Variables:  None")
            
        if sources['command_line_args']:
            print(f"Command Line Args:      Available")
        else:
            print(f"Command Line Args:      None")
            
        print(f"Validation Status:      {summary['validation_status']}")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"Error showing logging configuration: {e}")


if __name__ == "__main__":
    # Standalone CLI for testing logging configuration
    args = parse_logging_args()
    args = normalize_logging_args(args)
    
    if args.logging_stats:
        show_logging_configuration_summary()
    
    print("Unified logging configuration parsed successfully!")
    print(f"Arguments: {vars(args)}")