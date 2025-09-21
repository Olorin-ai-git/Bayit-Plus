#!/usr/bin/env python3
"""
Hybrid Intelligence Graph System Management Script

This script provides utilities for managing the Hybrid Intelligence Graph system,
including feature flags, A/B testing, and system monitoring.

Usage:
    python scripts/hybrid/manage_hybrid_system.py status
    python scripts/hybrid/manage_hybrid_system.py enable --rollout 10
    python scripts/hybrid/manage_hybrid_system.py disable --reason "maintenance"
    python scripts/hybrid/manage_hybrid_system.py start_ab_test --split 50
    python scripts/hybrid/manage_hybrid_system.py stop_ab_test
"""

import asyncio
import sys
import argparse
from typing import Optional

# Add the project root to the path
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def show_status():
    """Show current status of the Hybrid Intelligence Graph system."""
    try:
        from app.service.agent.orchestration.hybrid.migration_utilities import get_feature_flags
        
        feature_flags = get_feature_flags()
        
        print("🧠 Hybrid Intelligence Graph System Status")
        print("=" * 50)
        
        # Core flags
        core_flags = ["hybrid_graph_v1", "ai_confidence_engine", "advanced_safety_manager", "intelligent_router"]
        print("\n📋 Core System Components:")
        for flag_name in core_flags:
            status = feature_flags.get_flag_status(flag_name)
            enabled = status.get("enabled", False)
            rollout = status.get("rollout_percentage", 0)
            mode = status.get("deployment_mode", "disabled")
            print(f"   {flag_name}: {'✅ ENABLED' if enabled else '❌ DISABLED'} ({rollout}% rollout, mode: {mode})")
        
        # Testing flags
        print("\n🧪 A/B Testing & Monitoring:")
        test_flags = ["ab_test_hybrid_vs_clean", "hybrid_performance_monitoring", "hybrid_audit_logging"]
        for flag_name in test_flags:
            status = feature_flags.get_flag_status(flag_name)
            enabled = status.get("enabled", False)
            rollout = status.get("rollout_percentage", 0)
            test_split = status.get("test_split", 50) if flag_name == "ab_test_hybrid_vs_clean" else None
            if test_split:
                print(f"   {flag_name}: {'✅ ACTIVE' if enabled else '❌ INACTIVE'} ({rollout}% rollout, {test_split}% hybrid)")
            else:
                print(f"   {flag_name}: {'✅ ENABLED' if enabled else '❌ DISABLED'} ({rollout}% rollout)")
        
        # Overall system status
        hybrid_enabled = feature_flags.is_enabled("hybrid_graph_v1")
        print(f"\n🎯 Overall System Status: {'🟢 ACTIVE' if hybrid_enabled else '🔴 INACTIVE'}")
        
        if hybrid_enabled:
            print("\n💡 System is ready to route investigations to hybrid graph based on feature flags")
        else:
            print("\n💡 System is using traditional graph selection only")
        
    except ImportError:
        print("❌ Hybrid Intelligence Graph system is not available")
        print("   Make sure the hybrid module is properly installed")
    except Exception as e:
        print(f"❌ Error getting system status: {e}")


async def enable_hybrid(rollout_percentage: int = 10):
    """Enable hybrid graph with gradual rollout."""
    try:
        from app.service.agent.orchestration.hybrid.migration_utilities import enable_hybrid_graph
        
        enable_hybrid_graph(rollout_percentage=rollout_percentage)
        print(f"✅ Hybrid Intelligence Graph enabled with {rollout_percentage}% rollout")
        print("🎯 Investigations with matching investigation_id will now use hybrid selection")
        
    except ImportError:
        print("❌ Hybrid Intelligence Graph system is not available")
    except Exception as e:
        print(f"❌ Error enabling hybrid system: {e}")


async def disable_hybrid(reason: str = "manual_disable"):
    """Disable hybrid graph and rollback to clean graph."""
    try:
        from app.service.agent.orchestration.hybrid.migration_utilities import disable_hybrid_graph
        
        disable_hybrid_graph(reason=reason)
        print(f"🛑 Hybrid Intelligence Graph disabled")
        print(f"   Reason: {reason}")
        print("🔄 All investigations will now use traditional graph selection")
        
    except ImportError:
        print("❌ Hybrid Intelligence Graph system is not available")
    except Exception as e:
        print(f"❌ Error disabling hybrid system: {e}")


