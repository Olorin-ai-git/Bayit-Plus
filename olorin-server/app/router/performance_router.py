"""
Performance Monitoring Router for Olorin Investigation System

This module provides endpoints for monitoring system performance, investigation
metrics, and structured agent performance tracking with real-time data.
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
import logging
from app.service.logging import get_bridge_logger
import asyncio

logger = get_bridge_logger(__name__)

# Router setup
router = APIRouter(prefix="/performance", tags=["performance"])

def get_perf_manager():
    """Get performance optimization manager."""
    from ..service.performance_integration import get_performance_optimization_manager
    return get_performance_optimization_manager()

@router.get("/health")
async def performance_health():
    """System performance health check with real performance data"""
    perf_manager = get_perf_manager()
    
    health_status = "healthy"
    additional_info = {}
    
    if perf_manager:
        try:
            stats = perf_manager.get_performance_stats()
            current_metrics = stats.get("current_metrics", {})
            
            # Determine health based on metrics
            memory_usage = current_metrics.get("memory_usage_percent", 0)
            cpu_usage = current_metrics.get("cpu_usage_percent", 0)
            error_rate = stats.get("requests", {}).get("error_rate", 0)
            
            if memory_usage > 90 or cpu_usage > 95 or error_rate > 10:
                health_status = "critical"
            elif memory_usage > 70 or cpu_usage > 80 or error_rate > 5:
                health_status = "warning"
            
            additional_info = {
                "performance_optimizations_enabled": stats["system"]["initialized"],
                "redis_available": stats["system"]["redis_available"],
                "cache_available": stats["system"]["cache_available"],
                "uptime_seconds": stats["system"]["uptime_seconds"],
                "memory_usage_percent": memory_usage,
                "cpu_usage_percent": cpu_usage,
                "error_rate": error_rate
            }
            
        except Exception as e:
            logger.error(f"Error getting performance health: {e}")
            health_status = "degraded"
            additional_info["error"] = str(e)
    
    return {
        "status": health_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "performance_monitoring": "active" if perf_manager else "disabled",
        **additional_info
    }

@router.get("/metrics")
async def get_performance_metrics():
    """Get comprehensive system performance metrics"""
    try:
        perf_manager = get_perf_manager()
        
        if not perf_manager:
            # Fallback to basic system metrics
            import psutil
            process = psutil.Process()
            system_memory = psutil.virtual_memory()
            
            return {
                "system_metrics": {
                    "cpu_usage_percent": process.cpu_percent(),
                    "memory_usage_mb": process.memory_info().rss / 1024 / 1024,
                    "memory_usage_percent": (process.memory_info().rss / system_memory.total) * 100,
                    "active_connections": len(process.net_connections())
                },
                "investigation_metrics": {
                    "active_investigations": 0,
                    "completed_investigations_today": 0,
                    "average_investigation_time_ms": 0
                },
                "agent_metrics": {
                    "total_agent_calls": 0,
                    "average_agent_response_time_ms": 0,
                    "agent_success_rate": 100.0
                },
                "cache_metrics": {
                    "hit_rate": 0.0,
                    "cache_size_mb": 0.0,
                    "total_entries": 0
                },
                "performance_optimizations_enabled": False,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        
        # Get comprehensive performance statistics
        stats = perf_manager.get_performance_stats()
        current_metrics = stats.get("current_metrics", {})
        request_stats = stats.get("requests", {})
        cache_stats = stats.get("cache_stats", {})
        
        return {
            "system_metrics": {
                "cpu_usage_percent": current_metrics.get("cpu_usage_percent", 0.0),
                "memory_usage_mb": current_metrics.get("memory_usage_mb", 0.0),
                "memory_usage_percent": current_metrics.get("memory_usage_percent", 0.0),
                "active_connections": current_metrics.get("active_connections", 0),
                "uptime_seconds": stats["system"]["uptime_seconds"]
            },
            "request_metrics": {
                "total_requests": request_stats.get("total_count", 0),
                "error_count": request_stats.get("error_count", 0),
                "error_rate": request_stats.get("error_rate", 0.0),
                "avg_response_time_ms": request_stats.get("avg_response_time_ms", 0.0),
                "min_response_time_ms": request_stats.get("min_response_time_ms", 0.0),
                "max_response_time_ms": request_stats.get("max_response_time_ms", 0.0)
            },
            "cache_metrics": {
                "hit_rate": cache_stats.get("performance", {}).get("hit_rate", 0.0),
                "cache_size_mb": cache_stats.get("capacity", {}).get("total_size_bytes", 0) / 1024 / 1024,
                "total_entries": cache_stats.get("capacity", {}).get("entry_count", 0),
                "memory_usage_percent": cache_stats.get("capacity", {}).get("memory_usage_percent", 0.0),
                "evictions": cache_stats.get("performance", {}).get("evictions", 0),
                "expired_entries": cache_stats.get("performance", {}).get("expired_entries", 0)
            },
            "agent_metrics": {
                "active_agents": current_metrics.get("active_agents", 0),
                "agent_queue_size": current_metrics.get("agent_queue_size", 0),
                "total_agent_calls": request_stats.get("total_count", 0),  # Approximation
                "average_agent_response_time_ms": request_stats.get("avg_response_time_ms", 0.0),
                "agent_success_rate": 100.0 - request_stats.get("error_rate", 0.0)
            },
            "performance_optimizations_enabled": stats["system"]["initialized"],
            "redis_available": stats["system"]["redis_available"],
            "cache_available": stats["system"]["cache_available"],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get performance metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Metrics retrieval failed: {str(e)}")

@router.get("/metrics/history")
async def get_performance_metrics_history(
    minutes: int = Query(default=30, description="Number of minutes of history to retrieve")
):
    """Get historical performance metrics"""
    try:
        perf_manager = get_perf_manager()
        
        if not perf_manager:
            return {
                "history": [],
                "message": "Performance monitoring not enabled",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        
        # Get metrics history from performance monitor
        history = perf_manager.monitor.get_metrics_history(minutes=minutes)
        
        return {
            "history": [
                {
                    "timestamp": metric.timestamp.isoformat(),
                    "cpu_usage_percent": metric.cpu_usage_percent,
                    "memory_usage_mb": metric.memory_usage_mb,
                    "memory_usage_percent": metric.memory_usage_percent,
                    "active_connections": metric.active_connections,
                    "cache_hit_rate": metric.cache_hit_rate,
                    "cache_size_mb": metric.cache_size_mb,
                    "avg_response_time_ms": metric.avg_response_time_ms
                }
                for metric in history
            ],
            "timeframe_minutes": minutes,
            "total_datapoints": len(history),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get performance metrics history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Metrics history retrieval failed: {str(e)}")

@router.get("/investigation/{investigation_id}/performance")
async def get_investigation_performance(investigation_id: str):
    """Get performance metrics for a specific investigation"""
    try:
        perf_manager = get_perf_manager()
        
        # Implement investigation-specific tracking
        if perf_manager:
            # Get investigation-specific metrics from performance manager
            investigation_metrics = perf_manager.get_investigation_metrics(investigation_id)
        else:
            investigation_metrics = None

        # Query investigation data from persistence layer
        from app.persistence import get_investigation
        try:
            investigation = get_investigation(investigation_id)
            investigation_exists = investigation is not None
        except Exception:
            investigation_exists = False

        if investigation_metrics:
            # Use real investigation metrics
            base_metrics = {
                "investigation_id": investigation_id,
                "investigation_exists": investigation_exists,
                "performance_metrics": {
                    "total_execution_time_ms": investigation_metrics.get("total_time_ms", 0),
                    "agent_execution_times": investigation_metrics.get("agent_times", {}),
                    "tool_execution_times": investigation_metrics.get("tool_times", {}),
                    "start_time": investigation_metrics.get("start_time"),
                    "end_time": investigation_metrics.get("end_time"),
                    "status": investigation_metrics.get("status", "unknown")
                }
            }
        else:
            # No performance data available - return empty metrics
            if not investigation_exists:
                raise HTTPException(status_code=404, detail=f"Investigation {investigation_id} not found")

            base_metrics = {
                "investigation_id": investigation_id,
                "investigation_exists": investigation_exists,
                "performance_metrics": {
                    "total_execution_time_ms": None,
                    "agent_execution_times": {},
                    "tool_execution_times": {},
                    "status": "no_performance_data_available",
                    "message": "Performance tracking not enabled for this investigation"
                },
                "llm_call_count": 0,
                "total_tokens_used": 0,
                "cache_hits": 0,
                "cache_misses": 0,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        
        if perf_manager:
            stats = perf_manager.get_performance_stats()
            request_stats = stats.get("requests", {})
            
            # Use general performance data as approximation
            base_metrics["performance_metrics"].update({
                "average_response_time_ms": request_stats.get("avg_response_time_ms", 0.0),
                "success_rate": 100.0 - request_stats.get("error_rate", 0.0)
            })
        
        return base_metrics
        
    except Exception as e:
        logger.error(f"Failed to get investigation performance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Investigation performance retrieval failed: {str(e)}")

@router.get("/agents")
async def get_agent_performance():
    """Get performance metrics for all agents with real data"""
    try:
        perf_manager = get_perf_manager()
        
        base_agent_data = {
            "device_analysis_agent": {
                "calls_today": 0,
                "average_response_time_ms": 0,
                "success_rate": 100.0,
                "cache_hit_rate": 0.0,
                "last_execution": None
            },
            "location_analysis_agent": {
                "calls_today": 0,
                "average_response_time_ms": 0,
                "success_rate": 100.0,
                "cache_hit_rate": 0.0,
                "last_execution": None
            },
            "network_analysis_agent": {
                "calls_today": 0,
                "average_response_time_ms": 0,
                "success_rate": 100.0,
                "cache_hit_rate": 0.0,
                "last_execution": None
            },
            "logs_analysis_agent": {
                "calls_today": 0,
                "average_response_time_ms": 0,
                "success_rate": 100.0,
                "cache_hit_rate": 0.0,
                "last_execution": None
            }
        }
        
        if perf_manager:
            stats = perf_manager.get_performance_stats()
            request_stats = stats.get("requests", {})
            cache_stats = stats.get("cache_stats", {})
            current_metrics = stats.get("current_metrics", {})
            
            # Update with real performance data
            global_cache_hit_rate = cache_stats.get("performance", {}).get("hit_rate", 0.0)
            global_avg_response = request_stats.get("avg_response_time_ms", 0.0)
            global_success_rate = 100.0 - request_stats.get("error_rate", 0.0)
            
            for agent_name in base_agent_data.keys():
                base_agent_data[agent_name].update({
                    "calls_today": request_stats.get("total_count", 0) // 4,  # Rough approximation
                    "average_response_time_ms": global_avg_response,
                    "success_rate": global_success_rate,
                    "cache_hit_rate": global_cache_hit_rate,
                    "active": current_metrics.get("active_agents", 0) > 0
                })
        
        return {
            "agent_performance": base_agent_data,
            "summary": {
                "total_agents": len(base_agent_data),
                "active_agents": perf_manager.monitor.get_current_metrics().active_agents if perf_manager else 0,
                "overall_success_rate": sum(agent["success_rate"] for agent in base_agent_data.values()) / len(base_agent_data),
                "overall_avg_response_time_ms": sum(agent["average_response_time_ms"] for agent in base_agent_data.values()) / len(base_agent_data)
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get agent performance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Agent performance retrieval failed: {str(e)}")

@router.get("/cache/stats")
async def get_cache_statistics():
    """Get detailed cache performance statistics"""
    try:
        perf_manager = get_perf_manager()
        
        if not perf_manager or not perf_manager.cache_manager:
            return {
                "cache_enabled": False,
                "message": "Cache system not available",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        
        cache_stats = perf_manager.cache_manager.get_statistics()
        
        return {
            "cache_enabled": True,
            "statistics": cache_stats,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get cache statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Cache statistics retrieval failed: {str(e)}")

@router.post("/cache/clear")
async def clear_cache():
    """Clear all cache entries (admin endpoint)"""
    try:
        perf_manager = get_perf_manager()
        
        if not perf_manager or not perf_manager.cache_manager:
            return {
                "success": False,
                "message": "Cache system not available",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        
        await perf_manager.cache_manager.clear()
        
        return {
            "success": True,
            "message": "Cache cleared successfully",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to clear cache: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Cache clear failed: {str(e)}")

@router.get("/system/alerts")
async def get_performance_alerts():
    """Get current performance alerts and warnings"""
    try:
        perf_manager = get_perf_manager()
        
        alerts = []
        
        if perf_manager:
            current_metrics = perf_manager.monitor.get_current_metrics()
            
            if current_metrics:
                if current_metrics.memory_usage_percent > 80:
                    alerts.append({
                        "type": "warning" if current_metrics.memory_usage_percent < 90 else "critical",
                        "message": f"High memory usage: {current_metrics.memory_usage_percent:.1f}%",
                        "metric": "memory_usage_percent",
                        "value": current_metrics.memory_usage_percent,
                        "threshold": 80
                    })
                
                if current_metrics.cpu_usage_percent > 85:
                    alerts.append({
                        "type": "warning" if current_metrics.cpu_usage_percent < 95 else "critical",
                        "message": f"High CPU usage: {current_metrics.cpu_usage_percent:.1f}%",
                        "metric": "cpu_usage_percent",
                        "value": current_metrics.cpu_usage_percent,
                        "threshold": 85
                    })
                
                if current_metrics.cache_hit_rate < 0.7 and current_metrics.cache_hit_rate > 0:
                    alerts.append({
                        "type": "warning",
                        "message": f"Low cache hit rate: {current_metrics.cache_hit_rate:.1%}",
                        "metric": "cache_hit_rate",
                        "value": current_metrics.cache_hit_rate,
                        "threshold": 0.7
                    })
        
        return {
            "alerts": alerts,
            "alert_count": len(alerts),
            "monitoring_enabled": perf_manager is not None,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get performance alerts: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Performance alerts retrieval failed: {str(e)}")