#!/usr/bin/env python
"""
Test script for the clean LangGraph architecture.

Tests the new graph with proper tool integration and orchestrator control.
"""

import asyncio
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.clean_graph_builder import run_investigation

logger = get_bridge_logger(__name__)


async def test_clean_graph():
    """Test the clean graph implementation."""
    
    print("\n" + "="*80)
    print("🧪 TESTING CLEAN LANGGRAPH ARCHITECTURE")
    print("="*80 + "\n")
    
    # Test configuration
    test_entity_id = "192.168.1.100"
    test_entity_type = "ip_address"
    test_investigation_id = "test-clean-graph-001"
    
    print(f"📋 Test Configuration:")
    print(f"  - Entity Type: {test_entity_type}")
    print(f"  - Entity ID: {test_entity_id}")
    print(f"  - Investigation ID: {test_investigation_id}")
    print()
    
    # Set test mode
    os.environ["TEST_MODE"] = "mock"
    os.environ["USE_SNOWFLAKE"] = "false"
    
    try:
        print("🚀 Starting investigation...")
        print("-" * 40)
        
        # Run the investigation with timeout
        result = await asyncio.wait_for(
            run_investigation(
                entity_id=test_entity_id,
                entity_type=test_entity_type,
                investigation_id=test_investigation_id
            ),
            timeout=30.0  # 30 second timeout
        )
        
        print("-" * 40)
        print("\n📊 Investigation Results:")
        print(f"  - Success: {'✅' if result['success'] else '❌'}")
        print(f"  - Risk Score: {result.get('risk_score', 0.0):.2f} / 1.00")
        print(f"  - Confidence: {result.get('confidence', 0.0):.2f} / 1.00")
        print(f"  - Tools Used: {result.get('tools_used', 0)}")
        print(f"  - Domains Analyzed: {', '.join(result.get('domains_analyzed', []))}")
        print(f"  - Duration: {result.get('duration_ms', 0)}ms")
        
        if not result['success']:
            print(f"\n❌ Error: {result.get('error', 'Unknown error')}")
            return False
        
        # Validate results
        print("\n🔍 Validation:")
        
        validations = []
        
        # Check if investigation completed
        if result['success']:
            validations.append(("Investigation completed", True))
        else:
            validations.append(("Investigation completed", False))
        
        # Check risk score
        if 0.0 <= result.get('risk_score', -1) <= 1.0:
            validations.append(("Risk score valid", True))
        else:
            validations.append(("Risk score valid", False))
        
        # Check tools usage
        tools_used = result.get('tools_used', 0)
        if tools_used > 0:
            validations.append((f"Tools used ({tools_used})", True))
        else:
            validations.append(("Tools used", False))
        
        # Check domain analysis
        domains = result.get('domains_analyzed', [])
        if len(domains) > 0:
            validations.append((f"Domains analyzed ({len(domains)})", True))
        else:
            validations.append(("Domains analyzed", False))
        
        # Print validation results
        for check, passed in validations:
            status = "✅" if passed else "❌"
            print(f"  {status} {check}")
        
        # Overall result
        all_passed = all(passed for _, passed in validations)
        
        print("\n" + "="*80)
        if all_passed:
            print("✅ ALL TESTS PASSED - Clean graph is working!")
        else:
            print("⚠️ SOME TESTS FAILED - Review the implementation")
        print("="*80 + "\n")
        
        return all_passed
        
    except asyncio.TimeoutError:
        print(f"\n❌ Test timed out after 30 seconds")
        return False
    except Exception as e:
        print(f"\n❌ Test failed with exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Main entry point."""
    # Run the async test
    success = asyncio.run(test_clean_graph())
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()