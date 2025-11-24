"""
Diagnostic script to identify why investigation execution is failing.
Tests each phase of the execution flow to pinpoint the failure.
"""
import sys
import asyncio
import json
from datetime import datetime, timezone

sys.path.insert(0, '.')

from app.persistence.database import init_database, get_db_session
from app.models.investigation_state import InvestigationState
from app.service.analytics.risk_analyzer import get_risk_analyzer
from app.router.models.autonomous_investigation_models import StructuredInvestigationRequest
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def test_risk_analyzer():
    """Test if RiskAnalyzer can successfully get top risk entities."""
    print("\n" + "="*80)
    print("TEST 1: Risk Analyzer - Auto-selection")
    print("="*80)
    
    try:
        analyzer = get_risk_analyzer()
        print("✅ RiskAnalyzer instance created")
        
        results = await analyzer.get_top_risk_entities(top_percentage=10)
        print(f"📊 Results status: {results.get('status')}")
        
        if results.get('status') != 'success':
            error = results.get('error', 'Unknown error')
            print(f"❌ RiskAnalyzer failed: {error}")
            return False
        
        entities = results.get('entities', [])
        print(f"✅ Found {len(entities)} top risk entities")
        
        if entities:
            first_entity = entities[0]
            print(f"   First entity: {first_entity.get('entity')}")
            print(f"   Risk score: {first_entity.get('risk_score')}")
            return True
        else:
            print("⚠️ No entities returned")
            return False
            
    except Exception as e:
        print(f"❌ RiskAnalyzer test failed with exception: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def test_langgraph_execution(entity_id: str, entity_type: str):
    """Test if LangGraph execution works with a simple case."""
    print("\n" + "="*80)
    print("TEST 2: LangGraph Execution")
    print("="*80)
    
    try:
        from app.service.agent.orchestration.hybrid.migration_utilities import (
            get_investigation_graph,
            get_feature_flags
        )
        from app.service.agent.orchestration.state_schema import create_initial_state
        from langchain_core.messages import HumanMessage
        
        investigation_id = "test-diagnostic-investigation"
        
        print(f"📋 Creating initial state for entity: {entity_type}={entity_id}")
        initial_state = create_initial_state(
            investigation_id=investigation_id,
            entity_id=entity_id,
            entity_type=entity_type,
            parallel_execution=True,
            max_tools=52,
            time_range=None
        )
        
        investigation_query = f"Test investigation for {entity_type}={entity_id}"
        initial_state["messages"] = [HumanMessage(content=investigation_query)]
        
        print("📊 Getting investigation graph...")
        graph = await get_investigation_graph(
            investigation_id=investigation_id,
            entity_type=entity_type
        )
        print("✅ Graph obtained")
        
        feature_flags = get_feature_flags()
        if feature_flags.is_enabled("hybrid_graph_v1", investigation_id):
            config = {
                "recursion_limit": 10,  # Lower limit for testing
                "configurable": {"thread_id": investigation_id, "investigation_id": investigation_id}
            }
            print("🧠 Using Hybrid Intelligence graph")
        else:
            config = {
                "recursion_limit": 10,  # Lower limit for testing
                "configurable": {"investigation_id": investigation_id}
            }
            print("🔄 Using Clean graph orchestration")
        
        print("🚀 Executing graph (this may take a moment)...")
        langgraph_result = await graph.ainvoke(initial_state, config=config)
        
        print("✅ LangGraph execution completed")
        messages = langgraph_result.get("messages", [])
        if messages:
            result = str(messages[-1].content)
            print(f"📋 Result preview: {result[:200]}...")
        else:
            print("⚠️ No messages in result")
        
        return True
        
    except Exception as e:
        print(f"❌ LangGraph execution failed: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def check_investigation_state(investigation_id: str):
    """Check the current state of an investigation."""
    print("\n" + "="*80)
    print(f"CHECKING INVESTIGATION: {investigation_id}")
    print("="*80)
    
    init_database()
    with get_db_session() as db:
        state = db.query(InvestigationState).filter(
            InvestigationState.investigation_id == investigation_id
        ).first()
        
        if not state:
            print(f"❌ Investigation {investigation_id} not found")
            return None
        
        print(f"✅ Investigation found")
        print(f"   Status: {state.status}")
        print(f"   Lifecycle Stage: {state.lifecycle_stage}")
        print(f"   Created: {state.created_at}")
        print(f"   Updated: {state.updated_at}")
        
        if state.settings_json:
            settings = json.loads(state.settings_json)
            print(f"\n📋 Settings:")
            print(f"   Investigation Mode: {settings.get('investigationMode')}")
            print(f"   Auto-select Entities: {settings.get('autoSelectEntities')}")
            entities = settings.get('entities', [])
            if entities:
                print(f"   Entities: {len(entities)} entity(ies)")
                for i, e in enumerate(entities):
                    print(f"      [{i}] type={e.get('entityType')}, value={e.get('entityValue')}")
        
        if state.progress_json:
            progress = json.loads(state.progress_json)
            print(f"\n📊 Progress:")
            print(f"   Status: {progress.get('status')}")
            print(f"   Current Phase: {progress.get('current_phase')}")
            print(f"   Percent Complete: {progress.get('percent_complete', progress.get('progress_percentage', 0))}")
            error_msg = progress.get('error_message')
            if error_msg:
                print(f"   ❌ Error Message: {error_msg}")
            else:
                print(f"   ✅ No error message in progress_json")
        
        if state.results_json:
            results = json.loads(state.results_json)
            print(f"\n📈 Results: Available ({len(str(results))} chars)")
        else:
            print(f"\n📈 Results: None")
        
        return state


async def simulate_execution_flow(investigation_id: str):
    """Simulate the execution flow to identify where it fails."""
    print("\n" + "="*80)
    print("SIMULATING EXECUTION FLOW")
    print("="*80)
    
    # Step 1: Check investigation state
    state = await check_investigation_state(investigation_id)
    if not state:
        return
    
    # Step 2: Test RiskAnalyzer if this is a risk-based investigation
    settings = json.loads(state.settings_json) if state.settings_json else {}
    is_risk_based = settings.get('investigationMode') == 'risk' or settings.get('autoSelectEntities')
    
    if is_risk_based:
        print("\n🔍 This is a risk-based investigation - testing auto-selection...")
        risk_test_passed = await test_risk_analyzer()
        if not risk_test_passed:
            print("\n❌ RISK ANALYZER TEST FAILED - This is likely the root cause!")
            return
    
    # Step 3: Test LangGraph execution with a real entity
    print("\n🔍 Testing LangGraph execution...")
    
    # Try to get entity from settings or use a test entity
    entities = settings.get('entities', [])
    entity_id = None
    entity_type = None
    
    if entities and entities[0].get('entityValue'):
        entity_value = entities[0].get('entityValue')
        entity_type_raw = entities[0].get('entityType')
        if entity_value and entity_value != 'risk-based-auto-select':
            entity_id = entity_value
            entity_type = entity_type_raw or 'user'
    
    if not entity_id:
        # Use a test entity
        print("⚠️ No entity found in settings, using test entity...")
        entity_id = "test@example.com"
        entity_type = "user"
    
    langgraph_test_passed = await test_langgraph_execution(entity_id, entity_type)
    if not langgraph_test_passed:
        print("\n❌ LANGGRAPH EXECUTION TEST FAILED - This is likely the root cause!")
        return
    
    print("\n✅ All tests passed - execution flow should work")


async def main():
    investigation_id = sys.argv[1] if len(sys.argv) > 1 else "inv-1762534045362-bix3g3x"
    
    print("\n" + "="*80)
    print("INVESTIGATION FAILURE DIAGNOSTIC")
    print("="*80)
    print(f"Investigation ID: {investigation_id}")
    
    await simulate_execution_flow(investigation_id)
    
    print("\n" + "="*80)
    print("DIAGNOSTIC COMPLETE")
    print("="*80)


if __name__ == "__main__":
    asyncio.run(main())

