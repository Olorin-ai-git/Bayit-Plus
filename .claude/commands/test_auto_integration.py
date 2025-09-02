#!/usr/bin/env python3
"""
test-auto Command Integration
Bridges Claude commands with python-tests-expert subagent
"""

import json
import subprocess
import sys
from pathlib import Path
from typing import Dict, Optional

def invoke_python_tests_expert(task: str, csv_file: Optional[str] = None, csv_limit: int = 50) -> Dict:
    """
    Invoke the python-tests-expert subagent through Claude's Task system
    
    This would normally use Claude's Task API, but for demonstration
    we'll show the integration pattern
    """
    
    prompt = f"""
    You are the python-tests-expert subagent for the Olorin project.
    
    Task: {task}
    
    Requirements:
    1. Run comprehensive autonomous investigation tests
    2. Fix any failures systematically until all pass
    3. Provide detailed step-by-step report with log citations
    
    Test Phases to Execute:
    1. Unit Tests - Autonomous Agents
    2. Integration Tests - Autonomous Investigation  
    3. WebSocket Real-time Updates
    4. Agent Orchestration
    5. Error Scenarios
    6. Performance Testing
    7. Firebase Secrets Integration
    8. Endpoint Coverage (52+ endpoints)
    
    For EACH test execution step:
    - Cite the exact command run
    - Show the test file and line number
    - Include relevant log excerpts
    - Explain what the test validates
    - Document any fixes applied
    
    Use this format for citations:
    [TIMESTAMP] [PHASE] [COMPONENT] Action taken
      └─ Source: filename.py:line_number
      └─ Command: exact command executed
      └─ Log: [Relevant log excerpt]
      └─ Result: [Pass/Fail with details]
    
    If tests fail:
    1. Analyze the failure pattern
    2. Apply targeted fix
    3. Re-run the test
    4. Document the fix in the report
    
    Continue until all tests pass or maximum 3 fix attempts per test.
    """
    
    # In a real implementation, this would call Claude's Task API
    # For now, we'll execute the test orchestrator directly
    
    cmd = [str(Path(__file__).parent.parent.parent / "scripts/tools/test_autonomous_investigation.sh")]
    if "--verbose" in task.lower():
        cmd.append("--verbose")
    if "--no-fix" in task.lower():
        cmd.append("--no-fix")
    if csv_file:
        cmd.extend(["--csv-file", csv_file, "--csv-limit", str(csv_limit)])
    
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        shell=True
    )
    
    return {
        "status": "completed" if result.returncode == 0 else "failed",
        "output": result.stdout,
        "errors": result.stderr,
        "report_path": find_latest_report()
    }

def find_latest_report() -> Optional[str]:
    """Find the most recent test report"""
    reports_dir = Path(__file__).parent.parent.parent / "reports" / "test-runs"
    if reports_dir.exists():
        reports = sorted(reports_dir.glob("autonomous_test_report_*.md"))
        if reports:
            return str(reports[-1])
    return None

def format_claude_response(result: Dict) -> str:
    """Format the response for Claude display"""
    
    response = """
# 🧪 Autonomous Investigation Test Results

## Execution Status: {}

""".format("✅ COMPLETED" if result["status"] == "completed" else "❌ FAILED")
    
    if result.get("report_path"):
        response += f"""
## Detailed Report Available
📄 Full report: `{result['report_path']}`

To view the report:
```bash
cat {result['report_path']}
```
"""
    
    # Add summary from output
    if "Summary" in result.get("output", ""):
        # Extract summary section
        lines = result["output"].split("\n")
        in_summary = False
        summary_lines = []
        
        for line in lines:
            if "Summary" in line:
                in_summary = True
            elif in_summary and line.startswith("##"):
                break
            elif in_summary:
                summary_lines.append(line)
        
        if summary_lines:
            response += """
## Test Summary
```
{}
```
""".format("\n".join(summary_lines[:20]))
    
    return response

def main():
    """Main entry point for Claude command"""
    import argparse
    
    parser = argparse.ArgumentParser(description="test-auto command")
    parser.add_argument("--task", default="Run full autonomous investigation test suite", 
                       help="Specific test task")
    parser.add_argument("--verbose", action="store_true", help="Verbose output")
    parser.add_argument("--no-fix", action="store_true", help="Skip auto-fixes")
    parser.add_argument("--csv-file", type=str, help="Path to CSV file with transaction data")
    parser.add_argument("--csv-limit", type=int, default=50, help="Max transactions from CSV")
    
    args = parser.parse_args()
    
    # Invoke the python-tests-expert
    result = invoke_python_tests_expert(args.task, args.csv_file, args.csv_limit)
    
    # Format and display response
    print(format_claude_response(result))
    
    # Return appropriate exit code
    sys.exit(0 if result["status"] == "completed" else 1)

if __name__ == "__main__":
    main()