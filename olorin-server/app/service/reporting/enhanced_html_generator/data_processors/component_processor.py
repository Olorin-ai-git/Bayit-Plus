#!/usr/bin/env python3
"""
Component data processing module.

<<<<<<< HEAD
Processes extracted data into component-specific data structures.
=======
@deprecated This module is a legacy wrapper. Use the specialized processors directly:
- component_processor_llm: LLMInteractionProcessor
- component_processor_tools: ToolsUsageProcessor
- component_processor_risk: RiskAnalysisProcessor
- component_processor_flow: InvestigationFlowProcessor
- component_processor_explanations: ExplanationsProcessor
- component_processor_langgraph: LangGraphNodesProcessor
>>>>>>> 001-modify-analyzer-method
"""

import logging
from typing import Dict, List, Any
<<<<<<< HEAD
from collections import defaultdict, Counter

from ..data_models import ExtractedData, ComponentData
=======

from ..data_models import ExtractedData, ComponentData
from .component_processor_llm import LLMInteractionProcessor
from .component_processor_tools import ToolsUsageProcessor
from .component_processor_risk import RiskAnalysisProcessor
from .component_processor_flow import InvestigationFlowProcessor
from .component_processor_explanations import ExplanationsProcessor
from .component_processor_langgraph import LangGraphNodesProcessor
>>>>>>> 001-modify-analyzer-method

logger = logging.getLogger(__name__)


class ComponentDataProcessor:
<<<<<<< HEAD
    """Processes extracted data into component-specific data structures."""
=======
    """
    Processes extracted data into component-specific data structures.

    @deprecated Use the specialized processor classes directly for better modularity.
    """
>>>>>>> 001-modify-analyzer-method

    def process_component_data(self, extracted_data: ExtractedData) -> ComponentData:
        """
        Process extracted data into component-specific data structures.

        Args:
            extracted_data: Raw extracted data from investigation files

        Returns:
            Processed component data ready for visualization
        """
<<<<<<< HEAD
        activities = extracted_data.autonomous_activities

        # Process LLM interactions
        llm_interactions = self._process_llm_interactions(activities)

        # Process tools analysis
        tools_analysis = self._process_tools_analysis(activities)

        # Collect agents and risk data
        agents_used, risk_scores = self._collect_agents_and_risk(activities)

        # Process investigation flow
        investigation_flow = self._build_investigation_flow(activities)

        # Process risk analysis
        risk_analysis = {
            'risk_scores': risk_scores,
            'final_risk_score': risk_scores[-1] if risk_scores else None,
            'risk_categories': self._analyze_risk_categories(activities),
            'risk_progression': risk_scores
        }

        # Process explanations
        explanations = self._extract_explanations(activities)

        # Process LangGraph nodes
        langgraph_nodes = self._process_langgraph_nodes(activities)

=======
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

>>>>>>> 001-modify-analyzer-method
        return ComponentData(
            llm_interactions=llm_interactions,
            investigation_flow=investigation_flow,
            tools_analysis=dict(tools_analysis),
            risk_analysis=risk_analysis,
            explanations=explanations,
            journey_data=extracted_data.journey_tracking,
<<<<<<< HEAD
            langgraph_nodes=langgraph_nodes
        )

    def _process_llm_interactions(self, activities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process LLM interactions from activities."""
        llm_interactions = []

        for activity in activities:
            if activity.get('interaction_type') == 'llm_call':
                data = activity.get('data', {})
                llm_interactions.append({
                    'timestamp': data.get('timestamp'),
                    'agent_name': data.get('agent_name'),
                    'model_name': data.get('model_name'),
                    'tokens_used': data.get('tokens_used', {}),
                    'tools_used': data.get('tools_used', []),
                    'reasoning_chain': data.get('reasoning_chain', ''),
                    'response_time_ms': data.get('response_time_ms', 0),
                    'request_content': data.get('request_content', ''),
                    'response_content': data.get('response_content', '')
                })

        return llm_interactions

    def _process_tools_analysis(self, activities: List[Dict[str, Any]]) -> Counter:
        """Process tools usage analysis from activities."""
        tools_counter = Counter()

        for activity in activities:
            if activity.get('interaction_type') == 'tool_call':
                tool_name = activity.get('data', {}).get('tool_name')
                if tool_name:
                    tools_counter[tool_name] += 1

            # Also count tools used in LLM calls
            elif activity.get('interaction_type') == 'llm_call':
                tools_used = activity.get('data', {}).get('tools_used', [])
                for tool in tools_used:
                    tools_counter[tool] += 1

        return tools_counter

    def _collect_agents_and_risk(self, activities: List[Dict[str, Any]]) -> tuple[List[str], List[float]]:
        """Collect unique agents used and risk scores."""
        agents_used = set()
        risk_scores = []

        for activity in activities:
            data = activity.get('data', {})

            # Collect agent names
            agent_name = data.get('agent_name')
            if agent_name:
                agents_used.add(agent_name)

            # Collect risk scores
            risk_score = data.get('risk_score')
            if risk_score is not None:
                try:
                    risk_scores.append(float(risk_score))
                except (ValueError, TypeError):
                    pass

        return list(agents_used), risk_scores

    def _build_investigation_flow(self, activities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Build investigation flow from activities."""
        flow_phases = []
        current_phase = None

        for activity in activities:
            data = activity.get('data', {})
            phase = data.get('phase') or data.get('stage')

            if phase and phase != current_phase:
                flow_phases.append({
                    'from_phase': current_phase,
                    'to_phase': phase,
                    'timestamp': data.get('timestamp'),
                    'agent': data.get('agent_name')
                })
                current_phase = phase

        return flow_phases

    def _analyze_risk_categories(self, activities: List[Dict[str, Any]]) -> Dict[str, float]:
        """Analyze risk by different categories."""
        risk_categories = defaultdict(list)

        for activity in activities:
            data = activity.get('data', {})
            risk_score = data.get('risk_score')
            category = data.get('category') or data.get('domain') or 'general'

            if risk_score is not None:
                try:
                    risk_categories[category].append(float(risk_score))
                except (ValueError, TypeError):
                    pass

        # Calculate average risk for each category
        avg_risks = {}
        for category, scores in risk_categories.items():
            if scores:
                avg_risks[category] = sum(scores) / len(scores)

        return avg_risks

    def _extract_explanations(self, activities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract explanations and reasoning from activities."""
        explanations = []

        for activity in activities:
            data = activity.get('data', {})
            explanation = data.get('explanation') or data.get('reasoning_chain')

            if explanation:
                explanations.append({
                    'timestamp': data.get('timestamp'),
                    'agent': data.get('agent_name'),
                    'explanation': explanation,
                    'category': data.get('category', 'general')
                })

        return explanations

    def _process_langgraph_nodes(self, activities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process LangGraph node information."""
        nodes = []

        for activity in activities:
            if activity.get('interaction_type') == 'node_execution':
                data = activity.get('data', {})
                nodes.append({
                    'node_name': data.get('node_name'),
                    'timestamp': data.get('timestamp'),
                    'execution_time_ms': data.get('execution_time_ms'),
                    'status': data.get('status', 'completed'),
                    'inputs': data.get('inputs', {}),
                    'outputs': data.get('outputs', {})
                })

        return nodes
=======
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
>>>>>>> 001-modify-analyzer-method
