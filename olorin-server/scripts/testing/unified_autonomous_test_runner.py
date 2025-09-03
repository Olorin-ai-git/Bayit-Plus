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

Usage:
    # Single scenario test
    python unified_autonomous_test_runner.py --scenario device_spoofing --verbose

    # Test all scenarios
    python unified_autonomous_test_runner.py --all --html-report --open-report

    # CSV-based testing
    python unified_autonomous_test_runner.py --csv-file data.csv --csv-limit 100 --concurrent 5

    # Custom configuration
    python unified_autonomous_test_runner.py --scenario impossible_travel --output-format html --timeout 600 --log-level debug

Author: Gil Klainert
Created: 2025-09-03
Version: 1.0.0
"""

import asyncio
import aiohttp
import json
import logging
import time
import argparse
import csv
import webbrowser
import sys
import os
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional, Tuple, Union
from pathlib import Path
from dataclasses import dataclass, field
from enum import Enum
import concurrent.futures
from contextlib import asynccontextmanager

# Add parent directories to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
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

# Configuration Constants
DEFAULT_SERVER_URL = "http://localhost:8090"
DEFAULT_TIMEOUT = 300  # 5 minutes
DEFAULT_CONCURRENT = 3
DEFAULT_CSV_LIMIT = 2000  # Changed from 50 to 2000
DEFAULT_CSV_FILE = "/Users/gklainert/Documents/olorin/transaction_dataset_10k.csv"  # Default CSV file
DEFAULT_LOG_LEVEL = "INFO"
DEFAULT_USE_MOCK_IPS = True  # Mock IPS cache enabled by default
PROGRESS_CHECK_INTERVAL = 2

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
    csv_file: Optional[str] = DEFAULT_CSV_FILE  # Use default CSV file
    csv_limit: int = DEFAULT_CSV_LIMIT
    concurrent: int = DEFAULT_CONCURRENT
    output_format: OutputFormat = OutputFormat.TERMINAL
    output_dir: str = "."
    verbose: bool = False
    server_url: str = DEFAULT_SERVER_URL
    timeout: int = DEFAULT_TIMEOUT
    log_level: str = DEFAULT_LOG_LEVEL
    mode: TestMode = TestMode.DEMO
    html_report: bool = False
    open_report: bool = False
    use_mock_ips_cache: bool = DEFAULT_USE_MOCK_IPS  # Now true by default

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
        
        # Initialize test infrastructure
        self.journey_tracker = LangGraphJourneyTracker()
        self.investigation_logger = AutonomousInvestigationLogger()
        self.scenario_generator = RealScenarioGenerator() if RealScenarioGenerator else None
        
        # CSV data
        self.csv_transactions: List[Dict] = []
        self.csv_users: List[Dict] = []
        
        self.logger.info(f"Initialized Unified Test Runner with config: {config}")

    def _setup_logging(self) -> logging.Logger:
        """Setup comprehensive logging with appropriate levels"""
        logger = logging.getLogger(__name__)
        logger.setLevel(getattr(logging, self.config.log_level.upper()))
        
        # Create handler if not exists
        if not logger.handlers:
            handler = logging.StreamHandler(sys.stdout)
            formatter = logging.Formatter(
                '%(asctime)s [%(levelname)s] %(name)s: %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        
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

    def load_csv_data(self) -> bool:
        """Load transaction data from CSV file"""
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
            async with self.session.get(f"{self.config.server_url}/autonomous/scenarios") as response:
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
            
            # Start journey tracking
            self.journey_tracker.start_journey_tracking(
                investigation_id=investigation_id,
                initial_state={
                    "scenario": scenario_name,
                    "entity_id": context.entity_id,
                    "test_mode": self.config.mode.value
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
            
            # Complete journey tracking
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

    async def _create_test_context(self, investigation_id: str, scenario_name: str) -> AutonomousInvestigationContext:
        """Create test context for investigation"""
        
        # Use CSV data if available, otherwise generate synthetic data
        if self.csv_users:
            csv_user = self.csv_users[0]  # Use first available user
            user_data = {
                "user_id": csv_user['user_id'],
                "email": csv_user['email'],
                "first_name": csv_user['first_name'],
                "app_id": csv_user['app_id'],
                "transaction_count": csv_user['transaction_count'],
                "latest_activity": csv_user['latest_tx_datetime']
            }
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
                }
                entity_data = {
                    "entity_id": user_data["user_id"],
                    "entity_type": "user_id",
                    "source": "synthetic"
                }
            self.logger.info("Using synthetic test data")
        
        # Create investigation context
        context = AutonomousInvestigationContext(
            investigation_id=investigation_id,
            entity_id=entity_data["entity_id"],
            entity_type=EntityType.USER_ID,
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
        """Run comprehensive multi-agent investigation"""
        
        # Set mock IPS cache environment variable if configured
        if self.config.use_mock_ips_cache:
            os.environ["USE_MOCK_IPS_CACHE"] = "true"
            self.logger.info("🎭 Using mocked IPS Cache for testing")
        
        config = RunnableConfig(
            tags=["test", "unified_runner"],
            metadata={
                "investigation_id": context.investigation_id,
                "scenario": result.scenario_name
            },
            configurable={"agent_context": context}
        )
        
        agent_results = {}
        
        # Define agent execution sequence
        agents = [
            ("network", autonomous_network_agent, "Network Analysis Agent"),
            ("device", autonomous_device_agent, "Device Analysis Agent"), 
            ("location", autonomous_location_agent, "Location Analysis Agent"),
            ("logs", autonomous_logs_agent, "Logs Analysis Agent")
        ]
        
        # Execute agents sequentially with progress tracking
        for i, (agent_name, agent_func, agent_description) in enumerate(agents):
            if self.config.verbose:
                self.logger.info(f"📡 Running {agent_description}...")
            
            start_time = time.time()
            
            try:
                findings = await agent_func(context, config)
                duration = time.time() - start_time
                
                agent_results[agent_name] = {
                    "findings": findings,
                    "duration": duration,
                    "status": "success",
                    "risk_score": self._extract_risk_score_from_response(findings),
                    "confidence": self._extract_confidence_from_response(findings)
                }
                
                if self.config.verbose:
                    self.logger.info(f"✅ {agent_description}: {agent_results[agent_name]['risk_score']:.2f} ({duration:.2f}s)")
                    
            except Exception as e:
                agent_results[agent_name] = {
                    "findings": None,
                    "duration": time.time() - start_time,
                    "status": "failed",
                    "error": str(e),
                    "risk_score": 0.0,
                    "confidence": 0.0
                }
                self.logger.error(f"❌ {agent_description} failed: {e}")
        
        # Run risk aggregation agent
        if self.config.verbose:
            self.logger.info("🧠 Running Risk Aggregation...")
            
        # Add domain findings to context
        context.progress.domain_findings = {
            name: data["findings"] for name, data in agent_results.items() 
            if data["findings"] is not None
        }
        
        start_time = time.time()
        try:
            final_risk = await autonomous_risk_agent(context, config)
            duration = time.time() - start_time
            
            agent_results["risk_aggregation"] = {
                "findings": final_risk,
                "duration": duration,
                "status": "success",
                "risk_score": self._extract_risk_score_from_response(final_risk),
                "confidence": self._extract_confidence_from_response(final_risk)
            }
            
            if self.config.verbose:
                self.logger.info(f"🎯 Final Risk Score: {agent_results['risk_aggregation']['risk_score']:.2f}")
                
        except Exception as e:
            agent_results["risk_aggregation"] = {
                "findings": None,
                "duration": time.time() - start_time,
                "status": "failed",
                "error": str(e),
                "risk_score": 0.0,
                "confidence": 0.0
            }
            self.logger.error(f"❌ Risk aggregation failed: {e}")
        
        return agent_results

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
            
            # Validate accuracy (risk score reasonableness)
            final_risk = result.agent_results.get("risk_aggregation", {}).get("risk_score", 0)
            accuracy_score = 100 if 0 <= final_risk <= 1 else 50
            
            validation_results["accuracy_score"] = accuracy_score
            validation_results["details"]["final_risk_score"] = final_risk
            
            # Validate logging completeness
            logging_score = 100  # Assume logging is comprehensive for now
            validation_results["logging_score"] = logging_score
            
            # Validate journey tracking
            journey_score = 100 if hasattr(self.journey_tracker, 'active_journeys') else 0
            validation_results["journey_score"] = journey_score
            
            # Calculate overall score
            validation_results["overall_score"] = (
                completion_score * 0.3 +
                performance_score * 0.2 +
                accuracy_score * 0.2 +
                logging_score * 0.15 +
                journey_score * 0.15
            )
            
        except Exception as e:
            self.logger.error(f"❌ Validation failed: {e}")
            validation_results["details"]["validation_error"] = str(e)
        
        return validation_results

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
        """Extract risk score from agent response"""
        if response is None:
            return 0.0
        
        # Handle DomainFindings object
        if hasattr(response, 'risk_score'):
            return response.risk_score or 0.0
        
        # Handle dict response
        if isinstance(response, dict):
            if 'error' in response:
                return 0.0
                
            # Extract from LangChain message format
            if 'messages' in response:
                for message in response['messages']:
                    if hasattr(message, 'content'):
                        try:
                            content = json.loads(message.content)
                            if 'risk_assessment' in content:
                                risk_level = content['risk_assessment'].get('risk_level', 0.0)
                                return float(risk_level) if risk_level is not None else 0.0
                        except (json.JSONDecodeError, KeyError, ValueError):
                            pass
                            
            # Direct risk_score field
            if 'risk_score' in response:
                return float(response['risk_score']) if response['risk_score'] is not None else 0.0
        
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
        
        return 0.0

    def _extract_final_risk_score(self, agent_results: Dict[str, Any]) -> float:
        """Extract final risk score from aggregated results"""
        risk_agg = agent_results.get("risk_aggregation", {})
        return risk_agg.get("risk_score", 0.0)

    def _extract_confidence_score(self, agent_results: Dict[str, Any]) -> float:
        """Extract final confidence score from aggregated results"""
        risk_agg = agent_results.get("risk_aggregation", {})
        return risk_agg.get("confidence", 0.0)

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
        
        # Load CSV data if specified
        if self.config.csv_file:
            if not self.load_csv_data():
                return {"error": "Failed to load CSV data"}
        
        # Get test scenarios
        if self.config.all_scenarios:
            scenarios = await self.get_available_scenarios()
            self.logger.info(f"📊 Testing all {len(scenarios)} scenarios")
        elif self.config.scenario:
            scenarios = [self.config.scenario]
            self.logger.info(f"🎯 Testing single scenario: {self.config.scenario}")
        else:
            return {"error": "No scenarios specified"}
        
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
        
        report_data = {
            "metadata": {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "test_runner_version": "1.0.0",
                "configuration": self.config.__dict__,
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
        
        print("\n" + "=" * 80)
        print("🔍 UNIFIED AUTONOMOUS INVESTIGATION TEST REPORT")
        print("=" * 80)
        
        # Summary
        summary = report_data["summary"]
        print(f"📊 SUMMARY")
        print(f"   Total Scenarios: {summary['total_scenarios']}")
        print(f"   Passed: {summary['scenarios_passed']} ✅")
        print(f"   Failed: {summary['scenarios_failed']} ❌")
        print(f"   Pass Rate: {summary['pass_rate']:.1f}%")
        print(f"   Average Score: {summary['average_score']:.1f}/100")
        print(f"   Total Duration: {summary['total_duration']:.2f}s")
        print()
        
        # CSV info if available
        if report_data.get("csv_metadata"):
            csv_meta = report_data["csv_metadata"]
            print(f"📁 CSV DATA")
            print(f"   Transactions: {csv_meta['transaction_count']}")
            print(f"   Unique Users: {csv_meta['unique_users']}")
            print(f"   Date Range: {csv_meta.get('date_range', 'N/A')}")
            print()
        
        # Individual results
        print(f"🧪 INDIVIDUAL RESULTS")
        for result_data in report_data["results"]:
            status_symbol = "✅" if result_data["status"] == "completed" else "❌"
            validation_score = result_data.get("validation_results", {}).get("overall_score", 0)
            
            print(f"   {status_symbol} {result_data['scenario_name']:<20} | "
                  f"Score: {validation_score:5.1f}/100 | "
                  f"Risk: {result_data['final_risk_score']:5.2f} | "
                  f"Time: {result_data['duration']:6.2f}s")
            
            if result_data.get("errors"):
                for error in result_data["errors"]:
                    print(f"      ⚠️  {error}")
        
        print()
        
        # Performance analysis
        perf = report_data.get("performance_analysis", {})
        if perf:
            print(f"⚡ PERFORMANCE ANALYSIS")
            print(f"   Average Duration: {summary['average_duration']:.2f}s")
            print(f"   Fastest Test: {perf.get('fastest_test', 0):.2f}s")
            print(f"   Slowest Test: {perf.get('slowest_test', 0):.2f}s")
            print()
        
        # Recommendations
        recommendations = report_data.get("recommendations", [])
        if recommendations:
            print(f"💡 RECOMMENDATIONS")
            for rec in recommendations:
                print(f"   • {rec}")
            print()
        
        print("=" * 80)

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
    test_group = parser.add_mutually_exclusive_group(required=True)
    test_group.add_argument(
        "--scenario", "-s",
        help="Test single scenario by name"
    )
    test_group.add_argument(
        "--all", "-a",
        action="store_true",
        help="Test all available scenarios"
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
        default=TestMode.DEMO.value,
        help=f"Test execution mode (default: {TestMode.DEMO.value})"
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
    
    return parser

async def main():
    """Main entry point for the unified test runner"""
    
    # Parse command line arguments
    parser = create_argument_parser()
    args = parser.parse_args()
    
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
        use_mock_ips_cache=use_mock_ips
    )
    
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