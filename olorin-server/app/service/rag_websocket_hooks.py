"""
RAG WebSocket Hooks

Simple hooks for integrating WebSocket broadcasting with RAG operations.
Designed to be easily integrated with existing RAG components.
"""

import asyncio
from typing import Any, Dict, List, Optional
from app.service.logging import get_bridge_logger
from app.service.rag_websocket_integration import rag_websocket_integration

logger = get_bridge_logger(__name__)


def broadcast_rag_event_sync(
    investigation_id: str,
    agent_type: str,
    operation_type: str,
    operation_data: Dict[str, Any]
):
    """Synchronous wrapper for broadcasting RAG events"""
    try:
        # Try to get the current event loop
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If loop is running, create a task
            task = asyncio.create_task(
                rag_websocket_integration.handle_rag_operation_event(
                    investigation_id, agent_type, operation_type, operation_data
                )
            )
            return task
        else:
            # If no loop is running, run the coroutine directly
            return asyncio.run(
                rag_websocket_integration.handle_rag_operation_event(
                    investigation_id, agent_type, operation_type, operation_data
                )
            )
    except Exception as e:
        logger.error(f"Error in sync RAG event broadcast: {e}")


async def broadcast_rag_event(
    investigation_id: str,
    agent_type: str,
    operation_type: str,
    operation_data: Dict[str, Any]
):
    """Async wrapper for broadcasting RAG events"""
    await rag_websocket_integration.handle_rag_operation_event(
        investigation_id, agent_type, operation_type, operation_data
    )


def broadcast_knowledge_retrieved(
    investigation_id: str,
    agent_type: str,
    knowledge_sources: List[str],
    context_size: int,
    retrieval_time: float,
    confidence_score: float = 0.8,
    knowledge_chunks_used: int = 0
):
    """Broadcast knowledge retrieval event"""
    operation_data = {
        "operation": "knowledge_retrieval",
        "knowledge_sources": knowledge_sources,
        "context_size": context_size,
        "retrieval_time": retrieval_time,
        "confidence_score": confidence_score,
        "knowledge_chunks_used": knowledge_chunks_used
    }
    
    broadcast_rag_event_sync(
        investigation_id, agent_type, "knowledge_retrieved", operation_data
    )


def broadcast_context_augmented(
    investigation_id: str,
    agent_type: str,
    context_size: int,
    enhancement_applied: bool = True
):
    """Broadcast context augmentation event"""
    operation_data = {
        "operation": "context_augmentation",
        "context_size": context_size,
        "enhancement_applied": enhancement_applied
    }
    
    broadcast_rag_event_sync(
        investigation_id, agent_type, "context_augmented", operation_data
    )


def broadcast_tool_recommended(
    investigation_id: str,
    agent_type: str,
    tools_recommended: List[str],
    confidence_score: float = 0.8
):
    """Broadcast tool recommendation event"""
    operation_data = {
        "tools_recommended": tools_recommended,
        "confidence_score": confidence_score
    }
    
    broadcast_rag_event_sync(
        investigation_id, agent_type, "tool_recommended", operation_data
    )


def broadcast_result_enhanced(
    investigation_id: str,
    agent_type: str,
    operation: str,
    enhancement_applied: bool = True,
    confidence_score: Optional[float] = None
):
    """Broadcast result enhancement event"""
    operation_data = {
        "operation": operation,
        "enhancement_applied": enhancement_applied,
        "confidence_score": confidence_score
    }
    
    broadcast_rag_event_sync(
        investigation_id, agent_type, "result_enhanced", operation_data
    )


def update_knowledge_sources_sync(
    investigation_id: str,
    sources: List[Dict[str, Any]]
):
    """Synchronous wrapper for updating knowledge sources"""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            task = asyncio.create_task(
                rag_websocket_integration.update_knowledge_sources(
                    investigation_id, sources
                )
            )
            return task
        else:
            return asyncio.run(
                rag_websocket_integration.update_knowledge_sources(
                    investigation_id, sources
                )
            )
    except Exception as e:
        logger.error(f"Error in sync knowledge sources update: {e}")


def start_metrics_broadcasting(investigation_id: str, interval_seconds: int = 30):
    """Start periodic metrics broadcasting for investigation"""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(
                rag_websocket_integration.start_periodic_metrics_broadcast(
                    investigation_id, interval_seconds
                )
            )
        else:
            asyncio.run(
                rag_websocket_integration.start_periodic_metrics_broadcast(
                    investigation_id, interval_seconds
                )
            )
    except Exception as e:
        logger.error(f"Error starting metrics broadcasting: {e}")


def cleanup_investigation_rag_data(investigation_id: str):
    """Clean up RAG data for completed investigation"""
    rag_websocket_integration.cleanup_investigation_data(investigation_id)