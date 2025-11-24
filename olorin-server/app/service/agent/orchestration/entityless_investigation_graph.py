"""
Entityless Investigation Graph

LangGraph workflow for investigating anomalies without direct entities.
Implements entity mining: SegmentHunter → EntityExtractor → Correlator → Narrator
"""

from typing import Annotated, List, Dict, Any, Optional
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langgraph.graph.message import add_messages
from langgraph.graph import START, END, StateGraph
from langgraph.prebuilt import ToolNode
from typing_extensions import TypedDict

from app.service.logging import get_bridge_logger
from app.service.agent.tools.tool_registry import get_tools_for_agent, initialize_tools
from app.service.agent.tools.anomaly_tools.segment_hunter import SegmentHunterTool
from app.service.agent.tools.anomaly_tools.entity_extractor import EntityExtractorTool
from app.service.agent.tools.anomaly_tools.anomaly_correlator import AnomalyCorrelatorTool
from app.models.anomaly import AnomalyEvent
from app.persistence.database import get_db
import uuid

logger = get_bridge_logger(__name__)


class EntitylessInvestigationState(TypedDict):
    """State for entityless investigation workflow."""
    messages: Annotated[List[BaseMessage], add_messages]
    investigation_id: Optional[str]
    anomaly_id: Optional[str]
    anomaly: Optional[Dict[str, Any]]
    segments: Annotated[List[Dict[str, Any]], lambda x, y: y]  # Replace, don't append
    entities: Annotated[List[Dict[str, Any]], lambda x, y: y]
    root_patterns: Annotated[List[Dict[str, Any]], lambda x, y: y]
    segment_path: Annotated[List[str], lambda x, y: y]  # Path of dimension splits


async def segment_hunter_node(state: EntitylessInvestigationState) -> Dict[str, Any]:
    """SegmentHunter node: decompose anomaly by dimensions."""
    anomaly_id = state.get('anomaly_id')
    if not anomaly_id:
        return {
            'messages': [AIMessage(content="Error: No anomaly_id in state")]
        }
    
    # Dimensions to check (priority order)
    # Note: 'gateway' removed - payment_gateway column doesn't exist in actual PostgreSQL database
    dimensions = [
        'reason_code',
        'issuer',
        'asn',
        'ip_prefix',
        'payment_method',
        'device_fp',
        'processor'
    ]
    
    segment_hunter = SegmentHunterTool()
    all_segments = []
    
    # Hunt segments across dimensions
    for dimension in dimensions:
        try:
            logger.info(f"🔍 SegmentHunter checking dimension {dimension} for anomaly {anomaly_id}")
            result = segment_hunter._run(
                anomaly_id=anomaly_id,
                dimension=dimension,
                top_k=10,
                min_support=50
            )
            
            segments_count = len(result.get('segments', []))
            has_error = 'error' in result
            
            logger.info(
                f"SegmentHunter result for {dimension}: segments={segments_count}, "
                f"error={'error' in result}, error_msg={result.get('error', 'None')}"
            )
            
            if has_error:
                logger.warning(f"⚠️ SegmentHunter error for dimension {dimension}: {result.get('error')}")
            elif segments_count == 0:
                logger.warning(
                    f"⚠️ SegmentHunter returned 0 segments for dimension {dimension}. "
                    f"This may indicate: no data in database, query failed, or min_support threshold too high."
                )
            elif result.get('segments'):
                for segment in result['segments']:
                    segment['dimension'] = dimension
                all_segments.extend(result['segments'])
                logger.info(f"✅ SegmentHunter found {len(result['segments'])} segments for dimension {dimension}")
        except Exception as e:
            logger.error(f"❌ SegmentHunter failed for dimension {dimension}: {e}", exc_info=True)
            continue
    
    # Sort by importance across all dimensions
    all_segments.sort(key=lambda x: x.get('importance', 0), reverse=True)
    top_segments = all_segments[:20]  # Top 20 across all dimensions
    
    logger.info(f"SegmentHunter found {len(top_segments)} top segments for anomaly {anomaly_id}")
    if len(top_segments) == 0:
        logger.warning(f"⚠️ SegmentHunter returned 0 segments for anomaly {anomaly_id}. All segments: {len(all_segments)}, Dimensions checked: {dimensions}")
    
    return {
        'segments': top_segments,
        'messages': [
            AIMessage(content=(
                f"SegmentHunter completed: Found {len(top_segments)} top segments across "
                f"{len(dimensions)} dimensions. Top contributors: "
                f"{', '.join([s.get('dimension_value', 'N/A') for s in top_segments[:5]])}"
            ))
        ]
    }


async def entity_extractor_node(state: EntitylessInvestigationState) -> Dict[str, Any]:
    """EntityExtractor node: extract candidate entities from top segments."""
    segments = state.get('segments', [])
    anomaly = state.get('anomaly', {})
    
    if not segments:
        return {
            'messages': [AIMessage(content="No segments to extract entities from")]
        }
    
    # Get anomaly context
    cohort_filters = anomaly.get('cohort', {})
    window_start = anomaly.get('window_start')
    window_end = anomaly.get('window_end')
    
    if not window_start or not window_end:
        return {
            'messages': [AIMessage(content="Error: Missing anomaly window information")]
        }
    
    entity_extractor = EntityExtractorTool()
    all_entities = []
    
    # Extract entities from top 5 segments
    for segment in segments[:5]:
        dimension = segment.get('dimension')
        dimension_value = segment.get('dimension_value')
        
        if not dimension or not dimension_value:
            continue
        
        try:
            result = entity_extractor._run(
                dimension=dimension,
                dimension_value=str(dimension_value),
                cohort_filters=cohort_filters,
                window_start=window_start,
                window_end=window_end,
                entity_types=['device_id', 'ip', 'email', 'user_id', 'card_bin'],
                limit_per_type=50
            )
            
            if 'error' not in result and result.get('entities'):
                all_entities.extend(result['entities'])
        except Exception as e:
            logger.warning(f"EntityExtractor failed for {dimension}={dimension_value}: {e}")
            continue
    
    logger.info(f"EntityExtractor found {len(all_entities)} entity groups for anomaly")
    
    return {
        'entities': all_entities,
        'messages': [
            AIMessage(content=(
                f"EntityExtractor completed: Found entities across {len(all_entities)} types. "
                f"Total candidate entities: {sum(len(e.get('entities', [])) for e in all_entities)}"
            ))
        ]
    }


