#!/usr/bin/env python3
"""
Batch Investigation Runner

Runs multiple investigation scenarios in batch mode for comprehensive testing
and validation of the autonomous investigation system. Supports CSV input,
concurrent execution, and comprehensive reporting.

Features:
- Batch processing of multiple investigations
- CSV file input support
- Concurrent execution with configurable workers
- Progress tracking and monitoring
- Comprehensive batch reporting
- Performance analytics
- Success rate analysis
- Cost tracking (for live mode)

Usage:
    # Run all predefined scenarios
    python batch_investigation_runner.py --all-scenarios --mode mock

    # Run from CSV file
    python batch_investigation_runner.py --csv-file investigations.csv --concurrent 3

    # Run specific scenario types in batch
    python batch_investigation_runner.py --scenario-types account-takeover,payment-fraud --count 5

    # Generate comprehensive batch report
    python batch_investigation_runner.py --all-scenarios --html-report --analytics

Author: Gil Klainert
Created: 2025-09-08
Version: 1.0.0
"""

import asyncio
import argparse
import csv
import json
import os
import sys
import time
import concurrent.futures
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
import threading
from queue import Queue

# Add parent directories to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "olorin-server"))

from app.service.logging import get_bridge_logger
logger = get_bridge_logger(__name__)

# Import scenario runner
from scenario_investigation_runner import ScenarioInvestigationRunner, InvestigationScenarioTemplate


@dataclass
class BatchInvestigationConfig:
    """Configuration for batch investigation runs."""
    
    scenarios: List[str] = field(default_factory=list)
    mode: str = "mock"
    concurrent_workers: int = 1
    timeout_per_investigation: int = 300
    csv_file: Optional[str] = None
    csv_limit: Optional[int] = None
    generate_html_report: bool = False
    include_analytics: bool = False
    output_directory: Optional[str] = None
    verbose: bool = False
    

@dataclass
class BatchInvestigationResult:
    """Results from a batch investigation run."""
    
    config: BatchInvestigationConfig
    start_time: datetime
    end_time: Optional[datetime] = None
    total_investigations: int = 0
    completed_investigations: int = 0
    failed_investigations: int = 0
    results: List[Dict[str, Any]] = field(default_factory=list)
    performance_metrics: Dict[str, Any] = field(default_factory=dict)
    cost_analysis: Dict[str, float] = field(default_factory=dict)
    error_analysis: Dict[str, Any] = field(default_factory=dict)


