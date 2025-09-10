#!/usr/bin/env python3
"""
Iterative Improver

Handles retry logic and iterative improvement of LLM responses
based on verification feedback with intelligent feedback generation.

Author: Gil Klainert
Date: 2025-01-10
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage

from .verification_config import VerificationConfig, get_verification_config

logger = logging.getLogger(__name__)


class ImprovementStrategy(Enum):
    """Different strategies for improving responses."""
    SPECIFIC_FEEDBACK = "specific_feedback"
    CLARIFY_REQUIREMENTS = "clarify_requirements"
    ENHANCE_CONTEXT = "enhance_context"
    RESTRUCTURE_RESPONSE = "restructure_response"
    SIMPLIFY_LANGUAGE = "simplify_language"
    ADD_EXAMPLES = "add_examples"


@dataclass
class ImprovementSuggestion:
    """Specific improvement suggestion from verification."""
    strategy: ImprovementStrategy
    description: str
    priority: int  # 1 = highest priority
    example: Optional[str] = None


@dataclass
class IterationContext:
    """Context for tracking iteration attempts."""
    original_request: List[BaseMessage]
    original_response: str
    verification_history: List[Dict[str, Any]]
    improvement_attempts: List[str]
    failed_strategies: List[ImprovementStrategy]
    context: Dict[str, Any]


class IterativeImprover:
    """
    Manages iterative improvement of LLM responses based on verification feedback.
    
    Features:
    - Intelligent feedback generation from verification results
    - Multiple improvement strategies
    - Learning from failed attempts
    - Context-aware prompt enhancement
    - Exponential backoff for retries
    """
    
    def __init__(self, config: Optional[VerificationConfig] = None):
        """Initialize iterative improver."""
        self.config = config or get_verification_config()
        
        # Strategy effectiveness tracking
        self.strategy_effectiveness = {
            strategy: {'successes': 0, 'failures': 0, 'avg_confidence_improvement': 0.0}
            for strategy in ImprovementStrategy
        }
        
        logger.info("🔄 Iterative improver initialized")
    
    def analyze_verification_failure(
        self,
        verification_result: Dict[str, Any],
        context: Dict[str, Any] = None
    ) -> List[ImprovementSuggestion]:
        """
        Analyze verification failure and generate improvement suggestions.
        
        Args:
            verification_result: Failed verification result
            context: Additional context for analysis
            
        Returns:
            List of improvement suggestions ordered by priority
        """
        suggestions = []
        issues = verification_result.get('issues', [])
        explanation = verification_result.get('explanation', '')
        confidence_score = verification_result.get('confidence_score', 0.0)
        
        # Analyze specific issues and generate targeted suggestions
        for issue in issues:
            suggestions.extend(self._generate_suggestions_for_issue(issue, context))
        
        # Analyze explanation for additional insights
        if explanation:
            suggestions.extend(self._generate_suggestions_from_explanation(explanation, context))
        
        # Add generic suggestions based on confidence score
        if confidence_score < 0.3:
            suggestions.append(ImprovementSuggestion(
                strategy=ImprovementStrategy.CLARIFY_REQUIREMENTS,
                description="Very low confidence - clarify original requirements",
                priority=1,
                example="Please restate the original request more clearly and provide specific examples"
            ))
        elif confidence_score < 0.6:
            suggestions.append(ImprovementSuggestion(
                strategy=ImprovementStrategy.ENHANCE_CONTEXT,
                description="Moderate confidence - enhance context and specificity",
                priority=2,
                example="Add more context about the expected output format and constraints"
            ))
        
        # Sort by priority and remove duplicates
        unique_suggestions = self._deduplicate_suggestions(suggestions)
        return sorted(unique_suggestions, key=lambda s: s.priority)
    
    def _generate_suggestions_for_issue(
        self,
        issue: str,
        context: Dict[str, Any] = None
    ) -> List[ImprovementSuggestion]:
        """Generate specific suggestions for a particular issue."""
        suggestions = []
        issue_lower = issue.lower()
        
        if any(keyword in issue_lower for keyword in ['incomplete', 'missing', 'lacks']):
            suggestions.append(ImprovementSuggestion(
                strategy=ImprovementStrategy.ENHANCE_CONTEXT,
                description=f"Address incomplete response: {issue}",
                priority=1,
                example="Provide complete information addressing all aspects of the request"
            ))
        
        elif any(keyword in issue_lower for keyword in ['unclear', 'confusing', 'ambiguous']):
            suggestions.append(ImprovementSuggestion(
                strategy=ImprovementStrategy.CLARIFY_REQUIREMENTS,
                description=f"Clarify unclear aspects: {issue}",
                priority=2,
                example="Restructure response to be more clear and specific"
            ))
        
        elif any(keyword in issue_lower for keyword in ['format', 'structure', 'organization']):
            suggestions.append(ImprovementSuggestion(
                strategy=ImprovementStrategy.RESTRUCTURE_RESPONSE,
                description=f"Improve response structure: {issue}",
                priority=2,
                example="Reorganize response with clear headings and logical flow"
            ))
        
        elif any(keyword in issue_lower for keyword in ['complex', 'difficult', 'technical']):
            suggestions.append(ImprovementSuggestion(
                strategy=ImprovementStrategy.SIMPLIFY_LANGUAGE,
                description=f"Simplify language: {issue}",
                priority=3,
                example="Use simpler language and explain technical terms"
            ))
        
        elif any(keyword in issue_lower for keyword in ['example', 'demonstration', 'illustration']):
            suggestions.append(ImprovementSuggestion(
                strategy=ImprovementStrategy.ADD_EXAMPLES,
                description=f"Add examples: {issue}",
                priority=3,
                example="Include specific examples to illustrate key points"
            ))
        
        return suggestions
    
    def _generate_suggestions_from_explanation(
        self,
        explanation: str,
        context: Dict[str, Any] = None
    ) -> List[ImprovementSuggestion]:
        """Generate suggestions from verification explanation."""
        suggestions = []
        explanation_lower = explanation.lower()
        
        # Pattern matching on explanation content
        if 'does not address' in explanation_lower or 'ignores' in explanation_lower:
            suggestions.append(ImprovementSuggestion(
                strategy=ImprovementStrategy.SPECIFIC_FEEDBACK,
                description="Response doesn't address the original request",
                priority=1,
                example="Directly address all aspects of the original request"
            ))
        
        if 'too brief' in explanation_lower or 'insufficient detail' in explanation_lower:
            suggestions.append(ImprovementSuggestion(
                strategy=ImprovementStrategy.ENHANCE_CONTEXT,
                description="Response lacks sufficient detail",
                priority=2,
                example="Provide more comprehensive and detailed information"
            ))
        
        if 'wrong format' in explanation_lower or 'format mismatch' in explanation_lower:
            suggestions.append(ImprovementSuggestion(
                strategy=ImprovementStrategy.RESTRUCTURE_RESPONSE,
                description="Response format doesn't match requirements",
                priority=1,
                example="Follow the exact format specified in the original request"
            ))
        
        return suggestions
    
    def _deduplicate_suggestions(
        self,
        suggestions: List[ImprovementSuggestion]
    ) -> List[ImprovementSuggestion]:
        """Remove duplicate suggestions based on strategy and description."""
        seen = set()
        unique_suggestions = []
        
        for suggestion in suggestions:
            key = (suggestion.strategy, suggestion.description)
            if key not in seen:
                seen.add(key)
                unique_suggestions.append(suggestion)
        
        return unique_suggestions
    
    def create_improvement_request(
        self,
        iteration_context: IterationContext,
        suggestions: List[ImprovementSuggestion],
        current_attempt: int
    ) -> List[BaseMessage]:
        """
        Create an improved request based on verification feedback.
        
        Args:
            iteration_context: Context from previous iterations
            suggestions: Improvement suggestions from verification
            current_attempt: Current retry attempt number
            
        Returns:
            Enhanced request messages for the main LLM
        """
        # Select best strategy based on effectiveness and context
        selected_strategy = self._select_best_strategy(
            suggestions,
            iteration_context.failed_strategies,
            current_attempt
        )
        
        # Create improvement prompt based on selected strategy
        improvement_prompt = self._create_improvement_prompt(
            selected_strategy,
            iteration_context,
            suggestions,
            current_attempt
        )
        
        # Combine original request with improvement guidance
        enhanced_messages = []
        
        # Add enhanced system message
        system_content = self._create_enhanced_system_message(
            selected_strategy,
            iteration_context,
            current_attempt
        )
        enhanced_messages.append(SystemMessage(content=system_content))
        
        # Add original user messages with context
        for message in iteration_context.original_request:
            if isinstance(message, SystemMessage):
                # Skip original system message as we've replaced it
                continue
            elif isinstance(message, HumanMessage):
                # Enhance human message with improvement context
                enhanced_content = self._enhance_user_message(
                    message.content,
                    improvement_prompt,
                    iteration_context
                )
                enhanced_messages.append(HumanMessage(content=enhanced_content))
            else:
                # Keep other message types as-is
                enhanced_messages.append(message)
        
        logger.debug(f"🔄 Created improvement request (attempt {current_attempt}, strategy: {selected_strategy.value})")
        
        return enhanced_messages
    
    def _select_best_strategy(
        self,
        suggestions: List[ImprovementSuggestion],
        failed_strategies: List[ImprovementStrategy],
        attempt: int
    ) -> ImprovementStrategy:
        """Select the best improvement strategy based on context and effectiveness."""
        # Filter out failed strategies
        available_suggestions = [
            s for s in suggestions
            if s.strategy not in failed_strategies
        ]
        
        if not available_suggestions:
            # All strategies have failed, try the most effective one again
            most_effective = max(
                ImprovementStrategy,
                key=lambda s: self.strategy_effectiveness[s]['successes']
            )
            return most_effective
        
        # For first attempt, use highest priority suggestion
        if attempt == 1:
            return available_suggestions[0].strategy
        
        # For later attempts, consider effectiveness
        def strategy_score(suggestion: ImprovementSuggestion) -> float:
            stats = self.strategy_effectiveness[suggestion.strategy]
            total_attempts = stats['successes'] + stats['failures']
            
            if total_attempts == 0:
                # Unknown effectiveness, use priority
                return 10.0 / suggestion.priority
            
            # Combine success rate with priority
            success_rate = stats['successes'] / total_attempts
            priority_score = 10.0 / suggestion.priority
            effectiveness_score = success_rate * 10.0
            
            return (priority_score + effectiveness_score) / 2
        
        best_suggestion = max(available_suggestions, key=strategy_score)
        return best_suggestion.strategy
    
    def _create_improvement_prompt(
        self,
        strategy: ImprovementStrategy,
        context: IterationContext,
        suggestions: List[ImprovementSuggestion],
        attempt: int
    ) -> str:
        """Create improvement prompt based on strategy."""
        base_prompt = f"\n\n🔄 IMPROVEMENT REQUIRED (Attempt {attempt}):\n"
        
        # Get relevant suggestions for this strategy
        relevant_suggestions = [s for s in suggestions if s.strategy == strategy]
        
        if strategy == ImprovementStrategy.SPECIFIC_FEEDBACK:
            base_prompt += "Your previous response did not adequately address the original request. Please:\n"
            for suggestion in relevant_suggestions:
                base_prompt += f"- {suggestion.description}\n"
            base_prompt += "\nFocus specifically on what was requested and ensure your response directly addresses each point."
        
        elif strategy == ImprovementStrategy.CLARIFY_REQUIREMENTS:
            base_prompt += "Your previous response was unclear or ambiguous. Please:\n"
            base_prompt += "- Reread the original request carefully\n"
            base_prompt += "- Provide a clear, unambiguous response\n"
            base_prompt += "- Address any potential confusion from the previous attempt\n"
            for suggestion in relevant_suggestions:
                if suggestion.example:
                    base_prompt += f"- {suggestion.example}\n"
        
        elif strategy == ImprovementStrategy.ENHANCE_CONTEXT:
            base_prompt += "Your previous response lacked sufficient context or detail. Please:\n"
            base_prompt += "- Provide more comprehensive information\n"
            base_prompt += "- Add relevant context and background\n"
            base_prompt += "- Ensure completeness in your response\n"
            for suggestion in relevant_suggestions:
                base_prompt += f"- {suggestion.description}\n"
        
        elif strategy == ImprovementStrategy.RESTRUCTURE_RESPONSE:
            base_prompt += "Your previous response had structural or format issues. Please:\n"
            base_prompt += "- Organize your response clearly and logically\n"
            base_prompt += "- Follow any specified format requirements\n"
            base_prompt += "- Use appropriate headings and structure\n"
        
        elif strategy == ImprovementStrategy.SIMPLIFY_LANGUAGE:
            base_prompt += "Your previous response was too complex or technical. Please:\n"
            base_prompt += "- Use simpler, more accessible language\n"
            base_prompt += "- Explain technical terms when necessary\n"
            base_prompt += "- Focus on clarity and readability\n"
        
        elif strategy == ImprovementStrategy.ADD_EXAMPLES:
            base_prompt += "Your previous response would benefit from examples. Please:\n"
            base_prompt += "- Include specific, relevant examples\n"
            base_prompt += "- Use illustrations to clarify key points\n"
            base_prompt += "- Make abstract concepts concrete\n"
        
        # Add verification history context
        if context.verification_history:
            last_verification = context.verification_history[-1]
            explanation = last_verification.get('explanation', '')
            if explanation:
                base_prompt += f"\nSpecific feedback from verification:\n{explanation}\n"
        
        base_prompt += "\n⚠️ This is a retry - please carefully address the issues identified above."
        
        return base_prompt
    
    def _create_enhanced_system_message(
        self,
        strategy: ImprovementStrategy,
        context: IterationContext,
        attempt: int
    ) -> str:
        """Create enhanced system message for improved request."""
        base_system = """You are a helpful AI assistant providing accurate and relevant responses.

