#!/usr/bin/env python3
"""
Debug Domain Agents - Investigation System

This script diagnoses why domain agents are never executing in fraud investigations.
It examines:
1. Feature flag configuration
2. Graph structure and routing decisions
3. Direct domain agent invocation
4. Hybrid vs traditional graph selection
"""

import asyncio
import os
import sys
import time
import json
from typing import Dict, Any, Optional
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.service.logging import get_bridge_logger
from app.models.agent_context import AgentContext, AgentMetadata, AdditionalMetadata

logger = get_bridge_logger(__name__)


async def debug_feature_flags():
    """Check feature flag configuration"""
    print("\n" + "="*80)
    print("🚩 FEATURE FLAGS DIAGNOSIS")
    print("="*80)
    
    try:
        from app.service.agent.orchestration.hybrid.migration_utilities import get_feature_flags
        
        feature_flags = get_feature_flags()
        
        print(f"📋 Feature Flags Status:")
        for flag_name, flag_data in feature_flags.flags.items():
            enabled = flag_data.get('enabled', False)
            rollout = flag_data.get('rollout_percentage', 0)
            mode = flag_data.get('deployment_mode', 'unknown')
            
            status_icon = "✅" if enabled else "❌"
            print(f"   {status_icon} {flag_name}: {enabled} ({rollout}% rollout, {mode})")
        
        # Check if hybrid graph is enabled
        hybrid_enabled = feature_flags.is_enabled("hybrid_graph_v1", "test-investigation-123")
        print(f"\n🧠 Hybrid Graph Test (investigation test-investigation-123): {'✅ ENABLED' if hybrid_enabled else '❌ DISABLED'}")
        
        return feature_flags
        
    except Exception as e:
        print(f"❌ Error checking feature flags: {e}")
        import traceback
        traceback.print_exc()
        return None


async def debug_graph_selection():
    """Test graph selection logic"""
    print("\n" + "="*80)
    print("🎯 GRAPH SELECTION DIAGNOSIS")
    print("="*80)
    
    try:
        from app.service.agent.orchestration.hybrid.migration_utilities import get_investigation_graph, GraphType
        
        investigation_id = "test-investigation-123"
        entity_type = "ip_address"
        
        print(f"📋 Testing graph selection for:")
        print(f"   Investigation ID: {investigation_id}")
        print(f"   Entity Type: {entity_type}")
        
        # Test with force types
        for graph_type in [GraphType.CLEAN, GraphType.HYBRID, GraphType.ORCHESTRATOR]:
            try:
                print(f"\n🔍 Testing {graph_type.value} graph:")
                start_time = time.time()
                
                graph = await get_investigation_graph(
                    investigation_id=investigation_id,
                    entity_type=entity_type,
                    force_graph_type=graph_type
                )
                
                duration = time.time() - start_time
                
                if graph:
                    # Get node information
                    nodes = list(graph.nodes.keys()) if hasattr(graph, 'nodes') else []
                    edges = list(graph.edges) if hasattr(graph, 'edges') else []
                    
                    print(f"   ✅ {graph_type.value} graph created successfully ({duration:.2f}s)")
                    print(f"   📊 Nodes: {len(nodes)}")
                    print(f"   🔗 Edges: {len(edges)}")
                    
                    # Check for domain agents
                    domain_agents = [node for node in nodes if any(domain in node for domain in ['network', 'device', 'location', 'logs'])]
                    print(f"   🤖 Domain agents found: {len(domain_agents)}")
                    for agent in domain_agents:
                        print(f"      - {agent}")
                
                else:
                    print(f"   ❌ {graph_type.value} graph creation failed")
                    
            except Exception as e:
                print(f"   ❌ Error creating {graph_type.value} graph: {e}")
        
        # Test default selection (no force)
        print(f"\n🎯 Testing default graph selection:")
        try:
            graph = await get_investigation_graph(
                investigation_id=investigation_id,
                entity_type=entity_type
            )
            
            if graph:
                nodes = list(graph.nodes.keys()) if hasattr(graph, 'nodes') else []
                domain_agents = [node for node in nodes if any(domain in node for domain in ['network', 'device', 'location', 'logs'])]
                print(f"   ✅ Default graph created with {len(nodes)} nodes")
                print(f"   🤖 Domain agents in default graph: {len(domain_agents)}")
                for agent in domain_agents:
                    print(f"      - {agent}")
            else:
                print(f"   ❌ Default graph creation failed")
                
        except Exception as e:
            print(f"   ❌ Error with default graph selection: {e}")
        
    except Exception as e:
        print(f"❌ Error in graph selection diagnosis: {e}")
        import traceback
        traceback.print_exc()


