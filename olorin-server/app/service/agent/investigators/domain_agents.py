"""
Domain Agents - Specialized investigation agents for different analysis domains.

This module contains the individual agent execution functions for network, 
location, device, logs, and risk analysis.
"""

import json
import logging
from datetime import datetime

from langchain_core.messages import AIMessage, MessagesState

from app.service.device_analysis_service import DeviceAnalysisService
from app.service.location_analysis_service import LocationAnalysisService
from app.service.logs_analysis_service import LogsAnalysisService
from app.service.network_analysis_service import NetworkAnalysisService
from app.service.risk_assessment_analysis_service import RiskAssessmentAnalysisService
from app.service.websocket_manager import AgentPhase, websocket_manager
from app.service.agent.ato_agents.location_data_agent.client import LocationDataClient
from app.service.agent.tools.vector_search_tool.vector_search_tool import VectorSearchTool
from app.service.agent.core import (
    get_config_value, rehydrate_agent_context, validate_agent_context,
    extract_metadata, get_investigation_params, create_standard_error_response,
    log_agent_execution
)

logger = logging.getLogger(__name__)


async def network_agent(state: MessagesState, config) -> dict:
    """Execute network analysis for fraud investigation."""
    agent_context = rehydrate_agent_context(get_config_value(config, ["configurable", "agent_context"]))
    
    if not validate_agent_context(agent_context):
        return create_standard_error_response("network_agent", "Missing agent context")
    
    metadata = extract_metadata(agent_context)
    investigation_id, entity_id, entity_type, time_range = get_investigation_params(metadata)
    
    if not investigation_id or not entity_id:
        return create_standard_error_response("network_agent", "Missing required fields")
    
    log_agent_execution("network_agent", investigation_id, entity_id, "start")
    
    # Progress update
    await websocket_manager.broadcast_progress(
        investigation_id, AgentPhase.NETWORK_ANALYSIS, 0.1, "Starting network analysis..."
    )
    
    # Execute analysis
    request = get_config_value(config, ["configurable", "request"])
    service = NetworkAnalysisService()
    result = await service.analyze_network(
        entity_id=entity_id, entity_type="user_id", request=request,
        investigation_id=investigation_id, time_range=time_range
    )
    
    # Broadcast results
    await websocket_manager.broadcast_agent_result(
        investigation_id, AgentPhase.NETWORK_ANALYSIS, result,
        "Network analysis completed with risk assessment"
    )
    
    log_agent_execution("network_agent", investigation_id, entity_id, "complete")
    return {"messages": [AIMessage(content=json.dumps(result))]}


async def location_agent(state: MessagesState, config) -> dict:
    """Execute location analysis for fraud investigation."""
    agent_context = rehydrate_agent_context(get_config_value(config, ["configurable", "agent_context"]))
    
    if not validate_agent_context(agent_context):
        return create_standard_error_response("location_agent", "Missing agent context", "location_risk_assessment")
    
    metadata = extract_metadata(agent_context)
    investigation_id, entity_id, entity_type, time_range = get_investigation_params(metadata)
    
    log_agent_execution("location_agent", investigation_id, entity_id, "start")
    
    await websocket_manager.broadcast_progress(
        investigation_id, AgentPhase.LOCATION_ANALYSIS, 0.1, "Starting location analysis..."
    )
    
    request = get_config_value(config, ["configurable", "request"])
    location_data_client = LocationDataClient()
    vector_search_tool = VectorSearchTool()
    service = LocationAnalysisService(location_data_client, vector_search_tool)
    result = await service.analyze_location(
        entity_id=entity_id, entity_type="user_id", request=request,
        investigation_id=investigation_id, time_range=time_range
    )
    
    await websocket_manager.broadcast_agent_result(
        investigation_id, AgentPhase.LOCATION_ANALYSIS, result,
        "Location analysis completed with geographic risk assessment"
    )
    
    log_agent_execution("location_agent", investigation_id, entity_id, "complete")
    return {"messages": [AIMessage(content=json.dumps(result))]}


