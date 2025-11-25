"""
Test Runner Configuration Classes

Extracted configuration classes from unified_ai_investigation_test_runner.py
"""

import os
import time
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

# Configuration Constants
DEFAULT_SERVER_URL = "http://localhost:8090"
DEFAULT_TIMEOUT = 300  # 5 minutes
DEFAULT_CONCURRENT = 3
DEFAULT_CSV_LIMIT = 2000
DEFAULT_CSV_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "transaction_dataset_10k.csv",
)
DEFAULT_LOG_LEVEL = "INFO"
DEFAULT_USE_MOCK_IPS = False


class TestMode(Enum):
    """Test execution modes"""

    DEMO = "demo"  # Uses MockLLM for testing (no real API calls)
    LIVE = "live"  # Uses real LLM with production data


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
    csv_file: Optional[str] = DEFAULT_CSV_FILE
    csv_limit: int = DEFAULT_CSV_LIMIT
    concurrent: int = DEFAULT_CONCURRENT
    output_format: OutputFormat = OutputFormat.HTML
    output_dir: str = "."
    verbose: bool = False
    server_url: str = DEFAULT_SERVER_URL
    timeout: int = DEFAULT_TIMEOUT
    log_level: str = DEFAULT_LOG_LEVEL
    mode: TestMode = TestMode.LIVE
    html_report: bool = False
    open_report: bool = False
    use_mock_ips_cache: bool = DEFAULT_USE_MOCK_IPS

    # Custom investigation options
    custom_prompt: Optional[str] = None

    # Anomaly-based investigation options
    anomaly_id: Optional[str] = None
    list_anomalies: bool = False

    # Advanced monitoring options
    show_websocket: bool = False
    show_llm: bool = False
    show_langgraph: bool = False
    show_agents: bool = False
    follow_logs: bool = False


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
    investigation_folder: Optional[str] = None
    websocket_events: List[Dict] = field(default_factory=list)
    graph_result: Dict[str, Any] = field(default_factory=dict)
    initial_risk_score: Optional[float] = None
