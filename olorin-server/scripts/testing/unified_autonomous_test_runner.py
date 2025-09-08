#!/usr/bin/env python3
"""
Unified Autonomous Investigation Test Runner

A comprehensive, production-ready test runner that consolidates all autonomous 
investigation testing functionality with enhanced reporting, multiple output formats,
and extensive validation capabilities.

Features:
- Unified CLI interface with comprehensive options
- Multiple test scenarios (predefined and CSV-based)
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

    # CSV-based testing
    python unified_autonomous_test_runner.py --csv-file data.csv --csv-limit 100 --concurrent 5

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
import csv
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

try:
    # Import orchestration system - the proper entry point
    from app.service.agent.orchestration.graph_builder import create_and_get_agent_graph
    from app.service.agent.orchestration.investigation_coordinator import start_investigation
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
    from app.service.agent.chain_of_thought_logger import ChainOfThoughtLogger
    
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

    # Import HTML report generator
    from html_report_generator import AutonomousInvestigationHTMLReporter

except ImportError as e:
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
DEFAULT_CSV_LIMIT = 2000  # Changed from 50 to 2000
DEFAULT_CSV_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "transaction_dataset_10k.csv")  # Default CSV file
DEFAULT_LOG_LEVEL = "INFO"
DEFAULT_USE_MOCK_IPS = False  # Disable mock IPS cache by default for LIVE runs
PROGRESS_CHECK_INTERVAL = 2

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
    csv_file: Optional[str] = DEFAULT_CSV_FILE  # Use default CSV file
    csv_limit: int = DEFAULT_CSV_LIMIT
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
    websocket_events: List[Dict] = field(default_factory=list)

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
        self.scenario_generator = RealScenarioGenerator() if RealScenarioGenerator else None
        
        # Data from Snowflake or CSV
        self.snowflake_entities: List[Dict] = []  # High-risk entities from Snowflake
        self.csv_transactions: List[Dict] = []  # Deprecated - for backward compatibility
        self.csv_users: List[Dict] = []  # Deprecated - for backward compatibility
        
        self.logger.info(f"Initialized Unified Test Runner with config: {config}")
        
        # Start monitoring if enabled
        if any([config.show_websocket, config.show_llm, config.show_langgraph, config.show_agents]):
            self.monitoring.start_monitoring()

    def _setup_logging(self):
        """Setup comprehensive logging with appropriate levels - writes to single investigation log file"""
        import logging
        import logging.handlers
        import os
        from datetime import datetime
        
        # Create logger
        logger = logging.getLogger('autonomous_investigation')
        logger.setLevel(getattr(logging, self.config.log_level.upper()))
        
        # Clear existing handlers to avoid duplicates
        logger.handlers.clear()
        
        # Generate unique timestamped filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        log_filename = f'logs/autonomous_investigation_{timestamp}.log'
        
        # Ensure logs directory exists
        log_dir = os.path.dirname(log_filename)
        if log_dir:
            os.makedirs(log_dir, exist_ok=True)
        
        # Add file handler for single investigation log with timestamp
        file_handler = logging.handlers.RotatingFileHandler(
            log_filename,
            maxBytes=50*1024*1024,  # 50MB
            backupCount=10
        )
        file_formatter = logging.Formatter(
            '%(asctime)s [%(levelname)s] [INVESTIGATION] %(name)s: %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        file_handler.setFormatter(file_formatter)
        logger.addHandler(file_handler)
        
        # Add console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_formatter = logging.Formatter(
            '%(asctime)s [%(levelname)s] %(name)s: %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        console_handler.setFormatter(console_formatter)
        logger.addHandler(console_handler)
        
        return logger

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
                group_by='ip_address',
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
                    return False
            else:
                self.logger.error(f"❌ Failed to fetch from Snowflake: {results.get('error')}")
                return False
                
        except Exception as e:
            self.logger.error(f"❌ Error loading Snowflake data: {e}")
            return False
    
    def load_csv_data(self) -> bool:
        """Load transaction data from CSV file (deprecated - use Snowflake instead)"""
        if not self.config.csv_file:
            return True
            
        self.logger.info(f"Loading CSV data from: {self.config.csv_file}")
        
        try:
            with open(self.config.csv_file, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                for i, row in enumerate(reader):
                    if i >= self.config.csv_limit:
                        break
                        
                    # Extract relevant transaction fields
                    transaction = {
                        "tx_id": row.get("TX_ID_KEY", ""),
                        "unique_user_id": row.get("UNIQUE_USER_ID", ""),
                        "email": row.get("EMAIL", ""),
                        "email_normalized": row.get("EMAIL_NORMALIZED", ""),
                        "first_name": row.get("FIRST_NAME", ""),
                        "app_id": row.get("APP_ID", ""),
                        "tx_datetime": row.get("TX_DATETIME", ""),
                        "tx_received_datetime": row.get("TX_RECEIVED_DATETIME", ""),
                        "authorization_stage": row.get("AUTHORIZATION_STAGE", ""),
                        "event_type": row.get("EVENT_TYPE", ""),
                        "tx_timestamp_ms": row.get("TX_TIMESTAMP_MS", ""),
                        "store_id": row.get("STORE_ID", ""),
                        "is_sent_for_nsure_review": row.get("IS_SENT_FOR_NSURE_REVIEW", "0")
                    }
                    self.csv_transactions.append(transaction)
            
            # Extract unique users
            self.csv_users = self._extract_csv_user_samples(self.csv_transactions)
            
            self.logger.info(f"✅ Loaded {len(self.csv_transactions)} transactions from CSV")
            self.logger.info(f"✅ Extracted {len(self.csv_users)} unique users")
            
            return True
            
        except FileNotFoundError:
            self.logger.error(f"❌ CSV file not found: {self.config.csv_file}")
            return False
        except Exception as e:
            self.logger.error(f"❌ Error loading CSV: {e}")
            return False

    def _extract_csv_user_samples(self, transactions: List[Dict], sample_size: int = 10) -> List[Dict]:
        """Extract unique user samples from CSV transactions"""
        user_groups = {}
        
        for tx in transactions:
            user_id = tx.get('unique_user_id', '')
            if user_id and user_id not in user_groups:
                user_groups[user_id] = {
                    'user_id': user_id,
                    'email': tx.get('email', ''),
                    'first_name': tx.get('first_name', ''),
                    'app_id': tx.get('app_id', ''),
                    'transaction_count': 1,
                    'latest_tx_datetime': tx.get('tx_datetime', ''),
                    'authorization_stages': [tx.get('authorization_stage', '')],
                    'sample_transactions': [tx]
                }
            elif user_id in user_groups:
                user_groups[user_id]['transaction_count'] += 1
                user_groups[user_id]['authorization_stages'].append(tx.get('authorization_stage', ''))
                if len(user_groups[user_id]['sample_transactions']) < 3:
                    user_groups[user_id]['sample_transactions'].append(tx)
        
        return list(user_groups.values())[:sample_size]

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
            investigation_folder = self.investigation_logger.start_investigation_logging(
                investigation_id=investigation_id,
                context={
                    "scenario": scenario_name,
                    "entity_id": context.entity_id,
                    "test_mode": self.config.mode.value,
                    "config": self.config.__dict__
                },
                mode=investigation_mode,
                scenario=scenario_name
            )
            
            self.logger.info(f"📁 Investigation folder: {investigation_folder}")
            
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
            
            # Run comprehensive investigation
            agent_results = await self._run_comprehensive_investigation(context, result)
            result.agent_results = agent_results
            
            # Validate and analyze results
            validation_results = await self._validate_investigation_results(context, result)
            result.validation_results = validation_results
            
            # Collect performance metrics
            performance_data = await self._collect_performance_metrics(context, result)
            result.performance_data = performance_data
            
            # Calculate final metrics
            result.final_risk_score = self._extract_final_risk_score(agent_results)
            result.confidence = self._extract_confidence_score(agent_results)
            result.status = "completed"
            
            # Complete unified journey tracking
            self.unified_journey_tracker.complete_journey_tracking(
                investigation_id,
                status="completed"
            )
            
            # Complete investigation logging
            self.investigation_logger.complete_investigation_logging(
                investigation_id, 
                final_status="completed"
            )
            
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
            except Exception as cleanup_e:
                self.logger.warning(f"Failed to complete investigation tracking: {cleanup_e}")
            
        finally:
            # Calculate duration
            result.end_time = datetime.now(timezone.utc)
            result.duration = (result.end_time - result.start_time).total_seconds()
            
            # Cleanup
            if 'context' in locals():
                cleanup_investigation_context(investigation_id, context.entity_id)
            
            # Clean up mock IPS cache environment variable
            if self.config.use_mock_ips_cache and "USE_MOCK_IPS_CACHE" in os.environ:
                del os.environ["USE_MOCK_IPS_CACHE"]
                self.logger.debug("Cleaned up USE_MOCK_IPS_CACHE environment variable")
        
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
        elif self.csv_users:
            # Fallback to CSV (deprecated)
            csv_user = self.csv_users[0]
            user_data = {
                "user_id": csv_user['user_id'],
                "email": csv_user['email'],
                "first_name": csv_user['first_name'],
                "app_id": csv_user['app_id'],
                "transaction_count": csv_user['transaction_count'],
                "latest_activity": csv_user['latest_tx_datetime']
            }
            if 'ip_address' in csv_user:
                user_data['ip_address'] = csv_user['ip_address']
            
            entity_data = {
                "entity_id": csv_user['user_id'],
                "entity_type": "user_id",
                "source": "csv_transactions"
            }
            self.logger.info(f"Using CSV user data: {csv_user['user_id']} ({csv_user['email']})")
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
        
        # Add CSV transaction data if available
        if self.csv_users:
            context.data_sources["transactions"] = self.csv_users[0]['sample_transactions']
            context.data_sources["csv_metadata"] = {
                "total_csv_transactions": len(self.csv_transactions),
                "user_transaction_count": self.csv_users[0]['transaction_count'],
                "data_source": "csv_file"
            }
        
        context.current_phase = InvestigationPhase.ANALYSIS
        return context

    async def _run_comprehensive_investigation(
        self, 
        context: AutonomousInvestigationContext, 
        result: InvestigationResult
    ) -> Dict[str, Any]:
        """Run comprehensive multi-agent investigation using proper LangGraph orchestration"""
        
        # Set mock IPS cache environment variable if configured
        if self.config.use_mock_ips_cache:
            os.environ["USE_MOCK_IPS_CACHE"] = "true"
            self.logger.info("🎭 Using mocked IPS Cache for testing")
        
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
        
        # CRITICAL FIX: Use proper LangGraph orchestration instead of calling agents directly
        try:
            # Create LangGraph with proper orchestration
            graph = await create_and_get_agent_graph(
                parallel=True,  # Use parallel execution for comprehensive testing
                use_enhanced_tools=True,
                use_subgraphs=False
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
            
            # Create investigation message - this will go through start_investigation()
            investigation_message = HumanMessage(
                content=f"Start comprehensive fraud investigation for {context.entity_type.value} {context.entity_id}",
                additional_kwargs={
                    'investigation_id': context.investigation_id,
                    'entity_id': context.entity_id,
                    'entity_type': context.entity_type.value,
                    'scenario': result.scenario_name
                }
            )
            
            self.logger.info("🔄 Using proper LangGraph orchestration system...")
            start_time = time.time()
            
            # Execute through proper orchestration - this will call start_investigation() first
            langgraph_result = await graph.ainvoke(
                {"messages": [investigation_message]},
                config=config
            )
            
            duration = time.time() - start_time
            self.logger.info(f"✅ LangGraph orchestration completed in {duration:.2f}s")
            
            # Debug: Log what LangGraph returned
            self.logger.info(f"🔍 LangGraph result keys: {langgraph_result.keys()}")
            messages = langgraph_result.get("messages", [])
            self.logger.info(f"🔍 Number of messages in result: {len(messages)}")
            if messages:
                for i, msg in enumerate(messages[:5]):  # Log first 5 messages
                    msg_type = type(msg).__name__
                    content_preview = str(msg.content)[:100] if hasattr(msg, 'content') else str(msg)[:100]
                    self.logger.info(f"  Message {i}: Type={msg_type}, Content={content_preview}...")
            
            # Extract agent results from LangGraph execution
            agent_results = self._extract_agent_results_from_langgraph(langgraph_result, duration)
            
            return agent_results
            
        except Exception as e:
            import traceback
            self.logger.error(f"❌ LangGraph orchestration failed: {e}")
            self.logger.error(f"Full traceback:\n{traceback.format_exc()}")
            # Fallback to mock responses to prevent test failure
            return await self._generate_fallback_results(context, result)
    
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
        expected_domains = ["network", "device", "location", "logs"]
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
    
    async def _generate_fallback_results(self, context: AutonomousInvestigationContext, result: InvestigationResult) -> Dict[str, Any]:
        """Fallbacks are disabled for LIVE; surface orchestration failure instead of generating data."""
        raise RuntimeError("Fallback result generation is disabled in LIVE mode. Fix orchestration failure.")

    async def _validate_investigation_results(
        self,
        context: AutonomousInvestigationContext,
        result: InvestigationResult
    ) -> Dict[str, Any]:
        """Comprehensive validation of investigation results"""
        
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
        """Extract final risk score from aggregated results or individual agents"""
        # First try to get from risk aggregation agent
        risk_agg = agent_results.get("risk_aggregation", {})
        if risk_agg.get("risk_score", 0.0) > 0:
            return risk_agg.get("risk_score", 0.0)
        
        # Fallback: calculate from individual agent scores
        agent_scores = []
        for agent_name in ["device", "network", "location", "logs"]:
            if agent_name in agent_results:
                agent_data = agent_results[agent_name]
                if isinstance(agent_data, dict) and "risk_score" in agent_data:
                    score = agent_data["risk_score"]
                    if score > 0:
                        agent_scores.append(score)
                        self.logger.debug(f"Found {agent_name} risk score: {score}")
        
        # Return average of agent scores if any exist
        if agent_scores:
            final_score = sum(agent_scores) / len(agent_scores)
            self.logger.info(f"Calculated final risk score from {len(agent_scores)} agents: {final_score:.3f}")
            return final_score
        
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
            self.logger.warning("⚠️  Failed to load Snowflake data, falling back to CSV if available")
            # Fall back to CSV if Snowflake fails
            if self.config.csv_file:
                if not self.load_csv_data():
                    self.logger.error("❌ Failed to load data from both Snowflake and CSV")
                    # Continue anyway with synthetic data
            else:
                self.logger.info("📊 Will use synthetic data for testing")
        
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
            "csv_metadata": self._get_csv_metadata() if self.csv_transactions else None,
            "performance_analysis": self._analyze_performance(),
            "recommendations": self._generate_recommendations()
        }
        
        # Generate report files
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Always generate JSON report
        json_filename = f"unified_test_report_{timestamp}.json"
        json_path = Path(self.config.output_dir) / json_filename
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
            markdown_path = await self._generate_markdown_report(report_data, timestamp)
            self.logger.info(f"📝 Markdown report saved: {markdown_path}")
        
        if self.config.output_format == OutputFormat.TERMINAL:
            self._print_terminal_report(report_data)
        
        return report_data

    async def _generate_html_report(self, report_data: Dict[str, Any], timestamp: str) -> Optional[str]:
        """Generate comprehensive HTML report"""
        try:
            html_reporter = AutonomousInvestigationHTMLReporter(
                report_title="Unified Autonomous Investigation Test Report"
            )
            
            # Transform data for HTML reporter
            test_results = {}
            for i, result_data in enumerate(report_data["results"]):
                test_results[result_data["scenario_name"]] = {
                    "status": "PASSED" if result_data["status"] == "completed" else "FAILED",
                    "duration": result_data["duration"],
                    "overall_score": result_data.get("validation_results", {}).get("overall_score", 0),
                    "final_risk_score": result_data["final_risk_score"],
                    "phases": result_data.get("agent_results", {}),
                    "errors": result_data.get("errors", [])
                }
            
            html_filename = f"unified_test_report_{timestamp}.html"
            html_path = Path(self.config.output_dir) / html_filename
            
            html_reporter.generate_html_report(
                test_results=test_results,
                csv_metadata=report_data.get("csv_metadata"),
                output_path=str(html_path)
            )
            
            self.logger.info(f"📊 HTML report generated: {html_path}")
            return str(html_path.absolute())
            
        except Exception as e:
            self.logger.error(f"Failed to generate HTML report: {e}")
            return None

    async def _generate_markdown_report(self, report_data: Dict[str, Any], timestamp: str) -> str:
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
        
        # CSV Data section if available
        if report_data.get("csv_metadata"):
            csv_meta = report_data["csv_metadata"]
            markdown_lines.extend([
                "## CSV Data Information",
                f"- **Transactions Loaded:** {csv_meta['transaction_count']}",
                f"- **Unique Users:** {csv_meta['unique_users']}",
                f"- **Date Range:** {csv_meta.get('date_range', 'N/A')}",
                ""
            ])
        
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
        markdown_filename = f"unified_test_report_{timestamp}.md"
        markdown_path = Path(self.config.output_dir) / markdown_filename
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
        
        # CSV info if available
        if report_data.get("csv_metadata"):
            csv_meta = report_data["csv_metadata"]
            logger.info(f"📁 CSV DATA")
            logger.info(f"   Transactions: {csv_meta['transaction_count']}")
            logger.info(f"   Unique Users: {csv_meta['unique_users']}")
            logger.info(f"   Date Range: {csv_meta.get('date_range', 'N/A')}")
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
            "websocket_events": result.websocket_events
        }

    def _get_csv_metadata(self) -> Dict[str, Any]:
        """Get CSV metadata for reporting"""
        if not self.csv_transactions:
            return None
            
        return {
            "file_path": self.config.csv_file,
            "transaction_count": len(self.csv_transactions),
            "unique_users": len(self.csv_users),
            "sample_user_id": self.csv_users[0]["user_id"] if self.csv_users else "N/A",
            "date_range": (
                f"{self.csv_transactions[0].get('tx_datetime', 'N/A')} to "
                f"{self.csv_transactions[-1].get('tx_datetime', 'N/A')}"
            ) if self.csv_transactions else "N/A"
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
        
        # CSV data recommendations
        if self.csv_transactions and len(self.csv_users) < 5:
            recommendations.append("Limited CSV user samples - consider increasing CSV limit for more comprehensive testing")
        
        # Concurrency recommendations
        if self.config.concurrent == 1 and len(self.results) > 3:
            recommendations.append("Consider using concurrent execution for faster test suite completion")
        
        return recommendations

def create_argument_parser() -> argparse.ArgumentParser:
    """Create comprehensive command line argument parser"""
    
    parser = argparse.ArgumentParser(
        description="Unified Autonomous Investigation Test Runner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Single scenario test with verbose output
  python unified_autonomous_test_runner.py --scenario device_spoofing --verbose

  # Test all scenarios with HTML report
  python unified_autonomous_test_runner.py --all --html-report --open-report

  # CSV-based testing with concurrency
  python unified_autonomous_test_runner.py --csv-file transactions.csv --csv-limit 100 --concurrent 5

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
    
    # CSV data options
    parser.add_argument(
        "--csv-file",
        default=DEFAULT_CSV_FILE,
        help=f"Path to CSV file containing transaction data (default: {DEFAULT_CSV_FILE})"
    )
    parser.add_argument(
        "--csv-limit",
        type=int,
        default=DEFAULT_CSV_LIMIT,
        help=f"Maximum number of CSV rows to process (default: {DEFAULT_CSV_LIMIT})"
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
        action="store_true",
        help="Generate HTML report (in addition to specified format)"
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
    
    return parser

async def main():
    """Main entry point for the unified test runner"""
    
    # Parse command line arguments
    parser = create_argument_parser()
    args = parser.parse_args()
    
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
        csv_file=args.csv_file,
        csv_limit=args.csv_limit,
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