class BatchInvestigationRunner:
    """Runs multiple investigation scenarios in batch."""
    
    def __init__(self, config: BatchInvestigationConfig):
        self.config = config
        self.scenario_runner = ScenarioInvestigationRunner()
        self.output_dir = Path(config.output_directory or "batch_reports")
        self.output_dir.mkdir(exist_ok=True)
        self.progress_queue = Queue()
        self.results_lock = threading.Lock()
        
    async def run_batch_investigations(self) -> BatchInvestigationResult:
        """Run batch investigations based on configuration."""
        
        print(f"\n🎯 Starting Batch Investigation Run")
        print("=" * 60)
        print(f"📋 Mode: {self.config.mode.upper()}")
        print(f"👥 Concurrent Workers: {self.config.concurrent_workers}")
        print(f"⏱️  Timeout per Investigation: {self.config.timeout_per_investigation}s")
        
        # Initialize result tracker
        batch_result = BatchInvestigationResult(
            config=self.config,
            start_time=datetime.now()
        )
        
        # Get investigation tasks
        investigation_tasks = await self._prepare_investigation_tasks()
        batch_result.total_investigations = len(investigation_tasks)
        
        print(f"📊 Total Investigations Planned: {batch_result.total_investigations}")
        
        if self.config.mode == "live":
            await self._validate_live_mode_approval(batch_result.total_investigations)
        
        # Start progress monitoring
        progress_thread = threading.Thread(
            target=self._monitor_progress,
            args=(batch_result,),
            daemon=True
        )
        progress_thread.start()
        
        # Execute investigations
        print(f"\n🚀 Executing investigations...")
        if self.config.concurrent_workers > 1:
            await self._run_concurrent_investigations(investigation_tasks, batch_result)
        else:
            await self._run_sequential_investigations(investigation_tasks, batch_result)
        
        # Finalize results
        batch_result.end_time = datetime.now()
        batch_result = await self._analyze_batch_results(batch_result)
        
        # Generate reports
        await self._generate_batch_reports(batch_result)
        
        # Print summary
        self._print_batch_summary(batch_result)
        
        return batch_result
    
    async def _prepare_investigation_tasks(self) -> List[Dict[str, Any]]:
        """Prepare list of investigation tasks to execute."""
        
        tasks = []
        
        if self.config.csv_file:
            # Load from CSV file
            tasks = await self._load_csv_investigations()
        else:
            # Generate from scenario configuration
            tasks = await self._generate_scenario_investigations()
        
        # Apply CSV limit if specified
        if self.config.csv_limit and len(tasks) > self.config.csv_limit:
            tasks = tasks[:self.config.csv_limit]
            print(f"📋 Limited to {self.config.csv_limit} investigations from {len(tasks)} total")
        
        return tasks
    
    async def _load_csv_investigations(self) -> List[Dict[str, Any]]:
        """Load investigation tasks from CSV file."""
        
        if not self.config.csv_file or not Path(self.config.csv_file).exists():
            raise FileNotFoundError(f"CSV file not found: {self.config.csv_file}")
        
        tasks = []
        
        with open(self.config.csv_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                task = {
                    "entity_id": row.get("entity_id", f"csv_{len(tasks)}_{int(time.time())}"),
                    "scenario_type": row.get("scenario_type", "account_takeover"),
                    "risk_level": row.get("risk_level", "medium"),
                    "custom_parameters": {k: v for k, v in row.items() 
                                        if k not in ["entity_id", "scenario_type", "risk_level"]}
                }
                tasks.append(task)
        
        print(f"📂 Loaded {len(tasks)} investigations from CSV: {self.config.csv_file}")
        return tasks
    
    async def _generate_scenario_investigations(self) -> List[Dict[str, Any]]:
        """Generate investigation tasks from scenario configuration."""
        
        tasks = []
        scenarios = self.config.scenarios or list(self.scenario_runner.scenarios.keys())
        
        for scenario_id in scenarios:
            if scenario_id in self.scenario_runner.scenarios:
                template = self.scenario_runner.scenarios[scenario_id]
                task = {
                    "scenario_id": scenario_id,
                    "entity_id": f"{scenario_id}_{int(time.time())}_{len(tasks)}",
                    "scenario_type": template.scenario_type,
                    "risk_level": template.risk_level,
                    "template": template
                }
                tasks.append(task)
        
        print(f"🎭 Generated {len(tasks)} investigations from scenarios: {', '.join(scenarios)}")
        return tasks
    
    async def _validate_live_mode_approval(self, total_investigations: int):
        """Validate approval for live mode batch execution."""
        
        estimated_cost = total_investigations * 0.20  # Rough estimate per investigation
        
        print(f"\n🚨💰 LIVE MODE BATCH EXECUTION!")
        print(f"🚨💰 Total Investigations: {total_investigations}")
        print(f"🚨💰 Estimated Total Cost: ${estimated_cost:.2f}")
        print(f"🚨💰 This will use REAL APIs and cost REAL MONEY!")
        
        response = input("🚨💰 Type 'I APPROVE LIVE MODE BATCH COSTS' to continue: ")
        if response != "I APPROVE LIVE MODE BATCH COSTS":
            print("❌ Live mode batch execution not approved. Exiting.")
            sys.exit(1)
        
        print("✅ Live mode batch execution approved.")
    
    async def _run_sequential_investigations(
        self, 
        tasks: List[Dict[str, Any]], 
        batch_result: BatchInvestigationResult
    ):
        """Run investigations sequentially."""
        
        for i, task in enumerate(tasks):
            print(f"\n🔍 Investigation {i+1}/{len(tasks)}: {task.get('scenario_id', task.get('scenario_type'))}")
            
            try:
                result = await self._execute_single_investigation(task)
                
                with self.results_lock:
                    batch_result.results.append(result)
                    batch_result.completed_investigations += 1
                
                self.progress_queue.put({
                    "type": "completed",
                    "task": task,
                    "result": result
                })
                
            except Exception as e:
                logger.error(f"Investigation failed: {e}")
                
                with self.results_lock:
                    batch_result.failed_investigations += 1
                
                self.progress_queue.put({
                    "type": "failed", 
                    "task": task,
                    "error": str(e)
                })
    
    async def _run_concurrent_investigations(
        self,
        tasks: List[Dict[str, Any]],
        batch_result: BatchInvestigationResult
    ):
        """Run investigations concurrently."""
        
        semaphore = asyncio.Semaphore(self.config.concurrent_workers)
        
        async def run_with_semaphore(task):
            async with semaphore:
                return await self._execute_single_investigation(task)
        
        # Execute all tasks concurrently
        results = await asyncio.gather(
            *[run_with_semaphore(task) for task in tasks],
            return_exceptions=True
        )
        
        # Process results
        for task, result in zip(tasks, results):
            if isinstance(result, Exception):
                logger.error(f"Investigation failed: {result}")
                
                with self.results_lock:
                    batch_result.failed_investigations += 1
                
                self.progress_queue.put({
                    "type": "failed",
                    "task": task, 
                    "error": str(result)
                })
            else:
                with self.results_lock:
                    batch_result.results.append(result)
                    batch_result.completed_investigations += 1
                
                self.progress_queue.put({
                    "type": "completed",
                    "task": task,
                    "result": result
                })
    
    async def _execute_single_investigation(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single investigation task."""
        
        start_time = time.time()
        
        try:
            if "scenario_id" in task:
                # Use predefined scenario
                result = await self.scenario_runner.run_scenario(
                    scenario_id=task["scenario_id"],
                    mode=self.config.mode,
                    entity_id=task["entity_id"],
                    timeout=self.config.timeout_per_investigation,
                    verbose=self.config.verbose
                )
            else:
                # Use custom scenario
                result = await self.scenario_runner.run_custom_scenario(
                    entity_id=task["entity_id"],
                    risk_level=task["risk_level"],
                    scenario_type=task["scenario_type"],
                    mode=self.config.mode,
                    **(task.get("custom_parameters", {}))
                )
            
            # Add batch execution metadata
            result["batch_metadata"] = {
                "task": task,
                "execution_time": time.time() - start_time,
                "batch_mode": True,
                "concurrent_workers": self.config.concurrent_workers
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Investigation execution failed: {e}")
            raise
    
    def _monitor_progress(self, batch_result: BatchInvestigationResult):
        """Monitor and display batch execution progress."""
        
        while True:
            try:
                progress_item = self.progress_queue.get(timeout=1)
                
                completed = batch_result.completed_investigations
                failed = batch_result.failed_investigations
                total = batch_result.total_investigations
                
                if progress_item["type"] == "completed":
                    print(f"✅ Completed: {completed}/{total} ({(completed/total)*100:.1f}%)")
                elif progress_item["type"] == "failed":
                    print(f"❌ Failed: {failed}/{total} - {progress_item['error']}")
                
                # Exit when all investigations are done
                if completed + failed >= total:
                    break
                    
            except:
                # Timeout or queue empty - continue monitoring
                continue
    
    async def _analyze_batch_results(self, batch_result: BatchInvestigationResult) -> BatchInvestigationResult:
        """Analyze batch results and generate analytics."""
        
        if not batch_result.results:
            return batch_result
        
        # Performance metrics
        execution_times = []
        total_cost = 0.0
        risk_scores = []
        scenario_performance = {}
        
        for result in batch_result.results:
            # Extract execution time
            if "investigation_summary" in result:
                execution_times.append(result["investigation_summary"]["execution_time_seconds"])
            elif "batch_metadata" in result:
                execution_times.append(result["batch_metadata"]["execution_time"])
            
            # Extract cost information
            if "technical_details" in result:
                metrics = result["technical_details"].get("execution_metrics", {})
                cost = metrics.get("estimated_cost", 0.0)
                total_cost += cost
            
            # Extract risk scores
            if "risk_assessment" in result:
                risk_score = result["risk_assessment"].get("risk_score", 0)
                risk_scores.append(risk_score)
            
            # Track scenario performance
            scenario_type = result.get("investigation_summary", {}).get("scenario_name", "unknown")
            if scenario_type not in scenario_performance:
                scenario_performance[scenario_type] = {"count": 0, "success": 0, "avg_time": 0}
            
            scenario_performance[scenario_type]["count"] += 1
            scenario_performance[scenario_type]["success"] += 1
        
        # Calculate analytics
        total_time = (batch_result.end_time - batch_result.start_time).total_seconds()
        
        batch_result.performance_metrics = {
            "total_execution_time": total_time,
            "average_investigation_time": sum(execution_times) / len(execution_times) if execution_times else 0,
            "fastest_investigation": min(execution_times) if execution_times else 0,
            "slowest_investigation": max(execution_times) if execution_times else 0,
            "success_rate": (batch_result.completed_investigations / batch_result.total_investigations) * 100,
            "throughput_per_hour": (batch_result.completed_investigations / (total_time / 3600)) if total_time > 0 else 0,
            "average_risk_score": sum(risk_scores) / len(risk_scores) if risk_scores else 0,
            "scenario_performance": scenario_performance
        }
        
        batch_result.cost_analysis = {
            "total_cost": total_cost,
            "average_cost_per_investigation": total_cost / batch_result.completed_investigations if batch_result.completed_investigations > 0 else 0,
            "cost_per_hour": total_cost / (total_time / 3600) if total_time > 0 else 0
        }
        
        return batch_result
    
    async def _generate_batch_reports(self, batch_result: BatchInvestigationResult):
        """Generate comprehensive batch reports."""
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Always generate JSON report
        json_file = self.output_dir / f"batch_report_{timestamp}.json"
        with open(json_file, 'w') as f:
            json.dump({
                "config": batch_result.config.__dict__,
                "summary": {
                    "start_time": batch_result.start_time.isoformat(),
                    "end_time": batch_result.end_time.isoformat() if batch_result.end_time else None,
                    "total_investigations": batch_result.total_investigations,
                    "completed_investigations": batch_result.completed_investigations,
                    "failed_investigations": batch_result.failed_investigations
                },
                "performance_metrics": batch_result.performance_metrics,
                "cost_analysis": batch_result.cost_analysis,
                "results": batch_result.results
            }, f, indent=2, default=str)
        
        print(f"💾 Batch report saved: {json_file}")
        
        # Generate HTML report if requested
        if self.config.generate_html_report:
            html_file = self.output_dir / f"batch_report_{timestamp}.html"
            await self._generate_html_batch_report(batch_result, html_file)
            print(f"🌐 HTML report generated: {html_file}")
    
    async def _generate_html_batch_report(self, batch_result: BatchInvestigationResult, output_file: Path):
        """Generate comprehensive HTML batch report."""
        
        perf = batch_result.performance_metrics
        cost = batch_result.cost_analysis
        
        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Batch Investigation Report</title>
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }}
                .container {{ max-width: 1400px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); }}
                .header {{ text-align: center; border-bottom: 2px solid #e0e0e0; padding-bottom: 20px; margin-bottom: 30px; }}
                .section {{ margin: 20px 0; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; }}
                .metric {{ display: inline-block; margin: 10px; padding: 15px; background: #f8f9fa; border-radius: 5px; min-width: 150px; text-align: center; }}
                .success {{ background-color: #e8f5e8; border-left: 5px solid #4caf50; }}
                .warning {{ background-color: #fff3e0; border-left: 5px solid #ff9800; }}
                .error {{ background-color: #ffebee; border-left: 5px solid #f44336; }}
                .chart-container {{ width: 100%; height: 400px; margin: 20px 0; }}
                table {{ width: 100%; border-collapse: collapse; }}
                th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }}
                th {{ background-color: #f2f2f2; }}
                .timestamp {{ color: #666; font-size: 0.9em; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📊 Batch Investigation Report</h1>
                    <p class="timestamp">Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</p>
                </div>
                
                <div class="section">
                    <h3>📋 Batch Execution Summary</h3>
                    <div class="metric success">
                        <strong>Total Investigations</strong><br>
                        {batch_result.total_investigations}
                    </div>
                    <div class="metric success">
                        <strong>Completed</strong><br>
                        {batch_result.completed_investigations}
                    </div>
                    <div class="metric {'error' if batch_result.failed_investigations > 0 else 'success'}">
                        <strong>Failed</strong><br>
                        {batch_result.failed_investigations}
                    </div>
                    <div class="metric success">
                        <strong>Success Rate</strong><br>
                        {perf.get('success_rate', 0):.1f}%
                    </div>
                    <div class="metric">
                        <strong>Mode</strong><br>
                        {batch_result.config.mode.upper()}
                    </div>
                    <div class="metric">
                        <strong>Workers</strong><br>
                        {batch_result.config.concurrent_workers}
                    </div>
                </div>
                
                <div class="section">
                    <h3>⚡ Performance Metrics</h3>
                    <div class="metric">
                        <strong>Total Time</strong><br>
                        {perf.get('total_execution_time', 0):.1f}s
                    </div>
                    <div class="metric">
                        <strong>Average Time</strong><br>
                        {perf.get('average_investigation_time', 0):.1f}s
                    </div>
                    <div class="metric">
                        <strong>Throughput</strong><br>
                        {perf.get('throughput_per_hour', 0):.1f}/hour
                    </div>
                    <div class="metric">
                        <strong>Fastest</strong><br>
                        {perf.get('fastest_investigation', 0):.1f}s
                    </div>
                    <div class="metric">
                        <strong>Slowest</strong><br>
                        {perf.get('slowest_investigation', 0):.1f}s
                    </div>
                    <div class="metric">
                        <strong>Avg Risk Score</strong><br>
                        {perf.get('average_risk_score', 0):.2f}
                    </div>
                </div>
                
                <div class="section">
                    <h3>💰 Cost Analysis</h3>
                    <div class="metric">
                        <strong>Total Cost</strong><br>
                        ${cost.get('total_cost', 0):.4f}
                    </div>
                    <div class="metric">
                        <strong>Avg Cost/Investigation</strong><br>
                        ${cost.get('average_cost_per_investigation', 0):.4f}
                    </div>
                    <div class="metric">
                        <strong>Cost/Hour</strong><br>
                        ${cost.get('cost_per_hour', 0):.4f}
                    </div>
                </div>
                
                <div class="section">
                    <h3>🎯 Scenario Performance</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Scenario</th>
                                <th>Count</th>
                                <th>Success</th>
                                <th>Success Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {self._generate_scenario_table_rows(perf.get('scenario_performance', {}))}
                        </tbody>
                    </table>
                </div>
                
                <div class="section">
                    <h3>📈 Performance Charts</h3>
                    <div class="chart-container">
                        <canvas id="performanceChart"></canvas>
                    </div>
                </div>
                
                <div class="section">
                    <h3>📄 Individual Results</h3>
                    <details>
                        <summary>Click to view detailed results ({len(batch_result.results)} investigations)</summary>
                        <div style="max-height: 400px; overflow-y: auto; margin-top: 20px;">
                            <pre style="background: #f8f9fa; padding: 20px; border-radius: 5px;">
{json.dumps(batch_result.results, indent=2, default=str)}
                            </pre>
                        </div>
                    </details>
                </div>
            </div>
            
            <script>
                // Performance chart
                const ctx = document.getElementById('performanceChart').getContext('2d');
                new Chart(ctx, {{
                    type: 'bar',
                    data: {{
                        labels: ['Completed', 'Failed', 'Total'],
                        datasets: [{{
                            label: 'Investigations',
                            data: [{batch_result.completed_investigations}, {batch_result.failed_investigations}, {batch_result.total_investigations}],
                            backgroundColor: ['#4caf50', '#f44336', '#2196f3']
                        }}]
                    }},
                    options: {{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {{
                            title: {{
                                display: true,
                                text: 'Batch Execution Results'
                            }}
                        }}
                    }}
                }});
            </script>
        </body>
        </html>
        """
        
        with open(output_file, 'w') as f:
            f.write(html_content)
    
    def _generate_scenario_table_rows(self, scenario_perf: Dict[str, Any]) -> str:
        """Generate HTML table rows for scenario performance."""
        
        rows = []
        for scenario, data in scenario_perf.items():
            success_rate = (data["success"] / data["count"]) * 100 if data["count"] > 0 else 0
            rows.append(f"""
                <tr>
                    <td>{scenario}</td>
                    <td>{data["count"]}</td>
                    <td>{data["success"]}</td>
                    <td>{success_rate:.1f}%</td>
                </tr>
            """)
        
        return ''.join(rows)
    
    def _print_batch_summary(self, batch_result: BatchInvestigationResult):
        """Print comprehensive batch summary."""
        
        print(f"\n📊 BATCH INVESTIGATION SUMMARY")
        print("=" * 60)
        print(f"⏱️  Total Execution Time: {batch_result.performance_metrics.get('total_execution_time', 0):.1f} seconds")
        print(f"📋 Total Investigations: {batch_result.total_investigations}")
        print(f"✅ Completed: {batch_result.completed_investigations}")
        print(f"❌ Failed: {batch_result.failed_investigations}")
        print(f"📈 Success Rate: {batch_result.performance_metrics.get('success_rate', 0):.1f}%")
        print(f"⚡ Average Time per Investigation: {batch_result.performance_metrics.get('average_investigation_time', 0):.1f}s")
        print(f"🚀 Throughput: {batch_result.performance_metrics.get('throughput_per_hour', 0):.1f} investigations/hour")
        
        if batch_result.config.mode == "live":
            print(f"💰 Total Cost: ${batch_result.cost_analysis.get('total_cost', 0):.4f}")
            print(f"💰 Average Cost per Investigation: ${batch_result.cost_analysis.get('average_cost_per_investigation', 0):.4f}")
        
        print("\n🎯 Scenario Performance:")
        for scenario, data in batch_result.performance_metrics.get('scenario_performance', {}).items():
            success_rate = (data["success"] / data["count"]) * 100 if data["count"] > 0 else 0
            print(f"  • {scenario}: {data['success']}/{data['count']} ({success_rate:.1f}%)")
        
        print("=" * 60)


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Batch Investigation Runner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Run all scenarios in mock mode
    python batch_investigation_runner.py --all-scenarios --mode mock
    
    # Run from CSV file with 3 concurrent workers
    python batch_investigation_runner.py --csv-file data.csv --concurrent 3
    
    # Run specific scenarios with analytics
    python batch_investigation_runner.py --scenario-types account-takeover,payment-fraud --count 5 --html-report --analytics
    
    # High-throughput batch run
    python batch_investigation_runner.py --all-scenarios --concurrent 5 --timeout 180
        """
    )
    
    # Input options
    parser.add_argument(
        "--all-scenarios",
        action="store_true",
        help="Run all available investigation scenarios"
    )
    
    parser.add_argument(
        "--scenario-types",
        type=str,
        help="Comma-separated list of scenario types to run"
    )
    
    parser.add_argument(
        "--count",
        type=int,
        default=1,
        help="Number of times to run each scenario (default: 1)"
    )
    
    parser.add_argument(
        "--csv-file",
        type=str,
        help="CSV file with investigation parameters"
    )
    
    parser.add_argument(
        "--csv-limit", 
        type=int,
        help="Limit number of investigations from CSV file"
    )
    
    # Execution options
    parser.add_argument(
        "--mode",
        choices=["mock", "live"],
        default="mock",
        help="Investigation mode (default: mock)"
    )
    
    parser.add_argument(
        "--concurrent",
        type=int,
        default=1,
        help="Number of concurrent workers (default: 1)"
    )
    
    parser.add_argument(
        "--timeout",
        type=int,
        default=300,
        help="Timeout per investigation in seconds (default: 300)"
    )
    
    # Output options
    parser.add_argument(
        "--html-report",
        action="store_true",
        help="Generate HTML batch report"
    )
    
    parser.add_argument(
        "--analytics",
        action="store_true", 
        help="Include detailed performance analytics"
    )
    
    parser.add_argument(
        "--output-dir",
        type=str,
        help="Output directory for reports (default: batch_reports)"
    )
    
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose output"
    )
    
    args = parser.parse_args()
    
    # Prepare scenarios list
    scenarios = []
    if args.all_scenarios:
        runner = ScenarioInvestigationRunner()
        scenarios = list(runner.scenarios.keys())
    elif args.scenario_types:
        scenarios = args.scenario_types.split(",")
    
    # Expand scenarios by count
    if args.count > 1:
        scenarios = scenarios * args.count
    
    # Create configuration
    config = BatchInvestigationConfig(
        scenarios=scenarios,
        mode=args.mode,
        concurrent_workers=args.concurrent,
        timeout_per_investigation=args.timeout,
        csv_file=args.csv_file,
        csv_limit=args.csv_limit,
        generate_html_report=args.html_report,
        include_analytics=args.analytics,
        output_directory=args.output_dir,
        verbose=args.verbose
    )
    
    # Validate configuration
    if not scenarios and not args.csv_file:
        print("❌ Error: Must specify --all-scenarios, --scenario-types, or --csv-file")
        parser.print_help()
        sys.exit(1)
    
    try:
        # Run batch investigations
        runner = BatchInvestigationRunner(config)
        result = asyncio.run(runner.run_batch_investigations())
        
        print(f"\n✅ Batch investigation completed successfully!")
        print(f"📊 {result.completed_investigations}/{result.total_investigations} investigations completed")
        
    except Exception as e:
        logger.error(f"Batch investigation failed: {e}")
        print(f"\n❌ Batch investigation failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()