async def logs_agent(state: MessagesState, config) -> dict:
    """Execute logs analysis for fraud investigation."""
    agent_context = rehydrate_agent_context(get_config_value(config, ["configurable", "agent_context"]))
    
    if not validate_agent_context(agent_context):
        return create_standard_error_response("logs_agent", "Missing agent context")
    
    metadata = extract_metadata(agent_context)
    investigation_id, entity_id, entity_type, time_range = get_investigation_params(metadata)
    
    log_agent_execution("logs_agent", investigation_id, entity_id, "start")
    
    await websocket_manager.broadcast_progress(
        investigation_id, AgentPhase.BEHAVIOR_ANALYSIS, 0.1, "Starting logs analysis..."
    )
    
    request = get_config_value(config, ["configurable", "request"])
    service = LogsAnalysisService()
    result = await service.analyze_logs(
        entity_id=entity_id, entity_type="user_id", request=request,
        investigation_id=investigation_id, time_range=time_range
    )
    
    await websocket_manager.broadcast_agent_result(
        investigation_id, AgentPhase.BEHAVIOR_ANALYSIS, result,
        "Logs analysis completed with behavioral risk assessment"
    )
    
    log_agent_execution("logs_agent", investigation_id, entity_id, "complete")
    return {"messages": [AIMessage(content=json.dumps(result))]}


async def device_agent(state: MessagesState, config) -> dict:
    """Execute device analysis for fraud investigation."""
    agent_context = rehydrate_agent_context(get_config_value(config, ["configurable", "agent_context"]))
    
    if not validate_agent_context(agent_context):
        return create_standard_error_response("device_agent", "Missing agent context", "llm_assessment")
    
    metadata = extract_metadata(agent_context)
    investigation_id, entity_id, entity_type, time_range = get_investigation_params(metadata)
    
    log_agent_execution("device_agent", investigation_id, entity_id, "start")
    
    await websocket_manager.broadcast_progress(
        investigation_id, AgentPhase.DEVICE_ANALYSIS, 0.1, "Starting device analysis..."
    )
    
    request = get_config_value(config, ["configurable", "request"])
    service = DeviceAnalysisService()
    result = await service.analyze_device(
        entity_id=entity_id, entity_type="user_id", investigation_id=investigation_id,
        time_range=time_range, request=request
    )
    
    await websocket_manager.broadcast_agent_result(
        investigation_id, AgentPhase.DEVICE_ANALYSIS, result,
        "Device analysis completed with device risk assessment"
    )
    
    log_agent_execution("device_agent", investigation_id, entity_id, "complete")
    return {"messages": [AIMessage(content=json.dumps(result))]}


async def risk_agent(state: MessagesState, config) -> dict:
    """Execute final risk assessment for fraud investigation."""
    agent_context = rehydrate_agent_context(get_config_value(config, ["configurable", "agent_context"]))
    
    if not validate_agent_context(agent_context):
        return create_standard_error_response("risk_agent", "Missing agent context")
    
    metadata = extract_metadata(agent_context)
    investigation_id, entity_id, entity_type, _ = get_investigation_params(metadata)
    
    log_agent_execution("risk_agent", investigation_id, entity_id, "start")
    
    await websocket_manager.broadcast_progress(
        investigation_id, AgentPhase.RISK_ASSESSMENT, 0.1, "Starting final risk assessment..."
    )
    
    request = get_config_value(config, ["configurable", "request"])
    service = RiskAssessmentAnalysisService()
    result = await service.assess_risk(
        user_id=entity_id, request=request, investigation_id=investigation_id
    )
    
    await websocket_manager.broadcast_agent_result(
        investigation_id, AgentPhase.COMPLETED, result,
        "Investigation completed successfully with final risk assessment"
    )
    
    log_agent_execution("risk_agent", investigation_id, entity_id, "complete")
    return {"messages": [AIMessage(content=json.dumps(result))]}