async def debug_domain_agent_direct():
    """Test direct domain agent invocation"""
    print("\n" + "="*80)
    print("🤖 DIRECT DOMAIN AGENT DIAGNOSIS")
    print("="*80)
    
    try:
        # Test importing domain agents
        domain_agents = [
            ("network_agent", "app.service.agent.orchestration.domain_agents.network_agent"),
            ("device_agent", "app.service.agent.orchestration.domain_agents.device_agent"),
            ("location_agent", "app.service.agent.orchestration.domain_agents.location_agent"),
            ("logs_agent", "app.service.agent.orchestration.domain_agents.logs_agent"),
        ]
        
        for agent_name, module_path in domain_agents:
            try:
                print(f"\n🔍 Testing {agent_name}:")
                
                # Import the module
                import importlib
                module = importlib.import_module(module_path)
                
                # Look for the node function
                node_function_name = f"{agent_name}_node"
                if hasattr(module, node_function_name):
                    node_function = getattr(module, node_function_name)
                    print(f"   ✅ Node function found: {node_function_name}")
                    
                    # Create test state for direct invocation
                    from app.service.agent.orchestration.hybrid.hybrid_state_schema import HybridInvestigationState
                    from langchain_core.messages import HumanMessage
                    
                    test_state = HybridInvestigationState(
                        messages=[HumanMessage(content="Test message for domain agent")],
                        investigation_metadata={
                            "investigation_id": "test-investigation-123",
                            "entity_type": "ip_address",
                            "entity_value": "192.168.1.100"
                        },
                        phase_results={},
                        ai_confidence={"current_level": "medium"},
                        safety_status={"level": "safe"},
                        routing_decisions=[],
                        investigation_context={
                            "entity_type": "ip_address",
                            "entity_value": "192.168.1.100"
                        }
                    )
                    
                    print(f"   🧪 Testing direct invocation...")
                    
                    # Create config object
                    class MockConfig:
                        configurable = {
                            "agent_context": None,
                            "thread_id": "test-thread-123",
                            "request": None
                        }
                    
                    config = MockConfig()
                    
                    try:
                        # Test direct invocation
                        start_time = time.time()
                        result = await node_function(test_state, config)
                        duration = time.time() - start_time
                        
                        print(f"   ✅ Direct invocation successful ({duration:.2f}s)")
                        print(f"   📊 Result type: {type(result)}")
                        
                        if hasattr(result, 'messages') and result.messages:
                            print(f"   💬 Messages returned: {len(result.messages)}")
                            last_message = result.messages[-1]
                            content_preview = str(last_message.content)[:200] + "..." if len(str(last_message.content)) > 200 else str(last_message.content)
                            print(f"   📝 Last message preview: {content_preview}")
                        
                    except Exception as e:
                        print(f"   ❌ Direct invocation failed: {e}")
                        import traceback
                        traceback.print_exc()
                    
                else:
                    print(f"   ❌ Node function not found: {node_function_name}")
                    available_functions = [name for name in dir(module) if not name.startswith('_')]
                    print(f"   📋 Available functions: {available_functions}")
                
            except ImportError as e:
                print(f"   ❌ Import failed: {e}")
            except Exception as e:
                print(f"   ❌ Unexpected error: {e}")
                import traceback
                traceback.print_exc()
                
    except Exception as e:
        print(f"❌ Error in domain agent diagnosis: {e}")
        import traceback
        traceback.print_exc()


