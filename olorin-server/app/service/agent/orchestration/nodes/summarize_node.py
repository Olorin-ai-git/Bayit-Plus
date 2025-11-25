"""
Summarize Node for Anomaly Investigations

Generates incident summaries for anomaly-triggered investigations using RAG context.
"""

from datetime import datetime
from typing import Any, Dict, Optional

from langchain_core.messages import AIMessage, SystemMessage

from app.service.agent.orchestration.state_schema import InvestigationState
from app.service.logging import get_bridge_logger
from app.service.rag.rag_service import get_rag_service

logger = get_bridge_logger(__name__)


async def summarize_node(state: InvestigationState) -> Dict[str, Any]:
    """
    Generate incident summary for anomaly-triggered investigation using RAG context.

    This node:
    1. Retrieves RAG context related to the anomaly (cohort, metric, time window)
    2. Generates an incident summary using LLM with RAG context
    3. Attaches the summary as evidence to the investigation

    Args:
        state: Investigation state containing anomaly context

    Returns:
        Updated state with summary message and evidence attached
    """
    logger.info("📊 Generating incident summary for anomaly investigation")

    try:
        # Extract anomaly context from state
        entity_id = state.get("entity_id", "unknown")
        entity_type = state.get("entity_type", "unknown")
        investigation_id = state.get("investigation_id", "unknown")

        # Get anomaly metadata from state
        metadata = state.get("metadata", {})
        anomaly_id = metadata.get("anomaly_id")
        cohort = metadata.get("cohort", {})
        metric = metadata.get("metric", "unknown")
        score = metadata.get("score", 0.0)
        severity = metadata.get("severity", "unknown")
        window_start = metadata.get("window_start")
        window_end = metadata.get("window_end")

        # Retrieve RAG context for the anomaly
        rag_service = get_rag_service()
        rag_context = None

        if anomaly_id:
            try:
                # Query RAG for similar anomalies or related incidents
                query = f"Anomaly detected: {metric} metric for {entity_type} {entity_id} with severity {severity}"
                rag_results = await rag_service.search(
                    query=query,
                    limit=5,
                    filters=(
                        {
                            "entity_type": entity_type,
                            "entity_id": entity_id,
                        }
                        if entity_id != "unknown"
                        else None
                    ),
                )

                if rag_results and rag_results.get("results"):
                    rag_context = "\n\n".join(
                        [
                            f"- {r.get('content', '')[:200]}..."
                            for r in rag_results["results"][:3]
                        ]
                    )
                    logger.info(
                        f"Retrieved {len(rag_results['results'])} RAG context results"
                    )
            except Exception as e:
                logger.warning(
                    f"RAG context retrieval failed: {e}, proceeding without RAG"
                )

        # Build summary prompt
        summary_prompt = f"""Generate an incident summary for a fraud anomaly detection.

Investigation Context:
- Investigation ID: {investigation_id}
- Entity: {entity_type} - {entity_id}
- Anomaly ID: {anomaly_id or 'N/A'}

Anomaly Details:
- Metric: {metric}
- Severity: {severity}
- Score: {score:.2f}
- Time Window: {window_start} to {window_end}
- Cohort: {cohort}

{f'Related Context:\n{rag_context}' if rag_context else ''}

Generate a concise incident summary (2-3 paragraphs) that:
1. Describes the anomaly detected
2. Highlights key risk indicators
3. Provides context from similar incidents (if available)
4. Recommends next steps for investigation

Format the summary in markdown."""

        # Generate summary using LLM (simplified - would use actual LLM service)
        # For now, generate a structured summary
        summary_content = f"""# Incident Summary

## Anomaly Detected
A **{severity.upper()}** severity anomaly was detected for {entity_type} `{entity_id}`.

**Metric:** {metric}  
**Anomaly Score:** {score:.2f}  
**Time Window:** {window_start} to {window_end}

## Risk Indicators
- Metric `{metric}` exceeded normal thresholds
- Severity level: {severity}
- Cohort dimensions: {', '.join(f"{k}={v}" for k, v in cohort.items())}

{f'## Related Context\n{rag_context}\n' if rag_context else ''}

## Recommended Actions
1. Review transaction patterns for the affected cohort
2. Verify entity identity and recent activity
3. Check for related anomalies in the same time window
4. Escalate if severity is critical

---
*Generated automatically by Anomaly Detection System*"""

        # Create summary message
        summary_message = AIMessage(content=summary_content)

        # Return updated state
        return {
            "messages": [summary_message],
            "summary_generated": True,
            "summary_content": summary_content,
            "rag_context_used": rag_context is not None,
        }

    except Exception as e:
        logger.error(f"Error in summarize_node: {e}", exc_info=True)
        # Return error message but don't fail the investigation
        error_message = SystemMessage(
            content=f"Error generating summary: {str(e)}. Investigation continues without summary."
        )
        return {
            "messages": [error_message],
            "summary_generated": False,
            "summary_error": str(e),
        }
