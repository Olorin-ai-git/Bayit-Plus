"""
RAG WebSocket Integration Service

Integrates RAG system components with WebSocket broadcasting for real-time
monitoring and event streaming during fraud investigations.
"""

import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from app.service.logging import get_bridge_logger
from app.service.rag_websocket_manager import rag_websocket_manager
from app.service.agent.tools.rag_performance_monitor import (
    get_rag_performance_monitor,
    PerformanceMetric
)

logger = get_bridge_logger(__name__)


class RAGWebSocketIntegration:
    """
    Integration service for RAG components and WebSocket broadcasting
    
    Provides real-time streaming of:
    - RAG operation events from agents
    - Performance metrics and monitoring data
    - Knowledge source statistics and updates
    """
    
    def __init__(self):
        self.performance_monitor = get_rag_performance_monitor()
        self.knowledge_sources_cache: Dict[str, List[Dict[str, Any]]] = {}
        self.last_metrics_broadcast: Dict[str, datetime] = {}
        self.metrics_broadcast_interval = timedelta(seconds=5)  # Broadcast every 5 seconds
        
    async def handle_rag_operation_event(
        self,
        investigation_id: str,
        agent_type: str,
        operation_type: str,
        operation_data: Dict[str, Any]
    ):
        """Handle RAG operation event and broadcast to WebSocket clients"""
        
        try:
            # Broadcast based on operation type
            if operation_type == "knowledge_retrieved":
                await rag_websocket_manager.broadcast_rag_knowledge_retrieved(
                    investigation_id=investigation_id,
                    agent_type=agent_type,
                    operation=operation_data.get("operation", "knowledge_retrieval"),
                    knowledge_sources=operation_data.get("knowledge_sources", []),
                    context_size=operation_data.get("context_size", 0),
                    retrieval_time=operation_data.get("retrieval_time", 0.0),
                    confidence_score=operation_data.get("confidence_score", 0.0),
                    knowledge_chunks_used=operation_data.get("knowledge_chunks_used", 0)
                )
                
            elif operation_type == "context_augmented":
                await rag_websocket_manager.broadcast_rag_context_augmented(
                    investigation_id=investigation_id,
                    agent_type=agent_type,
                    operation=operation_data.get("operation", "context_augmentation"),
                    context_size=operation_data.get("context_size", 0),
                    enhancement_applied=operation_data.get("enhancement_applied", False)
                )
                
            elif operation_type == "tool_recommended":
                await rag_websocket_manager.broadcast_rag_tool_recommended(
                    investigation_id=investigation_id,
                    agent_type=agent_type,
                    tools_recommended=operation_data.get("tools_recommended", []),
                    confidence_score=operation_data.get("confidence_score", 0.0)
                )
                
            elif operation_type == "result_enhanced":
                await rag_websocket_manager.broadcast_rag_result_enhanced(
                    investigation_id=investigation_id,
                    agent_type=agent_type,
                    operation=operation_data.get("operation", "result_enhancement"),
                    enhancement_applied=operation_data.get("enhancement_applied", False),
                    confidence_score=operation_data.get("confidence_score")
                )
                
            logger.debug(f"RAG operation event broadcasted: {operation_type} for {investigation_id}")
            
        except Exception as e:
            logger.error(f"Error broadcasting RAG operation event: {e}")
    
    async def handle_performance_metric_recorded(
        self,
        investigation_id: str,
        performance_metric: PerformanceMetric
    ):
        """Handle performance metric recording and broadcast if needed"""
        
        try:
            # Check if we should broadcast metrics update
            now = datetime.now()
            last_broadcast = self.last_metrics_broadcast.get(investigation_id)
            
            should_broadcast = (
                last_broadcast is None or
                now - last_broadcast >= self.metrics_broadcast_interval or
                not performance_metric.meets_target  # Always broadcast if performance issue
            )
            
            if should_broadcast:
                await self.broadcast_current_performance_metrics(investigation_id)
                self.last_metrics_broadcast[investigation_id] = now
                
        except Exception as e:
            logger.error(f"Error handling performance metric: {e}")
    
    async def broadcast_current_performance_metrics(self, investigation_id: str):
        """Broadcast current performance metrics for investigation"""
        
        try:
            # Get system performance summary
            system_summary = self.performance_monitor.get_system_performance_summary()
            
            # Create metrics payload
            metrics = {
                "total_queries": system_summary["performance_summary"]["total_executions"],
                "avg_retrieval_time": system_summary["performance_summary"]["avg_overhead_ms"],
                "knowledge_hit_rate": system_summary["performance_summary"]["target_compliance_rate"],
                "enhancement_success_rate": system_summary["performance_summary"]["target_compliance_rate"],
                "total_knowledge_chunks": sum(
                    summary.get("avg_knowledge_chunks", 0)
                    for summary in self.performance_monitor.tool_performance_summary.values()
                ),
                "active_sources": list(self.knowledge_sources_cache.get(investigation_id, [])),
                "last_operation_time": system_summary["performance_summary"]["avg_overhead_ms"]
            }
            
            await rag_websocket_manager.broadcast_performance_metrics(
                investigation_id=investigation_id,
                metrics=metrics
            )
            
            logger.debug(f"Performance metrics broadcasted for {investigation_id}")
            
        except Exception as e:
            logger.error(f"Error broadcasting performance metrics: {e}")
    
    async def update_knowledge_sources(
        self,
        investigation_id: str,
        sources: List[Dict[str, Any]]
    ):
        """Update and broadcast knowledge sources for investigation"""
        
        try:
            # Update cache
            self.knowledge_sources_cache[investigation_id] = sources
            
            # Convert to expected format
            formatted_sources = []
            for source in sources:
                formatted_sources.append({
                    "name": source.get("name", "Unknown"),
                    "type": source.get("type", "document"),
                    "confidence": source.get("confidence", 0.0),
                    "relevance": source.get("relevance", 0.0),
                    "lastUsed": source.get("last_used", datetime.now().isoformat()),
                    "hitCount": source.get("hit_count", 0)
                })
            
            await rag_websocket_manager.broadcast_knowledge_sources_update(
                investigation_id=investigation_id,
                sources=formatted_sources
            )
            
            logger.debug(f"Knowledge sources updated for {investigation_id}: {len(sources)} sources")
            
        except Exception as e:
            logger.error(f"Error updating knowledge sources: {e}")
    
    async def start_periodic_metrics_broadcast(self, investigation_id: str, interval_seconds: int = 30):
        """Start periodic broadcasting of metrics for an investigation"""
        
        async def broadcast_loop():
            while investigation_id in rag_websocket_manager.active_connections:
                try:
                    await self.broadcast_current_performance_metrics(investigation_id)
                    await asyncio.sleep(interval_seconds)
                except Exception as e:
                    logger.error(f"Error in periodic metrics broadcast: {e}")
                    break
        
        # Start background task
        asyncio.create_task(broadcast_loop())
        logger.info(f"Started periodic metrics broadcast for {investigation_id}")
    
    def cleanup_investigation_data(self, investigation_id: str):
        """Clean up cached data for completed investigation"""
        
        self.knowledge_sources_cache.pop(investigation_id, None)
        self.last_metrics_broadcast.pop(investigation_id, None)
        
        logger.debug(f"Cleaned up RAG WebSocket data for {investigation_id}")
    
    def get_integration_stats(self) -> Dict[str, Any]:
        """Get integration statistics"""
        
        return {
            "cached_investigations": len(self.knowledge_sources_cache),
            "active_connections": rag_websocket_manager.get_connection_stats(),
            "performance_monitor_health": self.performance_monitor.get_system_performance_summary(),
            "last_metrics_broadcasts": len(self.last_metrics_broadcast)
        }


# Create singleton instance
rag_websocket_integration = RAGWebSocketIntegration()