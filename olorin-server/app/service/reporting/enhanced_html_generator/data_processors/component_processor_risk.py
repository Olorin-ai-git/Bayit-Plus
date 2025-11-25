#!/usr/bin/env python3
"""
Risk Analysis Processor for Enhanced HTML Report Generator.

Processes risk scores, agents, and risk categories from investigation activities.
"""

from collections import defaultdict
from typing import Any, Dict, List


class RiskAnalysisProcessor:
    """Processes risk analysis data including agents and risk categories."""

    @staticmethod
    def collect_agents_and_risk(
        activities: List[Dict[str, Any]],
    ) -> tuple[List[str], List[float]]:
        """Collect unique agents used and risk scores."""
        agents_used = set()
        risk_scores = []

        for activity in activities:
            data = activity.get("data", {})

            # Collect agent names
            agent_name = data.get("agent_name")
            if agent_name:
                agents_used.add(agent_name)

            # Collect risk scores
            risk_score = data.get("risk_score")
            if risk_score is not None:
                try:
                    risk_scores.append(float(risk_score))
                except (ValueError, TypeError):
                    pass

        return list(agents_used), risk_scores

    @staticmethod
    def analyze_risk_categories(activities: List[Dict[str, Any]]) -> Dict[str, float]:
        """Analyze risk by different categories."""
        risk_categories = defaultdict(list)

        for activity in activities:
            data = activity.get("data", {})
            risk_score = data.get("risk_score")
            category = data.get("category") or data.get("domain") or "general"

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
