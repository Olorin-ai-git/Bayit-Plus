"""
Query Validator Test Suite

Comprehensive tests for the multi-entity query validation system,
including complexity analysis, limits enforcement, and performance optimization.
"""

import pytest
from app.service.agent.multi_entity.query_validator import (
    MultiEntityQueryValidator,
    QueryComplexityLevel,
    get_query_validator,
    validate_multi_entity_query
)


class TestMultiEntityQueryValidator:
    """Test suite for query validator"""
    
    def test_simple_query_validation(self):
        """Test validation of simple queries"""
        validator = MultiEntityQueryValidator()
        
        result = validator.validate_query(
            boolean_logic="user123 AND transaction456",
            entity_ids=["user123", "transaction456"]
        )
        
        assert result.is_valid is True
        assert result.complexity_metrics.complexity_level == QueryComplexityLevel.SIMPLE
        assert len(result.validation_errors) == 0
        assert result.complexity_metrics.entity_count == 2
        assert result.complexity_metrics.operator_count == 1
    
    def test_complex_query_validation(self):
        """Test validation of complex queries"""
        validator = MultiEntityQueryValidator()
        
        # Create a complex nested query
        entities = [f"entity_{i}" for i in range(15)]
        boolean_logic = "((entity_0 AND entity_1) OR (entity_2 AND entity_3)) AND ((entity_4 OR entity_5) AND NOT entity_6)"
        
        result = validator.validate_query(
            boolean_logic=boolean_logic,
            entity_ids=entities
        )
        
        assert result.is_valid is True
        assert result.complexity_metrics.complexity_level in [QueryComplexityLevel.MODERATE, QueryComplexityLevel.COMPLEX]
        assert result.complexity_metrics.nesting_depth >= 2
        assert result.should_cache is True
    
    def test_entity_limit_validation(self):
        """Test entity count limit enforcement"""
        validator = MultiEntityQueryValidator(max_entities=5)
        
        # Test within limit
        result = validator.validate_query(
            boolean_logic="entity_1 AND entity_2",
            entity_ids=["entity_1", "entity_2", "entity_3"]
        )
        assert result.is_valid is True
        
        # Test exceeding limit
        entities = [f"entity_{i}" for i in range(10)]
        result = validator.validate_query(
            boolean_logic="entity_0 AND entity_1",
            entity_ids=entities
        )
        assert result.is_valid is False
        assert any("Too many entities" in error for error in result.validation_errors)
    
    def test_nesting_depth_validation(self):
        """Test nesting depth limit enforcement"""
        validator = MultiEntityQueryValidator(max_nesting_depth=3)
        
        # Test exceeding nesting depth
        boolean_logic = "((((entity_0 AND entity_1) OR entity_2) AND entity_3) OR entity_4)"
        entities = [f"entity_{i}" for i in range(5)]
        
        result = validator.validate_query(
            boolean_logic=boolean_logic,
            entity_ids=entities
        )
        
        assert result.is_valid is False
        assert any("Nesting too deep" in error for error in result.validation_errors)
    
    def test_expression_length_validation(self):
        """Test expression length limit enforcement"""
        validator = MultiEntityQueryValidator(max_expression_length=100)
        
        # Create very long expression
        entities = [f"entity_{i}" for i in range(20)]
        boolean_logic = " AND ".join(entities) * 3  # Make it very long
        
        result = validator.validate_query(
            boolean_logic=boolean_logic,
            entity_ids=entities
        )
        
        assert result.is_valid is False
        assert any("Expression too long" in error for error in result.validation_errors)
    
    def test_syntax_validation(self):
        """Test Boolean expression syntax validation"""
        validator = MultiEntityQueryValidator()
        entities = ["entity_1", "entity_2", "entity_3"]
        
        # Test unbalanced parentheses
        result = validator.validate_query("(entity_1 AND entity_2", entities)
        assert result.is_valid is False
        assert any("Unbalanced parentheses" in error for error in result.validation_errors)
        
        # Test consecutive operators
        result = validator.validate_query("entity_1 AND AND entity_2", entities)
        assert result.is_valid is False
        assert any("Consecutive operators" in error for error in result.validation_errors)
        
        # Test operator at start
        result = validator.validate_query("AND entity_1", entities)
        assert result.is_valid is False
        assert any("cannot start with" in error for error in result.validation_errors)
    
    def test_complexity_scoring(self):
        """Test complexity scoring algorithm"""
        validator = MultiEntityQueryValidator()
        
        # Simple query
        result1 = validator.validate_query("entity_1", ["entity_1"])
        
        # Complex query with multiple operators and nesting
        result2 = validator.validate_query(
            "((entity_1 AND entity_2) OR (entity_3 AND NOT entity_4)) AND entity_5",
            ["entity_1", "entity_2", "entity_3", "entity_4", "entity_5"]
        )
        
        assert result2.complexity_metrics.complexity_score > result1.complexity_metrics.complexity_score
        assert result2.complexity_metrics.estimated_execution_time_ms > result1.complexity_metrics.estimated_execution_time_ms
    
    def test_caching_recommendations(self):
        """Test caching strategy recommendations"""
        validator = MultiEntityQueryValidator()
        
        # Simple query - should not be cached
        result1 = validator.validate_query("entity_1", ["entity_1"])
        assert result1.should_cache is False
        
        # Complex query - should be cached
        entities = [f"entity_{i}" for i in range(15)]
        result2 = validator.validate_query(
            "entity_0 AND entity_1 AND entity_2",
            entities
        )
        assert result2.should_cache is True
    
    def test_rate_limiting_factors(self):
        """Test rate limiting factor calculation"""
        validator = MultiEntityQueryValidator()
        
        # Simple query - normal rate limiting
        result1 = validator.validate_query("entity_1", ["entity_1"])
        assert result1.rate_limit_factor == 1.0
        
        # Complex query - increased rate limiting
        entities = [f"entity_{i}" for i in range(25)]
        complex_logic = " AND ".join([f"entity_{i}" for i in range(20)])
        result2 = validator.validate_query(complex_logic, entities)
        assert result2.rate_limit_factor > 1.0
    
    def test_resource_usage_estimation(self):
        """Test resource usage estimation"""
        validator = MultiEntityQueryValidator()
        
        entities = [f"entity_{i}" for i in range(10)]
        boolean_logic = "entity_0 AND entity_1 AND entity_2"
        
        result = validator.validate_query(boolean_logic, entities)
        
        assert "memory_mb" in result.complexity_metrics.resource_usage_estimate
        assert "cpu_score" in result.complexity_metrics.resource_usage_estimate
        assert "database_queries" in result.complexity_metrics.resource_usage_estimate
        assert result.complexity_metrics.resource_usage_estimate["memory_mb"] > 0
    
    def test_duplicate_entity_detection(self):
        """Test duplicate entity detection"""
        validator = MultiEntityQueryValidator()
        
        entities_with_duplicates = ["entity_1", "entity_2", "entity_1", "entity_3"]
        result = validator.validate_query("entity_1 AND entity_2", entities_with_duplicates)
        
        assert result.is_valid is True  # Should still be valid
        assert any("duplicate" in warning.lower() for warning in result.warnings)
    
    def test_empty_query_validation(self):
        """Test empty query handling"""
        validator = MultiEntityQueryValidator()
        
        result = validator.validate_query("", [])
        assert result.is_valid is False
        assert any("Empty Boolean expression" in error for error in result.validation_errors)
        assert any("No entities provided" in error for error in result.validation_errors)
    
    def test_optimization_recommendations(self):
        """Test optimization recommendations generation"""
        validator = MultiEntityQueryValidator()
        
        # Query with many entities
        entities = [f"entity_{i}" for i in range(25)]
        result = validator.validate_query("entity_0 AND entity_1", entities)
        
        assert len(result.recommendations) > 0
        assert any("breaking query" in rec.lower() for rec in result.recommendations)
    
    def test_global_validator_instance(self):
        """Test global validator instance management"""
        validator1 = get_query_validator()
        validator2 = get_query_validator()
        
        # Should return same instance (singleton pattern)
        assert validator1 is validator2
    
    def test_convenience_validation_function(self):
        """Test convenience validation function"""
        result = validate_multi_entity_query(
            boolean_logic="entity_1 AND entity_2",
            entity_ids=["entity_1", "entity_2"]
        )
        
        assert result.is_valid is True
        assert result.complexity_metrics.entity_count == 2


