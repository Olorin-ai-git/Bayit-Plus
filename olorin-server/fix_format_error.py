#!/usr/bin/env python3
"""
<<<<<<< HEAD
Fix the format string error in unified_autonomous_test_runner.py
"""

def fix_format_error():
    file_path = "/Users/gklainert/Documents/olorin/olorin-server/scripts/testing/unified_autonomous_test_runner.py"
=======
Fix the format string error in unified_structured_test_runner.py
"""

def fix_format_error():
    file_path = "/Users/gklainert/Documents/olorin/olorin-server/scripts/testing/unified_structured_test_runner.py"
>>>>>>> 001-modify-analyzer-method
    
    # Read the file
    with open(file_path, 'r') as f:
        lines = f.readlines()
    
    # Find and replace the problematic lines
    for i, line in enumerate(lines):
        if 'Final risk score: {langgraph_result.get(\'risk_score\', 0.0):.2f}' in line:
            # Replace with safe version
            lines[i] = line.replace(
                "langgraph_result.get('risk_score', 0.0):.2f",
                "(langgraph_result.get('risk_score') or 0.0):.2f"
            )
        elif 'Confidence score: {langgraph_result.get(\'confidence_score\', 0.0):.2f}' in line:
            # Replace with safe version
            lines[i] = line.replace(
                "langgraph_result.get('confidence_score', 0.0):.2f",
                "(langgraph_result.get('confidence_score') or 0.0):.2f"
            )
    
    # Write the file back
    with open(file_path, 'w') as f:
        f.writelines(lines)
    
<<<<<<< HEAD
    print("✅ Fixed format string error in unified_autonomous_test_runner.py")
=======
    print("✅ Fixed format string error in unified_structured_test_runner.py")
>>>>>>> 001-modify-analyzer-method

if __name__ == "__main__":
    fix_format_error()