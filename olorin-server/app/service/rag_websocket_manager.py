"""
RAG WebSocket Manager

Specialized WebSocket manager for RAG (Retrieval-Augmented Generation) events
and performance monitoring during fraud investigations.
"""

import json
import asyncio
from datetime import datetime
from typing import Any, Dict, List, Optional, Set
from enum import Enum

from fastapi import WebSocket
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class RAGEventType(Enum):
    """Types of RAG events that can be streamed"""
    RAG_EVENT = "rag_event"
    RAG_PERFORMANCE = "rag_performance"
    RAG_KNOWLEDGE_SOURCES = "rag_knowledge_sources"


class RAGWebSocketManager:
    """
    Specialized WebSocket manager for RAG events
    
    Handles real-time streaming of:
    - RAG operation events (knowledge retrieval, context augmentation, etc.)
    - Performance metrics and monitoring data
    - Knowledge source updates and statistics
    """
    
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.connection_metadata: Dict[WebSocket, Dict[str, Any]] = {}
        
    async def connect(self, websocket: WebSocket, investigation_id: str):
        """Connect WebSocket client for RAG events"""
        await websocket.accept()
        
        if investigation_id not in self.active_connections:
            self.active_connections[investigation_id] = set()
        
        self.active_connections[investigation_id].add(websocket)
        self.connection_metadata[websocket] = {
            "investigation_id": investigation_id,
            "connected_at": datetime.now(),
            "events_sent": 0
        }
        
        logger.info(f"RAG WebSocket connected for investigation {investigation_id}")
        
        # Send initial connection confirmation
        await self.send_rag_event(
            investigation_id=investigation_id,
            event_type="rag_event",
            data={
                "type": "connection_established",
                "investigation_id": investigation_id,
                "timestamp": datetime.now().isoformat(),
                "message": "RAG WebSocket connection established"
            }
        )
    
    def disconnect(self, websocket: WebSocket, investigation_id: str):
        """Disconnect WebSocket client"""
        if investigation_id in self.active_connections:
            self.active_connections[investigation_id].discard(websocket)
            
            if not self.active_connections[investigation_id]:
                del self.active_connections[investigation_id]
        
        if websocket in self.connection_metadata:
            metadata = self.connection_metadata.pop(websocket)
            logger.info(
                f"RAG WebSocket disconnected for investigation {investigation_id}. "
                f"Events sent: {metadata.get('events_sent', 0)}"
            )
    
    async def send_rag_event(
        self,
        investigation_id: str,
        event_type: str,
        data: Dict[str, Any]
    ):
        """Send RAG event to all connected clients for investigation"""
        if investigation_id not in self.active_connections:
            logger.debug(f"No RAG WebSocket connections for investigation {investigation_id}")
            return
        
        message = {
            "type": event_type,
            "data": data,
            "timestamp": datetime.now().isoformat()
        }
        
        disconnected_clients = []
        
        for websocket in self.active_connections[investigation_id].copy():
            try:
                await websocket.send_json(message)
                
                # Update metadata
                if websocket in self.connection_metadata:
                    self.connection_metadata[websocket]["events_sent"] += 1
                    
                logger.debug(f"RAG event sent: {event_type} to {investigation_id}")
                
            except Exception as e:
                logger.warning(f"Failed to send RAG event to WebSocket: {e}")
                disconnected_clients.append(websocket)
        
        # Clean up disconnected clients
        for websocket in disconnected_clients:
            self.disconnect(websocket, investigation_id)
    
    async def broadcast_rag_knowledge_retrieved(
        self,
        investigation_id: str,
        agent_type: str,
        operation: str,
        knowledge_sources: List[str],
        context_size: int,
        retrieval_time: float,
        confidence_score: float,
        knowledge_chunks_used: int
    ):
        """Broadcast knowledge retrieval event"""
        await self.send_rag_event(
            investigation_id=investigation_id,
            event_type="rag_event",
            data={
                "type": "rag_knowledge_retrieved",
                "investigation_id": investigation_id,
                "agent_type": agent_type,
                "timestamp": datetime.now().isoformat(),
                "data": {
                    "operation": operation,
                    "knowledge_sources": knowledge_sources,
                    "context_size": context_size,
                    "retrieval_time": retrieval_time,
                    "confidence_score": confidence_score,
                    "enhancement_applied": True,
                    "knowledge_chunks_used": knowledge_chunks_used
                }
            }
        )
    
    async def broadcast_rag_context_augmented(
        self,
        investigation_id: str,
        agent_type: str,
        operation: str,
        context_size: int,
        enhancement_applied: bool
    ):
        """Broadcast context augmentation event"""
        await self.send_rag_event(
            investigation_id=investigation_id,
            event_type="rag_event",
            data={
                "type": "rag_context_augmented",
                "investigation_id": investigation_id,
                "agent_type": agent_type,
                "timestamp": datetime.now().isoformat(),
                "data": {
                    "operation": operation,
                    "context_size": context_size,
                    "enhancement_applied": enhancement_applied
                }
            }
        )
    
    async def broadcast_rag_tool_recommended(
        self,
        investigation_id: str,
        agent_type: str,
        tools_recommended: List[str],
        confidence_score: float
    ):
        """Broadcast tool recommendation event"""
        await self.send_rag_event(
            investigation_id=investigation_id,
            event_type="rag_event",
            data={
                "type": "rag_tool_recommended",
                "investigation_id": investigation_id,
                "agent_type": agent_type,
                "timestamp": datetime.now().isoformat(),
                "data": {
                    "operation": "tool_recommendation",
                    "tools_recommended": tools_recommended,
                    "confidence_score": confidence_score,
                    "enhancement_applied": True
                }
            }
        )
    
    async def broadcast_rag_result_enhanced(
        self,
        investigation_id: str,
        agent_type: str,
        operation: str,
        enhancement_applied: bool,
        confidence_score: Optional[float] = None
    ):
        """Broadcast result enhancement event"""
        await self.send_rag_event(
            investigation_id=investigation_id,
            event_type="rag_event",
            data={
                "type": "rag_result_enhanced",
                "investigation_id": investigation_id,
                "agent_type": agent_type,
                "timestamp": datetime.now().isoformat(),
                "data": {
                    "operation": operation,
                    "enhancement_applied": enhancement_applied,
                    "confidence_score": confidence_score
                }
            }
        )
    
    async def broadcast_performance_metrics(
        self,
        investigation_id: str,
        metrics: Dict[str, Any]
    ):
        """Broadcast RAG performance metrics"""
        await self.send_rag_event(
            investigation_id=investigation_id,
            event_type="rag_performance",
            data={
                "type": "rag_performance_metrics",
                "investigation_id": investigation_id,
                "timestamp": datetime.now().isoformat(),
                "metrics": metrics
            }
        )
    
    async def broadcast_knowledge_sources_update(
        self,
        investigation_id: str,
        sources: List[Dict[str, Any]]
    ):
        """Broadcast knowledge sources update"""
        await self.send_rag_event(
            investigation_id=investigation_id,
            event_type="rag_knowledge_sources",
            data={
                "sources": sources,
                "updated_at": datetime.now().isoformat()
            }
        )
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get connection statistics"""
        total_connections = sum(len(connections) for connections in self.active_connections.values())
        
        return {
            "total_active_connections": total_connections,
            "investigations_with_connections": len(self.active_connections),
            "connection_breakdown": {
                inv_id: len(connections) 
                for inv_id, connections in self.active_connections.items()
            }
        }


# Create singleton instance
rag_websocket_manager = RAGWebSocketManager()