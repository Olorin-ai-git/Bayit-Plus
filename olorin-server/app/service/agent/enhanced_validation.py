"""
Enhanced Investigation Validation System

Provides comprehensive validation for investigation results including:
- Data extraction failure detection
- Risk score consistency validation  
- Minimum evidence thresholds
- LLM-based verification
- Automatic failure detection for parsing issues
"""

import os
import asyncio
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
from datetime import datetime

from app.service.logging import get_bridge_logger
from app.service.llm_manager import LLMManager
from app.service.agent.quality_assurance import (
    InvestigationQualityAssurance,
    ValidationLevel,
    QualityAssessment
)

logger = get_bridge_logger(__name__)


class ValidationStatus(Enum):
    """Investigation validation status"""
    PASSED = "passed"
    FAILED = "failed"
    WARNING = "warning"
    CRITICAL_FAILURE = "critical_failure"


class DataExtractionStatus(Enum):
    """Status of data extraction from sources"""
    SUCCESS = "success"
    PARTIAL = "partial"
    FAILED = "failed"
    STRING_FORMAT_ERROR = "string_format_error"


@dataclass
class EnhancedValidationResult:
    """Enhanced validation result with detailed checks"""
    investigation_id: str
    validation_status: ValidationStatus
    overall_score: float
    
    # Data extraction validation
    data_extraction_status: DataExtractionStatus
    extraction_failures: List[str]
    
    # Risk consistency validation
    initial_risk_score: float
    final_risk_score: float
    risk_score_delta: float
    risk_consistency_passed: bool
    
    # Evidence threshold validation
    evidence_count: int
    minimum_evidence_met: bool
    evidence_quality_score: float
    
    # LLM verification
    llm_verification_score: Optional[float]
    llm_verification_passed: Optional[bool]
    llm_verification_details: Optional[Dict[str, Any]]
    
    # Quality assessment
    quality_assessment: Optional[QualityAssessment]
    
    # Issues and recommendations
    critical_issues: List[str]
    warnings: List[str]
    recommendations: List[str]
    
    # Metadata
    validation_timestamp: datetime
    validation_duration: float


