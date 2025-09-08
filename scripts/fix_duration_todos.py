#!/usr/bin/env python3
"""
Quick fix script to replace TODO duration calculations with actual timing
"""

import os
import re
from pathlib import Path

# Agent files to fix
AGENT_FILES = [
    '/Users/gklainert/Documents/olorin/olorin-server/app/service/agent/location_agent.py',
    '/Users/gklainert/Documents/olorin/olorin-server/app/service/agent/risk_agent.py', 
    '/Users/gklainert/Documents/olorin/olorin-server/app/service/agent/logs_agent.py',
    '/Users/gklainert/Documents/olorin/olorin-server/app/service/agent/enhanced_network_agent.py'
]

def fix_agent_duration(file_path):
    """Fix duration calculation in an agent file"""
    
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Skip if already fixed
    if 'time.perf_counter()' in content:
        print(f"Already fixed: {file_path}")
        return
    
    # Add time import
    if 'import time' not in content:
        content = content.replace(
            'import json\n\nfrom langchain_core.messages import AIMessage',
            'import json\nimport time\n\nfrom langchain_core.messages import AIMessage'
        )
    
    # Find the function definition and add start time tracking
    function_pattern = r'(async def autonomous_\w+_agent\(state, config\) -> dict:\s*"""[^"]*"""\s*\n\s*)'
    content = re.sub(
        function_pattern,
        r'\1# Track execution start time\n    start_time = time.perf_counter()\n    \n    ',
        content,
        flags=re.MULTILINE | re.DOTALL
    )
    
    # Replace the TODO duration calculation
    content = content.replace(
        'duration_ms=0,  # TODO: Calculate actual duration',
        'duration_ms=int((time.perf_counter() - start_time) * 1000),'
    )
    
    # Write back to file
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"Fixed: {file_path}")

if __name__ == "__main__":
    for file_path in AGENT_FILES:
        fix_agent_duration(file_path)
    
    print("Duration TODO fixes complete!")