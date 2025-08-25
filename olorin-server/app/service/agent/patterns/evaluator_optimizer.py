"""
Evaluator-Optimizer Pattern

Iterative quality improvement with result evaluation and automatic refinement.
Continuously improves investigation results through evaluation and optimization cycles.
"""

import logging
from typing import Any, Dict, List, Optional
from dataclasses import dataclass
from enum import Enum

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage

from .augmented_llm import AugmentedLLMPattern
from .base import BasePattern, PatternResult

logger = logging.getLogger(__name__)


class EvaluationCriteria(Enum):
    """Criteria for evaluating investigation results"""
    COMPLETENESS = "completeness"
    ACCURACY = "accuracy" 
    CONFIDENCE = "confidence"
    ACTIONABILITY = "actionability"
    CONSISTENCY = "consistency"


@dataclass
class EvaluationMetric:
    """Individual evaluation metric"""
    
    criterion: EvaluationCriteria
    score: float  # 0.0 to 1.0
    reasoning: str
    improvement_suggestions: List[str]


@dataclass
class EvaluationResult:
    """Result of evaluating an investigation"""
    
    overall_score: float
    metrics: List[EvaluationMetric]
    strengths: List[str]
    weaknesses: List[str]
    improvement_plan: List[str]
    should_optimize: bool


