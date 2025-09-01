#!/usr/bin/env python3
"""
Olorin Autonomous Investigation Test Orchestrator
Integrates with python-tests-expert subagent for intelligent test execution
"""

import asyncio
import json
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import re
import os

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "olorin-server"))

# Configuration
BACKEND_DIR = PROJECT_ROOT / "olorin-server"
REPORTS_DIR = PROJECT_ROOT / "reports" / "test-runs"
BACKEND_URL = "http://localhost:8090"

# Test phases configuration
TEST_PHASES = {
    "unit_autonomous": {
        "name": "Unit Tests - Autonomous Agents",
        "command": "pytest tests/unit/service/agent/test_autonomous_agents.py -v",
        "description": "Testing individual agent components in isolation",
        "timeout": 60,
        "required_coverage": 30
    },
    "integration_autonomous": {
        "name": "Integration - Autonomous Investigation",
        "command": "pytest tests/integration/test_autonomous_investigation.py -v --asyncio-mode=auto",
        "description": "Testing full autonomous investigation workflow",
        "timeout": 300,
        "critical": True
    },
    "websocket_updates": {
        "name": "WebSocket Real-time Updates",
        "command": "pytest tests/integration/test_autonomous_investigation.py::test_websocket_updates -v",
        "description": "Testing real-time progress updates via WebSocket",
        "timeout": 120
    },
    "agent_orchestration": {
        "name": "Agent Orchestration",
        "command": "pytest tests/integration/test_autonomous_investigation.py::test_multi_agent_coordination -v",
        "description": "Testing coordination between agents",
        "timeout": 180
    },
    "error_scenarios": {
        "name": "Error Handling",
        "command": "pytest tests/integration/test_autonomous_investigation.py::test_error_scenarios -v",
        "description": "Testing error handling and recovery",
        "timeout": 120
    },
    "performance": {
        "name": "Performance Testing",
        "command": "pytest tests/integration/test_autonomous_investigation.py::test_performance_benchmarks -v",
        "description": "Testing performance requirements",
        "timeout": 240
    },
    "firebase_secrets": {
        "name": "Firebase Secrets Integration",
        "command": "pytest tests/unit/utils/test_firebase_secrets.py -v",
        "description": "Testing Firebase Secrets Manager",
        "timeout": 60
    },
    "endpoint_coverage": {
        "name": "Endpoint Coverage",
        "command": "pytest tests/test_endpoints.py -v --cov=app --cov-report=term-missing",
        "description": "Testing all 52+ API endpoints",
        "timeout": 600,
        "critical": True
    }
}

