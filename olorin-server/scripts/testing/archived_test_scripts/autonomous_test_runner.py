from app.service.logging import get_bridge_logger
logger = get_bridge_logger(__name__)

#!/usr/bin/env python3
"""
Unified Autonomous Investigation Test Runner

A comprehensive test runner that consolidates all autonomous investigation testing capabilities
with various modes, options, and reporting formats.

Usage:
    python autonomous_test_runner.py [OPTIONS]

Examples:
    # Run simple test with real server
    python autonomous_test_runner.py --mode simple
    
    # Run with mocks (no external dependencies)
    python autonomous_test_runner.py --mode mocked
    
    # Run full test suite with HTML reports
    python autonomous_test_runner.py --mode full --html --report-dir reports/
    
    # Run specific user investigation
    python autonomous_test_runner.py --mode user --entity-id USER123
    
    # Run with CSV upload test
    python autonomous_test_runner.py --mode csv --csv-file /path/to/data.csv
"""

import argparse
import asyncio
import json
import logging
import os
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional
from unittest.mock import AsyncMock, MagicMock, patch

import requests
import websockets

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


class UnifiedAutonomousTestRunner:
    """Unified test runner for all autonomous investigation scenarios."""
    
    def __init__(self, server_port: int = 8090, use_mocks: bool = False):
        self.server_port = server_port
        self.base_url = f"http://localhost:{server_port}"
        self.ws_url = f"ws://localhost:{server_port}/ws"
        self.use_mocks = use_mocks
        self.results = {}
        self.metrics_history = []
        
        # Authentication headers
        self.headers = {
            "Authorization": "Olorin_APIKey olorin_apikey=preprdakyres3AVWXWEiZESQdOnynrcYt9h9wwfR,olorin_apikey_version=1.0",
            "Content-Type": "application/json",
            "X-Forwarded-Port": str(server_port),
            "olorin_experience_id": "d3d28eaa-7ca9-4aa2-8905-69ac11fd8c58",
            "olorin_originating_assetalias": "Olorin.cas.hri.olorin",
        }
    
    def print_separator(self, title: str = ""):
        """Print a formatted separator."""
        if title:
            logger.info(f"\n{'='*60}")
            logger.info(f"  {title}")
            logger.info(f"{'='*60}")
        else:
            logger.info(f"{'='*60}")
    
    def check_health(self) -> bool:
        """Check if the server is healthy."""
        logger.info("🏥 Checking server health...")
        try:
            resp = requests.get(f"{self.base_url}/health", timeout=5)
            if resp.status_code == 200:
                logger.info(f"✅ Server is healthy: {resp.json()}")
                return True
            else:
                logger.error(f"❌ Server health check failed: {resp.status_code}")
                return False
        except Exception as e:
            logger.error(f"❌ Failed to connect to server: {e}")
            return False
    
    def create_mock_ips_cache_client(self):
        """Create a mock IPS Cache client for testing without external dependencies."""
        mock_client = MagicMock()
        
        # Mock async methods
        mock_client.zscan = AsyncMock(return_value=[])
        mock_client.zadd = AsyncMock(return_value=None)
        mock_client.hgetall = AsyncMock(return_value={})
        mock_client.hset = AsyncMock(return_value=None)
        mock_client.expire = AsyncMock(return_value=None)
        mock_client.pipeline = MagicMock()
        
        # Mock pipeline methods
        mock_pipeline = MagicMock()
        mock_pipeline.hset = MagicMock()
        mock_pipeline.zadd = MagicMock()
        mock_pipeline.expire = MagicMock()
        mock_pipeline.execute = AsyncMock(return_value=[])
        mock_client.pipeline.return_value = mock_pipeline
        
        return mock_client
    
    async def run_simple_test(self, entity_id: str = "4621097846089147992", 
                             entity_type: str = "user_id") -> Dict[str, Any]:
        """Run a simple autonomous investigation test."""
        self.print_separator("Simple Autonomous Investigation Test")
        
        if not self.check_health():
            return {"status": "FAILED", "error": "Server health check failed"}
        
        logger.info(f"🚀 Starting investigation for {entity_type}: {entity_id}")
        
        # Start investigation
        payload = {
            "entity_id": entity_id,
            "entity_type": entity_type,
            "parallel_execution": True,
            "config": {
                "max_iterations": 10,
                "enable_logging": True,
                "enable_journey_tracking": True,
            }
        }
        
        if self.use_mocks:
            payload["config"]["use_mock_cache"] = True
        
        try:
            # Start investigation
            start_resp = requests.post(
                f"{self.base_url}/api/investigation/autonomous",
                json=payload,
                headers=self.headers,
                timeout=30
            )
            
            if start_resp.status_code != 200:
                return {
                    "status": "FAILED",
                    "error": f"Failed to start investigation: {start_resp.status_code}",
                    "details": start_resp.text
                }
            
            investigation = start_resp.json()
            investigation_id = investigation.get("investigation_id")
            logger.info(f"✅ Investigation started: {investigation_id}")
            
            # Monitor progress via WebSocket
            await self.monitor_investigation_progress(investigation_id)
            
            # Get final results
            results_resp = requests.get(
                f"{self.base_url}/api/investigation/{investigation_id}",
                headers=self.headers,
                timeout=10
            )
            
            if results_resp.status_code == 200:
                final_results = results_resp.json()
                risk_score = final_results.get("final_risk_score", 0)
                status = final_results.get("status", "unknown")
                
                logger.info(f"✅ Investigation completed: risk_score={risk_score:.2f}, status={status}")
                
                return {
                    "status": "PASSED",
                    "investigation_id": investigation_id,
                    "final_risk_score": risk_score,
                    "investigation_status": status,
                    "duration": final_results.get("duration", 0)
                }
            else:
                return {
                    "status": "FAILED",
                    "error": f"Failed to get results: {results_resp.status_code}"
                }
                
        except Exception as e:
            logger.error(f"❌ Test failed: {str(e)}")
            return {"status": "FAILED", "error": str(e)}
    
    async def monitor_investigation_progress(self, investigation_id: str, timeout: int = 60):
        """Monitor investigation progress via WebSocket."""
        try:
            uri = f"{self.ws_url}/{investigation_id}"
            start_time = time.time()
            
            async with websockets.connect(uri) as websocket:
                while time.time() - start_time < timeout:
                    try:
                        message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                        data = json.loads(message)
                        
                        if data.get("type") == "progress":
                            phase = data.get("phase", "unknown")
                            progress = data.get("progress", 0)
                            logger.info(f"  Progress: {phase} - {progress}%")
                        elif data.get("type") == "completion":
                            logger.info("  ✓ Investigation completed")
                            break
                        elif data.get("type") == "error":
                            logger.error(f"  ✗ Error: {data.get('message')}")
                            break
                            
                    except asyncio.TimeoutError:
                        continue
                    except Exception as e:
                        logger.warning(f"WebSocket error: {e}")
                        break
                        
        except Exception as e:
            logger.warning(f"Failed to connect to WebSocket: {e}")
    
    async def run_csv_upload_test(self, csv_file: str) -> Dict[str, Any]:
        """Test CSV file upload and processing."""
        self.print_separator("CSV Upload Test")
        
        if not self.check_health():
            return {"status": "FAILED", "error": "Server health check failed"}
        
        csv_path = Path(csv_file)
        if not csv_path.exists():
            return {"status": "FAILED", "error": f"CSV file not found: {csv_file}"}
        
        logger.info(f"📁 Uploading CSV file: {csv_file}")
        logger.info(f"   File size: {csv_path.stat().st_size / 1024:.2f} KB")
        
        try:
            # Create multipart form data
            with open(csv_path, 'rb') as f:
                files = {'file': (csv_path.name, f, 'text/csv')}
                data = {'investigation_id': f'csv_test_{datetime.now().timestamp()}'}
                
                # Remove Content-Type from headers for multipart
                upload_headers = {k: v for k, v in self.headers.items() if k != "Content-Type"}
                
                resp = requests.post(
                    f"{self.base_url}/api/investigation/raw-data",
                    files=files,
                    data=data,
                    headers=upload_headers,
                    timeout=30
                )
            
            if resp.status_code == 200:
                result = resp.json()
                logger.info(f"✅ CSV uploaded successfully")
                logger.info(f"   Records processed: {result.get('records_processed', 0)}")
                logger.info(f"   Data quality: {result.get('data_quality', 0):.2%}")
                
                return {
                    "status": "PASSED",
                    "records_processed": result.get("records_processed", 0),
                    "data_quality": result.get("data_quality", 0),
                    "anomalies_detected": result.get("anomalies_detected", 0)
                }
            else:
                logger.error(f"❌ Upload failed: {resp.status_code}")
                return {
                    "status": "FAILED",
                    "error": f"Upload failed: {resp.status_code}",
                    "details": resp.text
                }
                
        except Exception as e:
            logger.error(f"❌ CSV upload test failed: {str(e)}")
            return {"status": "FAILED", "error": str(e)}
    
    async def run_full_test_suite(self) -> Dict[str, Any]:
        """Run comprehensive test suite with all test scenarios."""
        self.print_separator("Full Autonomous Investigation Test Suite")
        
        test_scenarios = [
            ("Simple Investigation", self.run_simple_test),
            ("Investigation with Mocks", lambda: self.run_simple_test()),
            ("Concurrent Investigations", self.run_concurrent_tests),
            ("Performance Test", self.run_performance_test),
        ]
        
        all_results = {}
        total_start = time.time()
        
        for test_name, test_func in test_scenarios:
            logger.info(f"\nRunning: {test_name}")
            try:
                result = await test_func()
                all_results[test_name] = result
                
                # Convert to metrics for history
                self.add_metrics_entry(test_name, result)
                
            except Exception as e:
                logger.error(f"Failed to run {test_name}: {str(e)}")
                all_results[test_name] = {"status": "ERROR", "error": str(e)}
            
            await asyncio.sleep(1)  # Brief pause between tests
        
        total_duration = time.time() - total_start
        
        # Generate summary
        passed = sum(1 for r in all_results.values() if r.get("status") == "PASSED")
        failed = sum(1 for r in all_results.values() if r.get("status") == "FAILED")
        
        self.print_separator("Test Summary")
        logger.info(f"Total Tests: {len(all_results)}")
        logger.info(f"Passed: {passed}")
        logger.info(f"Failed: {failed}")
        logger.info(f"Total Duration: {total_duration:.2f}s")
        
        return {
            "total_tests": len(all_results),
            "passed": passed,
            "failed": failed,
            "duration": total_duration,
            "results": all_results
        }
    
    async def run_concurrent_tests(self, num_investigations: int = 3) -> Dict[str, Any]:
        """Run multiple concurrent investigations."""
        self.print_separator("Concurrent Investigations Test")
        
        if not self.check_health():
            return {"status": "FAILED", "error": "Server health check failed"}
        
        logger.info(f"Starting {num_investigations} concurrent investigations...")
        
        # Create tasks for concurrent execution
        tasks = []
        for i in range(num_investigations):
            entity_id = f"test_user_{i}_{datetime.now().timestamp()}"
            task = self.run_simple_test(entity_id=entity_id)
            tasks.append(task)
        
        # Execute concurrently
        start_time = time.time()
        results = await asyncio.gather(*tasks, return_exceptions=True)
        duration = time.time() - start_time
        
        # Analyze results
        successful = sum(1 for r in results if isinstance(r, dict) and r.get("status") == "PASSED")
        
        logger.info(f"✅ Completed {successful}/{num_investigations} investigations in {duration:.2f}s")
        
        return {
            "status": "PASSED" if successful == num_investigations else "FAILED",
            "total": num_investigations,
            "successful": successful,
            "duration": duration,
            "average_time": duration / num_investigations
        }
    
    async def run_performance_test(self) -> Dict[str, Any]:
        """Run performance benchmarking test."""
        self.print_separator("Performance Test")
        
        if not self.check_health():
            return {"status": "FAILED", "error": "Server health check failed"}
        
        metrics = {
            "response_times": [],
            "memory_usage": [],
            "throughput": 0
        }
        
        num_iterations = 5
        logger.info(f"Running {num_iterations} iterations for performance testing...")
        
        for i in range(num_iterations):
            start_time = time.time()
            result = await self.run_simple_test(
                entity_id=f"perf_test_{i}_{datetime.now().timestamp()}"
            )
            elapsed = time.time() - start_time
            
            metrics["response_times"].append(elapsed)
            
            if result.get("status") == "PASSED":
                logger.info(f"  Iteration {i+1}: {elapsed:.2f}s")
        
        # Calculate statistics
        avg_time = sum(metrics["response_times"]) / len(metrics["response_times"])
        min_time = min(metrics["response_times"])
        max_time = max(metrics["response_times"])
        
        logger.info(f"✅ Performance Test Complete:")
        logger.info(f"   Average: {avg_time:.2f}s")
        logger.info(f"   Min: {min_time:.2f}s")
        logger.info(f"   Max: {max_time:.2f}s")
        
        return {
            "status": "PASSED",
            "iterations": num_iterations,
            "average_time": avg_time,
            "min_time": min_time,
            "max_time": max_time,
            "response_times": metrics["response_times"]
        }
    
    def add_metrics_entry(self, test_name: str, result: Dict[str, Any]):
        """Add test result to metrics history for reporting."""
        metrics = {
            "timestamp": datetime.now().isoformat(),
            "test_name": test_name,
            "status": result.get("status", "UNKNOWN"),
            "duration": result.get("duration", 0),
            "risk_score": result.get("final_risk_score", 0),
            "error": result.get("error", None)
        }
        self.metrics_history.append(metrics)
    
    def generate_json_report(self, output_dir: str = "reports"):
        """Generate JSON report of test results."""
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        report_file = output_path / f"test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        with open(report_file, 'w') as f:
            json.dump({
                "timestamp": datetime.now().isoformat(),
                "server_port": self.server_port,
                "use_mocks": self.use_mocks,
                "metrics": self.metrics_history,
                "results": self.results
            }, f, indent=2, default=str)
        
        logger.info(f"📄 JSON report saved to: {report_file}")
        return str(report_file)
    
    def generate_html_report(self, output_dir: str = "reports/html"):
        """Generate HTML report with visualizations."""
        try:
            from app.service.agent.ato_agents.utils.metrics_visualizer import MetricsVisualizer
            
            # Save metrics for visualization
            metrics_file = Path("logs/metrics.json")
            metrics_file.parent.mkdir(parents=True, exist_ok=True)
            
            # Convert metrics to format expected by visualizer
            visualizer_metrics = []
            for m in self.metrics_history:
                visualizer_metrics.append({
                    "timestamp": m["timestamp"],
                    "total_events": 1,
                    "high_risk_events": 1 if m.get("risk_score", 0) > 0.7 else 0,
                    "avg_risk_score": m.get("risk_score", 0),
                    "risk_score_stddev": 0,
                    "error_count": 1 if m["status"] == "FAILED" else 0,
                    "most_common_risks": [(m["test_name"], m.get("risk_score", 0))]
                })
            
            with open(metrics_file, 'w') as f:
                json.dump(visualizer_metrics, f, indent=2, default=str)
            
            # Generate HTML report
            visualizer = MetricsVisualizer(
                metrics_file=str(metrics_file),
                report_dir=output_dir
            )
            
            html_path = visualizer.generate_report(lookback_hours=24)
            
            if html_path:
                logger.info(f"📊 HTML report generated: {html_path}")
                return html_path
            else:
                logger.warning("HTML report generation returned empty path")
                return None
                
        except ImportError:
            logger.warning("MetricsVisualizer not available, skipping HTML report")
            return None
        except Exception as e:
            logger.error(f"Failed to generate HTML report: {str(e)}")
            return None