async def correlator_node(state: EntitylessInvestigationState) -> Dict[str, Any]:
    """Correlator node: correlate segments and entities to find root patterns."""
    anomaly_id = state.get('anomaly_id')
    segments = state.get('segments', [])
    entities = state.get('entities', [])
    
    correlator = AnomalyCorrelatorTool()
    
    try:
        result = correlator._run(
            anomaly_id=anomaly_id or '',
            top_segments=segments,
            candidate_entities=entities,
            check_sumo=True,
            check_bursts=True
        )
        
        root_patterns = result.get('root_patterns', [])
        summary = result.get('summary', {})
        
        logger.info(f"Correlator found {len(root_patterns)} root patterns")
        
        return {
            'root_patterns': root_patterns,
            'messages': [
                AIMessage(content=(
                    f"Correlator completed: Found {len(root_patterns)} root patterns. "
                    f"High confidence: {summary.get('high_confidence', 0)}. "
                    f"Bursts detected: {summary.get('has_bursts', False)}. "
                    f"Concentration detected: {summary.get('has_concentration', False)}"
                ))
            ]
        }
    except Exception as e:
        logger.error(f"Correlator error: {e}", exc_info=True)
        return {
            'root_patterns': [],
            'messages': [AIMessage(content=f"Correlator error: {str(e)}")]
        }


async def narrator_node(state: EntitylessInvestigationState) -> Dict[str, Any]:
    """Narrator node: LLM generates investigation summary and recommendations."""
    from langchain_openai import ChatOpenAI
    
    anomaly = state.get('anomaly', {})
    segments = state.get('segments', [])
    entities = state.get('entities', [])
    root_patterns = state.get('root_patterns', [])
    
    # Build context for LLM
    context = f"""
Anomaly Investigation Summary:

Anomaly Details:
- Metric: {anomaly.get('metric', 'N/A')}
- Score: {anomaly.get('score', 'N/A')}
- Severity: {anomaly.get('severity', 'N/A')}
- Window: {anomaly.get('window_start', 'N/A')} to {anomaly.get('window_end', 'N/A')}
- Cohort: {anomaly.get('cohort', {})}

Top Segments ({len(segments)}):
{chr(10).join([f"- {s.get('dimension')}={s.get('dimension_value')}: {s.get('share_of_delta', 0)*100:.1f}% of delta, importance={s.get('importance', 0):.3f}" for s in segments[:10]])}

Candidate Entities:
{chr(10).join([f"- {e.get('entity_type')}: {e.get('count', 0)} entities" for e in entities[:5]])}

Root Patterns ({len(root_patterns)}):
{chr(10).join([f"- {p.get('pattern_type')}: {p.get('description')} (confidence: {p.get('confidence')})" for p in root_patterns[:5]])}

Generate a concise investigation summary (2-3 paragraphs) covering:
1. What dimension splits best explain the deviation
2. Key root patterns identified
3. Recommended mitigation actions
4. Next steps for investigation
"""
    
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.1)  # Low temperature for consistent results
    
    try:
        response = await llm.ainvoke(context)
        summary = response.content if hasattr(response, 'content') else str(response)
        
        logger.info("Narrator generated investigation summary")
        
        return {
            'messages': [
                AIMessage(content=f"Investigation Summary:\n\n{summary}")
            ]
        }
    except Exception as e:
        logger.error(f"Narrator error: {e}", exc_info=True)
        return {
            'messages': [
                AIMessage(content=f"Error generating summary: {str(e)}")
            ]
        }


def route_after_segment_hunter(state: EntitylessInvestigationState) -> str:
    """Route after SegmentHunter: always go to EntityExtractor."""
    return "entity_extractor"


def route_after_entity_extractor(state: EntitylessInvestigationState) -> str:
    """Route after EntityExtractor: always go to Correlator."""
    return "correlator"


def route_after_correlator(state: EntitylessInvestigationState) -> str:
    """Route after Correlator: always go to Narrator."""
    return "narrator"


async def create_entityless_investigation_graph() -> StateGraph:
    """Create LangGraph workflow for entityless anomaly investigations."""
    logger.info("Creating entityless investigation graph")
    
    builder = StateGraph(EntitylessInvestigationState)
    
    # Add nodes
    builder.add_node("segment_hunter", segment_hunter_node)
    builder.add_node("entity_extractor", entity_extractor_node)
    builder.add_node("correlator", correlator_node)
    builder.add_node("narrator", narrator_node)
    
    # Define workflow: SegmentHunter → EntityExtractor → Correlator → Narrator → END
    builder.add_edge(START, "segment_hunter")
    builder.add_edge("segment_hunter", "entity_extractor")
    builder.add_edge("entity_extractor", "correlator")
    builder.add_edge("correlator", "narrator")
    builder.add_edge("narrator", END)
    
    # Compile graph
    from langgraph.checkpoint.memory import MemorySaver
    memory = MemorySaver()
    graph = builder.compile(checkpointer=memory)
    
    logger.info("Entityless investigation graph created successfully")
    
    return graph

