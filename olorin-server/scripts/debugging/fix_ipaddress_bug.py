#!/usr/bin/env python3
"""
Fix all ipaddress.ip() calls to use ipaddress.ip_address() instead.
"""

import os
import sys
import re

def fix_ipaddress_calls(file_path):
    """Fix ipaddress.ip calls in a single file."""
    try:
        with open(file_path, 'r') as f:
            content = f.read()

        # Replace all ipaddress.ip( with ipaddress.ip_address(
        # Use word boundary to avoid changing ipaddress.ip_address or ipaddress.ip_network
        original_content = content
        content = re.sub(r'\bipaddress\.ip\(', 'ipaddress.ip_address(', content)

        if content != original_content:
            with open(file_path, 'w') as f:
                f.write(content)
            print(f"✅ Fixed: {file_path}")
            return True
        else:
            print(f"   No changes needed: {file_path}")
            return False

    except Exception as e:
        print(f"❌ Error fixing {file_path}: {e}")
        return False

def main():
    """Fix all files with ipaddress.ip bugs."""
    # Files with ipaddress.ip bugs (from grep output)
    files_to_fix = [
        "/Users/gklainert/Documents/olorin/olorin-server/app/service/agent/tools/threat_intelligence_tool/virustotal/domain_analysis_tool.py",
        "/Users/gklainert/Documents/olorin/olorin-server/app/service/agent/tools/threat_intelligence_tool/virustotal/ip_analysis_tool.py",
        "/Users/gklainert/Documents/olorin/olorin-server/app/service/agent/tools/threat_intelligence_tool/unified_threat_intelligence_tool.py",
        "/Users/gklainert/Documents/olorin/olorin-server/app/service/agent/tools/threat_intelligence_tool/shodan/infrastructure_analysis_tool.py",
        "/Users/gklainert/Documents/olorin/olorin-server/app/service/agent/tools/threat_intelligence_tool/abuseipdb/simple_ip_reputation_tool.py",
        "/Users/gklainert/Documents/olorin/olorin-server/app/service/agent/tools/threat_intelligence_tool/abuseipdb/bulk_analysis_tool.py",
        "/Users/gklainert/Documents/olorin/olorin-server/app/service/agent/tools/threat_intelligence_tool/abuseipdb/ip_reputation_tool.py",
        "/Users/gklainert/Documents/olorin/olorin-server/app/service/agent/tools/threat_intelligence_tool/abuseipdb/abuse_reporting_tool.py",
        "/Users/gklainert/Documents/olorin/olorin-server/app/service/agent/tools/tool_parameter_mapper.py",
        "/Users/gklainert/Documents/olorin/olorin-server/app/service/agent/autonomous_context.py",
        "/Users/gklainert/Documents/olorin/olorin-server/app/service/agent/autonomous_investigation_fixes.py",
        "/Users/gklainert/Documents/olorin/olorin-server/app/service/agent/enhanced_network_agent.py",
        "/Users/gklainert/Documents/olorin/olorin-server/app/service/agent/orchestration/metrics/network.py",
        "/Users/gklainert/Documents/olorin/olorin-server/app/service/agent/orchestration/domain/network_scorer.py",
        "/Users/gklainert/Documents/olorin/olorin-server/app/service/agent/orchestration/risk/finalize.py",
        "/Users/gklainert/Documents/olorin/olorin-server/app/service/agent/tool_validation_fix.py",
        "/Users/gklainert/Documents/olorin/olorin-server/app/service/mcp_servers/security/input_validator.py",
        "/Users/gklainert/Documents/olorin/olorin-server/app/service/mcp_servers/external_api_server.py",
    ]

    print(f"🔧 Fixing ipaddress.ip() calls in {len(files_to_fix)} files...")

    fixed_count = 0
    for file_path in files_to_fix:
        if os.path.exists(file_path):
            if fix_ipaddress_calls(file_path):
                fixed_count += 1
        else:
            print(f"⚠️  File not found: {file_path}")

    print(f"\n✅ Fixed {fixed_count}/{len(files_to_fix)} files")
    print("🎯 All ipaddress.ip() calls have been updated to ipaddress.ip_address()")

if __name__ == "__main__":
    main()