class EnhancedInvestigationValidator:
    """
    Enhanced validation system for autonomous investigations.
    
    Integrates with the verification LLM model and quality assurance system
    to provide comprehensive validation with automatic failure detection.
    """
    
    def __init__(self):
        """Initialize the enhanced validator."""
        self.llm_manager = LLMManager()
        self.quality_assurance = InvestigationQualityAssurance()
        self.verification_enabled = os.getenv('LLM_VERIFICATION_ENABLED', 'true').lower() == 'true'
        self.verification_threshold = float(os.getenv('VERIFICATION_THRESHOLD_DEFAULT', '85')) / 100
        self.min_evidence_threshold = int(os.getenv('MIN_EVIDENCE_THRESHOLD', '3'))
        self.max_risk_delta_threshold = float(os.getenv('MAX_RISK_DELTA_THRESHOLD', '0.5'))
        
        logger.info(f"Enhanced Validator initialized: verification={self.verification_enabled}, "
                   f"threshold={self.verification_threshold}, min_evidence={self.min_evidence_threshold}")
    
    async def validate_investigation(
        self,
        investigation_id: str,
        initial_context: Dict[str, Any],
        investigation_result: Dict[str, Any],
        agent_results: Dict[str, Any]
    ) -> EnhancedValidationResult:
        """
        Perform comprehensive validation of investigation results.
        
        Args:
            investigation_id: Investigation identifier
            initial_context: Initial investigation context including Snowflake risk
            investigation_result: Final investigation results from clean graph
            agent_results: Individual agent analysis results
            
        Returns:
            Comprehensive validation result with pass/fail determination
        """
        start_time = datetime.utcnow()
        logger.info(f"🔍 Starting enhanced validation for investigation {investigation_id}")
        
        # Extract initial risk from Snowflake/context
        initial_risk = self._extract_initial_risk(initial_context)
        
        # Extract final risk from investigation
        final_risk = self._extract_final_risk(investigation_result, agent_results)
        
        # 1. Check data extraction status
        extraction_status, extraction_failures = self._validate_data_extraction(
            investigation_result, agent_results
        )
        
        # 2. Validate risk score consistency
        risk_delta = abs(initial_risk - final_risk) if initial_risk and final_risk else 1.0
        risk_consistency_passed = self._validate_risk_consistency(
            initial_risk, final_risk, risk_delta, extraction_status
        )
        
        # 3. Check minimum evidence threshold
        evidence_count, evidence_quality = self._validate_evidence_threshold(
            investigation_result, agent_results
        )
        minimum_evidence_met = evidence_count >= self.min_evidence_threshold
        
        # 4. Run quality assurance validation
        quality_assessment = None
        if agent_results:
            try:
                quality_assessment = await self.quality_assurance.validate_investigation_results(
                    investigation_id,
                    agent_results,
                    ValidationLevel.COMPREHENSIVE
                )
            except Exception as e:
                logger.error(f"Quality assessment failed: {e}")
        
        # 5. LLM verification (if enabled and data extraction succeeded)
        llm_verification_score = None
        llm_verification_passed = None
        llm_verification_details = None
        
        if self.verification_enabled and extraction_status != DataExtractionStatus.FAILED:
            llm_verification_score, llm_verification_passed, llm_verification_details = \
                await self._perform_llm_verification(
                    investigation_id, initial_context, investigation_result, agent_results
                )
        
        # Determine overall validation status
        critical_issues = []
        warnings = []
        recommendations = []
        
        # Critical failures that should fail the investigation
        if extraction_status in [DataExtractionStatus.FAILED, DataExtractionStatus.STRING_FORMAT_ERROR]:
            critical_issues.append(f"Data extraction failed: {', '.join(extraction_failures)}")
        
        if not risk_consistency_passed and extraction_status == DataExtractionStatus.SUCCESS:
            critical_issues.append(
                f"Risk score inconsistency: Initial={initial_risk:.2f}, Final={final_risk:.2f}, "
                f"Delta={risk_delta:.2f} exceeds threshold {self.max_risk_delta_threshold}"
            )
        
        if not minimum_evidence_met:
            critical_issues.append(
                f"Insufficient evidence: {evidence_count} sources < {self.min_evidence_threshold} required"
            )
        
        if llm_verification_passed is False:
            critical_issues.append(
                f"LLM verification failed: Score {llm_verification_score:.2f} < {self.verification_threshold}"
            )
        
        # Warnings that don't fail but indicate issues
        if extraction_status == DataExtractionStatus.PARTIAL:
            warnings.append("Some data extraction partially succeeded")
        
        if quality_assessment and quality_assessment.overall_quality_score < 0.6:
            warnings.append(f"Low quality score: {quality_assessment.overall_quality_score:.2f}")
        
        # Generate recommendations
        if extraction_failures:
            recommendations.append("Fix Snowflake data format to return structured JSON instead of strings")
        
        if not risk_consistency_passed:
            recommendations.append("Investigate why risk assessment changed dramatically from initial analysis")
        
        if not minimum_evidence_met:
            recommendations.append("Ensure more data sources are analyzed for comprehensive risk assessment")
        
        # Determine final validation status
        if critical_issues:
            validation_status = ValidationStatus.CRITICAL_FAILURE
        elif warnings and len(warnings) > 2:
            validation_status = ValidationStatus.WARNING
        elif warnings:
            validation_status = ValidationStatus.WARNING
        else:
            validation_status = ValidationStatus.PASSED
        
        # Calculate overall score
        overall_score = self._calculate_overall_score(
            extraction_status,
            risk_consistency_passed,
            minimum_evidence_met,
            evidence_quality,
            llm_verification_score,
            quality_assessment
        )
        
        # Don't pass investigations with critical issues
        if validation_status == ValidationStatus.CRITICAL_FAILURE:
            validation_status = ValidationStatus.FAILED
            overall_score = min(overall_score, 40.0)  # Cap score for failed investigations
        
        end_time = datetime.utcnow()
        validation_duration = (end_time - start_time).total_seconds()
        
        result = EnhancedValidationResult(
            investigation_id=investigation_id,
            validation_status=validation_status,
            overall_score=overall_score,
            data_extraction_status=extraction_status,
            extraction_failures=extraction_failures,
            initial_risk_score=initial_risk or 0.0,
            final_risk_score=final_risk or 0.0,
            risk_score_delta=risk_delta,
            risk_consistency_passed=risk_consistency_passed,
            evidence_count=evidence_count,
            minimum_evidence_met=minimum_evidence_met,
            evidence_quality_score=evidence_quality,
            llm_verification_score=llm_verification_score,
            llm_verification_passed=llm_verification_passed,
            llm_verification_details=llm_verification_details,
            quality_assessment=quality_assessment,
            critical_issues=critical_issues,
            warnings=warnings,
            recommendations=recommendations,
            validation_timestamp=start_time,
            validation_duration=validation_duration
        )
        
        # Log validation result
        status_emoji = "✅" if validation_status == ValidationStatus.PASSED else "❌"
        logger.info(
            f"{status_emoji} Validation {validation_status.value}: "
            f"Score={overall_score:.1f}, Extraction={extraction_status.value}, "
            f"RiskDelta={risk_delta:.2f}, Evidence={evidence_count}"
        )
        
        if critical_issues:
            logger.error(f"Critical issues: {critical_issues}")
        
        return result
    
    def _extract_initial_risk(self, initial_context: Dict[str, Any]) -> Optional[float]:
        """Extract initial risk score from Snowflake or context."""
        # Check for Snowflake risk score
        if 'snowflake_risk_score' in initial_context:
            return float(initial_context['snowflake_risk_score'])
        
        # Check for risk in entity data
        if 'entity_data' in initial_context:
            entity_data = initial_context['entity_data']
            if isinstance(entity_data, dict) and 'risk_score' in entity_data:
                return float(entity_data['risk_score'])
        
        # Check for direct risk_score in context
        if 'risk_score' in initial_context:
            return float(initial_context['risk_score'])
        
        return None
    
    def _extract_final_risk(
        self, 
        investigation_result: Dict[str, Any],
        agent_results: Dict[str, Any]
    ) -> Optional[float]:
        """Extract final risk score from investigation results."""
        # Check investigation result
        if 'risk_score' in investigation_result:
            return float(investigation_result['risk_score'])
        
        # Check risk aggregation agent
        if agent_results and 'risk_aggregation' in agent_results:
            risk_agg = agent_results['risk_aggregation']
            if isinstance(risk_agg, dict):
                if 'risk_score' in risk_agg:
                    return float(risk_agg['risk_score'])
                if 'findings' in risk_agg and isinstance(risk_agg['findings'], dict):
                    if 'risk_score' in risk_agg['findings']:
                        return float(risk_agg['findings']['risk_score'])
        
        # Check for final_risk_score
        if 'final_risk_score' in investigation_result:
            return float(investigation_result['final_risk_score'])
        
        return None
    
    def _validate_data_extraction(
        self,
        investigation_result: Dict[str, Any],
        agent_results: Dict[str, Any]
    ) -> Tuple[DataExtractionStatus, List[str]]:
        """Validate that data was properly extracted from sources."""
        failures = []
        partial_success = False
        any_success = False
        suspicious_zeros = []
        
        # Check for Snowflake data extraction issues
        snowflake_data = investigation_result.get('snowflake_data')
        if snowflake_data:
            if isinstance(snowflake_data, str):
                failures.append("Snowflake data is string format, cannot extract structured results")
            elif isinstance(snowflake_data, dict) and snowflake_data.get('error'):
                failures.append(f"Snowflake error: {snowflake_data['error']}")
            else:
                any_success = True
        
        # Check agent results for extraction issues
        if agent_results:
            for agent_name, result in agent_results.items():
                if isinstance(result, dict):
                    status = result.get('status', '')
                    risk_score = result.get('risk_score', None)
                    
                    # Check for explicit extraction failures
                    if 'extraction_error' in result or 'parse_error' in result:
                        failures.append(f"{agent_name}: Data extraction/parsing failed")
                    elif status == 'failed':
                        failures.append(f"{agent_name}: Agent execution failed")
                    elif status == 'no_results':
                        failures.append(f"{agent_name}: No results available")
                    elif status == 'partial':
                        partial_success = True
                    elif status == 'success':
                        # Check for suspicious 0.00 risk scores with "success" status
                        if risk_score == 0.0 and agent_name in ['device', 'location', 'logs']:
                            # Check if the findings indicate a parsing issue
                            findings = result.get('findings', {})
                            if isinstance(findings, dict):
                                analysis = findings.get('analysis', {})
                                # If analysis shows no data (all zeros), it's likely a parsing failure
                                if all(v == 0 for v in analysis.values() if isinstance(v, (int, float))):
                                    suspicious_zeros.append(agent_name)
                                    failures.append(f"{agent_name}: Suspicious 0.00 risk with empty analysis (likely parsing failure)")
                                else:
                                    any_success = True
                            else:
                                any_success = True
                        else:
                            any_success = True
                    
                    # Check for string format issues in findings
                    findings = result.get('findings')
                    if isinstance(findings, str) and "string format" in findings.lower():
                        failures.append(f"{agent_name}: String format error in findings")
        
        # Check if too many agents returned suspicious zeros
        if len(suspicious_zeros) >= 2:
            failures.insert(0, f"CRITICAL: {len(suspicious_zeros)} agents returned 0.00 risk with empty data (parsing failure suspected)")
            return DataExtractionStatus.FAILED, failures
        
        # Determine overall status
        if failures and not any_success:
            # Check if it's specifically a string format error
            if any("string format" in f for f in failures):
                return DataExtractionStatus.STRING_FORMAT_ERROR, failures
            return DataExtractionStatus.FAILED, failures
        elif failures and (any_success or partial_success):
            return DataExtractionStatus.PARTIAL, failures
        elif any_success:
            return DataExtractionStatus.SUCCESS, [] if not suspicious_zeros else failures
        else:
            return DataExtractionStatus.FAILED, ["No data successfully extracted"]
    
    def _validate_risk_consistency(
        self,
        initial_risk: Optional[float],
        final_risk: Optional[float],
        risk_delta: float,
        extraction_status: DataExtractionStatus
    ) -> bool:
        """
        Validate consistency between initial and final risk scores.
        
        Returns True if risk scores are consistent, False otherwise.
        """
        # If data extraction failed, we can't validate consistency
        if extraction_status in [DataExtractionStatus.FAILED, DataExtractionStatus.STRING_FORMAT_ERROR]:
            logger.warning("Cannot validate risk consistency due to data extraction failure")
            return False
        
        # Both scores must be present
        if initial_risk is None or final_risk is None:
            logger.warning(f"Missing risk scores: initial={initial_risk}, final={final_risk}")
            return False
        
        # Check for dramatic risk score changes
        if risk_delta > self.max_risk_delta_threshold:
            # Special case: High initial risk cleared to very low risk is suspicious
            if initial_risk > 0.8 and final_risk < 0.2:
                logger.error(
                    f"Suspicious risk reduction: {initial_risk:.2f} -> {final_risk:.2f}"
                )
                return False
            
            # Moderate changes might be acceptable with good evidence
            if risk_delta > 0.7:
                logger.warning(
                    f"Large risk delta {risk_delta:.2f}: {initial_risk:.2f} -> {final_risk:.2f}"
                )
                return False
        
        return True
    
    def _validate_evidence_threshold(
        self,
        investigation_result: Dict[str, Any],
        agent_results: Dict[str, Any]
    ) -> Tuple[int, float]:
        """
        Validate that minimum evidence threshold is met.
        
        Returns:
            Tuple of (evidence_count, evidence_quality_score)
        """
        evidence_count = 0
        quality_scores = []
        
        # Count tools used as evidence sources
        tools_used = investigation_result.get('tools_used', [])
        if tools_used:
            evidence_count += len(tools_used)
        
        # Count successful agent analyses as evidence
        if agent_results:
            for agent_name, result in agent_results.items():
                if isinstance(result, dict):
                    status = result.get('status', '')
                    if status == 'success':
                        evidence_count += 1
                        # Calculate quality based on findings
                        findings = result.get('findings')
                        if findings:
                            if isinstance(findings, dict):
                                quality_scores.append(0.8)  # Structured findings
                            elif isinstance(findings, str) and len(findings) > 100:
                                quality_scores.append(0.6)  # Text findings
                            else:
                                quality_scores.append(0.4)  # Minimal findings
        
        # Count completed domains as evidence
        domains_completed = investigation_result.get('domains_completed', [])
        if domains_completed:
            evidence_count = max(evidence_count, len(domains_completed))
        
        # Calculate average quality score
        evidence_quality = sum(quality_scores) / len(quality_scores) if quality_scores else 0.0
        
        return evidence_count, evidence_quality
    
    async def _perform_llm_verification(
        self,
        investigation_id: str,
        initial_context: Dict[str, Any],
        investigation_result: Dict[str, Any],
        agent_results: Dict[str, Any]
    ) -> Tuple[Optional[float], Optional[bool], Optional[Dict[str, Any]]]:
        """
        Perform LLM-based verification of investigation results.
        
        Returns:
            Tuple of (verification_score, passed, details)
        """
        try:
            # Check if verification model is available
            if not hasattr(self.llm_manager, 'verification_model') or not self.llm_manager.verification_model:
                logger.warning("Verification model not available, skipping LLM verification")
                return None, None, None
            
            # Prepare verification prompt
            verification_prompt = self._create_verification_prompt(
                initial_context, investigation_result, agent_results
            )
            
            # Call verification model directly
            from langchain.schema import HumanMessage
            messages = [HumanMessage(content=verification_prompt)]
            
            try:
                response = await self.llm_manager.verification_model.ainvoke(messages)
                response_text = response.content if hasattr(response, 'content') else str(response)
                
                # Parse the response to extract a confidence score
                # Look for numerical values in the response
                import re
                numbers = re.findall(r'(\d+\.?\d*)', response_text)
                
                # Try to find a score between 0 and 1 (or 0-100)
                score = 0.5  # Default score
                for num_str in numbers:
                    num = float(num_str)
                    if 0 <= num <= 1:
                        score = num
                        break
                    elif 0 <= num <= 100:
                        score = num / 100
                        break
                
                passed = score >= self.verification_threshold
                details = {
                    'model': self.llm_manager.verification_model_id,
                    'threshold': self.verification_threshold,
                    'response': response_text[:500]  # Truncate long responses
                }
                
                logger.info(
                    f"LLM verification: score={score:.2f}, passed={passed}, "
                    f"model={self.llm_manager.verification_model_id}"
                )
                
                return score, passed, details
                
            except Exception as model_error:
                logger.error(f"Verification model invocation failed: {model_error}")
                return None, None, None
            
        except Exception as e:
            logger.error(f"LLM verification failed: {e}")
        
        return None, None, None
    
    def _create_verification_prompt(
        self,
        initial_context: Dict[str, Any],
        investigation_result: Dict[str, Any],
        agent_results: Dict[str, Any]
    ) -> str:
        """Create prompt for LLM verification."""
        prompt = f"""
        Verify the quality and consistency of this fraud investigation:
        
        Initial Context:
        - Entity: {initial_context.get('entity_id')} ({initial_context.get('entity_type')})
        - Initial Risk Score: {self._extract_initial_risk(initial_context):.2f}
        
        Investigation Results:
        - Final Risk Score: {self._extract_final_risk(investigation_result, agent_results):.2f}
        - Domains Analyzed: {investigation_result.get('domains_completed', [])}
        - Tools Used: {len(investigation_result.get('tools_used', []))}
        
        Agent Findings Summary:
        {self._summarize_agent_findings(agent_results)}
        
        Please evaluate:
        1. Are the findings consistent with the risk assessment?
        2. Is there sufficient evidence to support the conclusion?
        3. Are there any red flags or inconsistencies?
        
        Provide a confidence score (0.0-1.0) for the investigation quality.
        """
        
        return prompt
    
    def _summarize_agent_findings(self, agent_results: Dict[str, Any]) -> str:
        """Summarize agent findings for verification prompt."""
        if not agent_results:
            return "No agent findings available"
        
        summary = []
        for agent_name, result in agent_results.items():
            if isinstance(result, dict):
                status = result.get('status', 'unknown')
                risk = result.get('risk_score', 'N/A')
                summary.append(f"- {agent_name}: status={status}, risk={risk}")
        
        return "\n".join(summary) if summary else "No findings to summarize"
    
    def _calculate_overall_score(
        self,
        extraction_status: DataExtractionStatus,
        risk_consistency: bool,
        evidence_met: bool,
        evidence_quality: float,
        llm_score: Optional[float],
        quality_assessment: Optional[QualityAssessment]
    ) -> float:
        """Calculate overall validation score."""
        scores = []
        weights = []
        
        # Data extraction score (30% weight)
        if extraction_status == DataExtractionStatus.SUCCESS:
            scores.append(100)
        elif extraction_status == DataExtractionStatus.PARTIAL:
            scores.append(60)
        else:
            scores.append(0)
        weights.append(0.3)
        
        # Risk consistency score (20% weight)
        scores.append(100 if risk_consistency else 0)
        weights.append(0.2)
        
        # Evidence threshold score (20% weight)
        evidence_score = 100 if evidence_met else 50
        evidence_score *= evidence_quality  # Adjust by quality
        scores.append(evidence_score)
        weights.append(0.2)
        
        # LLM verification score (15% weight if available)
        if llm_score is not None:
            scores.append(llm_score * 100)
            weights.append(0.15)
        
        # Quality assessment score (15% weight if available)
        if quality_assessment:
            scores.append(quality_assessment.overall_quality_score * 100)
            weights.append(0.15)
        
        # Normalize weights if some scores are missing
        total_weight = sum(weights)
        if total_weight < 1.0:
            remaining_weight = 1.0 - total_weight
            # Distribute remaining weight proportionally
            for i in range(len(weights)):
                weights[i] += weights[i] * (remaining_weight / total_weight)
        
        # Calculate weighted average
        overall_score = sum(s * w for s, w in zip(scores, weights))
        
        return min(100, max(0, overall_score))


# Global validator instance
_validator_instance = None

def get_enhanced_validator() -> EnhancedInvestigationValidator:
    """Get global enhanced validator instance."""
    global _validator_instance
    if _validator_instance is None:
        _validator_instance = EnhancedInvestigationValidator()
    return _validator_instance