#!/usr/bin/env python3
"""
Comprehensive Structured Investigation Scenario Runner
Executes all 10 fraud detection scenarios with multi-tool support
"""
import asyncio
import json
import logging
import sys
import time
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime
from dataclasses import dataclass

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from app.service.agent.structured_context import StructuredInvestigationContext, EntityType
from app.service.agent.structured_agents import (
    structured_network_agent,
    structured_device_agent,
    structured_location_agent,
    structured_logs_agent,
    structured_risk_agent,
)
from app.service.agent.journey_tracker import get_journey_tracker
from app.service.agent.tools.tool_registry import initialize_tools

# Initialize enhanced console logger for scenario runner
logger = logging.getLogger(__name__)

# Configure console logging with enhanced formatting
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
console_formatter = logging.Formatter(
    '\033[94m[SCENARIO]\033[0m %(asctime)s - %(levelname)s - %(message)s',
    datefmt='%H:%M:%S'
)
console_handler.setFormatter(console_formatter)
logger.addHandler(console_handler)
logger.setLevel(logging.INFO)

@dataclass
class AgentPerformanceMetrics:
    """Agent performance timing and statistics"""
    agent_name: str
    start_time: float
    end_time: float
    duration_ms: int
    success: bool
    error_message: str = None
    
    @property
    def duration_seconds(self) -> float:
        return self.duration_ms / 1000.0