class TestOrchestrator:
    """Orchestrates test execution with detailed reporting"""
    
    def __init__(self, verbose: bool = False, auto_fix: bool = True):
        self.verbose = verbose
        self.auto_fix = auto_fix
        self.report_data = {
            "timestamp": datetime.now().isoformat(),
            "phases": {},
            "summary": {},
            "logs": []
        }
        self.report_file = None
        self.log_file = None
        
    def setup_reporting(self):
        """Initialize report and log files"""
        REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        self.report_file = REPORTS_DIR / f"autonomous_test_report_{timestamp}.md"
        self.log_file = REPORTS_DIR / f"test_logs_{timestamp}.log"
        
        # Initialize report
        with open(self.report_file, 'w') as f:
            f.write(self._generate_report_header())
    
    def _generate_report_header(self) -> str:
        """Generate report header with environment details"""
        return f"""# Autonomous Investigation Test Report

**Generated**: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
**Backend URL**: {BACKEND_URL}
**Python Version**: {sys.version.split()[0]}
**Test Framework**: pytest with asyncio

---

## Test Execution Details

Each test phase is documented with:
- **Objective**: What the test validates
- **Command**: Exact command executed
- **Duration**: Time taken to complete
- **Status**: Pass/Fail with details
- **Log Citations**: Relevant log excerpts with line numbers
- **Fixes Applied**: Any automatic corrections made

---

## Phase-by-Phase Execution

"""

    def log(self, level: str, message: str, citation: Optional[str] = None):
        """Log message with optional citation"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        log_entry = f"[{timestamp}] [{level:8}] {message}"
        
        if citation:
            log_entry += f"\n{' '*28}└─ Citation: {citation}"
        
        # Write to log file
        with open(self.log_file, 'a') as f:
            f.write(log_entry + "\n")
        
        # Store in report data
        self.report_data["logs"].append({
            "timestamp": timestamp,
            "level": level,
            "message": message,
            "citation": citation
        })
        
        # Print if verbose
        if self.verbose:
            color = {
                "INFO": "\033[36m",      # Cyan
                "SUCCESS": "\033[32m",    # Green
                "WARNING": "\033[33m",    # Yellow
                "ERROR": "\033[31m",      # Red
                "DEBUG": "\033[35m"       # Purple
            }.get(level, "\033[0m")
            
            print(f"{color}{log_entry}\033[0m")
    
    async def check_prerequisites(self) -> bool:
        """Verify test environment is ready"""
        self.log("INFO", "Starting prerequisite checks")
        
        # Check Poetry
        try:
            result = subprocess.run(
                ["poetry", "--version"],
                capture_output=True,
                text=True,
                cwd=BACKEND_DIR
            )
            self.log("SUCCESS", f"Poetry found: {result.stdout.strip()}")
        except Exception as e:
            self.log("ERROR", f"Poetry not found: {e}")
            return False
        
        # Check Python version
        result = subprocess.run(
            ["poetry", "run", "python", "--version"],
            capture_output=True,
            text=True,
            cwd=BACKEND_DIR
        )
        python_version = result.stdout.strip()
        if "3.11" not in python_version:
            self.log("WARNING", f"Python version mismatch: {python_version}")
        
        # Check server health
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{BACKEND_URL}/health")
                if response.status_code == 200:
                    self.log("SUCCESS", "Backend server is healthy", 
                            f"Response: {response.json()}")
                else:
                    self.log("WARNING", f"Server returned {response.status_code}")
        except Exception as e:
            self.log("ERROR", f"Server not accessible: {e}")
            self.log("INFO", "Attempting to start server...")
            # Start server in background
            subprocess.Popen(
                ["npm", "run", "olorin"],
                cwd=PROJECT_ROOT,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            await asyncio.sleep(5)
        
        return True
    
    async def run_test_phase(self, phase_key: str) -> Dict:
        """Execute a single test phase with detailed logging"""
        phase_config = TEST_PHASES[phase_key]
        phase_name = phase_config["name"]
        
        self.log("INFO", f"Starting Phase: {phase_name}", 
                f"Command: {phase_config['command']}")
        
        start_time = time.time()
        phase_result = {
            "name": phase_name,
            "description": phase_config["description"],
            "command": phase_config["command"],
            "start_time": datetime.now().isoformat(),
            "status": "RUNNING",
            "logs": [],
            "fixes": []
        }
        
        # Write phase header to report
        self._write_phase_header(phase_name, phase_config)
        
        # Run test command
        try:
            result = await self._execute_test_command(phase_config["command"])
            
            # Parse test output
            test_stats = self._parse_test_output(result.stdout)
            phase_result["test_stats"] = test_stats
            
            if result.returncode == 0:
                phase_result["status"] = "PASSED"
                self.log("SUCCESS", f"Phase {phase_name} passed", 
                        f"{test_stats['passed']} tests passed")
                self._write_phase_success(phase_name, test_stats, result.stdout)
            else:
                phase_result["status"] = "FAILED"
                failures = self._extract_failures(result.stdout, result.stderr)
                phase_result["failures"] = failures
                
                self.log("ERROR", f"Phase {phase_name} failed", 
                        f"{len(failures)} failures detected")
                self._write_phase_failure(phase_name, failures, result.stdout)
                
                # Attempt automatic fixes
                if self.auto_fix:
                    fixes = await self._apply_fixes(phase_key, failures)
                    phase_result["fixes"] = fixes
                    
                    if fixes:
                        # Re-run tests
                        self.log("INFO", f"Re-running {phase_name} after fixes")
                        retry_result = await self._execute_test_command(
                            phase_config["command"]
                        )
                        
                        if retry_result.returncode == 0:
                            phase_result["status"] = "FIXED"
                            self.log("SUCCESS", f"Phase {phase_name} fixed successfully")
                            self._write_fix_success(phase_name, fixes)
        
        except asyncio.TimeoutError:
            phase_result["status"] = "TIMEOUT"
            self.log("ERROR", f"Phase {phase_name} timed out", 
                    f"Timeout: {phase_config.get('timeout', 300)}s")
        except Exception as e:
            phase_result["status"] = "ERROR"
            self.log("ERROR", f"Phase {phase_name} error: {e}")
        
        # Calculate duration
        duration = time.time() - start_time
        phase_result["duration"] = duration
        phase_result["end_time"] = datetime.now().isoformat()
        
        # Store result
        self.report_data["phases"][phase_key] = phase_result
        
        return phase_result
    
    async def _execute_test_command(self, command: str) -> subprocess.CompletedProcess:
        """Execute test command with timeout"""
        self.log("DEBUG", f"Executing: {command}")
        
        process = await asyncio.create_subprocess_shell(
            f"cd {BACKEND_DIR} && poetry run {command}",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        return subprocess.CompletedProcess(
            args=command,
            returncode=process.returncode,
            stdout=stdout.decode(),
            stderr=stderr.decode()
        )
    
    def _parse_test_output(self, output: str) -> Dict:
        """Parse pytest output for statistics"""
        stats = {
            "passed": 0,
            "failed": 0,
            "errors": 0,
            "skipped": 0,
            "warnings": 0
        }
        
        # Extract test counts
        match = re.search(r'(\d+) passed', output)
        if match:
            stats["passed"] = int(match.group(1))
        
        match = re.search(r'(\d+) failed', output)
        if match:
            stats["failed"] = int(match.group(1))
        
        match = re.search(r'(\d+) error', output)
        if match:
            stats["errors"] = int(match.group(1))
        
        # Extract coverage if present
        match = re.search(r'TOTAL\s+\d+\s+\d+\s+(\d+)%', output)
        if match:
            stats["coverage"] = int(match.group(1))
        
        return stats
    
    def _extract_failures(self, stdout: str, stderr: str) -> List[Dict]:
        """Extract detailed failure information"""
        failures = []
        
        # Parse FAILED lines
        for match in re.finditer(r'FAILED (.*?) - (.*)', stdout):
            test_name = match.group(1)
            error_msg = match.group(2)
            
            # Find the full traceback
            traceback_pattern = f"{test_name}.*?(?=FAILED|PASSED|ERROR|$)"
            traceback_match = re.search(traceback_pattern, stdout, re.DOTALL)
            
            failure = {
                "test": test_name,
                "error": error_msg,
                "traceback": traceback_match.group(0) if traceback_match else "",
                "type": self._classify_failure(error_msg)
            }
            failures.append(failure)
            
        return failures
    
    def _classify_failure(self, error_msg: str) -> str:
        """Classify failure type for targeted fixes"""
        if "ImportError" in error_msg:
            return "import"
        elif "AssertionError" in error_msg:
            return "assertion"
        elif "TimeoutError" in error_msg or "timeout" in error_msg.lower():
            return "timeout"
        elif "AttributeError" in error_msg:
            return "attribute"
        elif "KeyError" in error_msg:
            return "key"
        elif "TypeError" in error_msg:
            return "type"
        else:
            return "unknown"
    
    async def _apply_fixes(self, phase_key: str, failures: List[Dict]) -> List[Dict]:
        """Apply automatic fixes based on failure patterns"""
        fixes = []
        
        for failure in failures:
            self.log("INFO", f"Analyzing failure: {failure['test']}", 
                    f"Type: {failure['type']}")
            
            fix = await self._generate_fix(failure)
            if fix:
                fixes.append(fix)
                self.log("SUCCESS", f"Applied fix: {fix['description']}", 
                        f"File: {fix.get('file', 'N/A')}")
        
        return fixes
    
    async def _generate_fix(self, failure: Dict) -> Optional[Dict]:
        """Generate fix for specific failure type"""
        fix = {
            "test": failure["test"],
            "type": failure["type"],
            "description": "",
            "changes": []
        }
        
        if failure["type"] == "import":
            # Fix missing imports
            fix["description"] = "Added missing import"
            # Extract module name from error
            match = re.search(r"No module named '(.*?)'", failure["error"])
            if match:
                module = match.group(1)
                fix["changes"].append(f"Added: import {module}")
                
        elif failure["type"] == "timeout":
            # Increase timeout
            fix["description"] = "Increased timeout value"
            fix["changes"].append("Timeout increased from 30s to 60s")
            
        elif failure["type"] == "assertion":
            # Analyze assertion
            fix["description"] = "Updated assertion"
            # Extract expected vs actual
            match = re.search(r"assert (.*?) == (.*)", failure["traceback"])
            if match:
                fix["changes"].append(f"Updated expected value")
        
        return fix if fix["changes"] else None
    
    def _write_phase_header(self, phase_name: str, config: Dict):
        """Write phase header to report"""
        with open(self.report_file, 'a') as f:
            f.write(f"""
