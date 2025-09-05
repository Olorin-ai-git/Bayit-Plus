"""
Multi-Entity Query Validation and Complexity Analysis

Provides validation and complexity analysis for multi-entity Boolean queries
to prevent resource-intensive operations and ensure optimal performance.
"""

import re
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class QueryComplexityLevel(Enum):
    """Query complexity levels"""
    SIMPLE = "simple"
    MODERATE = "moderate"
    COMPLEX = "complex"
    EXCESSIVE = "excessive"


@dataclass
class QueryComplexityMetrics:
    """Query complexity analysis metrics"""
    entity_count: int
    operator_count: int
    nesting_depth: int
    expression_length: int
    complexity_score: float
    complexity_level: QueryComplexityLevel
    estimated_execution_time_ms: float
    resource_usage_estimate: Dict[str, float]


@dataclass
class QueryValidationResult:
    """Query validation result with details"""
    is_valid: bool
    complexity_metrics: QueryComplexityMetrics
    validation_errors: List[str]
    warnings: List[str]
    recommendations: List[str]
    should_cache: bool
    rate_limit_factor: float


class MultiEntityQueryValidator:
    """
    Advanced query validator for multi-entity Boolean expressions.
    
    Features:
    - Complexity analysis with scoring algorithms
    - Resource usage estimation
    - Performance-based recommendations
    - Rate limiting factor calculation
    - Caching strategy suggestions
    """
    
    def __init__(
        self,
        max_entities: int = 50,
        max_nesting_depth: int = 10,
        max_operators: int = 100,
        max_expression_length: int = 1000,
        complexity_threshold: float = 50.0
    ):
        self.max_entities = max_entities
        self.max_nesting_depth = max_nesting_depth
        self.max_operators = max_operators
        self.max_expression_length = max_expression_length
        self.complexity_threshold = complexity_threshold
        
        # Complexity weights for different query components
        self.weights = {
            "entity": 1.0,
            "and_operator": 2.0,
            "or_operator": 2.5,
            "not_operator": 1.5,
            "nesting_level": 3.0,
            "expression_length": 0.01
        }
        
        # Performance baselines (in milliseconds)
        self.execution_baselines = {
            QueryComplexityLevel.SIMPLE: 50,
            QueryComplexityLevel.MODERATE: 200,
            QueryComplexityLevel.COMPLEX: 500,
            QueryComplexityLevel.EXCESSIVE: 2000
        }
    
    def validate_query(
        self,
        boolean_logic: str,
        entity_ids: List[str],
        context: Optional[Dict[str, Any]] = None
    ) -> QueryValidationResult:
        """
        Perform comprehensive query validation and complexity analysis.
        
        Args:
            boolean_logic: Boolean expression to validate
            entity_ids: List of entity IDs involved in the query
            context: Additional context for validation (optional)
            
        Returns:
            QueryValidationResult with detailed analysis
        """
        try:
            # Initialize validation results
            errors = []
            warnings = []
            recommendations = []
            
            # Basic validation
            if not boolean_logic or not boolean_logic.strip():
                errors.append("Empty Boolean expression")
            
            if not entity_ids:
                errors.append("No entities provided")
            
            # Calculate complexity metrics
            complexity_metrics = self._analyze_complexity(boolean_logic, entity_ids)
            
            # Perform detailed validations
            self._validate_entity_limits(entity_ids, errors, warnings)
            self._validate_expression_syntax(boolean_logic, errors, warnings)
            self._validate_complexity_limits(complexity_metrics, errors, warnings)
            self._generate_recommendations(complexity_metrics, recommendations)
            
            # Determine caching strategy
            should_cache = self._should_cache_query(complexity_metrics)
            
            # Calculate rate limiting factor
            rate_limit_factor = self._calculate_rate_limit_factor(complexity_metrics)
            
            is_valid = len(errors) == 0
            
            logger.debug(f"Query validation completed: valid={is_valid}, "
                        f"complexity={complexity_metrics.complexity_level.value}, "
                        f"score={complexity_metrics.complexity_score:.2f}")
            
            return QueryValidationResult(
                is_valid=is_valid,
                complexity_metrics=complexity_metrics,
                validation_errors=errors,
                warnings=warnings,
                recommendations=recommendations,
                should_cache=should_cache,
                rate_limit_factor=rate_limit_factor
            )
            
        except Exception as e:
            logger.error(f"Query validation failed: {str(e)}")
            
            # Return error result with safe defaults
            expression_len = len(boolean_logic) if boolean_logic else 0
            entity_count = len(entity_ids) if entity_ids else 0
            
            return QueryValidationResult(
                is_valid=False,
                complexity_metrics=QueryComplexityMetrics(
                    entity_count=entity_count,
                    operator_count=0,
                    nesting_depth=0,
                    expression_length=expression_len,
                    complexity_score=0.0,
                    complexity_level=QueryComplexityLevel.SIMPLE,
                    estimated_execution_time_ms=0.0,
                    resource_usage_estimate={}
                ),
                validation_errors=[f"Validation error: {str(e)}"],
                warnings=[],
                recommendations=[],
                should_cache=False,
                rate_limit_factor=1.0
            )
    
    def _analyze_complexity(self, boolean_logic: str, entity_ids: List[str]) -> QueryComplexityMetrics:
        """Analyze query complexity and generate metrics"""
        
        # Count operators
        and_count = len(re.findall(r'\band\b', boolean_logic.lower()))
        or_count = len(re.findall(r'\bor\b', boolean_logic.lower()))
        not_count = len(re.findall(r'\bnot\b', boolean_logic.lower()))
        total_operators = and_count + or_count + not_count
        
        # Calculate nesting depth
        nesting_depth = self._calculate_nesting_depth(boolean_logic)
        
        # Expression metrics
        expression_length = len(boolean_logic)
        entity_count = len(entity_ids)
        
        # Calculate complexity score
        complexity_score = (
            entity_count * self.weights["entity"] +
            and_count * self.weights["and_operator"] +
            or_count * self.weights["or_operator"] +
            not_count * self.weights["not_operator"] +
            nesting_depth * self.weights["nesting_level"] +
            expression_length * self.weights["expression_length"]
        )
        
        # Determine complexity level
        if complexity_score <= 10:
            complexity_level = QueryComplexityLevel.SIMPLE
        elif complexity_score <= 25:
            complexity_level = QueryComplexityLevel.MODERATE
        elif complexity_score <= self.complexity_threshold:
            complexity_level = QueryComplexityLevel.COMPLEX
        else:
            complexity_level = QueryComplexityLevel.EXCESSIVE
        
        # Estimate execution time
        base_time = self.execution_baselines[complexity_level]
        entity_factor = max(1, entity_count / 10)  # Scale with entity count
        estimated_time = base_time * entity_factor
        
        # Estimate resource usage
        resource_usage = {
            "memory_mb": entity_count * 0.5 + complexity_score * 0.1,
            "cpu_score": complexity_score * 0.02,
            "database_queries": entity_count + total_operators,
            "cache_size_kb": entity_count * 2 + expression_length * 0.1
        }
        
        return QueryComplexityMetrics(
            entity_count=entity_count,
            operator_count=total_operators,
            nesting_depth=nesting_depth,
            expression_length=expression_length,
            complexity_score=complexity_score,
            complexity_level=complexity_level,
            estimated_execution_time_ms=estimated_time,
            resource_usage_estimate=resource_usage
        )
    
    def _calculate_nesting_depth(self, expression: str) -> int:
        """Calculate the maximum nesting depth of parentheses"""
        max_depth = 0
        current_depth = 0
        
        for char in expression:
            if char == '(':
                current_depth += 1
                max_depth = max(max_depth, current_depth)
            elif char == ')':
                current_depth -= 1
        
        return max_depth
    
    def _validate_entity_limits(self, entity_ids: List[str], errors: List[str], warnings: List[str]):
        """Validate entity count limits"""
        entity_count = len(entity_ids)
        
        if entity_count > self.max_entities:
            errors.append(f"Too many entities: {entity_count} (max: {self.max_entities})")
        elif entity_count > self.max_entities * 0.8:
            warnings.append(f"High entity count: {entity_count} (approaching limit of {self.max_entities})")
        
        # Check for duplicate entities
        unique_entities = set(entity_ids)
        if len(unique_entities) != entity_count:
            warnings.append(f"Duplicate entities detected: {entity_count - len(unique_entities)} duplicates")
    
    def _validate_expression_syntax(self, boolean_logic: str, errors: List[str], warnings: List[str]):
        """Validate Boolean expression syntax"""
        expression_length = len(boolean_logic)
        
        if expression_length > self.max_expression_length:
            errors.append(f"Expression too long: {expression_length} chars (max: {self.max_expression_length})")
        
        # Check for balanced parentheses
        paren_count = 0
        for char in boolean_logic:
            if char == '(':
                paren_count += 1
            elif char == ')':
                paren_count -= 1
                if paren_count < 0:
                    errors.append("Unbalanced parentheses: extra closing parenthesis")
                    break
        
        if paren_count > 0:
            errors.append("Unbalanced parentheses: missing closing parenthesis")
        
        # Check for consecutive operators (but allow NOT followed by other operators)
        if re.search(r'\b(and|or)\s+(and|or)\b', boolean_logic.lower()):
            errors.append("Consecutive operators detected (invalid syntax)")
        
        # Check for operators at start/end
        trimmed = boolean_logic.strip().lower()
        if re.match(r'^(and|or)\b', trimmed):
            errors.append("Expression cannot start with AND/OR operator")
        if re.search(r'\b(and|or)$', trimmed):
            errors.append("Expression cannot end with operator")
    
    def _validate_complexity_limits(self, metrics: QueryComplexityMetrics, errors: List[str], warnings: List[str]):
        """Validate complexity limits"""
        if metrics.nesting_depth > self.max_nesting_depth:
            errors.append(f"Nesting too deep: {metrics.nesting_depth} levels (max: {self.max_nesting_depth})")
        
        if metrics.operator_count > self.max_operators:
            errors.append(f"Too many operators: {metrics.operator_count} (max: {self.max_operators})")
        
        if metrics.complexity_score > self.complexity_threshold:
            errors.append(f"Query too complex: score {metrics.complexity_score:.1f} (max: {self.complexity_threshold})")
        elif metrics.complexity_level == QueryComplexityLevel.COMPLEX:
            warnings.append(f"Complex query detected: score {metrics.complexity_score:.1f}")
    
    def _generate_recommendations(self, metrics: QueryComplexityMetrics, recommendations: List[str]):
        """Generate optimization recommendations"""
        if metrics.entity_count > 20:
            recommendations.append("Consider breaking query into smaller entity groups")
        
        if metrics.nesting_depth > 5:
            recommendations.append("Simplify nested expressions for better performance")
        
        if metrics.complexity_level == QueryComplexityLevel.COMPLEX:
            recommendations.append("Query will be cached for improved performance")
        
        if metrics.estimated_execution_time_ms > 1000:
            recommendations.append("Query may take >1 second to execute - consider optimization")
        
        if metrics.operator_count > 50:
            recommendations.append("High operator count - consider using entity groups instead")
    
    def _should_cache_query(self, metrics: QueryComplexityMetrics) -> bool:
        """Determine if query should be cached based on complexity"""
        # Cache complex queries and queries with many entities
        return (
            metrics.complexity_level in [QueryComplexityLevel.COMPLEX, QueryComplexityLevel.MODERATE] or
            metrics.entity_count >= 10 or
            metrics.estimated_execution_time_ms > 500
        )
    
    def _calculate_rate_limit_factor(self, metrics: QueryComplexityMetrics) -> float:
        """Calculate rate limiting factor based on query complexity"""
        base_factor = 1.0
        
        # Increase rate limiting for complex queries
        if metrics.complexity_level == QueryComplexityLevel.EXCESSIVE:
            return 5.0  # 5x stricter rate limiting
        elif metrics.complexity_level == QueryComplexityLevel.COMPLEX:
            return 2.0  # 2x stricter rate limiting
        elif metrics.complexity_level == QueryComplexityLevel.MODERATE:
            return 1.5  # 1.5x stricter rate limiting
        
        return base_factor


# Global validator instance
_validator_instance: Optional[MultiEntityQueryValidator] = None


def get_query_validator() -> MultiEntityQueryValidator:
    """Get global query validator instance"""
    global _validator_instance
    
    if _validator_instance is None:
        _validator_instance = MultiEntityQueryValidator()
    
    return _validator_instance


def validate_multi_entity_query(
    boolean_logic: str,
    entity_ids: List[str],
    context: Optional[Dict[str, Any]] = None
) -> QueryValidationResult:
    """
    Convenience function for query validation.
    
    Args:
        boolean_logic: Boolean expression to validate
        entity_ids: List of entity IDs involved in the query
        context: Additional validation context
        
    Returns:
        QueryValidationResult with detailed analysis
    """
    validator = get_query_validator()
    return validator.validate_query(boolean_logic, entity_ids, context)