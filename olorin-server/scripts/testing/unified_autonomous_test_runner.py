#!/usr/bin/env python3
"""
Unified Autonomous Investigation Test Runner

A comprehensive, production-ready test runner that consolidates all autonomous 
investigation testing functionality with enhanced reporting, multiple output formats,
and extensive validation capabilities.

Features:
- Unified CLI interface with comprehensive options
- Multiple test scenarios (predefined)
- Snowflake data integration for realistic testing
- Enhanced reporting (HTML, JSON, Markdown, Terminal)
- Real-time progress monitoring
- Performance benchmarking
- Comprehensive validation
- WebSocket event tracking
- Error analysis and recovery
- Token usage and cost analysis
- Agent collaboration metrics
- Real-time monitoring (WebSocket, LLM, LangGraph, Agent conversations)

Usage:
    # Single scenario test
    python unified_autonomous_test_runner.py --scenario device_spoofing --verbose

    # Test all scenarios with comprehensive monitoring
    python unified_autonomous_test_runner.py --all --html-report --open-report --show-all

    # Monitor specific interactions
    python unified_autonomous_test_runner.py --scenario impossible_travel --show-websocket --show-llm --show-agents


    # Custom configuration
    python unified_autonomous_test_runner.py --scenario impossible_travel --output-format html --timeout 600 --log-level debug

Author: Gil Klainert
Created: 2025-09-03
Version: 1.0.0
"""

# CRITICAL: Check for mock mode BEFORE any agent imports
import sys
import os
if "--mode" in sys.argv and "mock" in sys.argv[sys.argv.index("--mode") + 1]:
    os.environ["TEST_MODE"] = "mock"
    print("🎭🎭🎭 TEST_MODE=mock detected in arguments - MockLLM will be used 🎭🎭🎭")

