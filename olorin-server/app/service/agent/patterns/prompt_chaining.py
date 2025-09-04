"""
Prompt Chaining Pattern

Sequential task decomposition with step-by-step execution, validation gates,
context passing between steps, and retry logic for failed steps.
"""

from typing import Any, Dict, List, Optional

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage

from .augmented_llm import AugmentedLLMPattern
from .base import BasePattern, PatternResult
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ChainStep:
    """Represents a single step in the prompt chain"""
    
    def __init__(
        self,
        name: str,
        prompt_template: str,
        validation_criteria: Optional[Dict[str, Any]] = None,
        max_retries: int = 2,
        required_context: Optional[List[str]] = None
    ):
        self.name = name
        self.prompt_template = prompt_template
        self.validation_criteria = validation_criteria or {}
        self.max_retries = max_retries
        self.required_context = required_context or []
        self.result: Optional[Any] = None
        self.is_completed = False
        self.retry_count = 0


class PromptChainingPattern(BasePattern):
    """
    Prompt Chaining Pattern implementation.
    
    Provides:
    - Sequential task decomposition
    - Step-by-step execution with validation
    - Context passing between steps  
    - Retry logic for failed steps
    - Pre-configured fraud investigation chains
    """
    
    def __init__(self, config, tools=None, ws_streaming=None):
        """Initialize the Prompt Chaining pattern"""
        super().__init__(config, tools, ws_streaming)
        
        # Initialize the underlying LLM pattern
        self.llm_pattern = AugmentedLLMPattern(config, tools, ws_streaming)
        
        # Define pre-configured chain templates
        self._chain_templates = self._initialize_chain_templates()
    
    def _initialize_chain_templates(self) -> Dict[str, List[ChainStep]]:
        """Initialize pre-configured chain templates for common investigation types"""
        
        return {
            "fraud_investigation": self._create_fraud_investigation_chain(),
            "device_analysis": self._create_device_analysis_chain(),
            "location_analysis": self._create_location_analysis_chain(),
            "network_analysis": self._create_network_analysis_chain(),
            "risk_assessment": self._create_risk_assessment_chain()
        }
    
    def _create_fraud_investigation_chain(self) -> List[ChainStep]:
        """Create a comprehensive fraud investigation chain"""
        
        return [
            ChainStep(
                name="initial_assessment",
                prompt_template="""
                Perform an initial assessment of the fraud case with the following information:
                Entity: {entity_id}
                Entity Type: {entity_type}
                Investigation Context: {context}
                
                Please provide:
                1. Summary of the case
                2. Key risk indicators identified
                3. Recommended investigation approach
                4. Priority level (High/Medium/Low)
                """,
                validation_criteria={"min_length": 200, "required_sections": ["Summary", "Risk indicators"]},
                required_context=["entity_id", "entity_type"]
            ),
            
            ChainStep(
                name="data_collection",
                prompt_template="""
                Based on the initial assessment: {previous_result}
                
                Collect relevant data using available tools. Focus on:
                1. Historical transaction patterns
                2. Device fingerprint information
                3. Location data analysis
                4. Network behavior patterns
                
                Use the appropriate tools to gather comprehensive data.
                """,
                validation_criteria={"tool_usage_required": True},
                required_context=["previous_result"]
            ),
            
            ChainStep(
                name="pattern_analysis",
                prompt_template="""
                Analyze the collected data for suspicious patterns:
                
                Previous Assessment: {initial_assessment}
                Collected Data: {data_collection}
                
                Identify:
                1. Anomalous behavior patterns
                2. Correlation with known fraud indicators
                3. Timeline of suspicious activities
                4. Confidence level for each finding
                """,
                validation_criteria={"min_length": 300, "confidence_score_required": True},
                required_context=["initial_assessment", "data_collection"]
            ),
            
            ChainStep(
                name="risk_scoring",
                prompt_template="""
                Calculate a comprehensive risk score based on the analysis:
                
                Initial Assessment: {initial_assessment}
                Data Analysis: {pattern_analysis}
                
                Provide:
                1. Overall risk score (0-100)
                2. Risk category (Low/Medium/High/Critical)
                3. Contributing factors with individual scores
                4. Confidence level in the assessment
                """,
                validation_criteria={"risk_score_required": True, "numeric_score": True},
                required_context=["initial_assessment", "pattern_analysis"]
            ),
            
            ChainStep(
                name="recommendations",
                prompt_template="""
                Based on the complete investigation, provide actionable recommendations:
                
                Risk Score: {risk_scoring}
                Full Analysis: {pattern_analysis}
                
                Include:
                1. Immediate actions required
                2. Additional monitoring recommendations  
                3. Prevention strategies
                4. Follow-up investigation needs
                5. Documentation requirements
                """,
                validation_criteria={"min_length": 250, "action_items_required": True},
                required_context=["risk_scoring", "pattern_analysis"]
            )
        ]
    
    def _create_device_analysis_chain(self) -> List[ChainStep]:
        """Create device analysis chain"""
        
        return [
            ChainStep(
                name="device_profiling",
                prompt_template="""
                Analyze the device information for: {entity_id}
                
                Focus on:
                1. Device fingerprint analysis
                2. Historical device behavior
                3. Anomaly detection in device patterns
                4. Cross-device correlation
                """,
                required_context=["entity_id"]
            ),
            
            ChainStep(
                name="risk_evaluation",
                prompt_template="""
                Evaluate device-related risks based on: {device_profiling}
                
                Assess:
                1. Device reputation score
                2. Behavioral anomalies
                3. Security indicators
                4. Overall device risk level
                """,
                required_context=["device_profiling"]
            )
        ]
    
    def _create_location_analysis_chain(self) -> List[ChainStep]:
        """Create location analysis chain"""
        
        return [
            ChainStep(
                name="location_mapping",
                prompt_template="""
                Map and analyze location patterns for: {entity_id}
                
                Examine:
                1. Geographic movement patterns
                2. Location consistency
                3. High-risk location indicators
                4. Velocity analysis
                """,
                required_context=["entity_id"]
            ),
            
            ChainStep(
                name="geo_risk_assessment",
                prompt_template="""
                Assess geographic risk factors from: {location_mapping}
                
                Evaluate:
                1. Location-based fraud indicators
                2. Geographic velocity concerns
                3. High-risk jurisdiction involvement
                4. Location spoofing indicators
                """,
                required_context=["location_mapping"]
            )
        ]
    
    def _create_network_analysis_chain(self) -> List[ChainStep]:
        """Create network analysis chain"""
        
        return [
            ChainStep(
                name="network_profiling",
                prompt_template="""
                Profile network behavior for: {entity_id}
                
                Analyze:
                1. Network connection patterns
                2. IP reputation and history
                3. Proxy/VPN usage indicators
                4. Network-based anomalies
                """,
                required_context=["entity_id"]
            ),
            
            ChainStep(
                name="network_risk_scoring",
                prompt_template="""
                Score network-related risks from: {network_profiling}
                
                Calculate:
                1. Network reputation score
                2. Connection anomaly indicators
                3. Proxy/anonymization risks
                4. Overall network risk level
                """,
                required_context=["network_profiling"]
            )
        ]
    
    def _create_risk_assessment_chain(self) -> List[ChainStep]:
        """Create comprehensive risk assessment chain"""
        
        return [
            ChainStep(
                name="data_aggregation",
                prompt_template="""
                Aggregate all available risk data for: {entity_id}
                
                Compile:
                1. Device risk indicators
                2. Location risk factors
                3. Network security concerns
                4. Behavioral pattern analysis
                """,
                required_context=["entity_id"]
            ),
            
            ChainStep(
                name="composite_scoring",
                prompt_template="""
                Create composite risk score from: {data_aggregation}
                
                Calculate:
                1. Weighted risk score across all factors
                2. Confidence intervals
                3. Risk category classification
                4. Key contributing factors
                """,
                validation_criteria={"numeric_score": True},
                required_context=["data_aggregation"]
            ),
            
            ChainStep(
                name="action_planning",
                prompt_template="""
                Develop action plan based on: {composite_scoring}
                
                Recommend:
                1. Immediate response actions
                2. Monitoring requirements
                3. Escalation procedures
                4. Documentation needs
                """,
                required_context=["composite_scoring"]
            )
        ]
    
    async def execute(self, messages: List[BaseMessage], context: Dict[str, Any]) -> PatternResult:
        """Execute the Prompt Chaining pattern"""
        
        try:
            # Determine which chain to use
            chain_type = context.get("chain_type", "fraud_investigation")
            chain_steps = self._get_chain_steps(chain_type, context)
            
            if not chain_steps:
                return PatternResult.error_result(f"Unknown chain type: {chain_type}")
            
            # Stream chain start event
            if self.ws_streaming:
                await self._stream_chain_start(chain_type, len(chain_steps), context)
            
            # Execute chain steps sequentially
            step_results = {}
            
            for step in chain_steps:
                step_result = await self._execute_step(step, messages, context, step_results)
                
                if not step_result.success:
                    return PatternResult.error_result(f"Step {step.name} failed: {step_result.error_message}")
                
                step_results[step.name] = step_result.result
                step.result = step_result.result
                step.is_completed = True
                
                # Stream step completion
                if self.ws_streaming:
                    await self._stream_step_complete(step, context)
            
            # Combine results
            final_result = self._combine_step_results(chain_steps, step_results)
            
            # Calculate overall confidence
            confidence = self._calculate_chain_confidence(chain_steps)
            
            # Stream chain completion
            if self.ws_streaming:
                await self._stream_chain_complete(chain_type, confidence, context)
            
            return PatternResult.success_result(
                result=final_result,
                confidence=confidence,
                reasoning=self._extract_chain_reasoning(chain_steps)
            )
            
        except Exception as e:
            logger.error(f"Prompt chaining execution failed: {str(e)}", exc_info=True)
            
            if self.ws_streaming:
                await self._stream_error(str(e), context)
            
            return PatternResult.error_result(f"Chain execution failed: {str(e)}")
    
    def _get_chain_steps(self, chain_type: str, context: Dict[str, Any]) -> List[ChainStep]:
        """Get chain steps for the specified type"""
        
        if chain_type in self._chain_templates:
            return self._chain_templates[chain_type].copy()
        
        # Allow custom chains from context
        if "custom_chain" in context:
            return context["custom_chain"]
        
        return []
    
    async def _execute_step(
        self,
        step: ChainStep,
        original_messages: List[BaseMessage],
        context: Dict[str, Any],
        previous_results: Dict[str, Any]
    ) -> PatternResult:
        """Execute a single step in the chain"""
        
        max_attempts = step.max_retries + 1
        
        for attempt in range(max_attempts):
            try:
                # Stream step start
                if self.ws_streaming:
                    await self._stream_step_start(step, attempt, context)
                
                # Build step context
                step_context = self._build_step_context(step, context, previous_results)
                
                # Create step-specific prompt
                step_prompt = self._create_step_prompt(step, step_context)
                step_messages = original_messages + [HumanMessage(content=step_prompt)]
                
                # Execute using underlying LLM pattern
                result = await self.llm_pattern.execute(step_messages, context)
                
                if result.success:
                    # Validate step result
                    if self._validate_step_result(step, result):
                        return result
                    else:
                        # Validation failed, retry if possible
                        step.retry_count += 1
                        if attempt < max_attempts - 1:
                            continue
                        else:
                            return PatternResult.error_result(f"Step validation failed after {max_attempts} attempts")
                else:
                    # Step execution failed, retry if possible
                    step.retry_count += 1
                    if attempt < max_attempts - 1:
                        continue
                    else:
                        return result
                        
            except Exception as e:
                step.retry_count += 1
                if attempt < max_attempts - 1:
                    logger.warning(f"Step {step.name} attempt {attempt + 1} failed: {str(e)}")
                    continue
                else:
                    return PatternResult.error_result(f"Step {step.name} failed: {str(e)}")
        
        return PatternResult.error_result(f"Step {step.name} exhausted all retries")
    
    def _build_step_context(
        self,
        step: ChainStep,
        context: Dict[str, Any],
        previous_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Build context for step execution"""
        
        step_context = context.copy()
        
        # Add previous results that this step requires
        for required_key in step.required_context:
            if required_key in previous_results:
                step_context[required_key] = previous_results[required_key]
            elif required_key in context:
                # Already in context
                continue
            else:
                logger.warning(f"Required context key {required_key} not available for step {step.name}")
        
        return step_context
    
    def _create_step_prompt(self, step: ChainStep, step_context: Dict[str, Any]) -> str:
        """Create prompt for step execution"""
        
        try:
            return step.prompt_template.format(**step_context)
        except KeyError as e:
            logger.error(f"Missing context key for step {step.name}: {e}")
            return step.prompt_template  # Return unformatted if formatting fails
    
    def _validate_step_result(self, step: ChainStep, result: PatternResult) -> bool:
        """Validate step result against criteria"""
        
        if not step.validation_criteria:
            return True
        
        result_content = str(result.result)
        
        # Check minimum length
        if "min_length" in step.validation_criteria:
            if len(result_content) < step.validation_criteria["min_length"]:
                return False
        
        # Check required sections
        if "required_sections" in step.validation_criteria:
            for section in step.validation_criteria["required_sections"]:
                if section.lower() not in result_content.lower():
                    return False
        
        # Check tool usage requirement
        if step.validation_criteria.get("tool_usage_required", False):
            if not hasattr(result.result, 'tool_calls') or not result.result.tool_calls:
                return False
        
        # Check numeric score requirement
        if step.validation_criteria.get("numeric_score", False):
            import re
            score_pattern = r'\b\d{1,3}\b'
            if not re.search(score_pattern, result_content):
                return False
        
        # Check risk score requirement
        if step.validation_criteria.get("risk_score_required", False):
            risk_keywords = ["risk", "score", "level"]
            if not any(keyword in result_content.lower() for keyword in risk_keywords):
                return False
        
        # Check confidence score requirement  
        if step.validation_criteria.get("confidence_score_required", False):
            if result.confidence_score < 0.5:
                return False
        
        # Check action items requirement
        if step.validation_criteria.get("action_items_required", False):
            action_keywords = ["recommend", "action", "should", "must", "need"]
            if not any(keyword in result_content.lower() for keyword in action_keywords):
                return False
        
        return True
    
    def _combine_step_results(self, chain_steps: List[ChainStep], step_results: Dict[str, Any]) -> Dict[str, Any]:
        """Combine all step results into final result"""
        
        combined_result = {
            "chain_type": getattr(self, '_current_chain_type', 'unknown'),
            "steps_completed": len([step for step in chain_steps if step.is_completed]),
            "total_steps": len(chain_steps),
            "step_results": step_results,
            "execution_summary": self._create_execution_summary(chain_steps)
        }
        
        # Extract final recommendation or conclusion if available
        if "recommendations" in step_results:
            combined_result["final_recommendations"] = step_results["recommendations"]
        elif "action_planning" in step_results:
            combined_result["final_recommendations"] = step_results["action_planning"]
        
        # Extract risk score if available
        risk_steps = ["risk_scoring", "composite_scoring", "risk_evaluation"]
        for step_name in risk_steps:
            if step_name in step_results:
                combined_result["risk_assessment"] = step_results[step_name]
                break
        
        return combined_result
    
    def _create_execution_summary(self, chain_steps: List[ChainStep]) -> str:
        """Create summary of chain execution"""
        
        summary_parts = []
        
        for step in chain_steps:
            if step.is_completed:
                retry_info = f" (retries: {step.retry_count})" if step.retry_count > 0 else ""
                summary_parts.append(f"✓ {step.name}{retry_info}")
            else:
                summary_parts.append(f"✗ {step.name} (failed)")
        
        return " → ".join(summary_parts)
    
    def _calculate_chain_confidence(self, chain_steps: List[ChainStep]) -> float:
        """Calculate overall confidence for the chain execution"""
        
        completed_steps = [step for step in chain_steps if step.is_completed]
        if not completed_steps:
            return 0.0
        
        # Base confidence from completion rate
        completion_rate = len(completed_steps) / len(chain_steps)
        base_confidence = completion_rate * 0.6
        
        # Penalty for retries
        total_retries = sum(step.retry_count for step in chain_steps)
        retry_penalty = min(total_retries * 0.05, 0.2)
        
        # Bonus for validation success
        validation_bonus = 0.2 if all(step.is_completed for step in chain_steps) else 0.0
        
        final_confidence = base_confidence - retry_penalty + validation_bonus
        return max(0.0, min(1.0, final_confidence))
    
    def _extract_chain_reasoning(self, chain_steps: List[ChainStep]) -> str:
        """Extract reasoning from chain execution"""
        
        reasoning_parts = []
        
        for step in chain_steps:
            if step.is_completed and step.result:
                step_reasoning = f"{step.name}: {str(step.result)[:100]}..."
                reasoning_parts.append(step_reasoning)
        
        return " | ".join(reasoning_parts)
    
    # WebSocket streaming methods
    async def _stream_chain_start(self, chain_type: str, step_count: int, context: Dict[str, Any]) -> None:
        """Stream chain start event"""
        if self.ws_streaming:
            await self.ws_streaming.send_agent_thought({
                "type": "chain_start",
                "pattern": "prompt_chaining",
                "chain_type": chain_type,
                "total_steps": step_count,
                "message": f"Starting {chain_type} chain with {step_count} steps",
                "context": context.get("investigation_id", "unknown")
            })
    
    async def _stream_step_start(self, step: ChainStep, attempt: int, context: Dict[str, Any]) -> None:
        """Stream step start event"""
        if self.ws_streaming:
            await self.ws_streaming.send_agent_thought({
                "type": "step_start",
                "pattern": "prompt_chaining",
                "step_name": step.name,
                "attempt": attempt + 1,
                "max_attempts": step.max_retries + 1,
                "message": f"Executing step: {step.name}",
                "context": context.get("investigation_id", "unknown")
            })
    
    async def _stream_step_complete(self, step: ChainStep, context: Dict[str, Any]) -> None:
        """Stream step completion event"""
        if self.ws_streaming:
            await self.ws_streaming.send_agent_thought({
                "type": "step_complete",
                "pattern": "prompt_chaining",
                "step_name": step.name,
                "retries_used": step.retry_count,
                "message": f"Completed step: {step.name}",
                "context": context.get("investigation_id", "unknown")
            })
    
    async def _stream_chain_complete(self, chain_type: str, confidence: float, context: Dict[str, Any]) -> None:
        """Stream chain completion event"""
        if self.ws_streaming:
            await self.ws_streaming.send_agent_thought({
                "type": "chain_complete",
                "pattern": "prompt_chaining",
                "chain_type": chain_type,
                "confidence": confidence,
                "message": f"Chain {chain_type} completed with confidence {confidence:.2f}",
                "context": context.get("investigation_id", "unknown")
            })
    
    async def _stream_error(self, error_message: str, context: Dict[str, Any]) -> None:
        """Stream error event"""
        if self.ws_streaming:
            await self.ws_streaming.send_agent_thought({
                "type": "error",
                "pattern": "prompt_chaining",
                "message": f"Chain execution failed: {error_message}",
                "context": context.get("investigation_id", "unknown")
            })