class EvaluatorOptimizerPattern(BasePattern):
    """
    Evaluator-Optimizer Pattern implementation.
    
    Provides:
    - Iterative quality improvement
    - Multi-criteria result evaluation
    - Automatic refinement suggestions
    - Quality convergence detection
    """
    
    def __init__(self, config, tools=None, ws_streaming=None):
        """Initialize the Evaluator-Optimizer pattern"""
        super().__init__(config, tools, ws_streaming)
        
        # Initialize underlying LLM pattern
        self.llm_pattern = AugmentedLLMPattern(config, tools, ws_streaming)
        
        # Configuration
        self.max_optimization_cycles = config.custom_params.get("max_optimization_cycles", 3)
        self.quality_threshold = config.custom_params.get("quality_threshold", 0.8)
        self.improvement_threshold = config.custom_params.get("improvement_threshold", 0.05)
        
        # Evaluation criteria weights
        self.criteria_weights = {
            EvaluationCriteria.COMPLETENESS: 0.25,
            EvaluationCriteria.ACCURACY: 0.30,
            EvaluationCriteria.CONFIDENCE: 0.20,
            EvaluationCriteria.ACTIONABILITY: 0.15,
            EvaluationCriteria.CONSISTENCY: 0.10
        }
    
    async def execute(self, messages: List[BaseMessage], context: Dict[str, Any]) -> PatternResult:
        """Execute the Evaluator-Optimizer pattern"""
        
        try:
            # Stream optimization start
            if self.ws_streaming:
                await self._stream_optimization_start(context)
            
            # Initial execution
            current_result = await self.llm_pattern.execute(messages, context)
            
            if not current_result.success:
                return current_result
            
            optimization_history = []
            
            # Iterative evaluation and optimization
            for cycle in range(self.max_optimization_cycles):
                
                # Stream cycle start
                if self.ws_streaming:
                    await self._stream_cycle_start(cycle + 1, context)
                
                # Evaluate current result
                evaluation = await self._evaluate_result(current_result, messages, context)
                optimization_history.append({
                    "cycle": cycle + 1,
                    "evaluation": evaluation,
                    "result": current_result
                })
                
                # Stream evaluation results
                if self.ws_streaming:
                    await self._stream_evaluation_complete(evaluation, cycle + 1, context)
                
                # Check if optimization is needed
                if not evaluation.should_optimize or evaluation.overall_score >= self.quality_threshold:
                    # Quality threshold met, stop optimization
                    break
                
                # Optimize based on evaluation
                optimized_result = await self._optimize_result(
                    current_result, 
                    evaluation, 
                    messages, 
                    context, 
                    cycle + 1
                )
                
                # Check for improvement
                if optimized_result.success:
                    improvement = self._calculate_improvement(current_result, optimized_result, evaluation)
                    
                    if improvement >= self.improvement_threshold:
                        current_result = optimized_result
                        
                        # Stream optimization success
                        if self.ws_streaming:
                            await self._stream_optimization_success(cycle + 1, improvement, context)
                    else:
                        # No significant improvement, stop optimization
                        if self.ws_streaming:
                            await self._stream_optimization_plateaued(cycle + 1, improvement, context)
                        break
                else:
                    # Optimization failed, keep current result
                    if self.ws_streaming:
                        await self._stream_optimization_failed(cycle + 1, context)
                    break
            
            # Final evaluation
            final_evaluation = await self._evaluate_result(current_result, messages, context)
            
            # Enhance result with optimization metadata
            enhanced_result = self._create_enhanced_result(
                current_result,
                final_evaluation, 
                optimization_history,
                context
            )
            
            # Stream optimization completion
            if self.ws_streaming:
                await self._stream_optimization_complete(
                    len(optimization_history), 
                    final_evaluation.overall_score, 
                    context
                )
            
            return enhanced_result
            
        except Exception as e:
            logger.error(f"Evaluator-Optimizer execution failed: {str(e)}", exc_info=True)
            
            if self.ws_streaming:
                await self._stream_error(str(e), context)
            
            return PatternResult.error_result(f"Evaluation-optimization failed: {str(e)}")
    
    async def _evaluate_result(
        self, 
        result: PatternResult, 
        original_messages: List[BaseMessage], 
        context: Dict[str, Any]
    ) -> EvaluationResult:
        """Evaluate investigation result against quality criteria"""
        
        evaluation_prompt = f"""
        As an Investigation Quality Evaluator, assess the following fraud investigation result against multiple criteria.
        
        Investigation Context:
        - Entity: {context.get('entity_id', 'unknown')}
        - Type: {context.get('entity_type', 'unknown')}
        
        Investigation Result to Evaluate:
        {str(result.result)[:1000]}...
        
        Evaluation Criteria:
        1. COMPLETENESS (25%): Does the analysis cover all relevant aspects?
        2. ACCURACY (30%): Are the findings accurate and well-supported?
        3. CONFIDENCE (20%): How confident can we be in the conclusions?
        4. ACTIONABILITY (15%): Are the recommendations clear and actionable?
        5. CONSISTENCY (10%): Are the findings internally consistent?
        
        For each criterion, provide:
        - Score (0.0 to 1.0)
        - Reasoning for the score
        - Specific improvement suggestions
        
        Also identify:
        - Overall strengths of the analysis
        - Key weaknesses or gaps
        - Priority improvements needed
        - Whether further optimization is recommended
        
        Format as structured evaluation with clear scores and recommendations.
        """
        
        evaluation_messages = [SystemMessage(content=evaluation_prompt)]
        eval_result = await self.llm_pattern.execute(evaluation_messages, context)
        
        if eval_result.success:
            return self._parse_evaluation_result(eval_result.result, result)
        else:
            # Return default evaluation if parsing fails
            return EvaluationResult(
                overall_score=result.confidence_score,
                metrics=[],
                strengths=["Investigation completed"],
                weaknesses=["Evaluation parsing failed"],
                improvement_plan=["Manual review recommended"],
                should_optimize=False
            )
    
    def _parse_evaluation_result(self, eval_content: Any, original_result: PatternResult) -> EvaluationResult:
        """Parse evaluation result from LLM response"""
        
        eval_text = str(eval_content).lower()
        
        # Extract scores for each criterion (simplified parsing)
        metrics = []
        
        for criterion in EvaluationCriteria:
            # Look for score indicators in the text
            score = self._extract_score_for_criterion(eval_text, criterion)
            
            metrics.append(EvaluationMetric(
                criterion=criterion,
                score=score,
                reasoning=f"Extracted from evaluation text for {criterion.value}",
                improvement_suggestions=[f"Enhance {criterion.value} aspects"]
            ))
        
        # Calculate weighted overall score
        overall_score = sum(
            metric.score * self.criteria_weights[metric.criterion] 
            for metric in metrics
        )
        
        # Determine if optimization is needed
        should_optimize = (
            overall_score < self.quality_threshold and
            overall_score < original_result.confidence_score + 0.1  # Room for improvement
        )
        
        return EvaluationResult(
            overall_score=overall_score,
            metrics=metrics,
            strengths=["Comprehensive analysis completed"],
            weaknesses=["Areas for improvement identified"] if should_optimize else [],
            improvement_plan=["Focus on lower-scoring criteria"] if should_optimize else [],
            should_optimize=should_optimize
        )
    
    def _extract_score_for_criterion(self, eval_text: str, criterion: EvaluationCriteria) -> float:
        """Extract score for a specific criterion from evaluation text"""
        
        import re
        
        # Look for patterns like "completeness: 0.8" or "completeness score: 0.7"
        pattern = rf"{criterion.value}[\w\s]*:?\s*([0-9]\.?[0-9]*)"
        match = re.search(pattern, eval_text)
        
        if match:
            try:
                score = float(match.group(1))
                return min(max(score, 0.0), 1.0)  # Clamp between 0 and 1
            except ValueError:
                pass
        
        # Default score based on criterion importance
        if criterion == EvaluationCriteria.ACCURACY:
            return 0.7
        elif criterion == EvaluationCriteria.COMPLETENESS:
            return 0.6
        elif criterion == EvaluationCriteria.CONFIDENCE:
            return 0.65
        elif criterion == EvaluationCriteria.ACTIONABILITY:
            return 0.6
        else:  # CONSISTENCY
            return 0.7
    
    async def _optimize_result(
        self,
        current_result: PatternResult,
        evaluation: EvaluationResult,
        original_messages: List[BaseMessage],
        context: Dict[str, Any],
        cycle: int
    ) -> PatternResult:
        """Optimize the result based on evaluation feedback"""
        
        # Find the lowest-scoring criteria for focused improvement
        lowest_criterion = min(evaluation.metrics, key=lambda m: m.score)
        
        optimization_prompt = f"""
        As an Investigation Optimizer, improve the following fraud investigation based on the quality evaluation.
        
        Current Investigation Result:
        {str(current_result.result)[:800]}...
        
        Quality Evaluation (Cycle {cycle}):
        - Overall Score: {evaluation.overall_score:.2f}
        - Lowest Scoring Area: {lowest_criterion.criterion.value} ({lowest_criterion.score:.2f})
        
        Key Weaknesses Identified:
        {chr(10).join(f"- {weakness}" for weakness in evaluation.weaknesses)}
        
        Improvement Plan:
        {chr(10).join(f"- {improvement}" for improvement in evaluation.improvement_plan)}
        
        Instructions for Optimization:
        1. Address the lowest-scoring criterion: {lowest_criterion.criterion.value}
        2. Incorporate the improvement suggestions
        3. Maintain the strengths of the current analysis
        4. Focus on making the investigation more comprehensive and actionable
        5. Provide enhanced reasoning and evidence for conclusions
        
        Return an improved version of the investigation that addresses the identified weaknesses while preserving existing strengths.
        """
        
        optimization_messages = original_messages + [SystemMessage(content=optimization_prompt)]
        
        return await self.llm_pattern.execute(optimization_messages, context)
    
    def _calculate_improvement(
        self,
        previous_result: PatternResult,
        optimized_result: PatternResult,
        evaluation: EvaluationResult
    ) -> float:
        """Calculate the improvement achieved through optimization"""
        
        # Simple improvement calculation based on confidence scores
        prev_confidence = previous_result.confidence_score
        opt_confidence = optimized_result.confidence_score
        
        # Factor in evaluation score
        eval_boost = evaluation.overall_score * 0.1
        
        improvement = (opt_confidence - prev_confidence) + eval_boost
        
        return improvement
    
    def _create_enhanced_result(
        self,
        final_result: PatternResult,
        final_evaluation: EvaluationResult,
        optimization_history: List[Dict[str, Any]],
        context: Dict[str, Any]
    ) -> PatternResult:
        """Create enhanced result with optimization metadata"""
        
        enhanced_content = {
            "optimized_investigation": final_result.result,
            "quality_assessment": {
                "overall_score": final_evaluation.overall_score,
                "criteria_scores": {
                    metric.criterion.value: metric.score 
                    for metric in final_evaluation.metrics
                },
                "strengths": final_evaluation.strengths,
                "areas_for_improvement": final_evaluation.weaknesses
            },
            "optimization_process": {
                "cycles_completed": len(optimization_history),
                "max_cycles": self.max_optimization_cycles,
                "quality_threshold": self.quality_threshold,
                "final_quality_met": final_evaluation.overall_score >= self.quality_threshold
            },
            "optimization_history": [
                {
                    "cycle": entry["cycle"],
                    "quality_score": entry["evaluation"].overall_score,
                    "improvements_suggested": len(entry["evaluation"].improvement_plan)
                }
                for entry in optimization_history
            ]
        }
        
        # Calculate final confidence as blend of result confidence and quality score
        final_confidence = (final_result.confidence_score + final_evaluation.overall_score) / 2
        
        return PatternResult.success_result(
            result=enhanced_content,
            confidence=final_confidence,
            reasoning=f"Optimized investigation through {len(optimization_history)} evaluation cycles"
        )
    
    # WebSocket streaming methods
    async def _stream_optimization_start(self, context: Dict[str, Any]) -> None:
        """Stream optimization start event"""
        if self.ws_streaming:
            await self.ws_streaming.send_agent_thought({
                "type": "optimization_start",
                "pattern": "evaluator_optimizer",
                "max_cycles": self.max_optimization_cycles,
                "quality_threshold": self.quality_threshold,
                "message": f"Starting iterative optimization with up to {self.max_optimization_cycles} cycles",
                "context": context.get("investigation_id", "unknown")
            })
    
    async def _stream_cycle_start(self, cycle: int, context: Dict[str, Any]) -> None:
        """Stream optimization cycle start"""
        if self.ws_streaming:
            await self.ws_streaming.send_agent_thought({
                "type": "cycle_start",
                "pattern": "evaluator_optimizer",
                "cycle_number": cycle,
                "message": f"Starting evaluation cycle {cycle}",
                "context": context.get("investigation_id", "unknown")
            })
    
    async def _stream_evaluation_complete(self, evaluation: EvaluationResult, cycle: int, context: Dict[str, Any]) -> None:
        """Stream evaluation completion"""
        if self.ws_streaming:
            await self.ws_streaming.send_agent_thought({
                "type": "evaluation_complete",
                "pattern": "evaluator_optimizer",
                "cycle_number": cycle,
                "overall_score": evaluation.overall_score,
                "should_optimize": evaluation.should_optimize,
                "criteria_scores": {metric.criterion.value: metric.score for metric in evaluation.metrics},
                "message": f"Cycle {cycle} evaluation complete: {evaluation.overall_score:.2f} overall score",
                "context": context.get("investigation_id", "unknown")
            })
    
    async def _stream_optimization_success(self, cycle: int, improvement: float, context: Dict[str, Any]) -> None:
        """Stream successful optimization"""
        if self.ws_streaming:
            await self.ws_streaming.send_agent_thought({
                "type": "optimization_success",
                "pattern": "evaluator_optimizer",
                "cycle_number": cycle,
                "improvement": improvement,
                "message": f"Cycle {cycle} optimization successful: +{improvement:.3f} improvement",
                "context": context.get("investigation_id", "unknown")
            })
    
    async def _stream_optimization_plateaued(self, cycle: int, improvement: float, context: Dict[str, Any]) -> None:
        """Stream optimization plateau"""
        if self.ws_streaming:
            await self.ws_streaming.send_agent_thought({
                "type": "optimization_plateaued", 
                "pattern": "evaluator_optimizer",
                "cycle_number": cycle,
                "improvement": improvement,
                "threshold": self.improvement_threshold,
                "message": f"Cycle {cycle} optimization plateaued: {improvement:.3f} < {self.improvement_threshold} threshold",
                "context": context.get("investigation_id", "unknown")
            })
    
    async def _stream_optimization_failed(self, cycle: int, context: Dict[str, Any]) -> None:
        """Stream optimization failure"""
        if self.ws_streaming:
            await self.ws_streaming.send_agent_thought({
                "type": "optimization_failed",
                "pattern": "evaluator_optimizer", 
                "cycle_number": cycle,
                "message": f"Cycle {cycle} optimization failed, keeping previous result",
                "context": context.get("investigation_id", "unknown")
            })
    
    async def _stream_optimization_complete(self, cycles_completed: int, final_score: float, context: Dict[str, Any]) -> None:
        """Stream optimization completion"""
        if self.ws_streaming:
            await self.ws_streaming.send_agent_thought({
                "type": "optimization_complete",
                "pattern": "evaluator_optimizer",
                "cycles_completed": cycles_completed,
                "final_score": final_score,
                "quality_threshold": self.quality_threshold,
                "threshold_met": final_score >= self.quality_threshold,
                "message": f"Optimization complete after {cycles_completed} cycles: final score {final_score:.2f}",
                "context": context.get("investigation_id", "unknown")
            })
    
    async def _stream_error(self, error_message: str, context: Dict[str, Any]) -> None:
        """Stream error event"""
        if self.ws_streaming:
            await self.ws_streaming.send_agent_thought({
                "type": "error",
                "pattern": "evaluator_optimizer",
                "message": f"Optimization failed: {error_message}",
                "context": context.get("investigation_id", "unknown")
            })