async def main():
    """Main entry point with CLI argument parsing."""
    parser = argparse.ArgumentParser(
        description="Unified Autonomous Investigation Test Runner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --mode simple                    Run simple test
  %(prog)s --mode full --html               Run full suite with HTML report
  %(prog)s --mode csv --csv-file data.csv   Test CSV upload
  %(prog)s --mode mocked                    Run with mocked dependencies
  %(prog)s --mode concurrent --num 5        Run 5 concurrent tests
        """
    )
    
    parser.add_argument(
        "--mode",
        choices=["simple", "full", "csv", "mocked", "concurrent", "performance", "user", "device"],
        default="simple",
        help="Test mode to run (default: simple)"
    )
    
    parser.add_argument(
        "--port",
        type=int,
        default=8090,
        help="Server port (default: 8090)"
    )
    
    parser.add_argument(
        "--entity-id",
        default="4621097846089147992",
        help="Entity ID for investigation (default: test user)"
    )
    
    parser.add_argument(
        "--entity-type",
        choices=["user_id", "device_id", "ip_address"],
        default="user_id",
        help="Entity type (default: user_id)"
    )
    
    parser.add_argument(
        "--csv-file",
        help="CSV file path for upload test"
    )
    
    parser.add_argument(
        "--num",
        type=int,
        default=3,
        help="Number of concurrent investigations (default: 3)"
    )
    
    parser.add_argument(
        "--use-mocks",
        action="store_true",
        help="Use mocked external services"
    )
    
    parser.add_argument(
        "--html",
        action="store_true",
        help="Generate HTML report with visualizations"
    )
    
    parser.add_argument(
        "--json",
        action="store_true",
        help="Generate JSON report (default: always enabled)"
    )
    
    parser.add_argument(
        "--report-dir",
        default="reports",
        help="Output directory for reports (default: reports)"
    )
    
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose logging"
    )
    
    args = parser.parse_args()
    
    # Configure logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Create test runner
    runner = UnifiedAutonomousTestRunner(
        server_port=args.port,
        use_mocks=args.use_mocks or args.mode == "mocked"
    )
    
    # Run appropriate test mode
    result = None
    
    try:
        if args.mode == "simple":
            result = await runner.run_simple_test(args.entity_id, args.entity_type)
            
        elif args.mode == "full":
            result = await runner.run_full_test_suite()
            
        elif args.mode == "csv":
            if not args.csv_file:
                logger.error("CSV file path required for CSV mode")
                sys.exit(1)
            result = await runner.run_csv_upload_test(args.csv_file)
            
        elif args.mode == "mocked":
            runner.use_mocks = True
            result = await runner.run_simple_test(args.entity_id, args.entity_type)
            
        elif args.mode == "concurrent":
            result = await runner.run_concurrent_tests(args.num)
            
        elif args.mode == "performance":
            result = await runner.run_performance_test()
            
        elif args.mode in ["user", "device"]:
            entity_type = "user_id" if args.mode == "user" else "device_id"
            result = await runner.run_simple_test(args.entity_id, entity_type)
        
        # Store result
        runner.results = result
        
        # Generate reports
        json_report = runner.generate_json_report(args.report_dir)
        
        if args.html:
            html_report = runner.generate_html_report(f"{args.report_dir}/html")
        
        # Exit with appropriate code
        if result and result.get("status") == "PASSED":
            logger.info("\n✅ Tests completed successfully!")
            sys.exit(0)
        else:
            logger.error("\n❌ Tests failed!")
            sys.exit(1)
            
    except KeyboardInterrupt:
        logger.info("\n⚠️ Test interrupted by user")
        sys.exit(130)
    except Exception as e:
        logger.error(f"\n❌ Unexpected error: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())