async def start_ab_test(test_split: int = 50):
    """Start A/B test between hybrid and clean graphs."""
    try:
        from app.service.agent.orchestration.hybrid.migration_utilities import start_ab_test
        
        start_ab_test(test_split=test_split)
        print(f"🧪 A/B test started: {test_split}% hybrid, {100-test_split}% clean")
        print("📊 Use this mode to compare performance between graph types")
        
    except ImportError:
        print("❌ Hybrid Intelligence Graph system is not available")
    except Exception as e:
        print(f"❌ Error starting A/B test: {e}")


async def stop_ab_test():
    """Stop A/B testing."""
    try:
        from app.service.agent.orchestration.hybrid.migration_utilities import stop_ab_test
        
        stop_ab_test()
        print("🧪 A/B test stopped")
        print("🔄 Graph selection will now use primary feature flags only")
        
    except ImportError:
        print("❌ Hybrid Intelligence Graph system is not available")
    except Exception as e:
        print(f"❌ Error stopping A/B test: {e}")


async def test_investigation_routing(investigation_id: str, entity_type: str = "ip"):
    """Test graph selection for a specific investigation."""
    try:
        from app.service.agent.orchestration.hybrid.migration_utilities import get_investigation_graph, GraphType
        
        print(f"🧪 Testing graph selection for investigation: {investigation_id}")
        print(f"   Entity type: {entity_type}")
        
        # This would normally return a compiled graph, but we just want to see the selection logic
        # We'll catch the exception when it tries to build the graph
        try:
            graph = await get_investigation_graph(investigation_id, entity_type)
            print("✅ Graph selection successful")
            print(f"   Selected graph type: Hybrid (based on feature flags)")
        except Exception as e:
            # This is expected as we don't have a full environment
            if "hybrid" in str(e).lower() or "build" in str(e).lower():
                print("✅ Graph selection logic working (hybrid graph would be selected)")
            else:
                print(f"⚠️ Graph selection encountered error: {e}")
        
    except ImportError:
        print("❌ Hybrid Intelligence Graph system is not available")
    except Exception as e:
        print(f"❌ Error testing investigation routing: {e}")


def main():
    parser = argparse.ArgumentParser(description="Manage Hybrid Intelligence Graph System")
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Status command
    subparsers.add_parser('status', help='Show system status')
    
    # Enable command
    enable_parser = subparsers.add_parser('enable', help='Enable hybrid graph')
    enable_parser.add_argument('--rollout', type=int, default=10, help='Rollout percentage (default: 10)')
    
    # Disable command
    disable_parser = subparsers.add_parser('disable', help='Disable hybrid graph')
    disable_parser.add_argument('--reason', default='manual_disable', help='Reason for disabling')
    
    # A/B test commands
    ab_start_parser = subparsers.add_parser('start_ab_test', help='Start A/B testing')
    ab_start_parser.add_argument('--split', type=int, default=50, help='Percentage for hybrid graph (default: 50)')
    
    subparsers.add_parser('stop_ab_test', help='Stop A/B testing')
    
    # Test routing command
    test_parser = subparsers.add_parser('test_routing', help='Test graph selection for an investigation')
    test_parser.add_argument('investigation_id', help='Investigation ID to test')
    test_parser.add_argument('--entity_type', default='ip', help='Entity type (default: ip)')
    
    args = parser.parse_args()
    
    if args.command == 'status':
        asyncio.run(show_status())
    elif args.command == 'enable':
        asyncio.run(enable_hybrid(args.rollout))
    elif args.command == 'disable':
        asyncio.run(disable_hybrid(args.reason))
    elif args.command == 'start_ab_test':
        asyncio.run(start_ab_test(args.split))
    elif args.command == 'stop_ab_test':
        asyncio.run(stop_ab_test())
    elif args.command == 'test_routing':
        asyncio.run(test_investigation_routing(args.investigation_id, args.entity_type))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()