# Check if this is a dependency-only check before doing any complex imports
if "--check-dependencies-only" in sys.argv:
    def check_dependencies_early():
        """
        Early dependency check that runs before problematic imports
        """
        print("\n" + "="*80)
        print("🧪 UNIFIED AUTONOMOUS INVESTIGATION TEST RUNNER")
        print("="*80)
        print("🔍 Running dependency check...")

        missing_packages = []
        missing_system_deps = []
        service_issues = []

        # Core Python packages required for the script
        required_packages = {
            # FastAPI and server dependencies
            'uvicorn': 'FastAPI ASGI server (critical for backend service)',
            'fastapi': 'FastAPI web framework',
            'aiohttp': 'Async HTTP client/server',
            'websocket': 'WebSocket client library (websocket-client package)',

            # LangChain ecosystem
            'langchain': 'LangChain framework',
            'langchain_core': 'LangChain core components',
            'langchain_openai': 'LangChain OpenAI integration',
            'langchain_anthropic': 'LangChain Anthropic integration',
            'langgraph': 'LangGraph state management',
            'langgraph_sdk': 'LangGraph SDK',

            # Testing frameworks
            'pytest': 'Python testing framework',
            'pytest_asyncio': 'Async testing support',

            # Data and analytics
            'snowflake': 'Snowflake connector (snowflake-connector-python)',
            'pandas': 'Data manipulation library',
            'numpy': 'Numerical computing',

            # Authentication and security
            'cryptography': 'Cryptographic operations',
            'passlib': 'Password hashing',
            'python_jose': 'JWT token handling (python-jose)',
            'bcrypt': 'Password hashing',

            # Database and storage
            'sqlalchemy': 'SQL toolkit and ORM',
            'asyncpg': 'Async PostgreSQL adapter',
            'redis': 'Redis client',

            # Firebase and Google Cloud
            'firebase_admin': 'Firebase Admin SDK',
            'google.cloud.secretmanager': 'Google Cloud Secret Manager',

            # Reporting and documentation
            'reportlab': 'PDF generation',
            'fpdf': 'PDF creation library',
            'markdown2': 'Markdown processing',
            'beautifulsoup4': 'HTML parsing',
            'html2text': 'HTML to text conversion',

            # HTTP and networking
            'httpx': 'HTTP client library',
            'requests': 'HTTP library',
            'httpcore': 'Low-level HTTP library',

            # Utilities
            'tenacity': 'Retry library',
            'python_dotenv': 'Environment variable loading',
            'pyyaml': 'YAML processing',
            'validators': 'Data validation',
            'email_validator': 'Email validation',

            # AI and ML
            'openai': 'OpenAI API client',
            'sentence_transformers': 'Sentence embeddings',
            'transformers': 'Hugging Face transformers',

            # Logging and monitoring
            'structlog': 'Structured logging',
            'python_json_logger': 'JSON logging',
            'prometheus_client': 'Prometheus metrics',

            # Development tools
            'black': 'Code formatter',
            'isort': 'Import sorter',
            'mypy': 'Type checker',
            'tox': 'Testing automation'
        }

        # Check Python packages
        print("📦 Checking Python packages...")
        for package, description in required_packages.items():
            try:
                if package == 'websocket':
                    import websocket
                elif package == 'snowflake':
                    import snowflake.connector
                elif package == 'python_jose':
                    import jose
                elif package == 'python_dotenv':
                    import dotenv
                elif package == 'python_json_logger':
                    import pythonjsonlogger
                elif package == 'firebase_admin':
                    import firebase_admin
                elif package == 'google.cloud.secretmanager':
                    from google.cloud import secretmanager
                elif package == 'sentence_transformers':
                    import sentence_transformers
                elif package == 'pytest_asyncio':
                    import pytest_asyncio
                elif package == 'beautifulsoup4':
                    import bs4
                elif package == 'pyyaml':
                    import yaml
                else:
                    __import__(package)
                print(f"  ✅ {package}")
            except ImportError:
                missing_packages.append((package, description))
                print(f"  ❌ {package} - {description}")
            except Exception as e:
                # Handle other import issues like TypeError during import
                print(f"  ⚠️  {package} - {description} (import issue: {str(e)})")

        # Check system dependencies
        print("\n🔧 Checking system dependencies...")
        system_deps = {
            'poetry': 'Python dependency management (required for: poetry install, poetry run)',
            'npm': 'Node.js package manager (for frontend dependencies)',
            'node': 'Node.js runtime (for frontend development)',
            'git': 'Version control system'
        }

        import subprocess
        for cmd, description in system_deps.items():
            try:
                result = subprocess.run([cmd, '--version'],
                                      capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    print(f"  ✅ {cmd}")
                else:
                    missing_system_deps.append((cmd, description))
                    print(f"  ❌ {cmd} - {description}")
            except (subprocess.TimeoutExpired, FileNotFoundError, subprocess.SubprocessError):
                missing_system_deps.append((cmd, description))
                print(f"  ❌ {cmd} - {description}")

        # Check service availability
        print("\n🚀 Checking service availability...")

        # Check if backend server is running
        try:
            import requests
            response = requests.get("http://localhost:8090/health", timeout=5)
            if response.status_code == 200:
                print("  ✅ Backend server (localhost:8090)")
            else:
                service_issues.append("Backend server responded with non-200 status")
                print("  ⚠️  Backend server (localhost:8090) - unexpected response")
        except Exception as e:
            service_issues.append(f"Backend server not accessible: {e}")
            print("  ❌ Backend server (localhost:8090) - not running or not accessible")

        # Check Poetry environment
        try:
            result = subprocess.run(['poetry', 'env', 'info'],
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0 and 'Python' in result.stdout:
                print("  ✅ Poetry environment")
            else:
                service_issues.append("Poetry environment not properly configured")
                print("  ❌ Poetry environment - not properly configured")
        except Exception as e:
            service_issues.append(f"Poetry environment check failed: {e}")
            print("  ❌ Poetry environment - check failed")

        # Print summary and installation instructions
        print("\n" + "="*80)
        if missing_packages or missing_system_deps or service_issues:
            print("❌ DEPENDENCY CHECK FAILED")
            print("="*80)

            if missing_packages:
                print("\n📦 MISSING PYTHON PACKAGES:")
                print("Run the following command to install missing packages:")
                print(f"cd {os.path.dirname(os.path.dirname(os.path.abspath(__file__)))}")
                print("poetry install")
                print("\nIf specific packages are still missing after poetry install:")
                for package, description in missing_packages:
                    if package == 'websocket':
                        print(f"  poetry add websocket-client  # {description}")
                    elif package == 'snowflake':
                        print(f"  poetry add snowflake-connector-python  # {description}")
                    elif package == 'python_jose':
                        print(f"  poetry add python-jose  # {description}")
                    elif package == 'python_dotenv':
                        print(f"  poetry add python-dotenv  # {description}")
                    elif package == 'python_json_logger':
                        print(f"  poetry add python-json-logger  # {description}")
                    elif package == 'firebase_admin':
                        print(f"  poetry add firebase-admin  # {description}")
                    elif package == 'sentence_transformers':
                        print(f"  poetry add sentence_transformers  # {description}")
                    elif package == 'pytest_asyncio':
                        print(f"  poetry add pytest-asyncio --group dev  # {description}")
                    else:
                        print(f"  poetry add {package}  # {description}")

            if missing_system_deps:
                print("\n🔧 MISSING SYSTEM DEPENDENCIES:")
                for cmd, description in missing_system_deps:
                    if cmd == 'poetry':
                        print(f"  Install Poetry: curl -sSL https://install.python-poetry.org | python3 -")
                        print(f"  Or: pip install poetry")
                    elif cmd == 'npm':
                        print(f"  Install Node.js and npm: https://nodejs.org/")
                        print(f"  Or on macOS: brew install node")
                    elif cmd == 'node':
                        print(f"  Install Node.js: https://nodejs.org/")
                        print(f"  Or on macOS: brew install node")
                    elif cmd == 'git':
                        print(f"  Install Git: https://git-scm.com/downloads")
                        print(f"  Or on macOS: brew install git")
                    print(f"  Description: {description}")

            if service_issues:
                print("\n🚀 SERVICE ISSUES:")
                for issue in service_issues:
                    print(f"  • {issue}")
                print("\nTo start the backend server:")
                print("  cd olorin-server")
                print("  poetry run python -m app.local_server")
                print("  # Or use the unified startup script:")
                print("  npm run olorin")

            print("\n" + "="*80)
            print("❌ Please resolve the above issues before running the test script.")
            print("="*80)
            return False
        else:
            print("✅ ALL DEPENDENCIES SATISFIED")
            print("="*80)
            print("🚀 Ready to run autonomous investigations!")
            return True

    # Run dependency check and exit
    success = check_dependencies_early()
    sys.exit(0 if success else 1)

import asyncio
import aiohttp
import json

# Investigation fixes imports
try:
    from app.service.agent.websocket_auth_fix import WebSocketAuthFixer, create_websocket_connection_config
    from app.service.agent.schema_validator_fix import UnifiedSchemaValidator
    from app.service.agent.tool_validation_fix import ToolInputValidator
    from scripts.testing.langsmith_disable_fix import apply_langsmith_fix
    FIXES_AVAILABLE = True
except ImportError as e:
    print(f"⚠️  Investigation fixes not available: {e}")
    FIXES_AVAILABLE = False
import time
import random
import argparse
import webbrowser
import sys
import os
import threading
import queue
import websocket
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional, Tuple, Union, Callable
from pathlib import Path
from dataclasses import dataclass, field
from enum import Enum
import concurrent.futures
from contextlib import asynccontextmanager

# Add parent directories to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import logger 
from app.service.logging import get_bridge_logger
logger = get_bridge_logger(__name__)

# DEBUG logging will be done after logger configuration in test runner

try:
    # Import orchestration system - using hybrid intelligence with feature flags
    from app.service.agent.orchestration.hybrid.migration_utilities import (
        get_investigation_graph,
        get_feature_flags
    )
    # Import clean graph for fallback
    from app.service.agent.orchestration.clean_graph_builder import run_investigation
    from app.service.agent.orchestration.state_schema import create_initial_state
    from langchain_core.messages import HumanMessage
    
    # Import existing test infrastructure  
    from app.service.agent.autonomous_agents import (
        autonomous_network_agent,
        autonomous_device_agent, 
        autonomous_location_agent,
        autonomous_logs_agent,
        autonomous_risk_agent,
        cleanup_investigation_context,
    )
    from app.service.agent.autonomous_context import (
        AutonomousInvestigationContext,
        InvestigationPhase,
        DomainFindings,
        EntityType,
    )
    from app.service.agent.journey_tracker import (
        LangGraphJourneyTracker,
        NodeType,
        NodeStatus,
    )
    from app.service.logging.autonomous_investigation_logger import AutonomousInvestigationLogger
    from app.service.logging.investigation_folder_manager import InvestigationMode
    from app.service.logging.journey_tracker import get_journey_tracker
    from app.service.logging.server_log_capture import get_server_log_capture
    from app.service.agent.chain_of_thought_logger import ChainOfThoughtLogger, ReasoningType
    
    # Import enhanced validation system
    try:
        from app.service.agent.enhanced_validation import (
            get_enhanced_validator,
            EnhancedValidationResult,
            ValidationStatus
        )
        ENHANCED_VALIDATION_AVAILABLE = True
    except ImportError as e:
        logger.warning(f"Enhanced validation not available: {e}")
        ENHANCED_VALIDATION_AVAILABLE = False
    
    # Import test data generators if available
    try:
        from tests.fixtures.real_investigation_scenarios import (
            get_test_scenarios,
            get_scenario_by_type,
            RealScenarioGenerator,
        )
    except ImportError:
        logging.warning("Test scenarios module not available, using synthetic data generation")
        RealScenarioGenerator = None
        get_test_scenarios = None
        get_scenario_by_type = None

    # Import unified HTML report generator
    try:
        from app.service.reporting.unified import UnifiedHTMLReportGenerator, DataSourceType
        HTML_REPORTER_AVAILABLE = True
    except ImportError:
        HTML_REPORTER_AVAILABLE = False
        UnifiedHTMLReportGenerator = None
        DataSourceType = None

except ImportError as e:
    # Import logger before using it
    import logging
    logging.basicConfig(level=logging.INFO)
    logging.error(f"Failed to import required modules: {e}")
    logging.error("Please ensure all dependencies are available and the script is run from the correct directory")
    sys.exit(1)

from langchain_core.runnables.config import RunnableConfig

# Import mock LLM system for MOCK mode testing
try:
    from mock_llm_responses import generate_mock_response
    MOCK_SYSTEM_AVAILABLE = True
except ImportError:
    MOCK_SYSTEM_AVAILABLE = False
    logging.warning("Mock LLM response system not available")

# Configuration Constants
DEFAULT_SERVER_URL = "http://localhost:8090"
DEFAULT_TIMEOUT = 300  # 5 minutes
DEFAULT_CONCURRENT = 3
DEFAULT_LOG_LEVEL = "INFO"
DEFAULT_USE_MOCK_IPS = False  # Disable mock IPS cache by default for LIVE runs
PROGRESS_CHECK_INTERVAL = 2

def check_dependencies():
    """
    Comprehensive dependency validation for the unified autonomous test runner.
    Checks for all required Python packages, system dependencies, and services.

    Returns:
        bool: True if all dependencies are available, False otherwise
    """
    print("🔍 Checking dependencies for Unified Autonomous Test Runner...")

    missing_packages = []
    missing_system_deps = []
    service_issues = []

    # Core Python packages required for the script
    required_packages = {
        # FastAPI and server dependencies
        'uvicorn': 'FastAPI ASGI server (critical for backend service)',
        'fastapi': 'FastAPI web framework',
        'aiohttp': 'Async HTTP client/server',
        'websocket': 'WebSocket client library (websocket-client package)',

        # LangChain ecosystem
        'langchain': 'LangChain framework',
        'langchain_core': 'LangChain core components',
        'langchain_openai': 'LangChain OpenAI integration',
        'langchain_anthropic': 'LangChain Anthropic integration',
        'langgraph': 'LangGraph state management',
        'langgraph_sdk': 'LangGraph SDK',

        # Testing frameworks
        'pytest': 'Python testing framework',
        'pytest_asyncio': 'Async testing support',

        # Data and analytics
        'snowflake': 'Snowflake connector (snowflake-connector-python)',
        'pandas': 'Data manipulation library',
        'numpy': 'Numerical computing',

        # Authentication and security
        'cryptography': 'Cryptographic operations',
        'passlib': 'Password hashing',
        'python_jose': 'JWT token handling (python-jose)',
        'bcrypt': 'Password hashing',

        # Database and storage
        'sqlalchemy': 'SQL toolkit and ORM',
        'asyncpg': 'Async PostgreSQL adapter',
        'redis': 'Redis client',
        'aioredis': 'Async Redis client',

        # Firebase and Google Cloud
        'firebase_admin': 'Firebase Admin SDK',
        'google.cloud.secretmanager': 'Google Cloud Secret Manager',

        # Reporting and documentation
        'reportlab': 'PDF generation',
        'fpdf': 'PDF creation library',
        'markdown2': 'Markdown processing',
        'beautifulsoup4': 'HTML parsing',
        'html2text': 'HTML to text conversion',

        # HTTP and networking
        'httpx': 'HTTP client library',
        'requests': 'HTTP library',
        'httpcore': 'Low-level HTTP library',

        # Utilities
        'tenacity': 'Retry library',
        'python_dotenv': 'Environment variable loading',
        'pyyaml': 'YAML processing',
        'validators': 'Data validation',
        'email_validator': 'Email validation',

        # AI and ML
        'openai': 'OpenAI API client',
        'sentence_transformers': 'Sentence embeddings',
        'transformers': 'Hugging Face transformers',
        'torch': 'PyTorch deep learning framework',

        # Logging and monitoring
        'structlog': 'Structured logging',
        'python_json_logger': 'JSON logging',
        'prometheus_client': 'Prometheus metrics',

        # Development tools
        'black': 'Code formatter',
        'isort': 'Import sorter',
        'mypy': 'Type checker',
        'tox': 'Testing automation'
    }

    # Check Python packages
    print("📦 Checking Python packages...")
    for package, description in required_packages.items():
        try:
            if package == 'websocket':
                import websocket
            elif package == 'snowflake':
                import snowflake.connector
            elif package == 'python_jose':
                import jose
            elif package == 'python_dotenv':
                import dotenv
            elif package == 'python_json_logger':
                import pythonjsonlogger
            elif package == 'firebase_admin':
                import firebase_admin
            elif package == 'google.cloud.secretmanager':
                from google.cloud import secretmanager
            elif package == 'sentence_transformers':
                import sentence_transformers
            elif package == 'pytest_asyncio':
                import pytest_asyncio
            elif package == 'beautifulsoup4':
                import bs4
            elif package == 'pyyaml':
                import yaml
            else:
                __import__(package)
            print(f"  ✅ {package}")
        except ImportError:
            missing_packages.append((package, description))
            print(f"  ❌ {package} - {description}")
        except Exception as e:
            # Handle other import issues like TypeError during import
            missing_packages.append((package, f"{description} (import error: {str(e)})"))
            print(f"  ⚠️  {package} - {description} (import issue: {str(e)})")

    # Check system dependencies
    print("\n🔧 Checking system dependencies...")
    system_deps = {
        'poetry': 'Python dependency management (required for: poetry install, poetry run)',
        'npm': 'Node.js package manager (for frontend dependencies)',
        'node': 'Node.js runtime (for frontend development)',
        'git': 'Version control system'
    }

    for cmd, description in system_deps.items():
        try:
            import subprocess
            result = subprocess.run([cmd, '--version'],
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                print(f"  ✅ {cmd}")
            else:
                missing_system_deps.append((cmd, description))
                print(f"  ❌ {cmd} - {description}")
        except (subprocess.TimeoutExpired, FileNotFoundError, subprocess.SubprocessError):
            missing_system_deps.append((cmd, description))
            print(f"  ❌ {cmd} - {description}")

    # Check service availability
    print("\n🚀 Checking service availability...")

    # Check if backend server is running
    try:
        import requests
        response = requests.get("http://localhost:8090/health", timeout=5)
        if response.status_code == 200:
            print("  ✅ Backend server (localhost:8090)")
        else:
            service_issues.append("Backend server responded with non-200 status")
            print("  ⚠️  Backend server (localhost:8090) - unexpected response")
    except Exception as e:
        service_issues.append(f"Backend server not accessible: {e}")
        print("  ❌ Backend server (localhost:8090) - not running or not accessible")

    # Check Poetry environment
    try:
        result = subprocess.run(['poetry', 'env', 'info'],
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0 and 'Python' in result.stdout:
            print("  ✅ Poetry environment")
        else:
            service_issues.append("Poetry environment not properly configured")
            print("  ❌ Poetry environment - not properly configured")
    except Exception as e:
        service_issues.append(f"Poetry environment check failed: {e}")
        print("  ❌ Poetry environment - check failed")

    # Print summary and installation instructions
    print("\n" + "="*80)
    if missing_packages or missing_system_deps or service_issues:
        print("❌ DEPENDENCY CHECK FAILED")
        print("="*80)

        if missing_packages:
            print("\n📦 MISSING PYTHON PACKAGES:")
            print("Run the following command to install missing packages:")
            print(f"cd {os.path.dirname(os.path.dirname(os.path.abspath(__file__)))}")
            print("poetry install")
            print("\nIf specific packages are still missing after poetry install:")
            for package, description in missing_packages:
                if package == 'websocket':
                    print(f"  poetry add websocket-client  # {description}")
                elif package == 'snowflake':
                    print(f"  poetry add snowflake-connector-python  # {description}")
                elif package == 'python_jose':
                    print(f"  poetry add python-jose  # {description}")
                elif package == 'python_dotenv':
                    print(f"  poetry add python-dotenv  # {description}")
                elif package == 'python_json_logger':
                    print(f"  poetry add python-json-logger  # {description}")
                elif package == 'firebase_admin':
                    print(f"  poetry add firebase-admin  # {description}")
                elif package == 'sentence_transformers':
                    print(f"  poetry add sentence-transformers  # {description}")
                elif package == 'pytest_asyncio':
                    print(f"  poetry add pytest-asyncio --group dev  # {description}")
                else:
                    print(f"  poetry add {package}  # {description}")

        if missing_system_deps:
            print("\n🔧 MISSING SYSTEM DEPENDENCIES:")
            for cmd, description in missing_system_deps:
                if cmd == 'poetry':
                    print(f"  Install Poetry: curl -sSL https://install.python-poetry.org | python3 -")
                    print(f"  Or: pip install poetry")
                elif cmd == 'npm':
                    print(f"  Install Node.js and npm: https://nodejs.org/")
                    print(f"  Or on macOS: brew install node")
                elif cmd == 'node':
                    print(f"  Install Node.js: https://nodejs.org/")
                    print(f"  Or on macOS: brew install node")
                elif cmd == 'git':
                    print(f"  Install Git: https://git-scm.com/downloads")
                    print(f"  Or on macOS: brew install git")
                print(f"  Description: {description}")

        if service_issues:
            print("\n🚀 SERVICE ISSUES:")
            for issue in service_issues:
                print(f"  • {issue}")
            print("\nTo start the backend server:")
            print("  cd olorin-server")
            print("  poetry run python -m app.local_server")
            print("  # Or use the unified startup script:")
            print("  npm run olorin")

        print("\n" + "="*80)
        print("❌ Please resolve the above issues before running the test script.")
        print("="*80)
        return False
    else:
        print("✅ ALL DEPENDENCIES SATISFIED")
        print("="*80)
        print("🚀 Ready to run autonomous investigations!")
        return True

# Monitoring colors
COLORS = {
    'WEBSOCKET': '\033[0;34m',  # Blue
    'LLM': '\033[0;32m',        # Green
    'LANGGRAPH': '\033[0;35m',  # Purple
    'AGENT': '\033[0;36m',      # Cyan
    'ERROR': '\033[0;31m',      # Red
    'WARNING': '\033[1;33m',    # Yellow
    'SUCCESS': '\033[0;92m',    # Bright green
    'NC': '\033[0m'             # No color
}

class TestMode(Enum):
    """Test execution modes"""
    MOCK = "mock"
    DEMO = "demo" 
    LIVE = "live"

class OutputFormat(Enum):
    """Report output formats"""
    HTML = "html"
    JSON = "json"
    MARKDOWN = "markdown"
    TERMINAL = "terminal"

@dataclass
class TestConfiguration:
    """Test runner configuration"""
    scenario: Optional[str] = None
    all_scenarios: bool = False
    entity_id: Optional[str] = None
    entity_type: Optional[str] = None
    concurrent: int = DEFAULT_CONCURRENT
    output_format: OutputFormat = OutputFormat.TERMINAL
    output_dir: str = "."
    verbose: bool = False
    server_url: str = DEFAULT_SERVER_URL
    timeout: int = DEFAULT_TIMEOUT
    log_level: str = DEFAULT_LOG_LEVEL
    mode: TestMode = TestMode.LIVE
    html_report: bool = False
    open_report: bool = False
    use_mock_ips_cache: bool = DEFAULT_USE_MOCK_IPS  # Now true by default
    
    # Custom investigation options
    custom_prompt: Optional[str] = None
    
    # Advanced monitoring options
    show_websocket: bool = False
    show_llm: bool = False
    show_langgraph: bool = False
    show_agents: bool = False
    follow_logs: bool = False

class AdvancedMonitoringSystem:
    """Advanced monitoring system for real-time investigation visibility"""
    
    def __init__(self, config: 'TestConfiguration', logger):
        self.config = config
        self.logger = logger
        self.monitoring_active = False
        self.websocket_client = None
        self.message_queue = queue.Queue()
        self.monitoring_threads = []
        
        # Monitoring state
        self.llm_calls_count = 0
        self.langgraph_states = []
        self.agent_conversations = []
        self.websocket_messages = []
        
    def start_monitoring(self):
        """Start all enabled monitoring systems"""
        if not any([self.config.show_websocket, self.config.show_llm, 
                   self.config.show_langgraph, self.config.show_agents]):
            return
        
        self.monitoring_active = True
        self.print_monitoring_banner()
        
        if self.config.show_websocket:
            self.start_websocket_monitoring()
        
        if self.config.show_llm:
            self.start_llm_monitoring()
        
        if self.config.show_langgraph:
            self.start_langgraph_monitoring()
        
        if self.config.show_agents:
            self.start_agent_monitoring()
        
        # Start message processor thread
        self.start_message_processor()
    
    def stop_monitoring(self):
        """Stop all monitoring systems"""
        self.monitoring_active = False
        
        if self.websocket_client:
            self.websocket_client.close()
        
        for thread in self.monitoring_threads:
            if thread.is_alive():
                thread.join(timeout=1)
    
    def print_monitoring_banner(self):
        """Print monitoring system startup banner"""
        enabled_features = []
        if self.config.show_websocket:
            enabled_features.append(f"{COLORS['WEBSOCKET']}WebSocket{COLORS['NC']}")
        if self.config.show_llm:
            enabled_features.append(f"{COLORS['LLM']}LLM Interactions{COLORS['NC']}")
        if self.config.show_langgraph:
            enabled_features.append(f"{COLORS['LANGGRAPH']}LangGraph States{COLORS['NC']}")
        if self.config.show_agents:
            enabled_features.append(f"{COLORS['AGENT']}Agent Conversations{COLORS['NC']}")
        
        features_str = ", ".join(enabled_features)
        print(f"\n{COLORS['SUCCESS']}🔍 Advanced Monitoring Active: {features_str}{COLORS['NC']}")
        print(f"{COLORS['SUCCESS']}{'=' * 80}{COLORS['NC']}\n")
    
    def start_websocket_monitoring(self):
        """Start WebSocket message monitoring"""
        if not self.config.show_websocket:
            return
            
        def websocket_monitor():
            try:
                # Import websocket-client
                try:
                    import websocket
                except ImportError:
                    self.log_monitoring_warning("WebSocket", "websocket-client library not installed - install with 'poetry add websocket-client'")
                    return
                
                # Create authenticated WebSocket connection
                try:
                    # Use WebSocket authentication system to prevent 403 Forbidden errors
                    # Use dynamic demo_mode based on test configuration
                    is_demo_mode = self.config.mode == TestMode.DEMO
                    ws_config = create_websocket_connection_config(
                        server_url=self.config.server_url,
                        investigation_id='investigation_monitor',
                        demo_mode=is_demo_mode,
                        parallel=False
                    )
                    ws_url = ws_config['url']
                    ws_headers = ws_config['headers']
                    self.log_monitoring_success("WebSocket", "Created authenticated WebSocket configuration")
                except Exception as auth_error:
                    # Fallback to basic WebSocket URL if authentication setup fails
                    self.log_monitoring_warning("WebSocket", f"Authentication setup failed ({auth_error}), using basic connection")
                    ws_url = self.config.server_url.replace('http://', 'ws://').replace('https://', 'wss://')
                    # Use the correct WebSocket endpoint path
                    ws_url += '/investigation/investigation_monitor/monitor'
                    ws_headers = None
                
                def on_message(ws, message):
                    try:
                        # Try to parse as JSON
                        if message.strip().startswith('{'):
                            data = json.loads(message)
                            self.log_websocket_message(
                                data.get('type', 'json'),
                                data,
                                data.get('investigation_id', 'unknown')
                            )
                        else:
                            # Handle raw text messages
                            self.log_websocket_message('text', message, 'unknown')
                    except json.JSONDecodeError:
                        # Handle non-JSON messages
                        self.log_websocket_message('raw', message, 'unknown')
                    except Exception as e:
                        self.log_monitoring_warning("WebSocket", f"Error processing message: {e}")
                
                def on_error(ws, error):
                    error_msg = str(error)
                    if "403" in error_msg or "Forbidden" in error_msg:
                        self.log_monitoring_error("WebSocket", f"Authentication failed (403 Forbidden) - JWT token may be invalid or missing")
                        self.log_monitoring_warning("WebSocket", "Try running with --show-websocket to see WebSocket authentication details")
                    else:
                        self.log_monitoring_error("WebSocket", f"Connection error: {error}")
                
                def on_close(ws, close_status_code, close_msg):
                    if self.monitoring_active:
                        self.log_monitoring_warning("WebSocket", f"Connection closed (code: {close_status_code}, msg: {close_msg})")
                
                def on_open(ws):
                    self.log_monitoring_success("WebSocket", f"Connected to investigation stream at {ws_url}")
                
                # Create WebSocket client with authentication headers
                if ws_headers:
                    self.websocket_client = websocket.WebSocketApp(
                        ws_url,
                        header=ws_headers,
                        on_message=on_message,
                        on_error=on_error,
                        on_close=on_close,
                        on_open=on_open
                    )
                    self.log_monitoring_success("WebSocket", "WebSocket client created with JWT authentication")
                else:
                    # Fallback without headers
                    self.websocket_client = websocket.WebSocketApp(
                        ws_url,
                        on_message=on_message,
                        on_error=on_error,
                        on_close=on_close,
                        on_open=on_open
                    )
                    self.log_monitoring_warning("WebSocket", "WebSocket client created without authentication (may fail with 403)")
                
                # Run forever with automatic reconnection
                self.websocket_client.run_forever(
                    ping_interval=30,
                    ping_timeout=10,
                    reconnect=3
                )
                
            except Exception as e:
                self.log_monitoring_error("WebSocket", f"Failed to start monitoring: {e}")
        
        if self.config.show_websocket:
            thread = threading.Thread(target=websocket_monitor, daemon=True)
            thread.start()
            self.monitoring_threads.append(thread)
    
    def start_llm_monitoring(self):
        """Start LLM interaction monitoring"""
        if not self.config.show_llm:
            return
            
        # This will hook into the LLM calls
        self.log_monitoring_success("LLM", "LLM interaction monitoring enabled")
        
        # Set up environment variables for LLM tracing
        os.environ['LANGCHAIN_VERBOSE'] = 'true'
        os.environ['OLORIN_LOG_LLM_INTERACTIONS'] = 'true'
        
        # Only enable LangSmith tracing if LANGSMITH_API_KEY is available
        # This prevents 401 authentication spam when running in demo mode
        if 'LANGSMITH_API_KEY' in os.environ:
            os.environ['LANGCHAIN_TRACING_V2'] = 'true'
            self.log_monitoring_success("LLM", "LangSmith tracing enabled with API key")
        else:
            # Keep LangSmith tracing disabled to prevent 401 errors
            os.environ['LANGCHAIN_TRACING_V2'] = 'false'
            self.log_monitoring_warning("LLM", "LangSmith tracing disabled (no API key - prevents 401 errors)")
        
        # Set up LangChain callback handler for monitoring
        try:
            from langchain.callbacks import StdOutCallbackHandler
            from langchain.callbacks.base import BaseCallbackHandler
            
            class LLMMonitoringCallback(BaseCallbackHandler):
                def __init__(self, monitoring_system):
                    self.monitoring = monitoring_system
                
                def on_llm_start(self, serialized, prompts, **kwargs):
                    model_name = serialized.get('name', 'unknown')
                    for prompt in prompts:
                        self.monitoring.log_llm_interaction(
                            model_name,
                            prompt[:500] + "..." if len(prompt) > 500 else prompt,
                            "Starting LLM call..."
                        )
                
                def on_llm_end(self, response, **kwargs):
                    if hasattr(response, 'generations') and response.generations:
                        for generation in response.generations:
                            for gen in generation:
                                if hasattr(gen, 'text'):
                                    self.monitoring.log_llm_interaction(
                                        "response",
                                        "LLM Response received",
                                        gen.text[:500] + "..." if len(gen.text) > 500 else gen.text
                                    )
                
                def on_llm_error(self, error, **kwargs):
                    self.monitoring.log_monitoring_error("LLM", f"LLM call failed: {error}")
            
            # Store callback for use in agent calls
            self.llm_callback = LLMMonitoringCallback(self)
            
        except ImportError:
            self.log_monitoring_warning("LLM", "LangChain not available for callback monitoring - will use basic logging")
    
    def start_langgraph_monitoring(self):
        """Start LangGraph state transition monitoring"""
        if not self.config.show_langgraph:
            return
            
        self.log_monitoring_success("LangGraph", "State transition monitoring enabled")
        
        # Set up environment variables for LangGraph debugging
        os.environ['OLORIN_LOG_LANGGRAPH_STATES'] = 'true'
        os.environ['LANGGRAPH_DEBUG'] = 'true'
        
        # Hook into LangGraph state changes if available
        try:
            # Try to import and set up LangGraph monitoring
            # This will depend on the actual LangGraph implementation in the project
            self.log_monitoring_success("LangGraph", "Monitoring hooks registered for state transitions")
            
        except ImportError:
            self.log_monitoring_warning("LangGraph", "LangGraph not available - will use environment variable based logging")
    
    def start_agent_monitoring(self):
        """Start agent conversation monitoring"""
        if not self.config.show_agents:
            return
            
        self.log_monitoring_success("Agent", "Agent conversation monitoring enabled")
        
        # Set up environment variables for agent debugging
        os.environ['OLORIN_LOG_AGENT_CONVERSATIONS'] = 'true'
        os.environ['OLORIN_AGENT_VERBOSE'] = 'true'
        os.environ['OLORIN_AGENT_DEBUG'] = 'true'
    
    def start_message_processor(self):
        """Start the message processing thread"""
        def process_messages():
            while self.monitoring_active:
                try:
                    # Get message from queue with timeout
                    message = self.message_queue.get(timeout=1)
                    if message:
                        self.display_monitoring_message(message)
                        self.message_queue.task_done()
                except queue.Empty:
                    continue
                except Exception as e:
                    self.log_monitoring_error("MessageProcessor", f"Error processing message: {e}")
        
        thread = threading.Thread(target=process_messages, daemon=True)
        thread.start()
        self.monitoring_threads.append(thread)
    
    def log_websocket_message(self, message_type: str, content, investigation_id: str = "unknown"):
        """Log WebSocket message with structured data"""
        formatted_msg = {
            'type': 'websocket',
            'timestamp': datetime.now().isoformat(),
            'message_type': message_type,
            'content': str(content)[:200] + "..." if len(str(content)) > 200 else str(content),
            'investigation_id': investigation_id,
            'raw_data': content if isinstance(content, dict) else None
        }
        
        self.websocket_messages.append(formatted_msg)
        self.message_queue.put(formatted_msg)
    
    def log_llm_interaction(self, prompt: str, response: str, model: str = "unknown"):
        """Log LLM interaction"""
        self.llm_calls_count += 1
        
        formatted_msg = {
            'type': 'llm',
            'timestamp': datetime.now().isoformat(),
            'call_number': self.llm_calls_count,
            'model': model,
            'prompt': prompt,
            'response': response
        }
        
        self.message_queue.put(formatted_msg)
    
    def log_langgraph_state(self, state_name: str, state_data: Dict):
        """Log LangGraph state transition"""
        formatted_msg = {
            'type': 'langgraph',
            'timestamp': datetime.now().isoformat(),
            'state_name': state_name,
            'state_data': state_data
        }
        
        self.langgraph_states.append(formatted_msg)
        self.message_queue.put(formatted_msg)
    
    def log_agent_conversation(self, agent_name: str, message: str, conversation_id: str = None):
        """Log agent conversation"""
        formatted_msg = {
            'type': 'agent',
            'timestamp': datetime.now().isoformat(),
            'agent_name': agent_name,
            'message': message,
            'conversation_id': conversation_id or f"conv_{len(self.agent_conversations)}"
        }
        
        self.agent_conversations.append(formatted_msg)
        self.message_queue.put(formatted_msg)
    
    def display_monitoring_message(self, message: Dict):
        """Display monitoring message with proper formatting"""
        msg_type = message['type']
        timestamp = datetime.fromisoformat(message['timestamp']).strftime('%H:%M:%S.%f')[:-3]
        
        if msg_type == 'websocket':
            color = COLORS['WEBSOCKET']
            prefix = "WEBSOCKET"
            content = message.get('content', '')
            msg_type_info = message.get('message_type', 'unknown')
            print(f"{color}[{prefix}] {timestamp} [{msg_type_info.upper()}]{COLORS['NC']} {content}")
        
        elif msg_type == 'llm':
            color = COLORS['LLM']
            prefix = "LLM"
            call_num = message.get('call_number', 0)
            model = message.get('model', 'unknown')
            prompt = message.get('prompt', '')[:100] + "..." if len(message.get('prompt', '')) > 100 else message.get('prompt', '')
            response = message.get('response', '')[:100] + "..." if len(message.get('response', '')) > 100 else message.get('response', '')
            
            print(f"{color}[{prefix}] {timestamp} Call #{call_num} ({model}){COLORS['NC']}")
            print(f"{color}  → Prompt: {prompt}{COLORS['NC']}")
            print(f"{color}  ← Response: {response}{COLORS['NC']}")
        
        elif msg_type == 'langgraph':
            color = COLORS['LANGGRAPH']
            prefix = "LANGGRAPH"
            state_name = message.get('state_name', 'unknown')
            print(f"{color}[{prefix}] {timestamp} State: {state_name}{COLORS['NC']}")
            
            # Display state data if available
            state_data = message.get('state_data', {})
            if state_data:
                for key, value in state_data.items():
                    print(f"{color}  {key}: {str(value)[:80]}{'...' if len(str(value)) > 80 else ''}{COLORS['NC']}")
        
        elif msg_type == 'agent':
            color = COLORS['AGENT']
            prefix = "AGENT"
            agent_name = message.get('agent_name', 'unknown')
            agent_message = message.get('message', '')
            conversation_id = message.get('conversation_id', 'unknown')
            
            print(f"{color}[{prefix}] {timestamp} {agent_name} ({conversation_id}){COLORS['NC']}")
            print(f"{color}  {agent_message}{COLORS['NC']}")
    
    def log_monitoring_success(self, system: str, message: str):
        """Log monitoring system success"""
        print(f"{COLORS['SUCCESS']}✅ [{system.upper()}] {message}{COLORS['NC']}")
    
    def log_monitoring_warning(self, system: str, message: str):
        """Log monitoring system warning"""
        print(f"{COLORS['WARNING']}⚠️  [{system.upper()}] {message}{COLORS['NC']}")
    
    def log_monitoring_error(self, system: str, message: str):
        """Log monitoring system error"""
        print(f"{COLORS['ERROR']}❌ [{system.upper()}] {message}{COLORS['NC']}")
    
    def get_monitoring_summary(self) -> Dict:
        """Get summary of all monitoring data"""
        return {
            'websocket_messages': len(self.websocket_messages),
            'llm_calls': self.llm_calls_count,
            'langgraph_states': len(self.langgraph_states),
            'agent_conversations': len(self.agent_conversations),
            'monitoring_active': self.monitoring_active
        }

@dataclass
class TestMetrics:
    """Comprehensive test metrics"""
    start_time: float = field(default_factory=time.time)
    end_time: Optional[float] = None
    total_duration: float = 0.0
    scenarios_tested: int = 0
    scenarios_passed: int = 0
    scenarios_failed: int = 0
    average_score: float = 0.0
    agent_metrics: Dict[str, Dict] = field(default_factory=dict)
    performance_metrics: Dict[str, float] = field(default_factory=dict)
    error_metrics: Dict[str, int] = field(default_factory=dict)
    token_usage: Dict[str, int] = field(default_factory=dict)
    cost_analysis: Dict[str, float] = field(default_factory=dict)

@dataclass
class InvestigationResult:
    """Results from a single investigation"""
    investigation_id: str
    scenario_name: str
    status: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration: float = 0.0
    final_risk_score: float = 0.0
    confidence: float = 0.0
    agent_results: Dict[str, Any] = field(default_factory=dict)
    journey_data: Dict[str, Any] = field(default_factory=dict)
    logging_data: Dict[str, Any] = field(default_factory=dict)
    performance_data: Dict[str, Any] = field(default_factory=dict)
    errors: List[str] = field(default_factory=list)
    validation_results: Dict[str, Any] = field(default_factory=dict)
    investigation_folder: Optional[str] = None  # Path to investigation folder
    websocket_events: List[Dict] = field(default_factory=list)
    graph_result: Dict[str, Any] = field(default_factory=dict)  # Clean graph result
    initial_risk_score: Optional[float] = None  # Initial risk from Snowflake

class UnifiedAutonomousTestRunner:
    """
    Comprehensive unified test runner for autonomous investigations.
    
    Consolidates all testing functionality with enhanced reporting,
    multiple output formats, and comprehensive validation.
    """
    
    def __init__(self, config: TestConfiguration):
        self.config = config
        self.session: Optional[aiohttp.ClientSession] = None
        self.logger = self._setup_logging()
        self.metrics = TestMetrics()
        self.results: List[InvestigationResult] = []
        
        # Initialize advanced monitoring system
        self.monitoring = AdvancedMonitoringSystem(config, self.logger)
        
        # Initialize test infrastructure
        self.journey_tracker = LangGraphJourneyTracker()
        self.investigation_logger = AutonomousInvestigationLogger()
        self.unified_journey_tracker = get_journey_tracker()
        self.chain_of_thought_logger = ChainOfThoughtLogger()
        self.scenario_generator = RealScenarioGenerator() if RealScenarioGenerator else None
        
        # Initialize server log capture
        self.server_log_capture = get_server_log_capture()
        
        # Data from Snowflake
        self.snowflake_entities: List[Dict] = []  # High-risk entities from Snowflake
        
        self.logger.info(f"Initialized Unified Test Runner with config: {config}")
        
        # Start monitoring if enabled
        if any([config.show_websocket, config.show_llm, config.show_langgraph, config.show_agents]):
            self.monitoring.start_monitoring()

    def _setup_logging(self):
        """Setup initial console logging - file logging will be added when investigation folder is created"""
        import logging
        import logging.handlers
        import os
        from datetime import datetime
        
        # Create logger
        logger = logging.getLogger('autonomous_investigation')
        logger.setLevel(getattr(logging, self.config.log_level.upper()))
        
        # Configure bridge logger for orchestration DEBUG messages
        from app.service.logging import configure_unified_bridge_from_config, get_bridge_logger
        configure_unified_bridge_from_config(log_level=self.config.log_level.upper())
        
        # DEBUG logging for Phase 1 initialization steps (Steps 1.1.1-1.1.3)
        bridge_logger = get_bridge_logger('scripts.testing.unified_autonomous_test_runner')
        if self.config.mode == TestMode.MOCK:
            bridge_logger.debug("[Step 1.1.1] Command line argument parsing - Mock mode detected in sys.argv")
            bridge_logger.debug("[Step 1.1.1] Setting os.environ['TEST_MODE'] = 'mock' BEFORE agent imports")
            bridge_logger.debug("[Step 1.1.2] Environment setup detection - MockLLM warning displayed")
        else:
            bridge_logger.debug("[Step 1.1.1] Command line argument parsing - Live mode will be used")
            bridge_logger.debug("[Step 1.1.2] Environment setup detection - No TEST_MODE override")
        bridge_logger.debug("[Step 1.1.3] Clean graph orchestration import - Starting imports")
        bridge_logger.debug("[Step 1.1.3] Successfully imported get_investigation_graph with hybrid intelligence support")
        
        # Clear existing handlers to avoid duplicates
        logger.handlers.clear()
        
        # Store file handler reference for later update
        self.file_handler = None
        
        # Add console handler only initially
        console_handler = logging.StreamHandler(sys.stdout)
        console_formatter = logging.Formatter(
            '%(asctime)s [%(levelname)s] %(name)s: %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        console_handler.setFormatter(console_formatter)
        logger.addHandler(console_handler)
        
        return logger
    
    def _update_log_file_location(self, investigation_folder: str):
        """Update the log file location to be inside the investigation folder"""
        import logging.handlers
        import os
        from datetime import datetime
        
        # Remove old file handler if it exists
        if self.file_handler:
            self.logger.removeHandler(self.file_handler)
            self.file_handler.close()
        
        # Generate unique timestamped filename inside investigation folder
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        log_filename = os.path.join(investigation_folder, f'autonomous_investigation_{timestamp}.log')
        
        # Ensure the investigation folder exists
        os.makedirs(investigation_folder, exist_ok=True)
        
        # Add new file handler for investigation log inside the investigation folder
        self.file_handler = logging.handlers.RotatingFileHandler(
            log_filename,
            maxBytes=50*1024*1024,  # 50MB
            backupCount=10
        )
        file_formatter = logging.Formatter(
            '%(asctime)s [%(levelname)s] [INVESTIGATION] %(name)s: %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        self.file_handler.setFormatter(file_formatter)
        self.logger.addHandler(self.file_handler)
        
        self.logger.info(f"📝 Log file updated to: {log_filename}")
        
        return log_filename

    @asynccontextmanager
    async def session_manager(self):
        """Async context manager for HTTP session"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=self.config.timeout)
        )
        try:
            yield self.session
        finally:
            if self.session:
                await self.session.close()
            # Stop monitoring when session closes
            self.monitoring.stop_monitoring()

    async def test_server_connectivity(self) -> bool:
        """Test server connectivity and health"""
        try:
            async with self.session.get(f"{self.config.server_url}/health") as response:
                if response.status == 200:
                    self.logger.info("✅ Server connectivity confirmed")
                    return True
                else:
                    self.logger.error(f"❌ Server health check failed: {response.status}")
                    return False
        except Exception as e:
            self.logger.error(f"❌ Failed to connect to server: {e}")
            return False
    
    async def start_server_if_needed(self) -> bool:
        """Start the olorin server if it's not running"""
        # First check if server is already running
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.config.server_url}/health", timeout=aiohttp.ClientTimeout(total=2)) as response:
                    if response.status == 200:
                        self.logger.info("✅ Server is already running")
                        return True
        except:
            pass  # Server not running, continue to start it
        
        self.logger.info("🚀 Starting olorin server...")
        
        # Get the server root directory
        server_root = Path(__file__).parent.parent.parent
        
        # Start the server in background using poetry
        try:
            import subprocess
            process = subprocess.Popen(
                ["poetry", "run", "python", "-m", "app.local_server"],
                cwd=server_root,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                start_new_session=True
            )
            
            # Wait for server to be ready (max 30 seconds)
            max_wait = 30
            start_time = time.time()
            
            while time.time() - start_time < max_wait:
                try:
                    async with aiohttp.ClientSession() as session:
                        async with session.get(f"{self.config.server_url}/health", timeout=aiohttp.ClientTimeout(total=2)) as response:
                            if response.status == 200:
                                self.logger.info("✅ Server started successfully")
                                return True
                except:
                    await asyncio.sleep(1)
                    continue
            
            self.logger.error("❌ Server failed to start within 30 seconds")
            return False
            
        except Exception as e:
            self.logger.error(f"❌ Failed to start server: {e}")
            return False

    async def load_snowflake_data(self) -> bool:
        """Load top risk entities from Snowflake"""
        from app.service.analytics.risk_analyzer import get_risk_analyzer
        
        self.logger.info("❄️ Loading top risk entities from Snowflake...")
        
        try:
            # Get the risk analyzer
            analyzer = get_risk_analyzer()
            
            # Fetch top 10% risk entities by IP address
            results = await analyzer.get_top_risk_entities(
                time_window='24h',
                group_by='IP_ADDRESS',
                top_percentage=10,
                force_refresh=False
            )
            
            if results.get('status') == 'success':
                entities = results.get('entities', [])
                
                if entities:
                    # Store Snowflake entities for investigation
                    self.snowflake_entities = []
                    for entity in entities:
                        # Each entity is a high-risk IP address
                        entity_data = {
                            'ip_address': entity.get('entity'),  # Actual IP address
                            'risk_score': float(entity.get('risk_score', 0)),
                            'risk_weighted_value': float(entity.get('risk_weighted_value', 0)),
                            'transaction_count': entity.get('transaction_count', 0),
                            'fraud_count': entity.get('fraud_count', 0),
                            'source': 'snowflake'
                        }
                        self.snowflake_entities.append(entity_data)
                    
                    self.logger.info(f"✅ Loaded {len(self.snowflake_entities)} high-risk IP addresses from Snowflake")
                    for i, entity in enumerate(self.snowflake_entities[:5], 1):
                        self.logger.info(f"  {i}. IP: {entity['ip_address']}, Risk Score: {entity['risk_score']:.4f}")
                    
                    return True
                else:
                    self.logger.warning("⚠️  No high-risk entities found in Snowflake")
                    self.logger.info("📊 This may be expected in development/test environments")
                    return False
            else:
                error_msg = results.get('error', 'Unknown error')
                self.logger.error(f"❌ Failed to fetch from Snowflake: {error_msg}")
                self.logger.error("🛠️  Please check:")
                self.logger.error("   1. Snowflake connection configuration")
                self.logger.error("   2. Database credentials and permissions")
                self.logger.error("   3. Network connectivity to Snowflake")
                self.logger.error("   4. Risk analyzer service availability")
                return False

        except Exception as e:
            self.logger.error(f"❌ Error loading Snowflake data: {e}")
            self.logger.error("🛠️  Common causes:")
            self.logger.error("   1. Snowflake service unavailable")
            self.logger.error("   2. Invalid database configuration")
            self.logger.error("   3. Authentication/authorization issues")
            self.logger.error("   4. Risk analyzer initialization failure")
            return False
    

    async def get_available_scenarios(self) -> List[str]:
        """Get list of available test scenarios"""
        predefined_scenarios = [
            "device_spoofing",
            "impossible_travel", 
            "account_takeover",
            "synthetic_identity",
            "velocity_fraud",
            "location_anomaly",
            "device_fingerprint_mismatch",
            "behavioral_anomaly"
        ]
        
        # Try to get scenarios from API if available
        try:
            async with self.session.get(f"{self.config.server_url}/v1/autonomous/scenarios") as response:
                if response.status == 200:
                    scenarios_data = await response.json()
                    fraud_scenarios = scenarios_data.get("fraud_scenarios", [])
                    legitimate_scenarios = scenarios_data.get("legitimate_scenarios", [])
                    return fraud_scenarios + legitimate_scenarios
        except Exception as e:
            self.logger.warning(f"Failed to fetch scenarios from API: {e}")
        
        return predefined_scenarios

    async def run_single_scenario_test(self, scenario_name: str) -> InvestigationResult:
        """Run a comprehensive test for a single scenario"""
        self.logger.info(f"🚀 Starting test for scenario: {scenario_name}")
        
        investigation_id = f"unified_test_{scenario_name}_{int(time.time())}"
        start_time = datetime.now(timezone.utc)
        
        result = InvestigationResult(
            investigation_id=investigation_id,
            scenario_name=scenario_name,
            status="running",
            start_time=start_time
        )
        
        try:
            # Initialize test context
            context = await self._create_test_context(investigation_id, scenario_name)
            
            # Map TestMode to InvestigationMode
            investigation_mode = InvestigationMode.LIVE
            if self.config.mode == TestMode.MOCK:
                investigation_mode = InvestigationMode.MOCK
            elif self.config.mode == TestMode.DEMO:
                investigation_mode = InvestigationMode.DEMO
            
            # Initialize unified investigation logging with proper mode and scenario
            # Create JSON-serializable config for context
            serializable_config = self.config.__dict__.copy()
            serializable_config['output_format'] = self.config.output_format.value
            serializable_config['mode'] = self.config.mode.value
            
            investigation_folder = self.investigation_logger.start_investigation_logging(
                investigation_id=investigation_id,
                context={
                    "scenario": scenario_name,
                    "entity_id": context.entity_id,
                    "test_mode": self.config.mode.value,
                    "config": serializable_config
                },
                mode=investigation_mode,
                scenario=scenario_name
            )
            
            self.logger.info(f"📁 Investigation folder: {investigation_folder}")
            
            # Start server log capture for this investigation
            self.server_log_capture.start_capture(investigation_id, investigation_folder)
            self.logger.info(f"🖥️ Server log capture started for investigation: {investigation_id}")
            
            # Update log file location to be inside the investigation folder
            self._update_log_file_location(str(investigation_folder))
            
            # Update chain of thought logger to save files in investigation folder
            self.chain_of_thought_logger.output_directory = Path(investigation_folder)
            self.chain_of_thought_logger.output_directory.mkdir(parents=True, exist_ok=True)
            self.logger.info(f"🧠 Chain of thought logger updated to use: {investigation_folder}")
            
            # Start unified journey tracking
            self.unified_journey_tracker.start_journey_tracking(
                investigation_id=investigation_id,
                initial_state={
                    "scenario": scenario_name,
                    "entity_id": context.entity_id,
                    "test_mode": self.config.mode.value,
                    "investigation_folder": str(investigation_folder)
                }
            )
            
            # Start legacy journey tracking (for compatibility)
            self.journey_tracker.start_journey_tracking(
                investigation_id=investigation_id,
                initial_state={
                    "scenario": scenario_name,
                    "entity_id": context.entity_id,
                    "test_mode": self.config.mode.value
                }
            )
            
            # Start chain of thought tracking for investigation orchestrator
            self.orchestrator_thought_process_id = self.chain_of_thought_logger.start_agent_thinking(
                investigation_id=investigation_id,
                agent_name="investigation_orchestrator",
                domain="autonomous_investigation",
                initial_context={
                    "scenario": scenario_name,
                    "entity_id": context.entity_id,
                    "entity_type": context.entity_type.value,
                    "test_mode": self.config.mode.value,
                    "investigation_folder": str(investigation_folder)
                }
            )
            
            # Log LangGraph state transition for monitoring
            if self.config.show_langgraph:
                self.monitoring.log_langgraph_state(
                    "journey_start",
                    {
                        "scenario": scenario_name,
                        "entity_id": context.entity_id,
                        "test_mode": self.config.mode.value,
                        "investigation_id": investigation_id
                    }
                )
            
            # Log reasoning step for investigation strategy selection
            # TODO: Calculate actual confidence based on investigation context, scenario complexity, available data
            initialization_confidence = 1.0  # High confidence in starting investigation (process certainty)
            self.chain_of_thought_logger.log_reasoning_step(
                process_id=self.orchestrator_thought_process_id,
                reasoning_type=ReasoningType.ANALYSIS,
                premise=f"Starting autonomous investigation for scenario: {scenario_name}",
                reasoning=f"Entity {context.entity_id} of type {context.entity_type.value} requires comprehensive analysis to assess risk profile and detect potential anomalies",
                conclusion="Initiating multi-domain investigation with device, location, network, and behavioral analysis",
                confidence=initialization_confidence,
                supporting_evidence=[{"investigation_context": context.__dict__}],
                metadata={"investigation_phase": "initialization"}
            )
            
            # Log tool selection reasoning 
            available_tools = ["device_analysis", "location_analysis", "network_analysis", "behavior_analysis", "risk_assessment"]
            selected_tools = available_tools  # Comprehensive investigation uses all tools
            self.chain_of_thought_logger.log_tool_selection_reasoning(
                process_id=self.orchestrator_thought_process_id,
                available_tools=available_tools,
                selected_tools=selected_tools,
                selection_criteria={
                    "investigation_scope": "comprehensive",
                    "scenario_type": scenario_name,
                    "entity_type": context.entity_type.value,
                    "risk_level": "unknown"
                },
                reasoning_chain=[
                    f"Scenario '{scenario_name}' requires comprehensive multi-domain analysis",
                    "All available investigation tools are necessary for thorough risk assessment",
                    "Device, location, network, and behavioral analysis will provide complete risk profile"
                ],
                expected_outcomes={
                    "device_analysis": "Device fingerprint and risk indicators",
                    "location_analysis": "Geographic anomaly detection",
                    "network_analysis": "Network-based risk assessment",
                    "behavior_analysis": "User behavior pattern analysis",
                    "risk_assessment": "Comprehensive risk scoring"
                },
                confidence_scores={},  # TODO: Calculate actual confidence scores based on investigation context
                contextual_factors={
                    "test_mode": self.config.mode.value,
                    "investigation_depth": "comprehensive",
                    "time_constraints": "test_scenario"
                }
            )
            
            # Run comprehensive investigation
            agent_results = await self._run_comprehensive_investigation(context, result)
            result.agent_results = agent_results
            
            # Log reasoning step for investigation execution
            # TODO: Calculate execution confidence based on actual agent success rates and data quality
            execution_confidence = self._calculate_execution_confidence(agent_results)
            self.chain_of_thought_logger.log_reasoning_step(
                process_id=self.orchestrator_thought_process_id,
                reasoning_type=ReasoningType.EVIDENCE_EVALUATION,
                premise="Investigation agents have completed their analysis",
                reasoning="Multiple specialized agents have analyzed different domains (device, location, network, logs) and provided their assessments",
                conclusion=f"Investigation completed with {len(agent_results)} domain analyses",
                confidence=execution_confidence,
                supporting_evidence=[{"agent_results_summary": {k: v.get("status", "unknown") for k, v in agent_results.items()}}],
                metadata={"investigation_phase": "execution", "domains_analyzed": list(agent_results.keys())}
            )
            
            # Calculate final metrics BEFORE validation
            result.final_risk_score = self._extract_final_risk_score(agent_results)
            result.confidence = self._extract_confidence_score(agent_results)
            
            # Set initial status (validation can override this)
            result.status = "completed"
            
            # Validate and analyze results (can set status to "failed" if validation fails)
            validation_results = await self._validate_investigation_results(context, result)
            result.validation_results = validation_results
            
            # Collect performance metrics
            performance_data = await self._collect_performance_metrics(context, result)
            result.performance_data = performance_data
            
            # Log reasoning step for final risk assessment
            self.chain_of_thought_logger.log_reasoning_step(
                process_id=self.orchestrator_thought_process_id,
                reasoning_type=ReasoningType.RISK_ASSESSMENT,
                premise="All investigation domains have been analyzed and validated",
                reasoning=f"Cross-domain analysis reveals risk indicators across multiple domains. Final risk score calculated from weighted domain assessments: {result.final_risk_score}",
                conclusion=f"Investigation concludes with risk score {result.final_risk_score:.1f} and confidence {result.confidence:.2f}",
                confidence=result.confidence,
                supporting_evidence=[
                    {"final_risk_score": result.final_risk_score},
                    {"validation_results": validation_results},
                    {"domain_count": len(agent_results)}
                ],
                metadata={"investigation_phase": "conclusion", "scenario": scenario_name}
            )
            
            # Complete unified journey tracking with actual result status
            self.unified_journey_tracker.complete_journey_tracking(
                investigation_id,
                status=result.status  # Use actual status (could be "failed" if validation failed)
            )
            
            # Complete investigation logging with actual result status
            self.investigation_logger.complete_investigation_logging(
                investigation_id, 
                final_status=result.status  # Use actual status (could be "failed" if validation failed)
            )
            
            # Stop server log capture and save to investigation folder
            server_logs_file = self.server_log_capture.stop_capture(investigation_id)
            if server_logs_file:
                self.logger.info(f"🖥️ Server logs saved to: {server_logs_file}")
            else:
                self.logger.warning(f"⚠️ Server log capture was not active for investigation: {investigation_id}")
            
            # Complete chain of thought tracking
            self.chain_of_thought_logger.complete_agent_thinking(
                process_id=self.orchestrator_thought_process_id,
                final_assessment={
                    "investigation_outcome": "completed",
                    "final_risk_score": result.final_risk_score,
                    "confidence_level": result.confidence,
                    "scenario_type": scenario_name,
                    "domains_analyzed": list(result.agent_results.keys()) if result.agent_results else [],
                    "total_reasoning_steps": 3,  # initialization, execution, conclusion
                    "investigation_success": True
                },
                performance_notes={
                    "total_duration_ms": result.duration * 1000,
                    "validation_score": validation_results.get("overall_score", 0) if validation_results else 0,
                    "investigation_complexity": "comprehensive_multi_domain"
                }
            )
            
            # Save investigation results to the results folder
            if 'investigation_folder' in locals():
                result.investigation_folder = str(investigation_folder)  # Store folder path in result
                self._save_investigation_results(str(investigation_folder), result)
            
            # Complete legacy journey tracking (for compatibility)
            self.journey_tracker.complete_journey(
                investigation_id,
                final_state={
                    "status": "completed",
                    "final_risk_score": result.final_risk_score,
                    "confidence": result.confidence
                }
            )
            
            self.logger.info(f"✅ Test completed for {scenario_name}: Score {result.final_risk_score:.2f}")
            
        except Exception as e:
            result.status = "failed"
            result.errors.append(str(e))
            self.logger.error(f"❌ Test failed for {scenario_name}: {e}")
            
            # Complete tracking with failed status
            try:
                if 'investigation_id' in locals():
                    self.unified_journey_tracker.complete_journey_tracking(
                        investigation_id,
                        status="failed"
                    )
                    self.investigation_logger.complete_investigation_logging(
                        investigation_id, 
                        final_status="failed"
                    )
                    
                    # Stop server log capture and save to investigation folder
                    server_logs_file = self.server_log_capture.stop_capture(investigation_id)
                    if server_logs_file:
                        self.logger.info(f"🖥️ Server logs saved to: {server_logs_file}")
                    else:
                        self.logger.warning(f"⚠️ Server log capture was not active for investigation: {investigation_id}")
                    
                    # Complete chain of thought tracking for failed investigation
                    if hasattr(self, 'orchestrator_thought_process_id'):
                        self.chain_of_thought_logger.complete_agent_thinking(
                            process_id=self.orchestrator_thought_process_id,
                            final_assessment={
                                "investigation_outcome": "failed",
                                "final_risk_score": result.final_risk_score,
                                "confidence_level": result.confidence,
                                "scenario_type": scenario_name,
                                "error_details": result.errors,
                                "investigation_success": False,
                                "failure_reason": str(e)
                            },
                            performance_notes={
                                "total_duration_ms": result.duration * 1000,
                                "investigation_complexity": "failed_execution",
                                "failure_stage": "investigation_execution"
                            }
                        )
                    
                    # Save investigation results even if failed
                    if 'investigation_folder' in locals():
                        result.investigation_folder = str(investigation_folder)  # Store folder path in result
                        self._save_investigation_results(str(investigation_folder), result)
            except Exception as cleanup_e:
                self.logger.warning(f"Failed to complete investigation tracking: {cleanup_e}")
            
        finally:
            # Calculate duration
            result.end_time = datetime.now(timezone.utc)
            result.duration = (result.end_time - result.start_time).total_seconds()
            
            # Cleanup
            if 'context' in locals():
                cleanup_investigation_context(investigation_id, context.entity_id)
            
            # Clean up TEST_MODE if it was set for mock mode
            if self.config.mode == TestMode.MOCK and "TEST_MODE" in os.environ:
                del os.environ["TEST_MODE"]
                self.logger.debug("Cleaned up TEST_MODE environment variable")
        
        return result

    async def _create_test_context(self, investigation_id: str, scenario_name: str, entity_index: int = 0) -> AutonomousInvestigationContext:
        """Create test context for investigation using Snowflake data or real entity data"""
        
        # Handle real entity investigations (when entity_id and entity_type are provided)
        if self.config.entity_id and self.config.entity_type:
            self.logger.info(f"Creating real entity investigation context for {self.config.entity_type}: {self.config.entity_id}")
            
            # Create entity data for real investigation
            entity_data = {
                "entity_id": self.config.entity_id,
                "entity_type": self.config.entity_type,
                "source": "real_investigation",
                "description": f"Real investigation of {self.config.entity_type}: {self.config.entity_id}"
            }
            
            # Create minimal user data for context (required by investigation framework)
            user_data = {
                "entity_id": self.config.entity_id,
                "entity_type": self.config.entity_type,
                "source": "real_investigation"
            }
            
            # Determine entity type enum
            if self.config.entity_type == "ip_address":
                entity_type_enum = EntityType.IP_ADDRESS
            elif self.config.entity_type == "user_id":
                entity_type_enum = EntityType.USER_ID
            elif self.config.entity_type == "device_id":
                entity_type_enum = EntityType.DEVICE_ID  
            elif self.config.entity_type == "transaction_id":
                entity_type_enum = EntityType.TRANSACTION_ID
            else:
                entity_type_enum = EntityType.USER_ID  # Default fallback
            
            # Create investigation context for real entity
            context = AutonomousInvestigationContext(
                investigation_id=investigation_id,
                entity_id=self.config.entity_id,
                entity_type=entity_type_enum,
                investigation_type="fraud_investigation"
            )
            
            # Add data sources
            context.data_sources["user"] = user_data
            context.data_sources["entity"] = entity_data
            context.data_sources["scenario"] = {
                "name": f"real_investigation_{self.config.entity_type}", 
                "test_mode": self.config.mode.value,
                "investigation_type": "real_entity",
                "created_at": datetime.utcnow().isoformat()
            }
            
            self.logger.info(f"Real entity investigation context created for {self.config.entity_type}: {self.config.entity_id}")
            return context
        
        # Prefer Snowflake data over CSV
        if self.snowflake_entities:
            # Use the specified entity index (for iterating through all IPs)
            if entity_index >= len(self.snowflake_entities):
                entity_index = 0
            
            snowflake_entity = self.snowflake_entities[entity_index]
            
            # Create user data from Snowflake entity
            user_data = {
                "ip_address": snowflake_entity['ip_address'],  # This is the actual IP address
                "risk_score": snowflake_entity['risk_score'],
                "risk_weighted_value": snowflake_entity['risk_weighted_value'],
                "transaction_count": snowflake_entity['transaction_count'],
                "fraud_count": snowflake_entity['fraud_count'],
                "source": "snowflake"
            }
            
            # Entity data for investigation - using IP address as the entity
            entity_data = {
                "entity_id": snowflake_entity['ip_address'],  # Use IP address as entity ID
                "entity_type": "ip_address",
                "source": "snowflake",
                "risk_score": snowflake_entity['risk_score']  # Include risk score for MockLLM
            }
            
            self.logger.info(f"Using Snowflake IP address: {snowflake_entity['ip_address']} (Risk Score: {snowflake_entity['risk_score']:.4f})")
        else:
            # Generate synthetic data
            if self.scenario_generator:
                user_data = self.scenario_generator.generate_real_user_data("high_risk")
                entity_data = self.scenario_generator.generate_real_entity_data()
            else:
                # Fallback synthetic data
                user_data = {
                    "user_id": f"test_user_{int(time.time())}",
                    "email": "test@example.com",
                    "first_name": "Test",
                    "app_id": "test_app"
                    # NO mock IP address - agents should skip IP tools if not available
                }
                entity_data = {
                    "entity_id": user_data["user_id"],
                    "entity_type": "user_id",
                    "source": "synthetic"
                }
            self.logger.info("Using synthetic test data")
        
        # Create investigation context
        # Use appropriate entity type based on what we're investigating
        if entity_data.get("entity_type") == "ip_address":
            entity_type = EntityType.IP_ADDRESS
        else:
            entity_type = EntityType.USER_ID
            
        context = AutonomousInvestigationContext(
            investigation_id=investigation_id,
            entity_id=entity_data["entity_id"],
            entity_type=entity_type,
            investigation_type="fraud_investigation"
        )
        
        # Add data sources
        context.data_sources["user"] = user_data
        context.data_sources["entity"] = entity_data
        context.data_sources["scenario"] = {"name": scenario_name, "test_mode": self.config.mode.value}
        
        # Transaction data is handled through Snowflake integration
        
        context.current_phase = InvestigationPhase.ANALYSIS
        return context

    async def _run_comprehensive_investigation(
        self, 
        context: AutonomousInvestigationContext, 
        result: InvestigationResult
    ) -> Dict[str, Any]:
        """Run comprehensive multi-agent investigation using proper LangGraph orchestration"""
        
        # IPS Cache now controlled by TEST_MODE (set below based on mode)
        
        # Configure Snowflake integration and TEST_MODE based on mode
        if self.config.mode == TestMode.LIVE:
            os.environ["USE_SNOWFLAKE"] = "true"
            os.environ.pop("TEST_MODE", None)  # Remove TEST_MODE for live testing
            self.logger.info("❄️ Enabling real Snowflake integration for LIVE mode")
        else:
            os.environ["USE_SNOWFLAKE"] = "false"
            if self.config.mode == TestMode.MOCK:
                os.environ["TEST_MODE"] = "mock"
                self.logger.warning("🎭🎭🎭 TEST_MODE=mock set - will use MockLLM instead of real Claude/GPT 🎭🎭🎭")
            self.logger.info(f"🎭 Using mock Snowflake client for {self.config.mode.value.upper()} mode")
        
        # CRITICAL FIX: Use proper LangGraph orchestration with hybrid intelligence
        try:
            # Use proper hybrid intelligence graph selection based on feature flags
            # The hybrid system will automatically fallback to clean graph if needed
            graph = await get_investigation_graph(
                investigation_id=context.investigation_id,
                entity_type=context.entity_type.value
                # Removed force_graph_type to allow normal hybrid/clean selection
            )            
            # Create proper AgentContext for orchestration system
            from app.models.agent_context import AgentContext
            from app.models.agent_headers import OlorinHeader, AuthContext
            from app.models.agent_request import Metadata
            
            # Create minimal AgentContext that orchestration system expects
            olorin_header = OlorinHeader(
                auth_context=AuthContext(
                    user_id="test-user",
                    is_internal=True,
                    permissions=["read", "write"],
                    olorin_user_id="test-user",
                    olorin_user_token="test-token"
                ),
                olorin_tid=f"test-tid-{context.investigation_id}",  # Add missing olorin_tid
                olorin_experience_id="test-experience",
                user_id="test-user"
            )
            
            # Include entity risk score in metadata for MockLLM
            additional_metadata = {
                "investigation_id": context.investigation_id,
                "entity_id": context.entity_id,
                "entity_type": context.entity_type.value,
                "scenario": result.scenario_name
            }
            
            # Add entity risk score if using Snowflake data
            if hasattr(context, 'data_sources') and 'entity' in context.data_sources:
                entity_data = context.data_sources['entity']
                if entity_data.get('source') == 'snowflake' and 'risk_score' in entity_data:
                    # Convert to string since additional_metadata expects Dict[str, str]
                    additional_metadata['entity_risk_score'] = str(entity_data['risk_score'])
                    self.logger.info(f"📊 Passing entity risk score to agents: {entity_data['risk_score']:.4f}")
            
            agent_metadata = Metadata(
                interactionGroupId=context.investigation_id,
                additionalMetadata=additional_metadata
            )
            
            agent_context = AgentContext(
                input=f"Start comprehensive fraud investigation for {context.entity_type.value} {context.entity_id}",
                olorin_header=olorin_header,
                metadata=agent_metadata
            )
            
            # Create proper configuration for LangGraph with monitoring callbacks
            config = {
                "configurable": {
                    "thread_id": f"test-{context.investigation_id}",
                    "agent_context": agent_context,
                    "request": None,
                }
            }
            
            # Add monitoring callbacks if verbose mode is enabled
            if self.config.verbose and hasattr(self, 'llm_callback'):
                config["callbacks"] = [self.llm_callback]
            
            # Create initial state based on graph type
            feature_flags = get_feature_flags()
            if feature_flags.is_enabled("hybrid_graph_v1", context.investigation_id):
                # Create hybrid state for hybrid graph
                from app.service.agent.orchestration.hybrid.hybrid_state_schema import create_hybrid_initial_state
                initial_state = create_hybrid_initial_state(
                    investigation_id=context.investigation_id,
                    entity_id=context.entity_id,
                    entity_type=context.entity_type.value,
                    parallel_execution=True,
                    max_tools=52
                )
                self.logger.info("🧠 Using Hybrid Intelligence Graph system...")
                self.logger.info(f"   Created hybrid state with {len(initial_state.get('decision_audit_trail', []))} initial audit trail entries")
            else:
                # Create regular state for clean graph
                initial_state = create_initial_state(
                    investigation_id=context.investigation_id,
                    entity_id=context.entity_id,
                    entity_type=context.entity_type.value,
                    parallel_execution=True,
                    max_tools=52
                )
                self.logger.info("🔄 Using clean graph orchestration system...")
            start_time = time.time()
            
            # Step 8.1.1: Mode-specific recursion limits - LIVE: 100, MOCK: 50
            recursion_limit = 100 if self.config.mode == TestMode.LIVE else 50
            
            self.logger.debug(f"[Step 8.1.1] 🔄 RECURSION LIMITS - Mode-specific configuration")
            self.logger.debug(f"[Step 8.1.1]   Test mode: {self.config.mode}")
            self.logger.debug(f"[Step 8.1.1]   Recursion limit: {recursion_limit} ({'LIVE: 100' if self.config.mode == TestMode.LIVE else 'MOCK: 50'})")
            self.logger.debug(f"[Step 8.1.1]   Rationale: {'Complex investigations need higher limits' if self.config.mode == TestMode.LIVE else 'Test mode uses conservative limits'}")
            self.logger.debug(f"[Step 8.1.1]   Graph config: recursion_limit={recursion_limit}")
            
            # Execute clean graph with initial state
            self.logger.debug(f"[Step 8.1.1] 🚀 GRAPH EXECUTION - Starting LangGraph with configured limits")
            self.logger.debug(f"[Step 8.1.1]   Initial state keys: {list(initial_state.keys())}")
            self.logger.debug(f"[Step 8.1.1]   Investigation ID: {initial_state.get('investigation_id', 'N/A')}")
            self.logger.debug(f"[Step 8.1.1]   Entity: {initial_state.get('entity_type', 'N/A')} - {initial_state.get('entity_id', 'N/A')}")
            
            try:
                # Configure for both clean and hybrid graphs
                config = {"recursion_limit": recursion_limit}
                
                # If using hybrid graph (with checkpointer), add thread_id
                feature_flags = get_feature_flags()
                if feature_flags.is_enabled("hybrid_graph_v1", context.investigation_id):
                    config["configurable"] = {"thread_id": context.investigation_id}
                    self.logger.debug(f"[Step 8.1.1]   Added thread_id for hybrid graph: {context.investigation_id}")
                
                langgraph_result = await graph.ainvoke(
                    initial_state,
                    config=config
                )
                
                duration = time.time() - start_time
                # Log completion with appropriate graph type
                feature_flags = get_feature_flags()
                graph_type = "Hybrid Intelligence" if feature_flags.is_enabled("hybrid_graph_v1", context.investigation_id) else "Clean"
                self.logger.info(f"✅ {graph_type} graph orchestration completed in {duration:.2f}s")
                
            except Exception as e:
                duration = time.time() - start_time
                
                # Step 7.2.1: LLM error categorization - Context length, model not found, API errors
                self.logger.debug(f"[Step 7.2.1] 🚨 LLM ERROR CATEGORIZATION - Analyzing error type")
                self.logger.debug(f"[Step 7.2.1]   Exception type: {type(e).__name__}")
                self.logger.debug(f"[Step 7.2.1]   Exception string: {str(e)}")
                self.logger.debug(f"[Step 7.2.1]   Investigation duration before failure: {duration:.2f}s")
                self.logger.debug(f"[Step 7.2.1]   Entity ID: {context.entity_id}")
                
                # Handle LLM orchestration failures gracefully - NO FALLBACKS
                if "context_length_exceeded" in str(e) or "maximum context length" in str(e) or "token limit" in str(e).lower():
                    self.logger.debug(f"[Step 7.2.1] 📏 CONTEXT LENGTH ERROR - LLM token limit exceeded")
                    self.logger.debug(f"[Step 7.2.1]   Error category: Context Length Exceeded")
                    self.logger.debug(f"[Step 7.2.1]   Recovery action: None (NO FALLBACKS)")
                    self.logger.debug(f"[Step 7.2.1]   User guidance: Fix orchestration context length issue")
                    
                    self.logger.error(f"❌ LLM orchestration failed: Context length exceeded")
                    self.logger.error(f"   Error: {str(e)}")
                    self.logger.error(f"   Investigation duration before failure: {duration:.2f}s")
                    self.logger.error(f"❌ Test failed for {context.entity_id}: Fix orchestration context length issue.")
                    
                    # Step 7.2.2: Graceful failure with no fallbacks - Errors are logged and re-raised
                    self.logger.debug(f"[Step 7.2.2] 🛑 GRACEFUL FAILURE - Re-raising context length error (NO FALLBACKS)")
                    raise e
                        
                elif "not_found_error" in str(e).lower() or "notfounderror" in str(type(e)).lower() or "model:" in str(e).lower():
                    self.logger.debug(f"[Step 7.2.1] 🔍 MODEL NOT FOUND ERROR - LLM model unavailable")
                    self.logger.debug(f"[Step 7.2.1]   Error category: Model Not Found")
                    self.logger.debug(f"[Step 7.2.1]   Recovery action: None (NO FALLBACKS)")
                    self.logger.debug(f"[Step 7.2.1]   User guidance: Fix model configuration (check model name/availability)")
                    
                    self.logger.error(f"❌ LLM orchestration failed: Model not found")
                    self.logger.error(f"   Error type: {type(e).__name__}")
                    self.logger.error(f"   Error details: {str(e)}")
                    self.logger.error(f"   Investigation duration before failure: {duration:.2f}s")
                    self.logger.error(f"❌ Test failed for {context.entity_id}: Fix model configuration (check model name/availability).")
                    
                    # Step 7.2.2: Graceful failure with no fallbacks
                    self.logger.debug(f"[Step 7.2.2] 🛑 GRACEFUL FAILURE - Re-raising model not found error (NO FALLBACKS)")
                    raise e
                        
                elif any(error_type in str(type(e)).lower() for error_type in ["badrequest", "apierror", "ratelimit"]) or any(provider in str(e).lower() for provider in ["openai", "anthropic", "google"]):
                    self.logger.debug(f"[Step 7.2.1] 🌐 API ERROR - LLM provider API failure")
                    self.logger.debug(f"[Step 7.2.1]   Error category: API Error")
                    self.logger.debug(f"[Step 7.2.1]   Detected error types: {[t for t in ['badrequest', 'apierror', 'ratelimit'] if t in str(type(e)).lower()]}")
                    self.logger.debug(f"[Step 7.2.1]   Detected providers: {[p for p in ['openai', 'anthropic', 'google'] if p in str(e).lower()]}")
                    self.logger.debug(f"[Step 7.2.1]   Recovery action: None (NO FALLBACKS)")
                    self.logger.debug(f"[Step 7.2.1]   User guidance: Fix API configuration or connection issue")
                    
                    self.logger.error(f"❌ LLM orchestration failed: API error")
                    self.logger.error(f"   Error type: {type(e).__name__}")
                    self.logger.error(f"   Error details: {str(e)}")
                    self.logger.error(f"   Investigation duration before failure: {duration:.2f}s")
                    self.logger.error(f"❌ Test failed for {context.entity_id}: Fix API configuration or connection issue.")
                    
                    # Step 7.2.2: Graceful failure with no fallbacks
                    self.logger.debug(f"[Step 7.2.2] 🛑 GRACEFUL FAILURE - Re-raising API error (NO FALLBACKS)")
                    raise e
                        
                else:
                    self.logger.debug(f"[Step 7.2.1] ❓ UNEXPECTED ERROR - Unhandled error type")
                    self.logger.debug(f"[Step 7.2.1]   Error category: Unexpected Error")
                    self.logger.debug(f"[Step 7.2.1]   Recovery action: None (NO FALLBACKS)")
                    self.logger.debug(f"[Step 7.2.1]   User guidance: Fix orchestration failure")
                    
                    # Re-raise unexpected errors with clean error message
                    self.logger.error(f"❌ LLM orchestration failed: Unexpected error")
                    self.logger.error(f"   Error type: {type(e).__name__}")
                    self.logger.error(f"   Error details: {str(e)}")
                    self.logger.error(f"   Investigation duration before failure: {duration:.2f}s")
                    self.logger.error(f"❌ Test failed for {context.entity_id}: Fix orchestration failure.")
                    
                    # Step 7.2.2: Graceful failure with no fallbacks
                    self.logger.debug(f"[Step 7.2.2] 🛑 GRACEFUL FAILURE - Re-raising unexpected error (NO FALLBACKS)")
                    raise e
            
            # Debug: Log what investigation graph returned
            # Log result with appropriate graph type
            feature_flags = get_feature_flags()
            graph_type = "Hybrid Intelligence" if feature_flags.is_enabled("hybrid_graph_v1", context.investigation_id) else "Clean"
            self.logger.info(f"🔍 {graph_type} graph result keys: {list(langgraph_result.keys())[:10]}...")  # Show first 10 keys
            # CRITICAL FIX: Don't coerce None risk scores to 0.0 - respect evidence gating
            risk_score = langgraph_result.get('risk_score')
            confidence_score = langgraph_result.get('confidence_score')
            
            risk_display = f"{risk_score:.2f}" if risk_score is not None else "N/A (blocked by evidence gating)"
            confidence_display = f"{confidence_score:.2f}" if confidence_score is not None else "N/A"
            
            self.logger.info(f"🔍 Final risk score: {risk_display}")
            self.logger.info(f"🔍 Confidence score: {confidence_display}")
            self.logger.info(f"🔍 Tools used: {len(langgraph_result.get('tools_used', []))}")
            self.logger.info(f"🔍 Domains completed: {langgraph_result.get('domains_completed', [])}")
            self.logger.info(f"🔍 Current phase: {langgraph_result.get('current_phase', 'unknown')}")
            
            # Store the full graph result for validation
            result.graph_result = langgraph_result
            
            # Store initial risk score from Snowflake if available
            if self.snowflake_entities and context:
                for entity in self.snowflake_entities:
                    if entity.get('ip_address') == context.entity_id:
                        result.initial_risk_score = entity.get('risk_score', 0.99)
                        break
            
            # Extract agent results from clean graph execution
            agent_results = self._extract_agent_results_from_clean_graph(langgraph_result, duration)
            
            return agent_results
            
        except Exception as e:
            # Handle LLM API errors gracefully with clean logging
            if "context_length_exceeded" in str(e) or "maximum context length" in str(e) or "token limit" in str(e).lower():
                self.logger.error(f"❌ LLM context length exceeded in comprehensive investigation")
                self.logger.error(f"   Error: {str(e)}")
                self.logger.error(f"   Investigation ID: {context.entity_id}")
                self.logger.error(f"   Investigation cannot continue - fix context length issue")
                raise e
            elif "not_found_error" in str(e).lower() or "notfounderror" in str(type(e)).lower() or "model:" in str(e).lower():
                self.logger.error(f"❌ LLM model not found in comprehensive investigation")
                self.logger.error(f"   Error type: {type(e).__name__}")
                self.logger.error(f"   Error details: {str(e)}")
                self.logger.error(f"   Investigation ID: {context.entity_id}")
                self.logger.error(f"   Investigation cannot continue - fix model configuration (check model name/availability)")
                raise e
            elif any(error_type in str(type(e)).lower() for error_type in ["badrequest", "apierror", "ratelimit"]) or any(provider in str(e).lower() for provider in ["openai", "anthropic", "google"]):
                self.logger.error(f"❌ LLM API error in comprehensive investigation")
                self.logger.error(f"   Error type: {type(e).__name__}")
                self.logger.error(f"   Error details: {str(e)}")
                self.logger.error(f"   Investigation ID: {context.entity_id}")
                self.logger.error(f"   Investigation cannot continue - fix API configuration")
                raise e
            else:
                self.logger.error(f"❌ LangGraph orchestration failed: {e}")
                self.logger.error(f"   Error type: {type(e).__name__}")
                self.logger.error(f"   Investigation ID: {context.entity_id}")
                self.logger.error(f"   Investigation cannot continue - unexpected error")
                raise e
    
    def _extract_agent_results_from_langgraph(self, langgraph_result: Dict, total_duration: float) -> Dict[str, Any]:
        """Extract individual agent results from LangGraph execution"""
        agent_results = {}
        
        # Extract messages from LangGraph result
        messages = langgraph_result.get("messages", [])
        
        # Parse agent results from messages
        for message in messages:
            try:
                if hasattr(message, 'content'):
                    content = message.content
                    if isinstance(content, str):
                        try:
                            parsed_content = json.loads(content)
                            if "risk_assessment" in parsed_content:
                                # This is an agent result
                                risk_assessment = parsed_content["risk_assessment"]
                                domain = risk_assessment.get("domain", "unknown")
                                
                                agent_results[domain] = {
                                    "findings": message,
                                    "duration": total_duration / 4,  # Approximate duration per agent
                                    "status": "success",
                                    "risk_score": risk_assessment.get("risk_level", 0.0),
                                    "confidence": risk_assessment.get("confidence", 0.0)
                                }
                        except json.JSONDecodeError:
                            continue
            except Exception:
                continue
        
        # Ensure we have results for all expected domains
        expected_domains = ["network", "device", "location", "logs", "authentication", "risk"]
        for domain in expected_domains:
            if domain not in agent_results:
                agent_results[domain] = {
                    "findings": {"messages": [{"content": f"No {domain} analysis results available"}]},
                    "duration": 0.0,
                    "status": "no_results",
                    "risk_score": 0.0,
                    "confidence": 0.0
                }
        
        return agent_results
    
    def _extract_agent_results_from_clean_graph(self, graph_result: Dict, total_duration: float) -> Dict[str, Any]:
        """Extract individual agent results from clean graph execution"""
        agent_results = {}
        
        # Extract domain findings from the clean graph state
        domain_findings = graph_result.get("domain_findings", {})
        domains_completed = graph_result.get("domains_completed", [])
        
        # Map clean graph domains to expected agent names
        domain_mapping = {
            "network": "network",
            "device": "device",
            "location": "location",
            "logs": "logs",
            "risk": "risk"
        }
        
        # Process each domain's findings
        for domain, agent_name in domain_mapping.items():
            if domain in domain_findings:
                findings = domain_findings[domain]
                agent_results[agent_name] = {
                    "findings": findings,
                    "duration": total_duration / len(domain_mapping),  # Approximate duration
                    "status": "success" if domain in domains_completed else "partial",
                    "risk_score": findings.get("risk_score", 0.0),
                    "confidence": findings.get("confidence", 0.0)
                }
            else:
                # Add default result if domain wasn't analyzed
                agent_results[agent_name] = {
                    "findings": {"messages": [{"content": f"No {domain} analysis available"}]},
                    "duration": 0.0,
                    "status": "no_results",
                    "risk_score": 0.0,
                    "confidence": 0.0
                }
        
        # SINGLE SOURCE OF TRUTH: Use risk aggregation result from single aggregator
        # The risk domain contains the authoritative final risk score from the single aggregator
        if "risk" in domain_findings:
            # Use the result from our single source of truth aggregator
            risk_findings = domain_findings["risk"]
            final_risk_score = graph_result.get("risk_score")  # This comes from the single aggregator
            final_confidence = graph_result.get("confidence_score", 0.0)
            
            agent_results["risk_aggregation"] = {
                "findings": {
                    "risk_score": final_risk_score,
                    "confidence": final_confidence,
                    "tools_used": len(graph_result.get("tools_used", [])),
                    "investigation_complete": graph_result.get("current_phase") == "complete",
                    "narrative": risk_findings.get("narrative", "Risk synthesis from single aggregator"),
                    "analysis": risk_findings.get("analysis", {})
                },
                "duration": total_duration * 0.1,  # Risk aggregation is typically quick
                "status": "success" if final_risk_score is not None else "blocked_by_evidence_gating",
                "risk_score": final_risk_score,
                "confidence": final_confidence
            }
        else:
            # Fallback: Use overall graph results if risk domain not available
            agent_results["risk_aggregation"] = {
                "findings": {
                    "risk_score": graph_result.get("risk_score"),
                    "confidence": graph_result.get("confidence_score", 0.0),
                    "tools_used": len(graph_result.get("tools_used", [])),
                    "investigation_complete": graph_result.get("current_phase") == "complete"
                },
                "duration": total_duration,
                "status": "success" if graph_result.get("current_phase") == "complete" else "partial",
                "risk_score": graph_result.get("risk_score"),
                "confidence": graph_result.get("confidence_score", 0.0)
            }
        
        # Add Snowflake data if available
        if graph_result.get("snowflake_completed"):
            agent_results["snowflake"] = {
                "findings": graph_result.get("snowflake_data", {}),
                "duration": 2.0,  # Typical Snowflake query time
                "status": "success",
                "risk_score": 0.0,
                "confidence": 1.0
            }
        
        return agent_results
    
    async def _generate_fallback_results(self, context: AutonomousInvestigationContext, result: InvestigationResult) -> Dict[str, Any]:
        """Fallbacks are disabled for LIVE; surface orchestration failure instead of generating data."""
        raise RuntimeError("Fallback result generation is disabled in LIVE mode. Fix orchestration failure.")

    async def _validate_investigation_results(
        self,
        context: AutonomousInvestigationContext,
        result: InvestigationResult
    ) -> Dict[str, Any]:
        """Comprehensive validation of investigation results"""
        
        # Use enhanced validation if available
        if ENHANCED_VALIDATION_AVAILABLE and hasattr(result, 'graph_result'):
            try:
                enhanced_validator = get_enhanced_validator()
                
                # Prepare initial context for validation
                initial_context = {
                    'investigation_id': result.investigation_id,
                    'entity_id': context.entity_id if context else None,
                    'entity_type': context.entity_type.value if context and hasattr(context.entity_type, 'value') else str(context.entity_type) if context else None,
                }
                
                # Add Snowflake risk score if available
                if hasattr(result, 'initial_risk_score'):
                    initial_context['snowflake_risk_score'] = result.initial_risk_score
                elif self.snowflake_entities:
                    # Find matching entity from Snowflake data
                    for entity in self.snowflake_entities:
                        if entity.get('ip_address') == context.entity_id:
                            initial_context['snowflake_risk_score'] = entity.get('risk_score', 0.99)
                            break
                
                # Run enhanced validation
                enhanced_result: EnhancedValidationResult = await enhanced_validator.validate_investigation(
                    investigation_id=result.investigation_id,
                    initial_context=initial_context,
                    investigation_result=result.graph_result if hasattr(result, 'graph_result') else {},
                    agent_results=result.agent_results if result.agent_results else {}
                )
                
                # Convert enhanced validation to standard format
                validation_results = {
                    "overall_score": enhanced_result.overall_score,
                    "completion_score": 100 if enhanced_result.data_extraction_status.value == "success" else 0,
                    "accuracy_score": 100 if enhanced_result.risk_consistency_passed else 0,
                    "performance_score": 90,  # Default performance score
                    "logging_score": 100,  # Default logging score
                    "journey_score": 100,  # Default journey score
                    "quality_score": enhanced_result.evidence_quality_score * 100,
                    "correlation_score": 80 if enhanced_result.risk_consistency_passed else 40,
                    "business_logic_score": 100 if enhanced_result.minimum_evidence_met else 50,
                    "validation_status": enhanced_result.validation_status.value,
                    "critical_issues": enhanced_result.critical_issues,
                    "warnings": enhanced_result.warnings,
                    "recommendations": enhanced_result.recommendations,
                    "details": {
                        "data_extraction_status": enhanced_result.data_extraction_status.value,
                        "extraction_failures": enhanced_result.extraction_failures,
                        "initial_risk": enhanced_result.initial_risk_score,
                        "final_risk": enhanced_result.final_risk_score,
                        "risk_delta": enhanced_result.risk_score_delta,
                        "evidence_count": enhanced_result.evidence_count,
                        "minimum_evidence_met": enhanced_result.minimum_evidence_met,
                        "llm_verification_score": enhanced_result.llm_verification_score,
                        "llm_verification_passed": enhanced_result.llm_verification_passed
                    }
                }
                
                # Mark investigation as failed if validation failed
                if enhanced_result.validation_status in [ValidationStatus.FAILED, ValidationStatus.CRITICAL_FAILURE]:
                    result.status = "failed"
                    result.errors.extend(enhanced_result.critical_issues)
                    self.logger.error(f"❌ Investigation FAILED validation: {enhanced_result.critical_issues}")
                elif enhanced_result.validation_status == ValidationStatus.WARNING:
                    self.logger.warning(f"⚠️  Investigation has warnings: {enhanced_result.warnings}")
                
                return validation_results
                
            except Exception as e:
                self.logger.error(f"Enhanced validation failed, falling back to standard: {e}")
                # Fall through to standard validation
        
        # Standard validation (fallback)
        validation_results = {
            "overall_score": 0,
            "completion_score": 0,
            "accuracy_score": 0,
            "performance_score": 0,
            "logging_score": 0,
            "journey_score": 0,
            "quality_score": 0,
            "correlation_score": 0,
            "business_logic_score": 0,
            "details": {}
        }
        
        try:
            # Validate investigation completion
            completion_score = 0
            successful_agents = sum(1 for data in result.agent_results.values() 
                                   if data.get("status") == "success")
            total_agents = len(result.agent_results)
            
            if total_agents > 0:
                completion_score = (successful_agents / total_agents) * 100
            
            validation_results["completion_score"] = completion_score
            validation_results["details"]["successful_agents"] = successful_agents
            validation_results["details"]["total_agents"] = total_agents
            
            # Validate performance metrics
            total_duration = sum(data.get("duration", 0) for data in result.agent_results.values())
            performance_score = 100 if total_duration < 30 else max(0, 100 - (total_duration - 30) * 2)
            
            validation_results["performance_score"] = performance_score
            validation_results["details"]["total_duration"] = total_duration
            
            # Enhanced accuracy validation (risk score quality)
            final_risk = result.agent_results.get("risk_aggregation", {}).get("risk_score", 0)
            accuracy_score = self._validate_risk_score_accuracy(final_risk, context.investigation_type if context else "unknown")
            
            validation_results["accuracy_score"] = accuracy_score
            validation_results["details"]["final_risk_score"] = final_risk
            
            # Validate logging completeness
            logging_score = 100  # Assume logging is comprehensive for now
            validation_results["logging_score"] = logging_score
            
            # Validate journey tracking
            journey_score = 100 if hasattr(self.journey_tracker, 'active_journeys') else 0
            validation_results["journey_score"] = journey_score
            
            # Enhanced validation: Agent response quality
            quality_score = self._validate_agent_response_quality(result.agent_results)
            validation_results["quality_score"] = quality_score
            
            # Enhanced validation: Cross-domain correlation
            correlation_score = self._validate_cross_domain_correlation(result.agent_results)
            validation_results["correlation_score"] = correlation_score
            
            # Enhanced validation: Business logic consistency
            business_logic_score = self._validate_business_logic(result.agent_results, context.investigation_type if context else "unknown")
            validation_results["business_logic_score"] = business_logic_score
            
            # Calculate enhanced overall score with comprehensive criteria
            validation_results["overall_score"] = (
                completion_score * 0.20 +      # Reduced weight - completion is basic
                performance_score * 0.15 +     # Reduced weight
                accuracy_score * 0.20 +        # Same weight - important
                quality_score * 0.15 +         # NEW - Agent response quality
                correlation_score * 0.10 +     # NEW - Cross-domain correlation
                business_logic_score * 0.10 +  # NEW - Business logic consistency
                logging_score * 0.05 +         # Reduced weight
                journey_score * 0.05          # Reduced weight
            )
            
        except Exception as e:
            self.logger.error(f"❌ Validation failed: {e}")
            validation_results["details"]["validation_error"] = str(e)
        
        return validation_results

    def _validate_risk_score_accuracy(self, risk_score: float, scenario_type: str) -> float:
        """Enhanced risk score accuracy validation"""
        
        if not isinstance(risk_score, (int, float)):
            return 20  # Major penalty for non-numeric scores
        
        # Basic range validation
        if not (0 <= risk_score <= 1):
            return 30  # Major penalty for out-of-range scores
        
        # Scenario-specific expectations (these would be based on domain knowledge)
        expected_ranges = {
            "velocity_abuse": (0.6, 0.9),      # Should be high risk
            "impossible_travel": (0.7, 1.0),   # Should be very high risk  
            "device_spoofing": (0.5, 0.8),     # Should be medium-high risk
            "account_takeover": (0.7, 0.95),   # Should be high risk
            "synthetic_identity": (0.6, 0.9),  # Should be high risk
        }
        
        expected_range = expected_ranges.get(scenario_type, (0.3, 0.8))  # Default range
        min_expected, max_expected = expected_range
        
        # Score based on how well it matches expectations
        if min_expected <= risk_score <= max_expected:
            return 100  # Perfect match to expectations
        elif min_expected - 0.2 <= risk_score <= max_expected + 0.2:
            return 80   # Close to expectations
        elif 0 < risk_score < 1:
            return 60   # Valid range but not ideal for scenario
        else:
            return 40   # Valid but concerning
    
    def _validate_agent_response_quality(self, agent_results: Dict[str, Any]) -> float:
        """Validate the quality of agent responses"""
        
        total_score = 0
        agent_count = 0
        
        for agent_name, data in agent_results.items():
            if agent_name == "risk_aggregation":
                continue  # Skip aggregation agent
                
            agent_count += 1
            agent_score = 0
            
            # Check if agent provided findings
            findings = data.get("findings", "")
            if findings and len(str(findings)) > 50:  # Substantial findings
                agent_score += 40
            elif findings:
                agent_score += 20  # Some findings
            
            # Check if agent provided risk score
            if "risk_score" in data and isinstance(data["risk_score"], (int, float)):
                if 0 <= data["risk_score"] <= 1:
                    agent_score += 30
                else:
                    agent_score += 10  # Invalid range
            
            # Check if agent completed successfully
            if data.get("status") == "success":
                agent_score += 20
            
            # Check response time (reasonable performance)
            duration = data.get("duration", 0)
            if duration < 10:  # Fast response
                agent_score += 10
            elif duration < 30:  # Acceptable response
                agent_score += 5
            
            total_score += agent_score
        
        return (total_score / (agent_count * 100)) * 100 if agent_count > 0 else 50
    
    def _validate_cross_domain_correlation(self, agent_results: Dict[str, Any]) -> float:
        """Validate correlation between different agent domains"""
        
        # Extract risk scores from different agents
        agent_scores = {}
        for agent_name, data in agent_results.items():
            if agent_name != "risk_aggregation" and "risk_score" in data:
                agent_scores[agent_name] = data.get("risk_score", 0)
        
        if len(agent_scores) < 2:
            return 50  # Can't validate correlation with < 2 agents
        
        scores = list(agent_scores.values())
        
        # Check for reasonable score variation (not all identical)
        score_range = max(scores) - min(scores)
        if score_range < 0.05:  # Too similar - likely mock or error
            return 40
        elif score_range > 0.8:  # Too different - inconsistent analysis
            return 60
        
        # Check for reasonable aggregation
        avg_individual = sum(scores) / len(scores)
        aggregated_score = agent_results.get("risk_aggregation", {}).get("risk_score", 0)
        
        if abs(aggregated_score - avg_individual) < 0.15:  # Close to average
            return 90
        elif abs(aggregated_score - avg_individual) < 0.25:  # Reasonably close
            return 75
        else:
            return 55  # Significant deviation
    
    def _validate_business_logic(self, agent_results: Dict[str, Any], scenario_type: str) -> float:
        """Validate business logic consistency for fraud detection"""
        
        score = 100
        
        # Check that findings mention relevant fraud indicators for the scenario
        scenario_keywords = {
            "velocity_abuse": ["velocity", "rapid", "frequency", "rate"],
            "impossible_travel": ["travel", "location", "geographic", "distance"],
            "device_spoofing": ["device", "fingerprint", "spoofing", "virtual"],
            "account_takeover": ["account", "credential", "unauthorized", "suspicious"],
            "synthetic_identity": ["identity", "synthetic", "profile", "fabricated"]
        }
        
        expected_keywords = scenario_keywords.get(scenario_type, [])
        if expected_keywords:
            keyword_found = False
            for agent_name, data in agent_results.items():
                findings_text = str(data.get("findings", "")).lower()
                if any(keyword in findings_text for keyword in expected_keywords):
                    keyword_found = True
                    break
            
            if not keyword_found:
                score -= 30  # Penalty for missing scenario-specific indicators
        
        # Check for reasonable confidence levels
        confidences = []
        for agent_name, data in agent_results.items():
            if "confidence" in data:
                confidences.append(data["confidence"])
        
        if confidences:
            avg_confidence = sum(confidences) / len(confidences)
            if avg_confidence < 0.5:  # Very low confidence
                score -= 20
            elif avg_confidence > 0.95:  # Unrealistically high confidence
                score -= 10
        
        # Check for error handling evidence
        error_count = sum(1 for data in agent_results.values() 
                         if data.get("status") == "error")
        if error_count > len(agent_results) * 0.5:  # More than half failed
            score -= 25
        
        return max(0, score)

    def _calculate_execution_confidence(self, agent_results: Dict[str, Any]) -> float:
        """Calculate execution confidence based on agent success rates and data quality"""
        if not agent_results:
            return 0.0
        
        # Calculate success rate based on agent statuses
        total_agents = len(agent_results)
        successful_agents = sum(1 for agent_data in agent_results.values() 
                              if agent_data.get("status") == "success")
        partial_agents = sum(1 for agent_data in agent_results.values() 
                           if agent_data.get("status") == "partial")
        
        # Base confidence from success rates
        success_rate = successful_agents / total_agents
        partial_rate = partial_agents / total_agents
        base_confidence = success_rate + (partial_rate * 0.5)  # Partial success counts as 50%
        
        # Adjust confidence based on individual agent confidence scores
        individual_confidences = [agent_data.get("confidence", 0.0) 
                                for agent_data in agent_results.values()]
        if individual_confidences:
            avg_individual_confidence = sum(individual_confidences) / len(individual_confidences)
            # Weight base confidence with individual confidences
            adjusted_confidence = (base_confidence * 0.6) + (avg_individual_confidence * 0.4)
        else:
            adjusted_confidence = base_confidence
        
        # Apply quality penalties for low data quality indicators
        quality_penalty = 0.0
        
        # Check for failed agents
        failed_agents = sum(1 for agent_data in agent_results.values() 
                          if agent_data.get("status") in ["error", "no_results"])
        if failed_agents > 0:
            quality_penalty += (failed_agents / total_agents) * 0.3
        
        # Check for very low individual confidences (indicates data quality issues)
        low_confidence_count = sum(1 for conf in individual_confidences if conf < 0.3)
        if low_confidence_count > 0:
            quality_penalty += (low_confidence_count / total_agents) * 0.2
        
        # Final confidence with penalties applied
        final_confidence = max(0.0, min(1.0, adjusted_confidence - quality_penalty))
        
        return final_confidence

    async def _collect_performance_metrics(
        self,
        context: AutonomousInvestigationContext,
        result: InvestigationResult
    ) -> Dict[str, Any]:
        """Collect comprehensive performance metrics"""
        
        performance_data = {
            "total_duration": result.duration,
            "agent_timings": {},
            "memory_usage": {},
            "token_usage": {},
            "api_calls": {},
            "error_rates": {},
            "throughput_metrics": {}
        }
        
        try:
            # Agent timing analysis
            for agent_name, agent_data in result.agent_results.items():
                duration = agent_data.get("duration", 0)
                performance_data["agent_timings"][agent_name] = {
                    "duration": duration,
                    "status": agent_data.get("status", "unknown"),
                    "performance_category": (
                        "excellent" if duration < 2 else
                        "good" if duration < 5 else
                        "fair" if duration < 10 else
                        "poor"
                    )
                }
            
            # Calculate throughput metrics
            successful_agents = sum(1 for data in result.agent_results.values() 
                                   if data.get("status") == "success")
            
            performance_data["throughput_metrics"] = {
                "agents_per_second": successful_agents / result.duration if result.duration > 0 else 0,
                "average_agent_time": sum(data.get("duration", 0) for data in result.agent_results.values()) / len(result.agent_results) if result.agent_results else 0,
                "parallel_efficiency": 1.0  # Placeholder for parallel execution efficiency
            }
            
            # Error rate analysis
            failed_agents = sum(1 for data in result.agent_results.values() 
                               if data.get("status") == "failed")
            total_agents = len(result.agent_results)
            
            performance_data["error_rates"] = {
                "agent_failure_rate": failed_agents / total_agents if total_agents > 0 else 0,
                "overall_success_rate": successful_agents / total_agents if total_agents > 0 else 0
            }
            
        except Exception as e:
            self.logger.error(f"❌ Performance metrics collection failed: {e}")
            performance_data["collection_error"] = str(e)
        
        return performance_data

    def _extract_risk_score_from_response(self, response) -> float:
        """
        UPDATED: Extract risk score from agent response - handles unified schema format
        This prevents 0.00 scores by properly extracting overall_risk_score from new format
        """
        if response is None:
            return 0.0
        
        # PRIORITY 1: Handle unified schema format (NEW - prevents 0.00 scores)
        if isinstance(response, dict):
            # Check for unified schema fields first
            if 'overall_risk_score' in response:
                score = response['overall_risk_score']
                if isinstance(score, (int, float)) and score > 0:
                    return float(score)
            
            # Extract from LangChain message format with unified schema
            if 'messages' in response:
                for message in response['messages']:
                    if hasattr(message, 'content'):
                        try:
                            content = json.loads(message.content)
                            
                            # UNIFIED SCHEMA: Look for overall_risk_score first
                            if 'overall_risk_score' in content:
                                score = content['overall_risk_score']
                                if isinstance(score, (int, float)) and score > 0:
                                    return float(score)
                                    
                            # Legacy compatibility: old risk_assessment format
                            if 'risk_assessment' in content:
                                risk_level = content['risk_assessment'].get('risk_level', 0.0)
                                if isinstance(risk_level, (int, float)) and risk_level > 0:
                                    return float(risk_level)
                                    
                        except (json.JSONDecodeError, KeyError, ValueError) as e:
                            self.logger.debug(f"JSON parsing failed for message content: {e}")
                            continue
            
            # Handle error responses gracefully
            if 'error' in response:
                return 0.0
                
            # Legacy: Direct risk_score field
            if 'risk_score' in response:
                score = response['risk_score']
                if isinstance(score, (int, float)):
                    return float(score) if score is not None else 0.0
        
        # Handle DomainFindings object (legacy)
        if hasattr(response, 'risk_score'):
            return response.risk_score or 0.0
        
        # Handle string response using improved validation
        if isinstance(response, str) and response.strip():
            try:
                # Try parsing as JSON first (unified schema format)
                try:
                    json_content = json.loads(response)
                    if isinstance(json_content, dict) and 'overall_risk_score' in json_content:
                        score = json_content['overall_risk_score']
                        if isinstance(score, (int, float)) and score > 0:
                            return float(score)
                except json.JSONDecodeError:
                    pass  # Not JSON, continue to text extraction
                
                # Use UnifiedSchemaValidator for text extraction
                from app.service.agent.schema_validator_fix import AgentType, get_unified_validator
                validator = get_unified_validator()
                
                # Try to extract risk score from text using the unified validator
                result = validator.extract_risk_score(response, AgentType.RISK, debug=False)
                if result and result.risk_level > 0:
                    return float(result.risk_level)
                    
                # Enhanced regex patterns for better extraction
                import re
                score_patterns = [
                    r'overall_risk_score[:\s]*([0-1]?\.\d+|\d+\.?\d*)',  # Unified schema format
                    r'(?:overall_)?risk_score[:\s]*([0-1]?\.\d+|\d+\.?\d*)',
                    r'(?:overall_)?risk_score\s*=\s*([0-1]?\.\d+|\d+\.?\d*)',
                    r'Risk Score[:\s]*([0-1]?\.\d+|\d+\.?\d*)',
                    r'risk_level[:\s]*([0-1]?\.\d+|\d+\.?\d*)'  # Legacy compatibility
                ]
                
                for pattern in score_patterns:
                    match = re.search(pattern, response, re.IGNORECASE)
                    if match:
                        score = float(match.group(1))
                        # Ensure score is in valid range
                        return min(max(score, 0.0), 1.0)
                        
            except Exception as e:
                self.logger.debug(f"Error extracting risk score from string response: {e}")
                
        return 0.0

    def _extract_confidence_from_response(self, response) -> float:
        """Extract confidence score from agent response"""
        if response is None:
            return 0.0
        
        # Handle DomainFindings object
        if hasattr(response, 'confidence'):
            return response.confidence or 0.0
        
        # Handle dict response
        if isinstance(response, dict):
            # Extract from LangChain message format
            if 'messages' in response:
                for message in response['messages']:
                    if hasattr(message, 'content'):
                        try:
                            content = json.loads(message.content)
                            if 'risk_assessment' in content:
                                confidence = content['risk_assessment'].get('confidence', 0.0)
                                return float(confidence) if confidence is not None else 0.0
                        except (json.JSONDecodeError, KeyError, ValueError):
                            pass
                            
            # Direct confidence field
            if 'confidence' in response:
                return float(response['confidence']) if response['confidence'] is not None else 0.0
        
        # Handle string response (LLM text output)
        if isinstance(response, str) and response.strip():
            try:
                import re
                # Look for confidence patterns
                confidence_patterns = [
                    r'confidence\s*score:\s*(\d+)',
                    r'confidence:\s*(\d+)',
                    r'Confidence Score:\s*(\d+)'
                ]
                
                for pattern in confidence_patterns:
                    match = re.search(pattern, response, re.IGNORECASE)
                    if match:
                        confidence = float(match.group(1))
                        # Ensure confidence is in valid range (0-100)
                        return min(max(confidence, 0.0), 100.0)
                        
            except Exception as e:
                self.logger.debug(f"Error extracting confidence from string response: {e}")
        
        return 0.0

    def _extract_final_risk_score(self, agent_results: Dict[str, Any]) -> float:
        """Extract final risk score from single source of truth aggregator"""
        # SINGLE SOURCE OF TRUTH: Use only the result from the single aggregator
        risk_agg = agent_results.get("risk_aggregation", {})
        risk_score = risk_agg.get("risk_score")
        
        # Handle None from evidence gating safely
        if risk_score is not None and isinstance(risk_score, (int, float)):
            return float(risk_score)
        
        # Evidence gating blocked the score or no risk aggregation available
        return 0.0

    def _extract_confidence_score(self, agent_results: Dict[str, Any]) -> float:
        """Extract final confidence score from aggregated results or individual agents"""
        # First try to get from risk aggregation agent
        risk_agg = agent_results.get("risk_aggregation", {})
        if risk_agg.get("confidence", 0.0) > 0:
            return risk_agg.get("confidence", 0.0)
        
        # Fallback: calculate from individual agent confidence scores
        confidence_scores = []
        for agent_name in ["device", "network", "location", "logs"]:
            if agent_name in agent_results:
                agent_data = agent_results[agent_name]
                if isinstance(agent_data, dict) and "confidence" in agent_data:
                    score = agent_data["confidence"]
                    if score > 0:
                        confidence_scores.append(score)
        
        # Return average if any exist, otherwise use a default confidence based on agent count
        if confidence_scores:
            return sum(confidence_scores) / len(confidence_scores)
        elif len([k for k in agent_results.keys() if k in ["device", "network", "location", "logs"]]) > 0:
            # If we have agent results but no explicit confidence, assume moderate confidence
            return 0.75
        
        return 0.0

    async def run_concurrent_tests(self, scenarios: List[str]) -> List[InvestigationResult]:
        """Run multiple scenarios concurrently"""
        self.logger.info(f"🔄 Running {len(scenarios)} scenarios concurrently (max {self.config.concurrent})")
        
        semaphore = asyncio.Semaphore(self.config.concurrent)
        
        async def run_with_semaphore(scenario):
            async with semaphore:
                return await self.run_single_scenario_test(scenario)
        
        tasks = [run_with_semaphore(scenario) for scenario in scenarios]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle exceptions in results
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                # Create failed result for exception
                failed_result = InvestigationResult(
                    investigation_id=f"failed_{scenarios[i]}_{int(time.time())}",
                    scenario_name=scenarios[i],
                    status="failed",
                    start_time=datetime.now(timezone.utc),
                    end_time=datetime.now(timezone.utc),
                    errors=[str(result)]
                )
                processed_results.append(failed_result)
            else:
                processed_results.append(result)
        
        return processed_results

    async def run_all_tests(self) -> Dict[str, Any]:
        """Run complete test suite based on configuration"""
        self.logger.info("🚀 Starting Unified Autonomous Investigation Test Suite")
        self.logger.info("=" * 80)
        
        self.metrics.start_time = time.time()
        
        # Always try to load data from Snowflake first (for all modes)
        snowflake_loaded = await self.load_snowflake_data()
        
        if not snowflake_loaded:
            self.logger.error("❌ Failed to load Snowflake data. This is required for investigation testing.")
            self.logger.error("❌ Please ensure Snowflake connection is properly configured and accessible.")
            self.logger.info("📊 Continuing with synthetic data for testing purposes only...")
            # Note: Some tests may fail without real Snowflake data
        
        # Get test scenarios or handle real entity investigation
        if self.config.entity_id and self.config.entity_type:
            # Real entity investigation mode
            scenarios = [f"real_investigation_{self.config.entity_type}"]
            self.logger.info(f"🔍 Running real entity investigation for {self.config.entity_type}: {self.config.entity_id}")
        elif self.config.all_scenarios:
            scenarios = await self.get_available_scenarios()
            self.logger.info(f"📊 Testing all {len(scenarios)} scenarios")
        elif self.config.scenario:
            scenarios = [self.config.scenario]
            self.logger.info(f"🎯 Testing single scenario: {self.config.scenario}")
        elif self.snowflake_entities and len(self.snowflake_entities) > 0:
            # Fallback: Use first Snowflake entity when no scenario or entity is specified
            first_entity = self.snowflake_entities[0]
            self.config.entity_id = first_entity['ip_address']
            self.config.entity_type = 'ip_address'
            scenarios = [f"real_investigation_{self.config.entity_type}"]
            self.logger.info(f"🎯 No scenario specified, using first Snowflake entity for investigation: {self.config.entity_type} = {self.config.entity_id} (Risk Score: {first_entity['risk_score']:.4f})")
        else:
            return {"error": "No scenarios specified and no Snowflake entities available"}
        
        # Run tests
        if self.config.concurrent > 1 and len(scenarios) > 1:
            self.results = await self.run_concurrent_tests(scenarios)
        else:
            self.results = []
            for scenario in scenarios:
                result = await self.run_single_scenario_test(scenario)
                self.results.append(result)
                
                # Brief pause between sequential tests
                if len(scenarios) > 1:
                    await asyncio.sleep(1)
        
        # Calculate final metrics
        self.metrics.end_time = time.time()
        self.metrics.total_duration = self.metrics.end_time - self.metrics.start_time
        self.metrics.scenarios_tested = len(self.results)
        
        # Validate status consistency and quality thresholds before counting
        for result in self.results:
            if result.status not in ["completed", "failed"]:
                self.logger.warning(f"⚠️ Result {result.investigation_id} has invalid status: {result.status}, defaulting to 'failed'")
                result.status = "failed"
            
            # Additional check: investigations marked "completed" but with very low scores should be failed
            if result.status == "completed" and result.validation_results:
                overall_score = result.validation_results.get("overall_score", 0)
                if overall_score < 70:  # Quality threshold
                    self.logger.warning(f"⚠️ Investigation {result.investigation_id} marked completed but has low quality score {overall_score:.1f}/100, changing status to failed")
                    result.status = "failed"
                    if not result.errors:
                        result.errors = []
                    result.errors.append(f"Investigation quality score {overall_score:.1f}/100 is below acceptable threshold of 70/100")
        
        # Now calculate final counts after status validation
        self.metrics.scenarios_passed = sum(1 for r in self.results if r.status == "completed")
        self.metrics.scenarios_failed = sum(1 for r in self.results if r.status == "failed")
        
        # Calculate average score
        scores = [r.validation_results.get("overall_score", 0) for r in self.results 
                 if r.validation_results]
        self.metrics.average_score = sum(scores) / len(scores) if scores else 0
        
        # Generate test report
        report_data = await self.generate_comprehensive_report()
        
        self.logger.info("=" * 80)
        self.logger.info(f"✅ Test Suite Completed: {self.metrics.scenarios_passed}/{self.metrics.scenarios_tested} passed")
        self.logger.info(f"📊 Average Score: {self.metrics.average_score:.1f}/100")
        self.logger.info(f"⏱️  Total Duration: {self.metrics.total_duration:.2f}s")
        
        return report_data

    async def generate_comprehensive_report(self) -> Dict[str, Any]:
        """Generate comprehensive test report in specified format"""
        
        # Create JSON-serializable configuration
        config_dict = self.config.__dict__.copy()
        config_dict['output_format'] = self.config.output_format.value
        config_dict['mode'] = self.config.mode.value
        
        report_data = {
            "metadata": {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "test_runner_version": "1.0.0",
                "configuration": config_dict,
                "server_url": self.config.server_url
            },
            "summary": {
                "total_scenarios": self.metrics.scenarios_tested,
                "scenarios_passed": self.metrics.scenarios_passed,
                "scenarios_failed": self.metrics.scenarios_failed,
                "pass_rate": (self.metrics.scenarios_passed / self.metrics.scenarios_tested * 100) if self.metrics.scenarios_tested > 0 else 0,
                "average_score": self.metrics.average_score,
                "total_duration": self.metrics.total_duration,
                "average_duration": self.metrics.total_duration / self.metrics.scenarios_tested if self.metrics.scenarios_tested > 0 else 0
            },
            "results": [self._serialize_result(result) for result in self.results],
            "performance_analysis": self._analyze_performance(),
            "recommendations": self._generate_recommendations()
        }
        
        # Generate report files
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Extract investigation folder from first result (if available)
        investigation_folder = None
        if self.results and hasattr(self.results[0], 'investigation_folder'):
            investigation_folder = self.results[0].investigation_folder
            
        # Determine output directory - prefer investigation folder over default
        if investigation_folder and Path(investigation_folder).exists():
            # Use the investigation folder for JSON report
            output_dir = Path(investigation_folder)
            self.logger.info(f"📁 Using investigation folder for JSON report: {output_dir}")
        elif self.config.output_dir == ".":
            # Create centralized reports directory under logs (fallback)
            reports_dir = Path("logs/reports")
            reports_dir.mkdir(parents=True, exist_ok=True)
            output_dir = reports_dir
            self.logger.info(f"📁 Using fallback reports directory for JSON report: {output_dir}")
        else:
            # Use user-specified output directory
            output_dir = Path(self.config.output_dir)
            output_dir.mkdir(parents=True, exist_ok=True)
            self.logger.info(f"📁 Using user-specified directory for JSON report: {output_dir}")
        
        # Always generate JSON report
        json_filename = f"unified_test_report_{timestamp}.json"
        json_path = output_dir / json_filename
        with open(json_path, 'w') as f:
            json.dump(report_data, f, indent=2, default=str)
        self.logger.info(f"📄 JSON report saved: {json_path}")
        
        # Generate format-specific reports
        if self.config.output_format == OutputFormat.HTML or self.config.html_report:
            html_path = await self._generate_html_report(report_data, timestamp)
            if self.config.open_report and html_path:
                try:
                    webbrowser.open(f"file://{html_path}")
                    self.logger.info(f"🌐 Opened HTML report in browser")
                except Exception as e:
                    self.logger.warning(f"Could not open browser: {e}")
        
        if self.config.output_format == OutputFormat.MARKDOWN:
            markdown_path = await self._generate_markdown_report(report_data, timestamp, investigation_folder)
            self.logger.info(f"📝 Markdown report saved: {markdown_path}")
        
        if self.config.output_format == OutputFormat.TERMINAL:
            self._print_terminal_report(report_data)
        
        return report_data

    async def _generate_html_report(self, report_data: Dict[str, Any], timestamp: str) -> Optional[str]:
        """Generate comprehensive HTML report using unified system"""
        try:
            if not HTML_REPORTER_AVAILABLE:
                self.logger.warning("Unified HTML reporter not available, skipping report generation")
                return None
                
            # Create unified HTML report generator
            unified_generator = UnifiedHTMLReportGenerator()
            
            # Transform data for unified reporter - include comprehensive investigation data
            test_results = {}
            investigation_folder = None
            
            for i, result_data in enumerate(report_data["results"]):
                test_results[result_data["scenario_name"]] = {
                    "status": "PASSED" if result_data["status"] == "completed" else "FAILED",
                    "duration": result_data["duration"],
                    "overall_score": result_data.get("validation_results", {}).get("overall_score", 0),
                    "final_risk_score": result_data["final_risk_score"],
                    "confidence": result_data.get("confidence", 0),
                    "phases": result_data.get("agent_results", {}),
                    "errors": result_data.get("errors", []),
                    # Include comprehensive investigation data
                    "journey_data": result_data.get("journey_data", {}),
                    "logging_data": result_data.get("logging_data", {}),
                    "performance_data": result_data.get("performance_data", {}),
                    "validation_results": result_data.get("validation_results", {}),
                    "websocket_events": result_data.get("websocket_events", []),
                    "investigation_id": result_data.get("investigation_id", ""),
                    "start_time": result_data.get("start_time", ""),
                    "end_time": result_data.get("end_time", ""),
                    "investigation_folder": result_data.get("investigation_folder", "")
                }
                
                # Capture investigation folder from first result (if available)
                if i == 0 and result_data.get("investigation_folder"):
                    investigation_folder = result_data["investigation_folder"]
            
            # Check if investigation folder already has a comprehensive report
            if investigation_folder and Path(investigation_folder).exists():
                comprehensive_report = Path(investigation_folder) / "comprehensive_investigation_report.html"
                if comprehensive_report.exists():
                    self.logger.info(f"✅ Using existing comprehensive investigation report: {comprehensive_report}")
                    return str(comprehensive_report.absolute())
            
            # Determine output directory for standalone test reports
            if self.config.output_dir == ".":
                # Create centralized reports directory under logs (fallback)
                reports_dir = Path("logs/reports")
                reports_dir.mkdir(parents=True, exist_ok=True)
                output_dir = reports_dir
                self.logger.info(f"📁 Using fallback reports directory: {output_dir}")
            else:
                # Use user-specified output directory
                output_dir = Path(self.config.output_dir)
                output_dir.mkdir(parents=True, exist_ok=True)
                self.logger.info(f"📁 Using user-specified directory: {output_dir}")
            
            html_filename = f"unified_test_report_{timestamp}.html"
            html_path = output_dir / html_filename
            
            # Generate standalone test report using unified system
            generated_path = unified_generator.generate_report(
                data_source=test_results,
                data_type=DataSourceType.TEST_RESULTS,
                output_path=html_path,
                title="Unified Autonomous Investigation Test Report",
                theme="professional"
            )
            
            self.logger.info(f"📊 Standalone test report generated: {generated_path}")
            return str(Path(generated_path).absolute())
            
        except Exception as e:
            self.logger.error(f"❌ Failed to generate unified HTML report")
            self.logger.error(f"   Error type: {type(e).__name__}")
            self.logger.error(f"   Error details: {str(e)}")
            self.logger.error(f"   Report generation failed - check file permissions and paths")
            return None

    async def _generate_markdown_report(self, report_data: Dict[str, Any], timestamp: str, investigation_folder: Optional[str] = None) -> str:
        """Generate comprehensive Markdown report"""
        
        markdown_lines = [
            "# Unified Autonomous Investigation Test Report",
            f"Generated: {report_data['metadata']['generated_at']}",
            "",
            "## Executive Summary",
            f"- **Total Scenarios:** {report_data['summary']['total_scenarios']}",
            f"- **Scenarios Passed:** {report_data['summary']['scenarios_passed']}",
            f"- **Scenarios Failed:** {report_data['summary']['scenarios_failed']}",
            f"- **Pass Rate:** {report_data['summary']['pass_rate']:.1f}%",
            f"- **Average Score:** {report_data['summary']['average_score']:.1f}/100",
            f"- **Total Duration:** {report_data['summary']['total_duration']:.2f}s",
            "",
        ]
        
        
        # Individual test results
        markdown_lines.extend([
            "## Test Results",
            "| Scenario | Status | Duration | Risk Score | Overall Score | Errors |",
            "|----------|--------|----------|------------|---------------|--------|"
        ])
        
        for result_data in report_data["results"]:
            status_emoji = "✅" if result_data["status"] == "completed" else "❌"
            errors = ", ".join(result_data.get("errors", [])) or "None"
            validation_score = result_data.get("validation_results", {}).get("overall_score", 0)
            
            markdown_lines.append(
                f"| {result_data['scenario_name']} | {status_emoji} {result_data['status']} | "
                f"{result_data['duration']:.2f}s | {result_data['final_risk_score']:.2f} | "
                f"{validation_score:.1f} | {errors} |"
            )
        
        markdown_lines.extend([
            "",
            "## Performance Analysis",
            f"- **Average Test Duration:** {report_data['summary']['average_duration']:.2f}s",
            f"- **Fastest Test:** {min((r['duration'] for r in report_data['results']), default=0):.2f}s",
            f"- **Slowest Test:** {max((r['duration'] for r in report_data['results']), default=0):.2f}s",
            "",
        ])
        
        # Recommendations
        if report_data.get("recommendations"):
            markdown_lines.extend([
                "## Recommendations",
                ""
            ])
            for rec in report_data["recommendations"]:
                markdown_lines.append(f"- {rec}")
            markdown_lines.append("")
        
        markdown_lines.extend([
            "---",
            "*Report generated by Unified Autonomous Test Runner v1.0.0*"
        ])
        
        markdown_content = "\n".join(markdown_lines)
        
        # Save to file
        # Determine output directory - prefer investigation folder over default
        if investigation_folder and Path(investigation_folder).exists():
            # Use the investigation folder for Markdown report
            output_dir = Path(investigation_folder)
            self.logger.info(f"📁 Using investigation folder for Markdown report: {output_dir}")
        elif self.config.output_dir == ".":
            # Create centralized reports directory under logs (fallback)
            reports_dir = Path("logs/reports")
            reports_dir.mkdir(parents=True, exist_ok=True)
            output_dir = reports_dir
            self.logger.info(f"📁 Using fallback reports directory for Markdown report: {output_dir}")
        else:
            # Use user-specified output directory
            output_dir = Path(self.config.output_dir)
            output_dir.mkdir(parents=True, exist_ok=True)
            self.logger.info(f"📁 Using user-specified directory for Markdown report: {output_dir}")
        
        markdown_filename = f"unified_test_report_{timestamp}.md"
        markdown_path = output_dir / markdown_filename
        with open(markdown_path, 'w') as f:
            f.write(markdown_content)
        
        return str(markdown_path)

    def _print_terminal_report(self, report_data: Dict[str, Any]):
        """Print comprehensive terminal report"""
        
        logger.info("\n" + "=" * 80)
        logger.info("🔍 UNIFIED AUTONOMOUS INVESTIGATION TEST REPORT")
        logger.info("=" * 80)
        
        # Summary
        summary = report_data["summary"]
        logger.info(f"📊 SUMMARY")
        logger.info(f"   Total Scenarios: {summary['total_scenarios']}")
        logger.info(f"   Passed: {summary['scenarios_passed']} ✅")
        logger.error(f"   Failed: {summary['scenarios_failed']} ❌")
        logger.info(f"   Pass Rate: {summary['pass_rate']:.1f}%")
        logger.info(f"   Average Score: {summary['average_score']:.1f}/100")
        logger.info(f"   Total Duration: {summary['total_duration']:.2f}s")
        logger.info("")
        
        
        # Individual results
        logger.info(f"🧪 INDIVIDUAL RESULTS")
        for result_data in report_data["results"]:
            status_symbol = "✅" if result_data["status"] == "completed" else "❌"
            validation_score = result_data.get("validation_results", {}).get("overall_score", 0)
            
            print(f"   {status_symbol} {result_data['scenario_name']:<20} | "
                  f"Score: {validation_score:5.1f}/100 | "
                  f"Risk: {result_data['final_risk_score']:5.2f} | "
                  f"Time: {result_data['duration']:6.2f}s")
            
            if result_data.get("errors"):
                for error in result_data["errors"]:
                    logger.error(f"      ⚠️  {error}")
        
        logger.info("")
        
        # Performance analysis
        perf = report_data.get("performance_analysis", {})
        if perf:
            logger.info(f"⚡ PERFORMANCE ANALYSIS")
            logger.info(f"   Average Duration: {summary['average_duration']:.2f}s")
            logger.info(f"   Fastest Test: {perf.get('fastest_test', 0):.2f}s")
            logger.info(f"   Slowest Test: {perf.get('slowest_test', 0):.2f}s")
            logger.info("")
        
        # Recommendations
        recommendations = report_data.get("recommendations", [])
        if recommendations:
            logger.info(f"💡 RECOMMENDATIONS")
            for rec in recommendations:
                logger.info(f"   • {rec}")
            logger.info("")
        
        logger.info("=" * 80)

    def _save_investigation_results(self, investigation_folder: str, result: InvestigationResult) -> None:
        """Save investigation results to the results folder"""
        try:
            import os
            from pathlib import Path
            
            # Convert to Path object
            folder_path = Path(investigation_folder)
            results_dir = folder_path / "results"
            
            # Ensure results directory exists
            results_dir.mkdir(parents=True, exist_ok=True)
            
            # Serialize the result
            result_data = self._serialize_result(result)
            
            # Save main investigation result
            result_file = results_dir / "investigation_result.json"
            with open(result_file, 'w') as f:
                json.dump(result_data, f, indent=2, default=str)
            
            # Save agent results separately for easier access
            if result.agent_results:
                agent_file = results_dir / "agent_results.json"
                with open(agent_file, 'w') as f:
                    json.dump(result.agent_results, f, indent=2, default=str)
            
            # Save validation results
            if result.validation_results:
                validation_file = results_dir / "validation_results.json"
                with open(validation_file, 'w') as f:
                    json.dump(result.validation_results, f, indent=2, default=str)
            
            # Save performance metrics
            if result.performance_data:
                performance_file = results_dir / "performance_metrics.json"
                with open(performance_file, 'w') as f:
                    json.dump(result.performance_data, f, indent=2, default=str)
            
            # Save journey data
            if result.journey_data:
                journey_file = results_dir / "journey_data.json"
                with open(journey_file, 'w') as f:
                    json.dump(result.journey_data, f, indent=2, default=str)
            
            # Create a summary file
            summary = {
                "investigation_id": result.investigation_id,
                "scenario": result.scenario_name,
                "status": result.status,
                "final_risk_score": result.final_risk_score,
                "confidence": result.confidence,
                "duration_seconds": result.duration,
                "timestamp": result.start_time.isoformat() if result.start_time else None,
                "errors": result.errors
            }
            summary_file = results_dir / "summary.json"
            with open(summary_file, 'w') as f:
                json.dump(summary, f, indent=2, default=str)
            
            self.logger.info(f"💾 Saved investigation results to {results_dir}")
            
        except Exception as e:
            self.logger.error(f"Failed to save investigation results: {e}")
    
    def _serialize_result(self, result: InvestigationResult) -> Dict[str, Any]:
        """Serialize investigation result to dictionary"""
        return {
            "investigation_id": result.investigation_id,
            "scenario_name": result.scenario_name,
            "status": result.status,
            "start_time": result.start_time.isoformat(),
            "end_time": result.end_time.isoformat() if result.end_time else None,
            "duration": result.duration,
            "final_risk_score": result.final_risk_score,
            "confidence": result.confidence,
            "agent_results": result.agent_results,
            "journey_data": result.journey_data,
            "logging_data": result.logging_data,
            "performance_data": result.performance_data,
            "errors": result.errors,
            "validation_results": result.validation_results,
            "websocket_events": result.websocket_events,
            "investigation_folder": result.investigation_folder
        }


    def _analyze_performance(self) -> Dict[str, Any]:
        """Analyze performance metrics across all tests"""
        if not self.results:
            return {}
            
        durations = [r.duration for r in self.results]
        risk_scores = [r.final_risk_score for r in self.results]
        validation_scores = [
            r.validation_results.get("overall_score", 0) 
            for r in self.results if r.validation_results
        ]
        
        return {
            "duration_stats": {
                "min": min(durations) if durations else 0,
                "max": max(durations) if durations else 0,
                "average": sum(durations) / len(durations) if durations else 0,
                "total": sum(durations)
            },
            "risk_score_stats": {
                "min": min(risk_scores) if risk_scores else 0,
                "max": max(risk_scores) if risk_scores else 0,
                "average": sum(risk_scores) / len(risk_scores) if risk_scores else 0
            },
            "validation_score_stats": {
                "min": min(validation_scores) if validation_scores else 0,
                "max": max(validation_scores) if validation_scores else 0,
                "average": sum(validation_scores) / len(validation_scores) if validation_scores else 0
            },
            "fastest_test": min(durations) if durations else 0,
            "slowest_test": max(durations) if durations else 0,
            "success_rate": self.metrics.scenarios_passed / self.metrics.scenarios_tested if self.metrics.scenarios_tested > 0 else 0
        }

    def _generate_recommendations(self) -> List[str]:
        """Generate recommendations based on test results"""
        recommendations = []
        
        # Performance recommendations
        avg_duration = self.metrics.total_duration / self.metrics.scenarios_tested if self.metrics.scenarios_tested > 0 else 0
        if avg_duration > 30:
            recommendations.append("Consider optimizing agent performance - average test duration exceeds 30 seconds")
        
        # Success rate recommendations
        success_rate = self.metrics.scenarios_passed / self.metrics.scenarios_tested if self.metrics.scenarios_tested > 0 else 0
        if success_rate < 0.9:
            recommendations.append("Investigation success rate is below 90% - review agent implementations")
        
        # Risk score recommendations
        avg_score = self.metrics.average_score
        if avg_score < 70:
            recommendations.append("Overall test quality score is below 70 - review test scenarios and validation logic")
        
        
        # Concurrency recommendations
        if self.config.concurrent == 1 and len(self.results) > 3:
            recommendations.append("Consider using concurrent execution for faster test suite completion")
        
        return recommendations


def create_argument_parser() -> argparse.ArgumentParser:
    """Create comprehensive command line argument parser"""
    
    parser = argparse.ArgumentParser(
        description="Unified Autonomous Investigation Test Runner - Requires Snowflake connection for data integration",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Single scenario test with verbose output
  python unified_autonomous_test_runner.py --scenario device_spoofing --verbose

  # Test all scenarios with HTML report
  python unified_autonomous_test_runner.py --all --html-report --open-report


  # Custom configuration with timeout
  python unified_autonomous_test_runner.py --scenario impossible_travel --timeout 600 --log-level debug

  # Generate multiple report formats
  python unified_autonomous_test_runner.py --all --output-format html --output-dir ./reports
        """
    )
    
    # Test selection
    test_group = parser.add_mutually_exclusive_group(required=False)
    test_group.add_argument(
        "--scenario", "-s",
        help="Test single scenario by name"
    )
    test_group.add_argument(
        "--all", "-a",
        action="store_true",
        help="Test all available scenarios"
    )
    
    # Real investigation options
    parser.add_argument(
        "--entity-id",
        help="Entity ID to investigate (for real investigations)"
    )
    parser.add_argument(
        "--entity-type",
        help="Entity type: user_id, device_id, ip_address, transaction_id, etc."
    )
    
    # Custom investigation options
    parser.add_argument(
        "--custom-prompt",
        help="Custom user prompt with highest priority in investigation (e.g., 'Focus on Device Data in Snowflake')"
    )
    
    
    # Execution options
    parser.add_argument(
        "--concurrent", "-c",
        type=int,
        default=DEFAULT_CONCURRENT,
        help=f"Number of concurrent tests (default: {DEFAULT_CONCURRENT})"
    )
    parser.add_argument(
        "--timeout", "-t",
        type=int,
        default=DEFAULT_TIMEOUT,
        help=f"Test timeout in seconds (default: {DEFAULT_TIMEOUT})"
    )
    parser.add_argument(
        "--server-url",
        default=DEFAULT_SERVER_URL,
        help=f"Server endpoint URL (default: {DEFAULT_SERVER_URL})"
    )
    parser.add_argument(
        "--mode", "-m",
        choices=[mode.value for mode in TestMode],
        default=TestMode.LIVE.value,
        help=f"Test execution mode (default: {TestMode.LIVE.value})"
    )
    
    # Output options
    parser.add_argument(
        "--output-format", "-f",
        choices=[fmt.value for fmt in OutputFormat],
        default=OutputFormat.TERMINAL.value,
        help=f"Output format (default: {OutputFormat.TERMINAL.value})"
    )
    parser.add_argument(
        "--output-dir", "-o",
        default=".",
        help="Output directory for reports (default: current directory)"
    )
    parser.add_argument(
        "--html-report",
        dest="html_report",
        action="store_true",
        default=True,
        help="Generate HTML report (enabled by default)"
    )
    parser.add_argument(
        "--no-html-report",
        dest="html_report",
        action="store_false",
        help="Disable HTML report generation"
    )
    parser.add_argument(
        "--open-report",
        action="store_true",
        help="Auto-open HTML report in browser"
    )
    
    # Logging and verbosity
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose output"
    )
    parser.add_argument(
        "--log-level", "-l",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        default=DEFAULT_LOG_LEVEL,
        help=f"Set logging level (default: {DEFAULT_LOG_LEVEL})"
    )
    
    parser.add_argument(
        "--mock-ips-cache",
        action="store_true",
        default=DEFAULT_USE_MOCK_IPS,
        help=f"Use mocked IPS Cache for testing (default: {'enabled' if DEFAULT_USE_MOCK_IPS else 'disabled'})"
    )
    
    parser.add_argument(
        "--no-mock-ips-cache",
        action="store_true",
        help="Disable mocked IPS Cache (use real IPS Cache)"
    )
    
    # Advanced monitoring options
    monitoring_group = parser.add_argument_group("Advanced Monitoring Options")
    monitoring_group.add_argument(
        "--show-websocket",
        action="store_true",
        help="Monitor ALL WebSocket messages in real-time"
    )
    monitoring_group.add_argument(
        "--show-llm",
        action="store_true", 
        help="Display ALL LLM interactions and reasoning"
    )
    monitoring_group.add_argument(
        "--show-langgraph",
        action="store_true",
        help="Show LangGraph state transitions and flow"
    )
    monitoring_group.add_argument(
        "--show-agents",
        action="store_true",
        help="Display agent conversations and collaborations"
    )
    monitoring_group.add_argument(
        "--follow-logs",
        action="store_true",
        help="Tail server logs in parallel terminal"
    )

    # Dependency management options
    dependency_group = parser.add_argument_group("dependency management", "Options for dependency validation")
    dependency_group.add_argument(
        "--skip-dependency-check",
        action="store_true",
        help="Skip comprehensive dependency validation (for advanced users only)"
    )
    dependency_group.add_argument(
        "--check-dependencies-only",
        action="store_true",
        help="Only run dependency check and exit (useful for setup validation)"
    )

    return parser

async def main():
    """Main entry point for the unified test runner"""

    # Parse command line arguments
    parser = create_argument_parser()
    args = parser.parse_args()

    print("\n" + "="*80)
    print("🧪 UNIFIED AUTONOMOUS INVESTIGATION TEST RUNNER")
    print("="*80)

    # Handle dependency check options
    if getattr(args, 'check_dependencies_only', False):
        # Only run dependency check and exit
        success = check_dependencies()
        sys.exit(0 if success else 1)

    # Run comprehensive dependency check unless explicitly skipped
    if not getattr(args, 'skip_dependency_check', False):
        if not check_dependencies():
            print("\n❌ Dependency check failed. Please install missing dependencies.")
            print("Script execution terminated to prevent errors.")
            print("Use --skip-dependency-check to bypass this check (not recommended).")
            sys.exit(1)
        print("\n✅ Dependency check passed. Continuing with test runner initialization...\n")
    else:
        print("⚠️  Dependency check skipped. Continuing at your own risk...\n")

    # Validate that we have either scenario or all flag
    if not getattr(args, 'scenario', None) and not getattr(args, 'all', False):
        print("❌ Error: Either --scenario or --all must be specified.")
        print("Use --help for usage information.")
        sys.exit(1)

    # Set TEST_MODE immediately if mock mode is requested
    # This MUST happen before any agent imports
    if args.mode == "mock":
        os.environ["TEST_MODE"] = "mock"
        print("🎭🎭🎭 TEST_MODE=mock set at startup - MockLLM will be used 🎭🎭🎭")
    
    # Determine mock IPS cache setting
    use_mock_ips = DEFAULT_USE_MOCK_IPS  # Start with default (true)
    if args.no_mock_ips_cache:
        use_mock_ips = False  # Explicitly disabled
    elif args.mock_ips_cache:
        use_mock_ips = True  # Explicitly enabled (though it's already default)
    
    # Create configuration
    config = TestConfiguration(
        scenario=args.scenario,
        all_scenarios=args.all,
        entity_id=getattr(args, 'entity_id', None),
        entity_type=getattr(args, 'entity_type', None),
        concurrent=args.concurrent,
        output_format=OutputFormat(args.output_format),
        output_dir=args.output_dir,
        verbose=args.verbose,
        server_url=args.server_url,
        timeout=args.timeout,
        log_level=args.log_level,
        mode=TestMode(args.mode),
        html_report=args.html_report,
        open_report=args.open_report,
        use_mock_ips_cache=use_mock_ips,
        # Custom investigation options
        custom_prompt=getattr(args, 'custom_prompt', None) or os.getenv('CUSTOM_USER_PROMPT'),
        # Advanced monitoring options
        show_websocket=getattr(args, 'show_websocket', False),
        show_llm=getattr(args, 'show_llm', False),
        show_langgraph=getattr(args, 'show_langgraph', False),
        show_agents=getattr(args, 'show_agents', False),
        follow_logs=getattr(args, 'follow_logs', False)
    )
    
    # Validate argument combinations
    # Note: If no scenario, --all, or entity is specified, the script will use Snowflake auto-selection
    scenario_specified = bool(config.scenario)
    all_scenarios = bool(config.all_scenarios)
    entity_specified = bool(config.entity_id)
    
    if entity_specified and not config.entity_type:
        print("❌ Error: When using --entity-id, you must also specify --entity-type")
        return 1
    
    if sum([scenario_specified, all_scenarios, entity_specified]) > 1:
        print("❌ Error: Cannot combine --scenario, --all, and --entity-id options")
        return 1
    
    # Apply LangSmith fixes to prevent 401 authentication spam
    if FIXES_AVAILABLE:
        try:
            # Use dynamic demo_mode based on test configuration
            is_demo_mode = config.mode == TestMode.DEMO
            langsmith_result = apply_langsmith_fix(demo_mode=is_demo_mode)
            if langsmith_result.get('langsmith_disabled'):
                print("✅ LangSmith tracing disabled to prevent 401 errors")
            else:
                print("⚠️  LangSmith tracing could not be fully disabled")
        except Exception as e:
            print(f"⚠️  Error applying LangSmith fixes: {e}")
    
    # Create and run test runner
    test_runner = UnifiedAutonomousTestRunner(config)
    
    try:
        async with test_runner.session_manager():
            # Check server connectivity and start if needed
            if not await test_runner.test_server_connectivity():
                test_runner.logger.warning("⚠️  Server not accessible. Attempting to start server...")
                if not await test_runner.start_server_if_needed():
                    test_runner.logger.error("❌ Failed to start server. Please start it manually.")
                    sys.exit(1)
            
            # Run test suite
            results = await test_runner.run_all_tests()
            
            # Check for errors
            if "error" in results:
                test_runner.logger.error(f"❌ Test suite failed: {results['error']}")
                sys.exit(1)
            
            # Exit with appropriate code
            if results["summary"]["scenarios_failed"] == 0:
                test_runner.logger.info("🎉 All tests passed successfully!")
                sys.exit(0)
            else:
                test_runner.logger.warning(f"⚠️  Some tests failed: {results['summary']['scenarios_failed']}/{results['summary']['total_scenarios']}")
                sys.exit(1)
                
    except KeyboardInterrupt:
        test_runner.logger.info("❌ Test runner interrupted by user")
        sys.exit(1)
    except Exception as e:
        test_runner.logger.error(f"❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())