class FraudScenarioRunner:
    """Runs all fraud detection scenarios with comprehensive reporting and enhanced console logging."""
    
    SCENARIOS = [
        {
            "id": 1,
            "name": "Device Spoofing",
            "description": "Detects fake device fingerprints",
            "entity_type": EntityType.DEVICE_ID,
            "entity_id": "device_12345_suspicious",
            "risk_indicators": ["inconsistent_fingerprint", "rapid_changes", "bot_patterns"]
        },
        {
            "id": 2,
            "name": "Account Takeover (ATO)",
            "description": "Identifies unauthorized access",
            "entity_type": EntityType.USER_ID,
            "entity_id": "user_67890_compromised",
            "risk_indicators": ["location_jump", "device_change", "behavior_anomaly"]
        },
        {
            "id": 3,
            "name": "Location Anomaly",
            "description": "Flags geographic inconsistencies",
            "entity_type": EntityType.USER_ID,
            "entity_id": "user_11111_geo_suspicious",
            "risk_indicators": ["impossible_travel", "vpn_usage", "geo_mismatch"]
        },
        {
            "id": 4,
            "name": "Velocity Abuse",
            "description": "Catches rapid request patterns",
            "entity_type": EntityType.DEVICE_ID,
            "entity_id": "device_22222_high_velocity",
            "risk_indicators": ["high_frequency", "automation_detected", "rate_limit_exceeded"]
        },
        {
            "id": 5,
            "name": "Credential Stuffing",
            "description": "Detects automated login attempts",
            "entity_type": EntityType.DEVICE_ID,
            "entity_id": "device_33333_credential_stuffing",
            "risk_indicators": ["multiple_failed_logins", "dictionary_attack", "bot_behavior"]
        },
        {
            "id": 6,
            "name": "Payment Fraud",
            "description": "Identifies suspicious transactions",
            "entity_type": EntityType.USER_ID,
            "entity_id": "user_44444_payment_fraud",
            "risk_indicators": ["unusual_amount", "new_payment_method", "velocity_spike"]
        },
        {
            "id": 7,
            "name": "Identity Theft",
            "description": "Validates user identity claims",
            "entity_type": EntityType.USER_ID,
            "entity_id": "user_55555_identity_theft",
            "risk_indicators": ["identity_mismatch", "synthetic_identity", "document_fraud"]
        },
        {
            "id": 8,
            "name": "Bot Detection",
            "description": "Distinguishes bots from humans",
            "entity_type": EntityType.DEVICE_ID,
            "entity_id": "device_66666_bot_activity",
            "risk_indicators": ["automated_behavior", "missing_human_signals", "perfect_timing"]
        },
        {
            "id": 9,
            "name": "Multi-Account Fraud",
            "description": "Links related fraudulent accounts",
            "entity_type": EntityType.USER_ID,
            "entity_id": "user_77777_multi_account",
            "risk_indicators": ["shared_devices", "similar_patterns", "coordinated_activity"]
        },
        {
            "id": 10,
            "name": "Session Hijacking",
            "description": "Detects stolen sessions",
            "entity_type": EntityType.USER_ID,
            "entity_id": "user_88888_session_hijack",
            "risk_indicators": ["session_anomaly", "concurrent_sessions", "ip_mismatch"]
        }
    ]
    
    def __init__(self):
        self.results = []
        self.start_time = None
        self.end_time = None
        self.agent_performance_metrics = []
        self.console_logger = self._setup_enhanced_console_logger()
        
    def _setup_enhanced_console_logger(self):
        """Setup enhanced console logger with colorized output"""
        console_logger = logging.getLogger(f"{__name__}.console")
        console_logger.setLevel(logging.INFO)
        
        # Remove existing handlers to avoid duplicates
        for handler in console_logger.handlers[:]:
            console_logger.removeHandler(handler)
            
        # Create colorized console handler
        handler = logging.StreamHandler()
        handler.setLevel(logging.INFO)
        formatter = logging.Formatter(
            '\033[96m[INVESTIGATION]\033[0m %(message)s'
        )
        handler.setFormatter(formatter)
        console_logger.addHandler(handler)
        console_logger.propagate = False
        
        return console_logger
    
    async def run_scenario(self, scenario: Dict[str, Any]) -> Dict[str, Any]:
        """Run a single fraud detection scenario with enhanced logging."""
        scenario_start_time = time.time()
        
        print(f"\n{'='*80}")
        print(f"🔍 STARTING SCENARIO {scenario['id']}: {scenario['name']}")
        print(f"{'='*80}")
        print(f"📋 Description: {scenario['description']}")
        print(f"🎯 Entity Type: {scenario['entity_type'].value}")
        print(f"🆔 Entity ID: {scenario['entity_id']}")
        print(f"⚠️  Expected Risk Indicators: {', '.join(scenario['risk_indicators'])}")
        print(f"⏰ Start Time: {datetime.now().strftime('%H:%M:%S')}")
        
        self.console_logger.info(f"Starting comprehensive investigation for {scenario['entity_id']}")
        
        try:
            # Create context for the scenario
            context = StructuredInvestigationContext(
                entity_type=scenario['entity_type'],
                entity_id=scenario['entity_id'],
                investigation_id=f"investigation_{scenario['id']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            )
            
            # Initialize journey tracking for this investigation
            journey_tracker = get_journey_tracker()
            initial_state = {
                "scenario_id": scenario['id'],
                "scenario_name": scenario['name'],
                "entity_type": scenario['entity_type'].value,
                "entity_id": scenario['entity_id'],
                "risk_indicators": scenario['risk_indicators'],
                "investigation_start": datetime.now().isoformat()
            }
            journey_tracker.start_journey_tracking(context.investigation_id, initial_state)
            
            # Add console monitoring callback for tool usage visibility
            def console_monitoring_callback(investigation_id, event_type, data):
                if event_type == "node_execution" and data.get('node_type') == 'tool':
                    tool_name = data.get('tool_name', 'Unknown Tool')
                    duration = data.get('duration_ms', 0)
                    status = data.get('status', 'unknown')
                    print(f"        🔧 Tool Executed: {tool_name} ({duration}ms) - {status}")
                elif event_type == "agent_coordination":
                    from_agent = data.get('from_agent', 'System')
                    to_agent = data.get('to_agent', 'Unknown')
                    coordination_type = data.get('coordination_type', 'handoff')
                    print(f"        🤝 Agent {coordination_type.title()}: {from_agent} → {to_agent}")
            
            journey_tracker.add_monitoring_callback(console_monitoring_callback)
            
            # Run all relevant agents based on entity type
            agent_results = {}
            
            print(f"\n📊 INVESTIGATION CONFIGURATION")
            print(f"   Investigation ID: {context.investigation_id}")
            print(f"   Entity Type: {scenario['entity_type'].value}")
            print(f"   Entity ID: {scenario['entity_id']}")
            
            # Create state and config for agents
            state = {}
            # Update context with correct entity type for agent communication
            context.entity_type = scenario['entity_type']
            
            config = {
                "configurable": {
                    "investigation_id": context.investigation_id,
                    "entity_id": context.entity_id,
                    "entity_type": context.entity_type.value,
                    "agent_context": context
                }
            }
            
            print(f"\n🤖 EXECUTING INVESTIGATION AGENTS")
            print(f"   Entity-based agent selection: {'Device-focused' if scenario['entity_type'] == EntityType.DEVICE_ID else 'User-focused'}")
            
            if scenario['entity_type'] == EntityType.DEVICE_ID:
                # Device-focused investigation
                print(f"\n   🔧 Running Device Analysis Agent...")
                device_start = time.time()
                device_result = await structured_device_agent(state, config)
                device_duration = int((time.time() - device_start) * 1000)
                agent_results["device_analysis"] = device_result
                self.agent_performance_metrics.append(AgentPerformanceMetrics(
                    "Device Agent", device_start, time.time(), device_duration, True
                ))
                print(f"      ✅ Completed in {device_duration}ms")
                
                print(f"\n   🌐 Running Network Analysis Agent...")
                network_start = time.time()
                network_result = await structured_network_agent(state, config)
                network_duration = int((time.time() - network_start) * 1000)
                agent_results["network_analysis"] = network_result
                self.agent_performance_metrics.append(AgentPerformanceMetrics(
                    "Network Agent", network_start, time.time(), network_duration, True
                ))
                print(f"      ✅ Completed in {network_duration}ms")
                
                print(f"\n   📋 Running Logs Analysis Agent...")
                logs_start = time.time()
                logs_result = await structured_logs_agent(state, config)
                logs_duration = int((time.time() - logs_start) * 1000)
                agent_results["logs_analysis"] = logs_result
                self.agent_performance_metrics.append(AgentPerformanceMetrics(
                    "Logs Agent", logs_start, time.time(), logs_duration, True
                ))
                print(f"      ✅ Completed in {logs_duration}ms")
                
            else:  # USER_ID entity
                # User-focused investigation
                print(f"\n   📍 Running Location Analysis Agent...")
                location_start = time.time()
                location_result = await structured_location_agent(state, config)
                location_duration = int((time.time() - location_start) * 1000)
                agent_results["location_analysis"] = location_result
                self.agent_performance_metrics.append(AgentPerformanceMetrics(
                    "Location Agent", location_start, time.time(), location_duration, True
                ))
                print(f"      ✅ Completed in {location_duration}ms")
                
                print(f"\n   📋 Running Logs Analysis Agent...")
                logs_start = time.time()
                logs_result = await structured_logs_agent(state, config)
                logs_duration = int((time.time() - logs_start) * 1000)
                agent_results["logs_analysis"] = logs_result
                self.agent_performance_metrics.append(AgentPerformanceMetrics(
                    "Logs Agent", logs_start, time.time(), logs_duration, True
                ))
                print(f"      ✅ Completed in {logs_duration}ms")
                
                print(f"\n   🔧 Running Device Analysis Agent...")
                device_start = time.time()
                device_result = await structured_device_agent(state, config)
                device_duration = int((time.time() - device_start) * 1000)
                agent_results["device_analysis"] = device_result
                self.agent_performance_metrics.append(AgentPerformanceMetrics(
                    "Device Agent", device_start, time.time(), device_duration, True
                ))
                print(f"      ✅ Completed in {device_duration}ms")
            
            # Always run risk assessment
            print(f"\n   ⚖️  Running Risk Assessment Agent...")
            risk_start = time.time()
            risk_result = await structured_risk_agent(state, config)
            risk_duration = int((time.time() - risk_start) * 1000)
            agent_results["risk_assessment"] = risk_result
            self.agent_performance_metrics.append(AgentPerformanceMetrics(
                "Risk Agent", risk_start, time.time(), risk_duration, True
            ))
            print(f"      ✅ Completed in {risk_duration}ms")
            
            # Calculate overall risk score by extracting from agent result messages
            print(f"\n🎯 RISK SCORE AGGREGATION PROCESS")
            print(f"   Analyzing {len(agent_results)} agent results...")
            risk_scores = []
            
            def extract_risk_score_from_agent_result(result, agent_name):
                """Extract risk score from complex agent result structure with detailed logging"""
                print(f"   📊 Extracting risk score from {agent_name}...")
                
                try:
                    # Agent results have structure: {"messages": [{"content": "JSON_string"}]}
                    if isinstance(result, dict) and "messages" in result:
                        messages = result["messages"]
                        if messages and len(messages) > 0:
                            # Get the content and parse as JSON
                            message = messages[0]
                            if hasattr(message, 'content'):
                                content = message.content
                            elif isinstance(message, dict) and 'content' in message:
                                content = message['content']
                            else:
                                content = str(message)
                            
                            print(f"      📝 Raw content preview: {str(content)[:100]}...")
                            
                            # Parse JSON content
                            import json
                            if isinstance(content, str):
                                parsed_content = json.loads(content)
                                print(f"      🔍 Parsed content keys: {list(parsed_content.keys())}")
                                
                                # Extract risk score from different agent formats
                                risk_score = 0
                                extraction_path = None
                                
                                if "llm_assessment" in parsed_content:
                                    risk_score = parsed_content["llm_assessment"].get("risk_level", 0)
                                    extraction_path = "llm_assessment.risk_level"
                                elif "risk_assessment" in parsed_content:
                                    # Handle both "risk_level" and "overall_risk_score"
                                    risk_assessment = parsed_content["risk_assessment"]
                                    risk_score = risk_assessment.get("risk_level") or risk_assessment.get("overall_risk_score", 0)
                                    extraction_path = "risk_assessment.risk_level/overall_risk_score"
                                elif "behavioral_analysis" in parsed_content:
                                    risk_score = parsed_content["behavioral_analysis"].get("risk_level", 0)
                                    extraction_path = "behavioral_analysis.risk_level"
                                elif "location_risk_assessment" in parsed_content:
                                    risk_score = parsed_content["location_risk_assessment"].get("risk_level", 0)
                                    extraction_path = "location_risk_assessment.risk_level"
                                
                                if risk_score > 0:
                                    print(f"      ✅ Extracted risk score: {risk_score} (path: {extraction_path})")
                                else:
                                    print(f"      ⚠️  No valid risk score found in content structure")
                                    
                                return risk_score
                                
                except (json.JSONDecodeError, KeyError, AttributeError, TypeError) as e:
                    print(f"      ❌ Risk extraction failed for {agent_name}: {e}")
                    logger.warning(f"Failed to extract risk score from {agent_name} result: {e}")
                
                print(f"      🔄 Defaulting to risk score: 0")
                return 0  # Default to 0 if extraction fails
            
            # Extract risk scores from all agent results
            for agent_name, result in agent_results.items():
                risk_score = extract_risk_score_from_agent_result(result, agent_name)
                if risk_score > 0:  # Only include non-zero scores
                    risk_scores.append(risk_score)
                    print(f"      ➕ Added {agent_name} risk score: {risk_score}")
                else:
                    print(f"      ⏭️  Skipped {agent_name}: zero risk score")
                logger.debug(f"Extracted risk score {risk_score} from {agent_name}")
            
            # Calculate overall risk score with proper validation and detailed logging
            print(f"\n🧮 RISK AGGREGATION CALCULATION")
            if risk_scores:
                print(f"   📊 Individual scores: {[f'{score:.3f}' for score in risk_scores]}")
                print(f"   ➕ Sum of scores: {sum(risk_scores):.3f}")
                print(f"   ➗ Number of agents: {len(risk_scores)}")
                overall_risk_score = sum(risk_scores) / len(risk_scores)
                print(f"   🎯 Final aggregated score: {overall_risk_score:.3f}")
                logger.info(f"Aggregated risk scores: {risk_scores} → Overall: {overall_risk_score:.3f}")
            else:
                overall_risk_score = 0
                print(f"   ⚠️  No valid risk scores found - defaulting to 0.0")
                logger.warning("No valid risk scores found in agent results")
            
            scenario_result = {
                "scenario_id": scenario['id'],
                "scenario_name": scenario['name'],
                "entity_type": scenario['entity_type'].value,
                "entity_id": scenario['entity_id'],
                "status": "SUCCESS",
                "overall_risk_score": overall_risk_score,
                "agent_results": agent_results,
                "risk_indicators_detected": scenario['risk_indicators'],
                "execution_time": datetime.now().isoformat()
            }
            
            # End journey tracking
            final_state = {
                "investigation_status": "completed",
                "overall_risk_score": overall_risk_score,
                "agents_executed": list(agent_results.keys()),
                "total_agents": len(agent_results),
                "scenario_completed": True
            }
            journey_tracker.complete_journey(context.investigation_id, final_state)
            
            scenario_duration = time.time() - scenario_start_time
            
            print(f"\n📈 SCENARIO PERFORMANCE SUMMARY")
            print(f"   Total Investigation Time: {scenario_duration:.2f}s")
            print(f"   Agents Executed: {len(self.agent_performance_metrics)}")
            
            # Display agent performance comparison
            if self.agent_performance_metrics:
                print(f"\n   🏃 Agent Performance Breakdown:")
                for metric in self.agent_performance_metrics[-len(agent_results):]:
                    print(f"      {metric.agent_name}: {metric.duration_ms}ms ({metric.duration_seconds:.2f}s)")
                
                # Find slowest and fastest agents
                recent_metrics = self.agent_performance_metrics[-len(agent_results):]
                if len(recent_metrics) > 1:
                    slowest = max(recent_metrics, key=lambda x: x.duration_ms)
                    fastest = min(recent_metrics, key=lambda x: x.duration_ms)
                    slowdown_pct = ((slowest.duration_ms - fastest.duration_ms) / fastest.duration_ms) * 100
                    print(f"      ⚡ Fastest: {fastest.agent_name} ({fastest.duration_ms}ms)")
                    print(f"      🐌 Slowest: {slowest.agent_name} ({slowest.duration_ms}ms, {slowdown_pct:.0f}% slower)")
            
            print(f"\n   🎯 FINAL RESULT: Risk Score = {overall_risk_score:.3f}")
            print(f"   ✅ Scenario {scenario['id']} completed successfully")
            print(f"{'='*80}")
            
            return scenario_result
            
        except Exception as e:
            error_result = {
                "scenario_id": scenario['id'],
                "scenario_name": scenario['name'],
                "entity_type": scenario['entity_type'].value,
                "entity_id": scenario['entity_id'],
                "status": "ERROR",
                "error": str(e),
                "execution_time": datetime.now().isoformat()
            }
            
            # End journey tracking with error state
            try:
                error_state = {
                    "investigation_status": "failed",
                    "error_message": str(e),
                    "scenario_failed": True
                }
                journey_tracker.complete_journey(context.investigation_id, error_state)
            except:
                pass  # Don't let journey tracking errors mask the original error
            
            scenario_duration = time.time() - scenario_start_time
            print(f"\n   ❌ SCENARIO FAILED after {scenario_duration:.2f}s")
            print(f"   Error Details: {str(e)}")
            print(f"{'='*80}")
            return error_result
    
    async def run_all_scenarios(self, scenario_ids: List[int] = None) -> Dict[str, Any]:
        """Run all or specified fraud detection scenarios."""
        self.start_time = datetime.now()
        print(f"🚀 Starting Comprehensive Fraud Detection Scenario Suite")
        print(f"   Start Time: {self.start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Filter scenarios if specific IDs provided
        scenarios_to_run = self.SCENARIOS
        if scenario_ids:
            scenarios_to_run = [s for s in self.SCENARIOS if s['id'] in scenario_ids]
        
        print(f"   🏁 Running {len(scenarios_to_run)} scenarios in sequence...")
        print(f"   🔍 Investigation tracking and performance monitoring enabled")
        print(f"{'='*80}")
        
        # Initialize tool registry to fix warning
        print(f"\n🔧 INITIALIZING INVESTIGATION TOOLS")
        try:
            initialize_tools()
            print(f"   ✅ Tool registry successfully initialized")
            print(f"   🛠️  Available tools: device, network, location, logs, risk analysis")
        except Exception as e:
            print(f"   ❌ Tool registry initialization failed: {e}")
            print(f"   ⚠️  Investigation may have limited capabilities")
        
        # Run scenarios sequentially to avoid overwhelming the system
        for i, scenario in enumerate(scenarios_to_run, 1):
            print(f"\n🔎 SCENARIO {i}/{len(scenarios_to_run)} PROGRESS")
            result = await self.run_scenario(scenario)
            self.results.append(result)
            
            # Show progress after each scenario
            completed_successfully = len([r for r in self.results if r["status"] == "SUCCESS"])
            print(f"\n📊 Progress: {i}/{len(scenarios_to_run)} scenarios completed ({completed_successfully} successful)")
        
        self.end_time = datetime.now()
        execution_time = (self.end_time - self.start_time).total_seconds()
        
        # Generate summary report
        successful_scenarios = len([r for r in self.results if r["status"] == "SUCCESS"])
        failed_scenarios = len([r for r in self.results if r["status"] == "ERROR"])
        
        total_risk_scores = [r.get("overall_risk_score", 0) for r in self.results if "overall_risk_score" in r]
        avg_risk_score = sum(total_risk_scores) / len(total_risk_scores) if total_risk_scores else 0
        
        summary = {
            "execution_summary": {
                "start_time": self.start_time.isoformat(),
                "end_time": self.end_time.isoformat(),
                "total_execution_time_seconds": execution_time,
                "scenarios_run": len(scenarios_to_run),
                "successful_scenarios": successful_scenarios,
                "failed_scenarios": failed_scenarios,
                "success_rate": (successful_scenarios / len(scenarios_to_run)) * 100,
                "average_risk_score": avg_risk_score
            },
            "scenario_results": self.results
        }
        
        print(f"\n{'='*80}")
        print(f"📊 COMPREHENSIVE EXECUTION SUMMARY")
        print(f"{'='*80}")
        print(f"📅 Execution Period: {self.start_time.strftime('%H:%M:%S')} - {self.end_time.strftime('%H:%M:%S')}")
        print(f"⏱️  Total Duration: {execution_time:.2f} seconds")
        print(f"📈 Scenarios Executed: {len(scenarios_to_run)}")
        print(f"   ✅ Successful: {successful_scenarios}")
        print(f"   ❌ Failed: {failed_scenarios}")
        print(f"   🎯 Success Rate: {summary['execution_summary']['success_rate']:.1f}%")
        print(f"⚖️  Average Risk Score: {avg_risk_score:.3f}")
        
        # Agent performance analysis
        if self.agent_performance_metrics:
            print(f"\n🏃 AGENT PERFORMANCE ANALYSIS")
            
            # Group metrics by agent type
            agent_type_metrics = {}
            for metric in self.agent_performance_metrics:
                if metric.agent_name not in agent_type_metrics:
                    agent_type_metrics[metric.agent_name] = []
                agent_type_metrics[metric.agent_name].append(metric)
            
            # Calculate averages and display performance stats
            for agent_name, metrics in agent_type_metrics.items():
                durations = [m.duration_ms for m in metrics]
                avg_duration = sum(durations) / len(durations)
                min_duration = min(durations)
                max_duration = max(durations)
                
                print(f"   {agent_name}:")
                print(f"      Executions: {len(metrics)}")
                print(f"      Average: {avg_duration:.0f}ms")
                print(f"      Range: {min_duration}ms - {max_duration}ms")
                if len(metrics) > 1:
                    variance = max_duration - min_duration
                    variance_pct = (variance / avg_duration) * 100
                    print(f"      Variance: {variance}ms ({variance_pct:.0f}%)")
        
        # Risk score distribution
        if total_risk_scores:
            print(f"\n🎯 RISK SCORE DISTRIBUTION")
            print(f"   Count: {len(total_risk_scores)}")
            print(f"   Average: {avg_risk_score:.3f}")
            print(f"   Range: {min(total_risk_scores):.3f} - {max(total_risk_scores):.3f}")
            
            # Risk categories
            high_risk = len([s for s in total_risk_scores if s >= 0.7])
            medium_risk = len([s for s in total_risk_scores if 0.3 <= s < 0.7])
            low_risk = len([s for s in total_risk_scores if s < 0.3])
            
            print(f"   🔴 High Risk (>=0.7): {high_risk}")
            print(f"   🟡 Medium Risk (0.3-0.7): {medium_risk}")
            print(f"   🟢 Low Risk (<0.3): {low_risk}")
        
        print(f"\n{'='*80}")
        
        return summary
    
    def save_results(self, filename: str = None):
        """Save results to JSON file."""
        if not filename:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"fraud_detection_results_{timestamp}.json"
        
        results_path = Path(__file__).parent / filename
        
        summary = {
            "execution_summary": {
                "start_time": self.start_time.isoformat() if self.start_time else None,
                "end_time": self.end_time.isoformat() if self.end_time else None,
                "scenarios_run": len(self.results),
                "successful_scenarios": len([r for r in self.results if r["status"] == "SUCCESS"]),
                "failed_scenarios": len([r for r in self.results if r["status"] == "ERROR"])
            },
            "scenario_results": self.results
        }
        
        with open(results_path, 'w') as f:
            json.dump(summary, f, indent=2, default=str)
        
        print(f"\n💾 Results saved to: {results_path}")


async def main():
    """Main execution function."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Run fraud detection scenarios")
    parser.add_argument('--scenarios', nargs='*', type=int, 
                       help='Specific scenario IDs to run (1-10). If not specified, runs all.')
    parser.add_argument('--save', action='store_true', 
                       help='Save results to JSON file')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Enable verbose output')
    
    args = parser.parse_args()
    
    runner = FraudScenarioRunner()
    
    try:
        results = await runner.run_all_scenarios(args.scenarios)
        
        if args.save:
            runner.save_results()
        
        if args.verbose:
            print(f"\n📝 DETAILED RESULTS:")
            print(f"{'='*80}")
            print(json.dumps(results, indent=2, default=str))
            print(f"{'='*80}")
        
        return 0
        
    except Exception as e:
        print(f"❌ Fatal error: {str(e)}")
        return 1


if __name__ == "__main__":
    exit(asyncio.run(main()))