class TestQueryValidatorPerformance:
    """Performance tests for query validator"""
    
    def test_validation_performance(self):
        """Test validator performance with large queries"""
        validator = MultiEntityQueryValidator(complexity_threshold=100.0)  # Higher threshold for performance test
        
        # Create large query within limits
        entities = [f"entity_{i}" for i in range(30)]
        boolean_logic = " AND ".join(entities[:15])
        
        import time
        start_time = time.time()
        result = validator.validate_query(boolean_logic, entities)
        validation_time = time.time() - start_time
        
        assert validation_time < 0.1  # Should validate in under 100ms
        assert result.is_valid is True
    
    def test_complexity_analysis_performance(self):
        """Test complexity analysis performance"""
        validator = MultiEntityQueryValidator()
        
        # Create deeply nested expression
        nested_expr = "entity_0"
        for i in range(1, 8):
            nested_expr = f"({nested_expr} AND entity_{i})"
        
        entities = [f"entity_{i}" for i in range(8)]
        
        import time
        start_time = time.time()
        result = validator.validate_query(nested_expr, entities)
        analysis_time = time.time() - start_time
        
        assert analysis_time < 0.05  # Should analyze in under 50ms
        assert result.complexity_metrics.nesting_depth >= 7


class TestQueryValidatorEdgeCases:
    """Edge case tests for query validator"""
    
    def test_special_characters_in_queries(self):
        """Test handling of special characters"""
        validator = MultiEntityQueryValidator()
        
        entities = ["entity_123", "entity_456"]
        result = validator.validate_query("entity_123 AND entity_456", entities)
        
        assert result.is_valid is True
    
    def test_case_insensitive_operators(self):
        """Test case insensitive operator handling"""
        validator = MultiEntityQueryValidator()
        
        entities = ["entity_1", "entity_2"]
        
        # Test lowercase
        result1 = validator.validate_query("entity_1 and entity_2", entities)
        assert result1.is_valid is True
        
        # Test mixed case
        result2 = validator.validate_query("entity_1 AND entity_2 or entity_1", entities)
        assert result2.is_valid is True
    
    def test_whitespace_handling(self):
        """Test proper whitespace handling"""
        validator = MultiEntityQueryValidator()
        
        entities = ["entity_1", "entity_2"]
        result = validator.validate_query("  entity_1   AND   entity_2  ", entities)
        
        assert result.is_valid is True
    
    def test_validation_error_handling(self):
        """Test validator error handling"""
        validator = MultiEntityQueryValidator()
        
        # Pass malformed data that might cause exceptions
        result = validator.validate_query(None, ["entity_1"])
        assert result.is_valid is False
        assert len(result.validation_errors) > 0