async def debug_investigation_execution():
    """Test full investigation execution with debugging"""
    print("\n" + "="*80)
    print("🔬 INVESTIGATION EXECUTION DIAGNOSIS")
    print("="*80)
    
    try:
        # Create test agent context
        additional_metadata = AdditionalMetadata(
            investigationId="test-investigation-123",
            entity_type="ip_address",
            entity_value="192.168.1.100"
        )
        
        metadata = AgentMetadata(
            username="debug_user",
            additional_metadata=additional_metadata
        )
        
        agent_context = AgentContext(
            input="Investigate potential fraud for IP address 192.168.1.100",
            thread_id="debug-thread-123",
            metadata=metadata
        )
        
        print(f"📋 Test investigation details:")
        print(f"   Investigation ID: {additional_metadata.investigationId}")
        print(f"   Entity Type: {additional_metadata.entity_type}")
        print(f"   Entity Value: {additional_metadata.entity_value}")
        
        # Import agent service
        from app.service.agent_service import ainvoke_agent
        
        print(f"\n🚀 Starting investigation execution...")
        start_time = time.time()
        
        try:
            result, trace_id = await ainvoke_agent(None, agent_context)
            duration = time.time() - start_time
            
            print(f"✅ Investigation completed ({duration:.2f}s)")
            print(f"🆔 Trace ID: {trace_id}")
            
            # Analyze result
            if result:
                result_preview = str(result)[:500] + "..." if len(str(result)) > 500 else str(result)
                print(f"📝 Result preview: {result_preview}")
                
                # Look for domain agent results
                domain_keywords = ['network', 'device', 'location', 'logs', 'authentication', 'risk']
                found_domains = [keyword for keyword in domain_keywords if keyword.lower() in str(result).lower()]
                
                print(f"🤖 Domain evidence found: {found_domains}")
                
                # Check for investigation quality markers
                if "quality" in str(result).lower():
                    print(f"📊 Quality information found in result")
                
                if "evidence" in str(result).lower():
                    print(f"🔍 Evidence information found in result")
                    
            else:
                print(f"❌ No result returned")
            
        except Exception as e:
            duration = time.time() - start_time
            print(f"❌ Investigation failed ({duration:.2f}s): {e}")
            import traceback
            traceback.print_exc()
            
    except Exception as e:
        print(f"❌ Error in investigation execution: {e}")
        import traceback
        traceback.print_exc()


async def enable_hybrid_graph_for_testing():
    """Enable hybrid graph feature flag for testing"""
    print("\n" + "="*80)
    print("🚀 ENABLING HYBRID GRAPH FOR TESTING")
    print("="*80)
    
    try:
        from app.service.agent.orchestration.hybrid.migration_utilities import enable_hybrid_graph
        
        print(f"🔧 Enabling hybrid graph with 100% rollout...")
        enable_hybrid_graph(rollout_percentage=100)
        
        print(f"✅ Hybrid graph enabled for testing")
        
        # Verify it's enabled
        from app.service.agent.orchestration.hybrid.migration_utilities import get_feature_flags
        feature_flags = get_feature_flags()
        hybrid_enabled = feature_flags.is_enabled("hybrid_graph_v1", "test-investigation-123")
        
        print(f"🧠 Verification: Hybrid graph is {'✅ ENABLED' if hybrid_enabled else '❌ STILL DISABLED'}")
        
        return hybrid_enabled
        
    except Exception as e:
        print(f"❌ Error enabling hybrid graph: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Main debugging function"""
    print("🔍 Domain Agent Debugging Tool")
    print("="*80)
    print("Investigating why domain agents never execute in fraud investigations...")
    
    # Step 1: Check feature flags
    feature_flags = await debug_feature_flags()
    
    # Step 2: Enable hybrid graph for testing
    hybrid_enabled = await enable_hybrid_graph_for_testing()
    
    # Step 3: Test graph selection
    await debug_graph_selection()
    
    # Step 4: Test direct domain agent invocation
    await debug_domain_agent_direct()
    
    # Step 5: Test full investigation execution
    await debug_investigation_execution()
    
    print("\n" + "="*80)
    print("🎯 DIAGNOSIS SUMMARY")
    print("="*80)
    
    if hybrid_enabled:
        print("✅ Hybrid graph is now enabled for testing")
        print("🧪 Run a test investigation to see if domain agents execute")
    else:
        print("❌ Hybrid graph could not be enabled")
        print("🔧 Manual feature flag configuration may be required")
    
    print("\n💡 NEXT STEPS:")
    print("1. If hybrid graph is enabled, test a real investigation")
    print("2. If domain agents still don't execute, check routing logic")
    print("3. Examine graph node connections and execution flow")
    print("4. Verify domain agent node implementations")


if __name__ == "__main__":
    asyncio.run(main())