IMPORTANT: This is a retry attempt due to verification failure. Your previous response was deemed inadequate.

Please pay careful attention to:
1. Directly addressing the user's request
2. Providing accurate and relevant information
3. Following any specified format requirements
4. Being thorough and complete in your response

"""
        
        # Add strategy-specific guidance
        if strategy == ImprovementStrategy.SPECIFIC_FEEDBACK:
            base_system += "Focus specifically on what was requested. Ensure every part of the user's question is addressed.\n"
        
        elif strategy == ImprovementStrategy.CLARIFY_REQUIREMENTS:
            base_system += "Be extremely clear and unambiguous in your response. Avoid any confusing or unclear language.\n"
        
        elif strategy == ImprovementStrategy.ENHANCE_CONTEXT:
            base_system += "Provide comprehensive, detailed information with sufficient context and background.\n"
        
        elif strategy == ImprovementStrategy.RESTRUCTURE_RESPONSE:
            base_system += "Organize your response with clear structure, proper formatting, and logical flow.\n"
        
        elif strategy == ImprovementStrategy.SIMPLIFY_LANGUAGE:
            base_system += "Use clear, simple language that is easy to understand. Explain technical concepts when needed.\n"
        
        elif strategy == ImprovementStrategy.ADD_EXAMPLES:
            base_system += "Include specific examples and illustrations to make your points clear and concrete.\n"
        
        base_system += f"\nThis is attempt #{attempt}. Previous attempts have failed verification. Take extra care to meet the requirements."
        
        return base_system
    
    def _enhance_user_message(
        self,
        original_content: str,
        improvement_prompt: str,
        context: IterationContext
    ) -> str:
        """Enhance user message with improvement context."""
        enhanced_content = original_content
        
        # Add improvement prompt
        enhanced_content += improvement_prompt
        
        # Add context about failed attempts if relevant
        if len(context.improvement_attempts) > 0:
            enhanced_content += f"\n\nNote: Previous responses were unsuccessful. Please ensure your response addresses the specific requirements above."
        
        return enhanced_content
    
    def record_strategy_outcome(
        self,
        strategy: ImprovementStrategy,
        success: bool,
        confidence_improvement: float = 0.0
    ):
        """Record the outcome of using a strategy for learning."""
        stats = self.strategy_effectiveness[strategy]
        
        if success:
            stats['successes'] += 1
        else:
            stats['failures'] += 1
        
        # Update average confidence improvement
        if confidence_improvement != 0.0:
            current_avg = stats['avg_confidence_improvement']
            total_attempts = stats['successes'] + stats['failures']
            
            # Calculate new average
            stats['avg_confidence_improvement'] = (
                (current_avg * (total_attempts - 1) + confidence_improvement) / total_attempts
            )
        
        logger.debug(f"📊 Strategy {strategy.value} outcome recorded: success={success}, improvement={confidence_improvement:.3f}")
    
    def get_strategy_effectiveness_report(self) -> Dict[str, Any]:
        """Get report on strategy effectiveness for optimization."""
        report = {}
        
        for strategy, stats in self.strategy_effectiveness.items():
            total_attempts = stats['successes'] + stats['failures']
            success_rate = stats['successes'] / total_attempts if total_attempts > 0 else 0
            
            report[strategy.value] = {
                'total_attempts': total_attempts,
                'successes': stats['successes'],
                'failures': stats['failures'],
                'success_rate': round(success_rate, 3),
                'avg_confidence_improvement': round(stats['avg_confidence_improvement'], 3)
            }
        
        return report
    
    def calculate_retry_delay(self, attempt: int) -> float:
        """Calculate delay before retry attempt."""
        return self.config.get_retry_delay(attempt)