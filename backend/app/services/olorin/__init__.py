"""
Olorin.ai Platform Services

This module provides AI capabilities for third-party content providers:
- Realtime Dubbing: Hebrew→English/Spanish audio dubbing with <2s latency
- Semantic Search: Vector-based content search with timestamp deep-linking
- Cultural Context: Israeli/Jewish cultural reference detection and explanation
- Recap Agent: Real-time summaries for late-joiners to live broadcasts
"""

from app.services.olorin.partner_service import PartnerService, partner_service
from app.services.olorin.metering_service import MeteringService, metering_service
from app.services.olorin.realtime_dubbing_service import RealtimeDubbingService
from app.services.olorin.vector_search_service import VectorSearchService, vector_search_service
from app.services.olorin.cultural_context_service import (
    CulturalContextService,
    cultural_context_service,
)
from app.services.olorin.recap_agent_service import RecapAgentService, recap_agent_service

__all__ = [
    # Partner management
    "PartnerService",
    "partner_service",
    # Usage metering
    "MeteringService",
    "metering_service",
    # Realtime dubbing
    "RealtimeDubbingService",
    # Semantic search
    "VectorSearchService",
    "vector_search_service",
    # Cultural context
    "CulturalContextService",
    "cultural_context_service",
    # Recap agent
    "RecapAgentService",
    "recap_agent_service",
]
