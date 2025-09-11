"""
Confidence Score Calculation Engine

This module performs weighted confidence calculations and determines
confidence levels based on consolidated scores.
"""

from typing import Dict, Union, Any, List

from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.metrics.safe import fmt_num
from .confidence_models import (
    ConfidenceFieldType,
    DEFAULT_COMPONENT_WEIGHTS,
    CONFIDENCE_THRESHOLDS,
    FALLBACK_CONFIDENCE,
    ConfidencePayload,
    ConfidenceCalculationError
)

logger = get_bridge_logger(__name__)


class ConfidenceCalculator:
    """Calculates weighted confidence scores and determines levels."""
    
    def __init__(self, component_weights: Dict[ConfidenceFieldType, float] = None):
        """
        Initialize calculator with component weights.
        
        Args:
            component_weights: Custom weights for different confidence types.
                             If None, uses default weights.
        """
        self.component_weights = component_weights or DEFAULT_COMPONENT_WEIGHTS.copy()
        self._validate_weights()
    
    def calculate_weighted_confidence(
        self, 
        confidence_values: Union[Dict[ConfidenceFieldType, float], Dict[str, Any]]
    ) -> float:
        """
        Calculate weighted overall confidence from available sources.
        
        Args:
            confidence_values: Dictionary of confidence values by type or raw dict
            
        Returns:
            Weighted overall confidence score (0.0-1.0)
            
        Raises:
            ConfidenceCalculationError: If input validation fails
        """
        # PRE-CALC GUARDS: Validate input before arithmetic operations
        try:
            validated_values = self._validate_and_sanitize_input(confidence_values)
        except Exception as e:
            logger.error(f"Input validation failed: {e}")
            raise ConfidenceCalculationError(f"Invalid confidence input: {e}")
        
        if not validated_values:
            logger.warning("No valid confidence values after validation, returning fallback")
            return FALLBACK_CONFIDENCE
        
        # If overall confidence is already calculated, use it
        if ConfidenceFieldType.OVERALL_CONFIDENCE in confidence_values:
            overall = confidence_values[ConfidenceFieldType.OVERALL_CONFIDENCE]
            logger.debug(f"Using pre-calculated overall confidence: {fmt_num(overall, 3)}")
            return overall
        
        # Calculate weighted average of available confidence types
        weighted_sum = 0.0
        total_weight = 0.0
        
        for field_type, value in validated_values.items():
            # Additional runtime validation for arithmetic safety
            if not isinstance(value, (int, float)) or not (-float('inf') < value < float('inf')):
                logger.warning(f"Skipping invalid value for {field_type}: {value}")
                continue
            if field_type in self.component_weights:
                weight = self.component_weights[field_type]
                weighted_sum += value * weight
                total_weight += weight
                logger.debug(f"  {field_type.value}: {fmt_num(value, 3)} × {fmt_num(weight, 2)} = {fmt_num(value * weight, 3)}")
        
        # If no weighted components, use simple average
        if total_weight == 0:
            valid_values = [v for v in validated_values.values() if isinstance(v, (int, float)) and -float('inf') < v < float('inf')]
            if not valid_values:
                logger.error("No valid numeric values found for confidence calculation")
                return FALLBACK_CONFIDENCE
            
            simple_avg = sum(valid_values) / len(valid_values)
            logger.debug(f"No weighted components found, using simple average: {fmt_num(simple_avg, 3)}")
            return simple_avg
        
        # Normalize by actual weights used
        result = min(1.0, max(0.0, weighted_sum / total_weight))
        
        logger.debug(f"Weighted confidence calculation:")
        logger.debug(f"  Total weighted sum: {fmt_num(weighted_sum, 3)}")
        logger.debug(f"  Total weight: {fmt_num(total_weight, 3)}")
        logger.debug(f"  Final result: {fmt_num(result, 3)}")
        
        return result
    
    def determine_confidence_level(self, confidence: float) -> str:
        """
        Determine human-readable confidence level from score.
        
        Args:
            confidence: Confidence score (0.0-1.0)
            
        Returns:
            Human-readable confidence level string
        """
        # Sort thresholds in descending order to find highest matching level
        sorted_thresholds = sorted(CONFIDENCE_THRESHOLDS.items(), 
                                 key=lambda x: x[1], reverse=True)
        
        for level, threshold in sorted_thresholds:
            if confidence >= threshold:
                return level
        
        return "MINIMAL"
    
    def calculate_confidence_distribution(
        self, 
        confidence_values: Dict[ConfidenceFieldType, float]
    ) -> Dict[str, float]:
        """
        Calculate how confidence is distributed across components.
        
        Args:
            confidence_values: Dictionary of confidence values by type
            
        Returns:
            Dictionary showing weight contribution of each component
        """
        distribution = {}
        total_weight = 0.0
        
        # Calculate total weight for normalization
        for field_type in confidence_values:
            if field_type in self.component_weights:
                total_weight += self.component_weights[field_type]
        
        # Calculate normalized distribution
        for field_type, value in confidence_values.items():
            if field_type in self.component_weights:
                weight = self.component_weights[field_type]
                normalized_weight = weight / total_weight if total_weight > 0 else 0
                contribution = value * normalized_weight
                distribution[field_type.value] = {
                    "value": value,
                    "weight": weight,
                    "normalized_weight": normalized_weight,
                    "contribution": contribution
                }
        
        return distribution
    
    def safe_calculate_weighted_confidence(
        self,
        confidence_values: Union[Dict[ConfidenceFieldType, float], Dict[str, Any]]
    ) -> tuple[float, List[str]]:
        """
        Safe wrapper that never throws exceptions, returns confidence and issues.
        
        Args:
            confidence_values: Confidence values dictionary
            
        Returns:
            Tuple of (confidence_score, data_quality_issues)
        """
        try:
            confidence = self.calculate_weighted_confidence(confidence_values)
            return confidence, []
        except ConfidenceCalculationError as e:
            logger.error(f"Confidence calculation error: {e}")
            return FALLBACK_CONFIDENCE, [str(e)]
        except Exception as e:
            logger.error(f"Unexpected error in confidence calculation: {e}")
            return FALLBACK_CONFIDENCE, [f"Unexpected calculation error: {e}"]
    
    def calculate_confidence_trend(
        self, 
        historical_confidences: list
    ) -> Dict[str, float]:
        """
        Calculate confidence trend metrics from historical data.
        
        Args:
            historical_confidences: List of historical confidence values
            
        Returns:
            Dictionary with trend metrics
        """
        if not historical_confidences or len(historical_confidences) < 2:
            return {
                "trend": "stable",
                "change_rate": 0.0,
                "volatility": 0.0,
                "direction": "neutral"
            }
        
        # Calculate change rate
        first_conf = historical_confidences[0]
        last_conf = historical_confidences[-1]
        change_rate = (last_conf - first_conf) / len(historical_confidences)
        
        # Calculate volatility (standard deviation)
        mean_conf = sum(historical_confidences) / len(historical_confidences)
        variance = sum((x - mean_conf) ** 2 for x in historical_confidences) / len(historical_confidences)
        volatility = variance ** 0.5
        
        # Determine trend direction
        if change_rate > 0.02:  # Increasing by more than 2% per step
            direction = "increasing"
        elif change_rate < -0.02:  # Decreasing by more than 2% per step  
            direction = "decreasing"
        else:
            direction = "stable"
        
        # Determine overall trend classification
        if volatility > 0.2:
            trend = "volatile"
        elif abs(change_rate) > 0.05:
            trend = "trending"
        else:
            trend = "stable"
        
        return {
            "trend": trend,
            "change_rate": change_rate,
            "volatility": volatility,
            "direction": direction,
            "mean": mean_conf,
            "latest": last_conf
        }
    
    def _validate_weights(self):
        """Validate that component weights are reasonable."""
        total_weight = sum(self.component_weights.values())
        
        if total_weight <= 0:
            raise ValueError("Total component weights must be positive")
        
        # Check for negative weights
        negative_weights = [k for k, v in self.component_weights.items() if v < 0]
        if negative_weights:
            raise ValueError(f"Negative weights not allowed: {negative_weights}")
        
        # Warn if weights don't sum to approximately 1.0
        if abs(total_weight - 1.0) > 0.1:
            logger.warning(f"Component weights sum to {fmt_num(total_weight, 3)}, expected ~1.0")
    
    def update_component_weights(self, new_weights: Dict[ConfidenceFieldType, float]):
        """
        Update component weights for calculation.
        
        Args:
            new_weights: New weights dictionary
        """
        old_weights = self.component_weights.copy()
        self.component_weights.update(new_weights)
        
        try:
            self._validate_weights()
            logger.info(f"Updated component weights: {len(new_weights)} changes")
        except ValueError as e:
            # Revert to old weights if validation fails
            self.component_weights = old_weights
            logger.error(f"Failed to update weights: {e}")
            raise
    
    def _validate_and_sanitize_input(
        self, 
        confidence_values: Union[Dict[ConfidenceFieldType, float], Dict[str, Any]]
    ) -> Dict[ConfidenceFieldType, float]:
        """
        Validate and sanitize confidence input with strict type checking.
        
        Args:
            confidence_values: Raw confidence values dictionary
            
        Returns:
            Validated and sanitized confidence values
            
        Raises:
            ConfidenceCalculationError: If validation fails
        """
        if not confidence_values:
            return {}
        
        # If input is already properly typed, validate the values
        if all(isinstance(k, ConfidenceFieldType) for k in confidence_values.keys()):
            validated = {}
            for field_type, value in confidence_values.items():
                try:
                    validated_value = self._validate_single_confidence_value(value, field_type.value)
                    validated[field_type] = validated_value
                except ValueError as e:
                    logger.warning(f"Skipping invalid {field_type.value}: {e}")
                    # Add to data quality issues but don't fail the calculation
                    continue
            return validated
        
        # If input is a raw dictionary, try to convert using ConfidencePayload
        try:
            # Create ConfidencePayload for validation
            payload_data = {}
            
            # Map common field names to payload fields
            field_mapping = {
                'snowflake_score': 'snowflake_score',
                'tool_score': 'tool_score', 
                'domain_score': 'domain_score',
                'pattern_score': 'pattern_score',
                'velocity_score': 'velocity_score',
                'ai_confidence': 'snowflake_score',
                'tool_confidence': 'tool_score',
                'domain_confidence': 'domain_score',
                'evidence_confidence': 'pattern_score',
                'confidence_score': 'velocity_score'
            }
            
            # Extract and map values
            for key, value in confidence_values.items():
                if isinstance(key, str) and key in field_mapping:
                    payload_field = field_mapping[key]
                    payload_data[payload_field] = value
                elif hasattr(key, 'value'):  # Handle enum-like objects
                    key_str = key.value if hasattr(key, 'value') else str(key)
                    if key_str in field_mapping:
                        payload_field = field_mapping[key_str]
                        payload_data[payload_field] = value
            
            # Validate using Pydantic
            payload = ConfidencePayload(**payload_data)
            
            # Check for data quality issues
            quality_issues = payload.get_data_quality_issues()
            if quality_issues:
                logger.warning(f"Data quality issues detected: {quality_issues}")
                # Route to data quality issues path but continue calculation
            
            # Convert to proper format
            return payload.to_confidence_dict()
            
        except Exception as e:
            raise ConfidenceCalculationError(
                f"Failed to validate confidence values: {e}. "
                f"Input must be Dict[ConfidenceFieldType, float] or compatible dict."
            )
    
    def _validate_single_confidence_value(self, value: Any, field_name: str) -> float:
        """
        Validate a single confidence value.
        
        Args:
            value: Value to validate
            field_name: Name of the field for error messages
            
        Returns:
            Validated float value
            
        Raises:
            ValueError: If value is invalid
        """
        if value is None:
            raise ValueError(f"{field_name} cannot be None")
        
        # Handle string representations
        if isinstance(value, str):
            try:
                value = float(value)
            except (ValueError, TypeError):
                raise ValueError(f"{field_name} must be a valid number, got '{value}'")
        
        # Ensure it's numeric
        if not isinstance(value, (int, float)):
            raise ValueError(f"{field_name} must be numeric, got {type(value).__name__}")
        
        # Check for NaN or infinite values
        if not (-float('inf') < value < float('inf')):
            raise ValueError(f"{field_name} must be finite, got {value}")
        
        # Check range
        float_value = float(value)
        if not (0.0 <= float_value <= 1.0):
            raise ValueError(f"{field_name} must be between 0.0 and 1.0, got {float_value}")
        
        return float_value
    
    def calculate_with_validation(
        self,
        raw_confidence_data: Dict[str, Any]
    ) -> tuple[float, List[str]]:
        """
        Calculate confidence with full validation and return quality issues.
        
        Args:
            raw_confidence_data: Raw confidence data dictionary
            
        Returns:
            Tuple of (confidence_score, data_quality_issues)
        """
        data_quality_issues = []
        
        try:
            # Validate using Pydantic payload
            payload = ConfidencePayload(**raw_confidence_data)
            
            # Get quality issues
            data_quality_issues = payload.get_data_quality_issues()
            
            # Calculate confidence
            confidence_dict = payload.to_confidence_dict()
            confidence_score = self.calculate_weighted_confidence(confidence_dict)
            
            return confidence_score, data_quality_issues
            
        except Exception as e:
            error_msg = f"Confidence calculation failed: {e}"
            logger.error(error_msg)
            data_quality_issues.append(error_msg)
            return FALLBACK_CONFIDENCE, data_quality_issues