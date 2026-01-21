"""
Prompt Optimizer
Feature: 026-llm-training-pipeline

Automatically refines prompts based on feedback from misclassifications.
Supports version rollback on performance degradation.
"""

import os
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional

from langchain_core.messages import HumanMessage, SystemMessage

from app.service.llm_manager import get_llm_manager
from app.service.logging import get_bridge_logger
from app.service.training.feedback_collector import FeedbackEntry, get_feedback_collector
from app.service.training.prompt_registry import PromptTemplate, get_prompt_registry
from app.service.training.training_config_loader import get_training_config

logger = get_bridge_logger(__name__)


@dataclass
class OptimizationResult:
    """Result of prompt optimization attempt."""

    success: bool
    new_version: Optional[str] = None
    old_version: str = ""
    improvement: float = 0.0
    changes_made: Optional[str] = None
    error: Optional[str] = None


class PromptOptimizer:
    """Optimizes prompts based on feedback from misclassifications."""

    def __init__(self):
        """Initialize prompt optimizer."""
        self._config = get_training_config()
        self._prompt_registry = get_prompt_registry()
        self._feedback_collector = get_feedback_collector()
        self._llm_manager = get_llm_manager()
        self._load_optimizer_config()

    def _load_optimizer_config(self) -> None:
        """Load optimizer-specific configuration."""
        self._auto_optimize = os.getenv(
            "LLM_FEEDBACK_AUTO_OPTIMIZE", "true"
        ).lower() == "true"
        self._improvement_threshold = float(
            os.getenv("LLM_FEEDBACK_IMPROVEMENT_THRESHOLD", "0.02")
        )
        self._degradation_threshold = float(
            os.getenv("LLM_FEEDBACK_DEGRADATION_THRESHOLD", "0.10")
        )
        self._auto_rollback = os.getenv(
            "LLM_FEEDBACK_AUTO_ROLLBACK", "true"
        ).lower() == "true"

    def is_auto_optimize_enabled(self) -> bool:
        """Check if auto optimization is enabled."""
        return self._auto_optimize

    async def optimize_prompt(
        self,
        false_positives: List[FeedbackEntry],
        false_negatives: List[FeedbackEntry],
    ) -> OptimizationResult:
        """
        Optimize the current prompt based on misclassification feedback.

        Args:
            false_positives: List of false positive entries
            false_negatives: List of false negative entries

        Returns:
            OptimizationResult with new version if successful
        """
        current_version = self._prompt_registry.get_active_version()
        current_template = self._prompt_registry.get_prompt_template(current_version)

        try:
            suggestions = await self._get_optimization_suggestions(
                current_template, false_positives, false_negatives
            )

            if not suggestions:
                return OptimizationResult(
                    success=False,
                    old_version=current_version,
                    error="No optimization suggestions generated",
                )

            new_template = self._apply_suggestions(current_template, suggestions)
            description = self._generate_version_description(
                false_positives, false_negatives, suggestions
            )
            new_version = self._prompt_registry.save_new_version(
                new_template, description
            )

            return OptimizationResult(
                success=True,
                new_version=new_version,
                old_version=current_version,
                changes_made=suggestions.get("summary", "Prompt optimized"),
            )

        except Exception as e:
            logger.error(f"Prompt optimization failed: {e}")
            return OptimizationResult(
                success=False, old_version=current_version, error=str(e)
            )

    async def _get_optimization_suggestions(
        self,
        template: PromptTemplate,
        false_positives: List[FeedbackEntry],
        false_negatives: List[FeedbackEntry],
    ) -> Optional[Dict[str, Any]]:
        """Get optimization suggestions from LLM analysis."""
        fp_examples = self._format_examples(false_positives[:5])
        fn_examples = self._format_examples(false_negatives[:5])

        optimization_prompt = f"""
You are a prompt engineering expert. Analyze the following fraud detection prompt
and the misclassification examples to suggest improvements.

## Current System Prompt:
{template.system_prompt[:500]}...

## False Positives (predicted fraud but was legitimate):
{fp_examples}

## False Negatives (predicted legitimate but was fraud):
{fn_examples}

Based on these patterns, suggest specific improvements to the prompt.
Return your suggestions as JSON:
```json
{{
    "summary": "<brief summary of changes>",
    "system_prompt_additions": "<additional instructions to add>",
    "threshold_suggestion": <suggested fraud threshold adjustment or null>,
    "emphasis_changes": [<list of features to emphasize more/less>],
    "reasoning_improvements": "<how to improve reasoning quality>"
}}
```
"""

        messages = [
            SystemMessage(content="You are a prompt engineering expert."),
            HumanMessage(content=optimization_prompt),
        ]

        result = await self._llm_manager.invoke_with_verification(
            messages, verify=False
        )

        if "error" in result:
            logger.error(f"LLM optimization error: {result['error']}")
            return None

        return self._parse_suggestions(result.get("response", ""))

    def _format_examples(self, entries: List[FeedbackEntry]) -> str:
        """Format feedback entries as examples."""
        if not entries:
            return "No examples available"

        lines = []
        for entry in entries:
            lines.append(
                f"- Entity: {entry.entity_type}={entry.entity_value[:20]}..., "
                f"Score: {entry.risk_score:.2f}, "
                f"Reasoning: {entry.reasoning[:100]}..."
            )
        return "\n".join(lines)

    def _parse_suggestions(self, response: str) -> Optional[Dict[str, Any]]:
        """Parse optimization suggestions from LLM response."""
        import json
        import re

        json_match = re.search(r"```json\s*([\s\S]*?)\s*```", response)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass

        json_match = re.search(r"\{[\s\S]*\}", response)
        if json_match:
            try:
                return json.loads(json_match.group(0))
            except json.JSONDecodeError:
                pass

        return None

    def _apply_suggestions(
        self, template: PromptTemplate, suggestions: Dict[str, Any]
    ) -> PromptTemplate:
        """Apply optimization suggestions to create new template."""
        new_system_prompt = template.system_prompt

        if suggestions.get("system_prompt_additions"):
            new_system_prompt = (
                template.system_prompt + "\n\n" + suggestions["system_prompt_additions"]
            )

        return PromptTemplate(
            version="optimized",
            system_prompt=new_system_prompt,
            fraud_analysis_prompt=template.fraud_analysis_prompt,
            fraud_indicators_template=template.fraud_indicators_template,
            velocity_analysis_template=template.velocity_analysis_template,
            geographic_analysis_template=template.geographic_analysis_template,
            device_analysis_template=template.device_analysis_template,
            historical_patterns_template=template.historical_patterns_template,
            batch_analysis_prompt=template.batch_analysis_prompt,
            feedback_analysis_prompt=template.feedback_analysis_prompt,
        )

    def _generate_version_description(
        self,
        false_positives: List[FeedbackEntry],
        false_negatives: List[FeedbackEntry],
        suggestions: Dict[str, Any],
    ) -> str:
        """Generate description for new version."""
        return (
            f"Optimized based on {len(false_positives)} FP and "
            f"{len(false_negatives)} FN. {suggestions.get('summary', '')}"
        )

    def check_for_degradation(
        self,
        current_metrics: Dict[str, float],
        previous_metrics: Dict[str, float],
    ) -> bool:
        """Check if current metrics show degradation vs previous."""
        f1_current = current_metrics.get("f1_score", 0)
        f1_previous = previous_metrics.get("f1_score", 0)

        degradation = (f1_previous - f1_current) / max(f1_previous, 0.01)

        if degradation > self._degradation_threshold:
            logger.warning(
                f"Performance degradation detected: "
                f"F1 dropped from {f1_previous:.3f} to {f1_current:.3f}"
            )
            return True

        return False

    def rollback_to_previous(self, target_version: Optional[str] = None) -> bool:
        """
        Rollback to a previous prompt version.

        Args:
            target_version: Specific version to rollback to, or previous if None

        Returns:
            True if rollback successful
        """
        if not self._auto_rollback:
            logger.warning("Auto rollback is disabled")
            return False

        versions = self._prompt_registry.list_versions()
        if len(versions) < 2:
            logger.warning("No previous versions available for rollback")
            return False

        sorted_versions = sorted(
            versions, key=lambda v: v.version, reverse=True
        )

        if target_version:
            target = target_version
        else:
            current = self._prompt_registry.get_active_version()
            for v in sorted_versions:
                if v.version != current:
                    target = v.version
                    break
            else:
                logger.warning("No rollback target found")
                return False

        self._prompt_registry.set_active_version(target)
        logger.info(f"Rolled back to prompt version: {target}")
        return True


_prompt_optimizer: Optional[PromptOptimizer] = None


def get_prompt_optimizer() -> PromptOptimizer:
    """Get cached prompt optimizer instance."""
    global _prompt_optimizer
    if _prompt_optimizer is None:
        _prompt_optimizer = PromptOptimizer()
    return _prompt_optimizer
