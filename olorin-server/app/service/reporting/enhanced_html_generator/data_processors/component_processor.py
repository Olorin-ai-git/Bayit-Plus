#!/usr/bin/env python3
"""
Component data processing module.

@deprecated This module is a legacy wrapper. Use the specialized processors directly:
- component_processor_llm: LLMInteractionProcessor
- component_processor_tools: ToolsUsageProcessor
- component_processor_risk: RiskAnalysisProcessor
- component_processor_flow: InvestigationFlowProcessor
- component_processor_explanations: ExplanationsProcessor
- component_processor_langgraph: LangGraphNodesProcessor
"""

import logging
from typing import Any, Dict, List

from ..data_models import ComponentData, ExtractedData
from .component_processor_explanations import ExplanationsProcessor
from .component_processor_flow import InvestigationFlowProcessor
from .component_processor_langgraph import LangGraphNodesProcessor
from .component_processor_llm import LLMInteractionProcessor
from .component_processor_risk import RiskAnalysisProcessor
from .component_processor_tools import ToolsUsageProcessor

logger = logging.getLogger(__name__)


class ComponentDataProcessor:
    """
    Processes extracted data into component-specific data structures.

    @deprecated Use the specialized processor classes directly for better modularity.
    """

    def process_component_data(self, extracted_data: ExtractedData) -> ComponentData:
        """
        Process extracted data into component-specific data structures.

        Args:
            extracted_data: Raw extracted data from investigation files

        Returns:
            Processed component data ready for visualization
        """
        activities = extracted_data.structured_activities

        # Process using specialized processors
        llm_interactions = LLMInteractionProcessor.process_llm_interactions(activities)
        tools_analysis = ToolsUsageProcessor.process_tools_analysis(activities)
        agents_used, risk_scores = RiskAnalysisProcessor.collect_agents_and_risk(
            activities
        )
        investigation_flow = InvestigationFlowProcessor.build_investigation_flow(
            activities
        )
        risk_categories = RiskAnalysisProcessor.analyze_risk_categories(activities)
        explanations = ExplanationsProcessor.extract_explanations(activities)
        langgraph_nodes = LangGraphNodesProcessor.process_langgraph_nodes(activities)

        # Assemble risk analysis
        risk_analysis = {
            "risk_scores": risk_scores,
            "final_risk_score": risk_scores[-1] if risk_scores else None,
            "risk_categories": risk_categories,
            "risk_progression": risk_scores,
        }

        return ComponentData(
            llm_interactions=llm_interactions,
            investigation_flow=investigation_flow,
            tools_analysis=dict(tools_analysis),
            risk_analysis=risk_analysis,
            explanations=explanations,
            journey_data=extracted_data.journey_tracking,
            langgraph_nodes=langgraph_nodes,
        )

    # Legacy method wrappers for backwards compatibility
    def _process_llm_interactions(
        self, activities: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """@deprecated Use LLMInteractionProcessor.process_llm_interactions()"""
        return LLMInteractionProcessor.process_llm_interactions(activities)

    def _process_tools_analysis(self, activities: List[Dict[str, Any]]):
        """@deprecated Use ToolsUsageProcessor.process_tools_analysis()"""
        return ToolsUsageProcessor.process_tools_analysis(activities)

    def _collect_agents_and_risk(self, activities: List[Dict[str, Any]]):
        """@deprecated Use RiskAnalysisProcessor.collect_agents_and_risk()"""
        return RiskAnalysisProcessor.collect_agents_and_risk(activities)

    def _build_investigation_flow(self, activities: List[Dict[str, Any]]):
        """@deprecated Use InvestigationFlowProcessor.build_investigation_flow()"""
        return InvestigationFlowProcessor.build_investigation_flow(activities)

    def _analyze_risk_categories(self, activities: List[Dict[str, Any]]):
        """@deprecated Use RiskAnalysisProcessor.analyze_risk_categories()"""
        return RiskAnalysisProcessor.analyze_risk_categories(activities)

    def _extract_explanations(self, activities: List[Dict[str, Any]]):
        """@deprecated Use ExplanationsProcessor.extract_explanations()"""
        return ExplanationsProcessor.extract_explanations(activities)

    def _process_langgraph_nodes(self, activities: List[Dict[str, Any]]):
        """@deprecated Use LangGraphNodesProcessor.process_langgraph_nodes()"""
        return LangGraphNodesProcessor.process_langgraph_nodes(activities)
