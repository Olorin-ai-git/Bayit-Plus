#!/usr/bin/env python3
"""
Test Multi-Entity Investigation Flow

Tests the complete multi-entity investigation system with real implementations:
- Boolean logic evaluation
- Multi-entity investigation coordinator  
- Cross-entity analyzer
- LangGraph workflow integration
"""

import asyncio
import sys
import os
from datetime import datetime
import json

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.models.multi_entity_investigation import (
    MultiEntityInvestigationRequest,
    EntityRelationship,
    RelationshipType,
    BooleanQueryParser
)
from app.service.agent.multi_entity.investigation_orchestrator import get_multi_entity_orchestrator
from app.service.agent.multi_entity.entity_manager import EntityType
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def test_boolean_logic_parser():
    """Test Boolean logic parsing and evaluation"""
    
    print("\n🧪 Testing Boolean Logic Parser...")
    
    # Test cases
    test_cases = [
        {
            "expression": "user123 AND transaction456",
            "entity_mapping": {"user123": "user123", "transaction456": "transaction456"},
            "entity_results": {"user123": True, "transaction456": False},
            "expected": False
        },
        {
            "expression": "user123 OR transaction456",
            "entity_mapping": {"user123": "user123", "transaction456": "transaction456"},
            "entity_results": {"user123": True, "transaction456": False},
            "expected": True
        },
        {
            "expression": "(user123 AND transaction456) OR store789",
            "entity_mapping": {"user123": "user123", "transaction456": "transaction456", "store789": "store789"},
            "entity_results": {"user123": True, "transaction456": False, "store789": True},
            "expected": True
        },
        {
            "expression": "NOT user123",
            "entity_mapping": {"user123": "user123"},
            "entity_results": {"user123": True},
            "expected": False
        }
    ]
    
    for i, test in enumerate(test_cases):
        print(f"\n  Test {i+1}: {test['expression']}")
        
        try:
            parser = BooleanQueryParser(
                expression=test["expression"],
                entity_mapping=test["entity_mapping"]
            )
            
            # Test parsing
            parse_result = parser.parse()
            print(f"    Parse result: {parse_result.get('valid', False)}")
            
            if parse_result.get("valid"):
                # Test evaluation
                eval_result = parser.evaluate(test["entity_results"])
                print(f"    Evaluation result: {eval_result}")
                print(f"    Expected: {test['expected']}")
                
                if eval_result == test["expected"]:
                    print("    ✅ PASSED")
                else:
                    print("    ❌ FAILED")
            else:
                print(f"    ❌ Parse failed: {parse_result.get('error')}")
                
        except Exception as e:
            print(f"    ❌ Exception: {str(e)}")


