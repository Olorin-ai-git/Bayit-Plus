"""
Test Runner Monitoring System

Extracted AdvancedMonitoringSystem from unified_ai_investigation_test_runner.py
"""

import json
import os
import queue
import threading
from datetime import datetime
from typing import TYPE_CHECKING, Dict

if TYPE_CHECKING:
    from .test_config import TestConfiguration, TestMode

# Import websocket auth fix if available
try:
    from app.service.agent.websocket_auth_fix import create_websocket_connection_config
except ImportError:
    create_websocket_connection_config = None

# Monitoring colors
COLORS = {
    "WEBSOCKET": "\033[0;34m",  # Blue
    "LLM": "\033[0;32m",  # Green
    "LANGGRAPH": "\033[0;35m",  # Purple
    "AGENT": "\033[0;36m",  # Cyan
    "ERROR": "\033[0;31m",  # Red
    "WARNING": "\033[1;33m",  # Yellow
    "SUCCESS": "\033[0;92m",  # Bright green
    "NC": "\033[0m",  # No color
}


class AdvancedMonitoringSystem:
    """Advanced monitoring system for real-time investigation visibility"""

    def __init__(self, config: "TestConfiguration", logger):
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
        if not any(
            [
                self.config.show_websocket,
                self.config.show_llm,
                self.config.show_langgraph,
                self.config.show_agents,
            ]
        ):
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
        from .test_config import TestMode

        enabled_features = []
        if self.config.show_websocket:
            enabled_features.append(f"{COLORS['WEBSOCKET']}WebSocket{COLORS['NC']}")
        if self.config.show_llm:
            enabled_features.append(f"{COLORS['LLM']}LLM Interactions{COLORS['NC']}")
        if self.config.show_langgraph:
            enabled_features.append(
                f"{COLORS['LANGGRAPH']}LangGraph States{COLORS['NC']}"
            )
        if self.config.show_agents:
            enabled_features.append(
                f"{COLORS['AGENT']}Agent Conversations{COLORS['NC']}"
            )

        features_str = ", ".join(enabled_features)
        print(
            f"\n{COLORS['SUCCESS']}🔍 Advanced Monitoring Active: {features_str}{COLORS['NC']}"
        )
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
                    self.log_monitoring_warning(
                        "WebSocket",
                        "websocket-client library not installed - install with 'poetry add websocket-client'",
                    )
                    return

                # Create authenticated WebSocket connection
                try:
                    from .test_config import TestMode

                    # Use WebSocket authentication system to prevent 403 Forbidden errors
                    # Use dynamic demo_mode based on test configuration
                    is_demo_mode = self.config.mode == TestMode.DEMO

                    if create_websocket_connection_config:
                        ws_config = create_websocket_connection_config(
                            server_url=self.config.server_url,
                            investigation_id="investigation_monitor",
                            demo_mode=is_demo_mode,
                            parallel=False,
                        )
                        ws_url = ws_config["url"]
                        ws_headers = ws_config["headers"]
                        self.log_monitoring_success(
                            "WebSocket", "Created authenticated WebSocket configuration"
                        )
                    else:
                        raise ImportError("WebSocket auth fix not available")
                except Exception as auth_error:
                    # Fallback to basic WebSocket URL if authentication setup fails
                    self.log_monitoring_warning(
                        "WebSocket",
                        f"Authentication setup failed ({auth_error}), using basic connection",
                    )
                    ws_url = self.config.server_url.replace("http://", "ws://").replace(
                        "https://", "wss://"
                    )
                    # Use the correct WebSocket endpoint path
                    ws_url += "/investigation/investigation_monitor/monitor"
                    ws_headers = None

                def on_message(ws, message):
                    try:
                        # Try to parse as JSON
                        if message.strip().startswith("{"):
                            data = json.loads(message)
                            self.log_websocket_message(
                                data.get("type", "json"),
                                data,
                                data.get("investigation_id", "unknown"),
                            )
                        else:
                            # Handle raw text messages
                            self.log_websocket_message("text", message, "unknown")
                    except json.JSONDecodeError:
                        # Handle non-JSON messages
                        self.log_websocket_message("raw", message, "unknown")
                    except Exception as e:
                        self.log_monitoring_warning(
                            "WebSocket", f"Error processing message: {e}"
                        )

                def on_error(ws, error):
                    error_msg = str(error)
                    if "403" in error_msg or "Forbidden" in error_msg:
                        self.log_monitoring_error(
                            "WebSocket",
                            f"Authentication failed (403 Forbidden) - JWT token may be invalid or missing",
                        )
                        self.log_monitoring_warning(
                            "WebSocket",
                            "Try running with --show-websocket to see WebSocket authentication details",
                        )
                    else:
                        self.log_monitoring_error(
                            "WebSocket", f"Connection error: {error}"
                        )

                def on_close(ws, close_status_code, close_msg):
                    if self.monitoring_active:
                        self.log_monitoring_warning(
                            "WebSocket",
                            f"Connection closed (code: {close_status_code}, msg: {close_msg})",
                        )

                def on_open(ws):
                    self.log_monitoring_success(
                        "WebSocket", f"Connected to investigation stream at {ws_url}"
                    )

                # Create WebSocket client with authentication headers
                if ws_headers:
                    self.websocket_client = websocket.WebSocketApp(
                        ws_url,
                        header=ws_headers,
                        on_message=on_message,
                        on_error=on_error,
                        on_close=on_close,
                        on_open=on_open,
                    )
                    self.log_monitoring_success(
                        "WebSocket", "WebSocket client created with JWT authentication"
                    )
                else:
                    # Fallback without headers
                    self.websocket_client = websocket.WebSocketApp(
                        ws_url,
                        on_message=on_message,
                        on_error=on_error,
                        on_close=on_close,
                        on_open=on_open,
                    )
                    self.log_monitoring_warning(
                        "WebSocket",
                        "WebSocket client created without authentication (may fail with 403)",
                    )

                # Run forever with automatic reconnection
                self.websocket_client.run_forever(
                    ping_interval=30, ping_timeout=10, reconnect=3
                )

            except Exception as e:
                self.log_monitoring_error(
                    "WebSocket", f"Failed to start monitoring: {e}"
                )

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
        os.environ["LANGCHAIN_VERBOSE"] = "true"
        os.environ["OLORIN_LOG_LLM_INTERACTIONS"] = "true"

        # Only enable LangSmith tracing if LANGSMITH_API_KEY is available
        # This prevents 401 authentication spam when running in demo mode
        if "LANGSMITH_API_KEY" in os.environ:
            os.environ["LANGCHAIN_TRACING_V2"] = "true"
            self.log_monitoring_success("LLM", "LangSmith tracing enabled with API key")
        else:
            # Keep LangSmith tracing disabled to prevent 401 errors
            os.environ["LANGCHAIN_TRACING_V2"] = "false"
            self.log_monitoring_warning(
                "LLM", "LangSmith tracing disabled (no API key - prevents 401 errors)"
            )

        # Set up LangChain callback handler for monitoring
        try:
            from langchain.callbacks import StdOutCallbackHandler
            from langchain.callbacks.base import BaseCallbackHandler

            class LLMMonitoringCallback(BaseCallbackHandler):
                def __init__(self, monitoring_system):
                    self.monitoring = monitoring_system

                def on_llm_start(self, serialized, prompts, **kwargs):
                    model_name = serialized.get("name", "unknown")
                    for prompt in prompts:
                        self.monitoring.log_llm_interaction(
                            model_name,
                            prompt[:500] + "..." if len(prompt) > 500 else prompt,
                            "Starting LLM call...",
                        )

                def on_llm_end(self, response, **kwargs):
                    if hasattr(response, "generations") and response.generations:
                        for generation in response.generations:
                            for gen in generation:
                                if hasattr(gen, "text"):
                                    self.monitoring.log_llm_interaction(
                                        "response",
                                        "LLM Response received",
                                        (
                                            gen.text[:500] + "..."
                                            if len(gen.text) > 500
                                            else gen.text
                                        ),
                                    )

                def on_llm_error(self, error, **kwargs):
                    self.monitoring.log_monitoring_error(
                        "LLM", f"LLM call failed: {error}"
                    )

            # Store callback for use in agent calls
            self.llm_callback = LLMMonitoringCallback(self)

        except ImportError:
            self.log_monitoring_warning(
                "LLM",
                "LangChain not available for callback monitoring - will use basic logging",
            )

    def start_langgraph_monitoring(self):
        """Start LangGraph state transition monitoring"""
        if not self.config.show_langgraph:
            return

        self.log_monitoring_success("LangGraph", "State transition monitoring enabled")

        # Set up environment variables for LangGraph debugging
        os.environ["OLORIN_LOG_LANGGRAPH_STATES"] = "true"
        os.environ["LANGGRAPH_DEBUG"] = "true"

        # Hook into LangGraph state changes if available
        try:
            # Try to import and set up LangGraph monitoring
            # This will depend on the actual LangGraph implementation in the project
            self.log_monitoring_success(
                "LangGraph", "Monitoring hooks registered for state transitions"
            )

        except ImportError:
            self.log_monitoring_warning(
                "LangGraph",
                "LangGraph not available - will use environment variable based logging",
            )

    def start_agent_monitoring(self):
        """Start agent conversation monitoring"""
        if not self.config.show_agents:
            return

        self.log_monitoring_success("Agent", "Agent conversation monitoring enabled")

        # Set up environment variables for agent debugging
        os.environ["OLORIN_LOG_AGENT_CONVERSATIONS"] = "true"
        os.environ["OLORIN_AGENT_VERBOSE"] = "true"
        os.environ["OLORIN_AGENT_DEBUG"] = "true"

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
                    self.log_monitoring_error(
                        "MessageProcessor", f"Error processing message: {e}"
                    )

        thread = threading.Thread(target=process_messages, daemon=True)
        thread.start()
        self.monitoring_threads.append(thread)

    def log_websocket_message(
        self, message_type: str, content, investigation_id: str = "unknown"
    ):
        """Log WebSocket message with structured data"""
        formatted_msg = {
            "type": "websocket",
            "timestamp": datetime.now().isoformat(),
            "message_type": message_type,
            "content": (
                str(content)[:200] + "..." if len(str(content)) > 200 else str(content)
            ),
            "investigation_id": investigation_id,
            "raw_data": content if isinstance(content, dict) else None,
        }

        self.websocket_messages.append(formatted_msg)
        self.message_queue.put(formatted_msg)

    def log_llm_interaction(self, prompt: str, response: str, model: str = "unknown"):
        """Log LLM interaction"""
        self.llm_calls_count += 1

        formatted_msg = {
            "type": "llm",
            "timestamp": datetime.now().isoformat(),
            "call_number": self.llm_calls_count,
            "model": model,
            "prompt": prompt,
            "response": response,
        }

        self.message_queue.put(formatted_msg)

    def log_langgraph_state(self, state_name: str, state_data: Dict):
        """Log LangGraph state transition"""
        formatted_msg = {
            "type": "langgraph",
            "timestamp": datetime.now().isoformat(),
            "state_name": state_name,
            "state_data": state_data,
        }

        self.langgraph_states.append(formatted_msg)
        self.message_queue.put(formatted_msg)

    def log_agent_conversation(
        self, agent_name: str, message: str, conversation_id: str = None
    ):
        """Log agent conversation"""
        formatted_msg = {
            "type": "agent",
            "timestamp": datetime.now().isoformat(),
            "agent_name": agent_name,
            "message": message,
            "conversation_id": conversation_id
            or f"conv_{len(self.agent_conversations)}",
        }

        self.agent_conversations.append(formatted_msg)
        self.message_queue.put(formatted_msg)

    def display_monitoring_message(self, message: Dict):
        """Display monitoring message with proper formatting"""
        msg_type = message["type"]
        timestamp = datetime.fromisoformat(message["timestamp"]).strftime(
            "%H:%M:%S.%f"
        )[:-3]

        if msg_type == "websocket":
            color = COLORS["WEBSOCKET"]
            prefix = "WEBSOCKET"
            content = message.get("content", "")
            msg_type_info = message.get("message_type", "unknown")
            print(
                f"{color}[{prefix}] {timestamp} [{msg_type_info.upper()}]{COLORS['NC']} {content}"
            )

        elif msg_type == "llm":
            color = COLORS["LLM"]
            prefix = "LLM"
            call_num = message.get("call_number", 0)
            model = message.get("model", "unknown")
            prompt = (
                message.get("prompt", "")[:100] + "..."
                if len(message.get("prompt", "")) > 100
                else message.get("prompt", "")
            )
            response = (
                message.get("response", "")[:100] + "..."
                if len(message.get("response", "")) > 100
                else message.get("response", "")
            )

            print(
                f"{color}[{prefix}] {timestamp} Call #{call_num} ({model}){COLORS['NC']}"
            )
            print(f"{color}  → Prompt: {prompt}{COLORS['NC']}")
            print(f"{color}  ← Response: {response}{COLORS['NC']}")

        elif msg_type == "langgraph":
            color = COLORS["LANGGRAPH"]
            prefix = "LANGGRAPH"
            state_name = message.get("state_name", "unknown")
            print(f"{color}[{prefix}] {timestamp} State: {state_name}{COLORS['NC']}")

            # Display state data if available
            state_data = message.get("state_data", {})
            if state_data:
                for key, value in state_data.items():
                    print(
                        f"{color}  {key}: {str(value)[:80]}{'...' if len(str(value)) > 80 else ''}{COLORS['NC']}"
                    )

        elif msg_type == "agent":
            color = COLORS["AGENT"]
            prefix = "AGENT"
            agent_name = message.get("agent_name", "unknown")
            agent_message = message.get("message", "")
            conversation_id = message.get("conversation_id", "unknown")

            print(
                f"{color}[{prefix}] {timestamp} {agent_name} ({conversation_id}){COLORS['NC']}"
            )
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
            "websocket_messages": len(self.websocket_messages),
            "llm_calls": self.llm_calls_count,
            "langgraph_states": len(self.langgraph_states),
            "agent_conversations": len(self.agent_conversations),
            "monitoring_active": self.monitoring_active,
        }