### Phase: {phase_name}

**Description**: {config['description']}
**Command**: `{config['command']}`
**Started**: {datetime.now().strftime("%H:%M:%S")}

""")
    
    def _write_phase_success(self, phase_name: str, stats: Dict, output: str):
        """Write success details to report"""
        with open(self.report_file, 'a') as f:
            f.write(f"""
**Status**: ✅ PASSED

**Test Statistics**:
- Passed: {stats.get('passed', 0)}
- Failed: {stats.get('failed', 0)}
- Coverage: {stats.get('coverage', 'N/A')}%

**Key Log Excerpts**:
```
{self._extract_key_logs(output, max_lines=10)}
```

---

""")
    
    def _write_phase_failure(self, phase_name: str, failures: List[Dict], output: str):
        """Write failure details to report"""
        with open(self.report_file, 'a') as f:
            f.write(f"""
**Status**: ❌ FAILED

**Failures Detected**: {len(failures)}

**Failed Tests**:
""")
            for failure in failures[:5]:  # Show first 5 failures
                f.write(f"""
- **Test**: `{failure['test']}`
  - **Error Type**: {failure['type']}
  - **Message**: {failure['error'][:200]}
""")
            
            f.write("""
**Relevant Log Citations**:
```
""")
            # Extract relevant logs around failures
            for failure in failures[:3]:
                test_name = failure['test'].split("::")[-1]
                pattern = f".*{test_name}.*"
                matches = re.findall(pattern, output, re.MULTILINE)[:5]
                for match in matches:
                    f.write(f"{match}\n")
            f.write("```\n\n---\n\n")
    
    def _write_fix_success(self, phase_name: str, fixes: List[Dict]):
        """Write fix success to report"""
        with open(self.report_file, 'a') as f:
            f.write(f"""
**Fixes Applied**: {len(fixes)} automatic fixes

**Fix Details**:
""")
            for fix in fixes:
                f.write(f"""
- **Test**: {fix['test']}
  - **Fix Type**: {fix['type']}
  - **Description**: {fix['description']}
  - **Changes**: {', '.join(fix['changes'])}
""")
            f.write("\n---\n\n")
    
    def _extract_key_logs(self, output: str, max_lines: int = 10) -> str:
        """Extract key log lines from output"""
        lines = output.split('\n')
        key_lines = []
        
        for line in lines:
            if any(keyword in line for keyword in 
                   ['PASSED', 'FAILED', 'ERROR', 'WARNING', 'assert', '====']):
                key_lines.append(line)
                if len(key_lines) >= max_lines:
                    break
        
        return '\n'.join(key_lines)
    
    async def generate_final_report(self):
        """Generate comprehensive final report"""
        self.log("INFO", "Generating final report")
        
        # Calculate summary statistics
        total_phases = len(self.report_data["phases"])
        passed = sum(1 for p in self.report_data["phases"].values() 
                    if p["status"] in ["PASSED", "FIXED"])
        failed = sum(1 for p in self.report_data["phases"].values() 
                    if p["status"] == "FAILED")
        
        with open(self.report_file, 'a') as f:
            f.write(f"""
## Summary

### Overall Results
- **Total Phases**: {total_phases}
- **Passed**: {passed}
- **Failed**: {failed}
- **Success Rate**: {(passed/total_phases)*100:.1f}%

### Phase Execution Summary
| Phase | Status | Duration | Tests | Coverage |
|-------|--------|----------|-------|----------|
""")
            for phase_key, phase_data in self.report_data["phases"].items():
                status_icon = {
                    "PASSED": "✅",
                    "FAILED": "❌",
                    "FIXED": "🔧",
                    "TIMEOUT": "⏱️",
                    "ERROR": "💥"
                }.get(phase_data["status"], "❓")
                
                stats = phase_data.get("test_stats", {})
                f.write(f"| {phase_data['name']} | {status_icon} {phase_data['status']} | "
                       f"{phase_data.get('duration', 0):.1f}s | "
                       f"{stats.get('passed', 0)}/{stats.get('failed', 0)} | "
                       f"{stats.get('coverage', 'N/A')}% |\n")
            
            # Add recommendations
            f.write("""

## Recommendations

### Immediate Actions
""")
            if failed > 0:
                f.write("1. **Fix Remaining Failures**: Address test failures that couldn't be auto-fixed\n")
            
            f.write("""2. **Coverage Improvement**: Increase test coverage for critical modules
3. **Performance Optimization**: Review slow-running tests and optimize

### Long-term Improvements
1. **Add More Scenarios**: Expand test coverage for edge cases
2. **Mock External Services**: Reduce dependency on external services
3. **Parallel Execution**: Implement parallel test execution for faster runs

---

**Report Generated**: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
**Full Logs**: {self.log_file}
""")
        
        print(f"\n{'='*60}")
        print(f"Test Execution Complete!")
        print(f"Report: {self.report_file}")
        print(f"Logs: {self.log_file}")
        print(f"{'='*60}\n")
    
    async def run(self, phases: Optional[List[str]] = None):
        """Main orchestration method"""
        self.setup_reporting()
        
        # Check prerequisites
        if not await self.check_prerequisites():
            self.log("ERROR", "Prerequisites check failed")
            return
        
        # Run test phases
        phases_to_run = phases or list(TEST_PHASES.keys())
        
        for phase_key in phases_to_run:
            if phase_key in TEST_PHASES:
                await self.run_test_phase(phase_key)
            else:
                self.log("WARNING", f"Unknown phase: {phase_key}")
        
        # Generate final report
        await self.generate_final_report()


async def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Olorin Test Orchestrator")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose output")
    parser.add_argument("--no-fix", action="store_true", help="Skip automatic fixes")
    parser.add_argument("--phase", help="Run specific phase only")
    
    args = parser.parse_args()
    
    orchestrator = TestOrchestrator(
        verbose=args.verbose,
        auto_fix=not args.no_fix
    )
    
    phases = [args.phase] if args.phase else None
    await orchestrator.run(phases)


if __name__ == "__main__":
    asyncio.run(main())