async def test_multi_entity_investigation():
    """Test complete multi-entity investigation flow"""
    
    print("\n🔍 Testing Multi-Entity Investigation Flow...")
    
    # Create test entities
    entities = [
        {"entity_id": "user_12345", "entity_type": "user"},
        {"entity_id": "transaction_98765", "entity_type": "transaction"},
        {"entity_id": "store_555", "entity_type": "merchant"}
    ]
    
    # Create relationships
    relationships = [
        EntityRelationship(
            source_entity_id="user_12345",
            target_entity_id="transaction_98765",
            relationship_type=RelationshipType.INITIATED,
            strength=0.9,
            evidence={"source": "transaction_log"}
        ),
        EntityRelationship(
            source_entity_id="transaction_98765",
            target_entity_id="store_555",
            relationship_type=RelationshipType.PROCESSED_BY,
            strength=0.8,
            evidence={"source": "merchant_data"}
        )
    ]
    
    # Create investigation request
    request = MultiEntityInvestigationRequest(
        investigation_id="test_multi_001",
        entities=entities,
        relationships=relationships,
        boolean_logic="(user_12345 AND transaction_98765) OR store_555",
        investigation_scope=["device", "location", "network", "logs"],
        priority="high",
        enable_verbose_logging=True,
        enable_cross_entity_analysis=True
    )
    
    print(f"  Investigation ID: {request.investigation_id}")
    print(f"  Entities: {len(request.entities)}")
    print(f"  Relationships: {len(request.relationships)}")
    print(f"  Boolean Logic: {request.boolean_logic}")
    
    try:
        # Get orchestrator
        orchestrator = get_multi_entity_orchestrator()
        
        # Start investigation
        print("\n  🚀 Starting investigation...")
        initial_result = await orchestrator.start_multi_entity_investigation(request)
        print(f"    Status: {initial_result.status}")
        
        # Execute investigation
        print("\n  ⚙️ Executing investigation...")
        final_result = await orchestrator.execute_multi_entity_investigation(
            request.investigation_id, request
        )
        
        print(f"    Final Status: {final_result.status}")
        print(f"    Duration: {final_result.total_duration_ms}ms")
        print(f"    Entity Results: {len(final_result.entity_results)}")
        
        # Check cross-entity analysis
        if final_result.cross_entity_analysis:
            analysis = final_result.cross_entity_analysis
            print(f"    Cross-Entity Analysis:")
            print(f"      - Entity Interactions: {len(analysis.entity_interactions)}")
            print(f"      - Risk Correlations: {len(analysis.risk_correlations)}")
            print(f"      - Temporal Patterns: {len(analysis.temporal_patterns)}")
            print(f"      - Anomaly Clusters: {len(analysis.anomaly_clusters)}")
            print(f"      - Behavioral Insights: {len(analysis.behavioral_insights)}")
            print(f"      - Overall Confidence: {analysis.overall_confidence:.2f}")
        
        # Check risk assessment
        if final_result.overall_risk_assessment:
            risk = final_result.overall_risk_assessment
            print(f"    Risk Assessment:")
            print(f"      - Overall Risk Score: {risk.overall_risk_score:.2f}")
            print(f"      - Individual Scores: {len(risk.individual_entity_scores)}")
            print(f"      - Confidence: {risk.confidence_level:.2f}")
        
        # Check timeline
        print(f"    Investigation Timeline: {len(final_result.investigation_timeline)} events")
        
        print("\n    ✅ Multi-Entity Investigation COMPLETED")
        
        return final_result
        
    except Exception as e:
        print(f"\n    ❌ Multi-Entity Investigation FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


async def test_entity_manager():
    """Test entity manager functionality"""
    
    print("\n📊 Testing Entity Manager...")
    
    from app.service.agent.multi_entity.entity_manager import get_entity_manager
    
    try:
        entity_manager = get_entity_manager()
        
        # Create test entities
        user_id = await entity_manager.create_entity(
            entity_type=EntityType.USER,
            name="test_user_001",
            attributes={"email": "test@example.com", "risk_score": 0.7},
            investigation_id="test_001"
        )
        
        transaction_id = await entity_manager.create_entity(
            entity_type=EntityType.TRANSACTION,
            name="test_transaction_001", 
            attributes={"amount": 1000.00, "currency": "USD"},
            investigation_id="test_001"
        )
        
        # Create relationship
        relationship_id = await entity_manager.create_relationship(
            source_entity_id=user_id,
            target_entity_id=transaction_id,
            relationship_type="initiated",
            strength=0.9,
            evidence={"timestamp": "2025-01-09T10:00:00Z"},
            investigation_id="test_001"
        )
        
        print(f"    Created user entity: {user_id}")
        print(f"    Created transaction entity: {transaction_id}")
        print(f"    Created relationship: {relationship_id}")
        
        # Test queries
        user_entity = entity_manager.get_entity(user_id)
        print(f"    Retrieved user: {user_entity.name if user_entity else 'None'}")
        
        related_entities = entity_manager.get_related_entities(user_id)
        print(f"    Related entities: {len(related_entities)}")
        
        # Get statistics
        stats = entity_manager.get_statistics()
        print(f"    Entity Manager Stats:")
        print(f"      - Entities: {stats['manager_status']['entities_count']}")
        print(f"      - Relationships: {stats['manager_status']['relationships_count']}")
        
        print("    ✅ Entity Manager PASSED")
        
    except Exception as e:
        print(f"    ❌ Entity Manager FAILED: {str(e)}")
        import traceback
        traceback.print_exc()


async def test_cross_entity_analyzer():
    """Test cross-entity analyzer independently"""
    
    print("\n🔗 Testing Cross-Entity Analyzer...")
    
    from app.service.agent.multi_entity.cross_entity_analyzer import get_cross_entity_analyzer
    from app.models.multi_entity_investigation import InvestigationResult
    
    try:
        analyzer = get_cross_entity_analyzer()
        
        # Create mock investigation results
        entity_results = {
            "user_001": [
                InvestigationResult(
                    investigation_id="test_cross_001",
                    entity_id="user_001", 
                    agent_type="device_agent",
                    findings={"device_risk": "high", "timestamp": "2025-01-09T10:00:00Z"},
                    risk_score=0.8,
                    confidence_score=0.9
                ),
                InvestigationResult(
                    investigation_id="test_cross_001",
                    entity_id="user_001",
                    agent_type="location_agent", 
                    findings={"location_risk": "medium", "timestamp": "2025-01-09T10:01:00Z"},
                    risk_score=0.6,
                    confidence_score=0.8
                )
            ],
            "transaction_001": [
                InvestigationResult(
                    investigation_id="test_cross_001",
                    entity_id="transaction_001",
                    agent_type="network_agent",
                    findings={"network_risk": "low", "timestamp": "2025-01-09T10:02:00Z"},
                    risk_score=0.3,
                    confidence_score=0.7
                )
            ]
        }
        
        relationships = [
            EntityRelationship(
                source_entity_id="user_001",
                target_entity_id="transaction_001",
                relationship_type=RelationshipType.INITIATED,
                strength=0.9
            )
        ]
        
        entities = [
            {"entity_id": "user_001", "entity_type": "user"},
            {"entity_id": "transaction_001", "entity_type": "transaction"}
        ]
        
        # Run analysis
        analysis = await analyzer.analyze_cross_entity_patterns(
            investigation_id="test_cross_001",
            entity_results=entity_results,
            relationships=relationships,
            entities=entities
        )
        
        print(f"    Analysis ID: {analysis.analysis_id}")
        print(f"    Entity Interactions: {len(analysis.entity_interactions)}")
        print(f"    Risk Correlations: {len(analysis.risk_correlations)}")
        print(f"    Temporal Patterns: {len(analysis.temporal_patterns)}")
        print(f"    Anomaly Clusters: {len(analysis.anomaly_clusters)}")
        print(f"    Behavioral Insights: {len(analysis.behavioral_insights)}")
        print(f"    Overall Confidence: {analysis.overall_confidence:.2f}")
        
        # Get analyzer metrics
        metrics = analyzer.get_analyzer_metrics()
        print(f"    Analyzer Metrics: {metrics}")
        
        print("    ✅ Cross-Entity Analyzer PASSED")
        
    except Exception as e:
        print(f"    ❌ Cross-Entity Analyzer FAILED: {str(e)}")
        import traceback
        traceback.print_exc()


async def main():
    """Run all tests"""
    
    print("🧪 Multi-Entity Investigation System Tests")
    print("=" * 50)
    
    start_time = datetime.now()
    
    # Run individual component tests
    await test_boolean_logic_parser()
    await test_entity_manager()
    await test_cross_entity_analyzer()
    
    # Run integration test
    result = await test_multi_entity_investigation()
    
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    print(f"\n🏁 All tests completed in {duration:.2f}s")
    
    if result and result.status == "completed":
        print("✅ Multi-Entity Investigation System is OPERATIONAL")
        
        # Save test result for inspection
        result_file = "multi_entity_test_result.json"
        try:
            with open(result_file, 'w') as f:
                json.dump(result.dict(), f, indent=2, default=str)
            print(f"📄 Test result saved to: {result_file}")
        except Exception as e:
            print(f"⚠️ Could not save result: {str(e)}")
    else:
        print("❌ Multi-Entity Investigation System has ISSUES")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())