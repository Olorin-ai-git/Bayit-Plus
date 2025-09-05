"""
Boolean Search Logic Test Suite

Comprehensive tests for Boolean logic evaluation in multi-entity investigations.
Tests AND, OR, NOT operators with complex nested expressions and parentheses.
"""

import pytest
from app.models.multi_entity_investigation import BooleanQueryParser


class TestBooleanQueryParser:
    """Test suite for Boolean query parsing and evaluation"""
    
    def test_simple_and_operation(self):
        """Test basic AND operation"""
        parser = BooleanQueryParser(
            expression="user123 AND transaction456",
            entity_mapping={"user123": "user123", "transaction456": "transaction456"}
        )
        
        parse_result = parser.parse()
        assert parse_result["valid"] is True
        
        # Test True AND False = False
        result = parser.evaluate({"user123": True, "transaction456": False})
        assert result is False
        
        # Test True AND True = True
        result = parser.evaluate({"user123": True, "transaction456": True})
        assert result is True
        
        # Test False AND False = False
        result = parser.evaluate({"user123": False, "transaction456": False})
        assert result is False
    
    def test_simple_or_operation(self):
        """Test basic OR operation"""
        parser = BooleanQueryParser(
            expression="user123 OR transaction456",
            entity_mapping={"user123": "user123", "transaction456": "transaction456"}
        )
        
        parse_result = parser.parse()
        assert parse_result["valid"] is True
        
        # Test True OR False = True
        result = parser.evaluate({"user123": True, "transaction456": False})
        assert result is True
        
        # Test False OR True = True
        result = parser.evaluate({"user123": False, "transaction456": True})
        assert result is True
        
        # Test False OR False = False
        result = parser.evaluate({"user123": False, "transaction456": False})
        assert result is False
    
    def test_simple_not_operation(self):
        """Test basic NOT operation"""
        parser = BooleanQueryParser(
            expression="NOT user123",
            entity_mapping={"user123": "user123"}
        )
        
        parse_result = parser.parse()
        assert parse_result["valid"] is True
        
        # Test NOT True = False
        result = parser.evaluate({"user123": True})
        assert result is False
        
        # Test NOT False = True
        result = parser.evaluate({"user123": False})
        assert result is True
    
    def test_complex_nested_queries(self):
        """Test complex nested Boolean expressions"""
        parser = BooleanQueryParser(
            expression="(user123 AND transaction456) OR store789",
            entity_mapping={
                "user123": "user123", 
                "transaction456": "transaction456",
                "store789": "store789"
            }
        )
        
        parse_result = parser.parse()
        assert parse_result["valid"] is True
        
        # Test (True AND False) OR True = True
        result = parser.evaluate({
            "user123": True, 
            "transaction456": False, 
            "store789": True
        })
        assert result is True
        
        # Test (False AND False) OR False = False
        result = parser.evaluate({
            "user123": False, 
            "transaction456": False, 
            "store789": False
        })
        assert result is False
        
        # Test (True AND True) OR False = True
        result = parser.evaluate({
            "user123": True, 
            "transaction456": True, 
            "store789": False
        })
        assert result is True
    
    def test_parentheses_grouping(self):
        """Test parentheses precedence and grouping"""
        parser = BooleanQueryParser(
            expression="user123 AND (transaction456 OR store789)",
            entity_mapping={
                "user123": "user123", 
                "transaction456": "transaction456",
                "store789": "store789"
            }
        )
        
        parse_result = parser.parse()
        assert parse_result["valid"] is True
        
        # Test True AND (False OR True) = True
        result = parser.evaluate({
            "user123": True, 
            "transaction456": False, 
            "store789": True
        })
        assert result is True
        
        # Test True AND (False OR False) = False
        result = parser.evaluate({
            "user123": True, 
            "transaction456": False, 
            "store789": False
        })
        assert result is False
    
    def test_multiple_not_operations(self):
        """Test multiple NOT operations"""
        parser = BooleanQueryParser(
            expression="NOT user123 AND NOT transaction456",
            entity_mapping={"user123": "user123", "transaction456": "transaction456"}
        )
        
        parse_result = parser.parse()
        assert parse_result["valid"] is True
        
        # Test NOT True AND NOT True = False
        result = parser.evaluate({"user123": True, "transaction456": True})
        assert result is False
        
        # Test NOT False AND NOT False = True
        result = parser.evaluate({"user123": False, "transaction456": False})
        assert result is True
    
    def test_deeply_nested_expressions(self):
        """Test deeply nested Boolean expressions with multiple levels"""
        parser = BooleanQueryParser(
            expression="((user123 AND transaction456) OR (store789 AND merchant001)) AND location555",
            entity_mapping={
                "user123": "user123",
                "transaction456": "transaction456", 
                "store789": "store789",
                "merchant001": "merchant001",
                "location555": "location555"
            }
        )
        
        parse_result = parser.parse()
        assert parse_result["valid"] is True
        
        # Test complex nested evaluation
        result = parser.evaluate({
            "user123": True,
            "transaction456": False,
            "store789": True, 
            "merchant001": True,
            "location555": True
        })
        assert result is True  # ((True AND False) OR (True AND True)) AND True = True
    
    def test_invalid_syntax_handling(self):
        """Test handling of invalid Boolean expressions"""
        # Missing closing parenthesis
        parser = BooleanQueryParser(
            expression="(user123 AND transaction456",
            entity_mapping={"user123": "user123", "transaction456": "transaction456"}
        )
        
        parse_result = parser.parse()
        assert parse_result["valid"] is False
        assert "error" in parse_result
    
    def test_unknown_entity_handling(self):
        """Test handling of unknown entities in evaluation"""
        parser = BooleanQueryParser(
            expression="user123 AND unknown_entity",
            entity_mapping={"user123": "user123", "unknown_entity": "unknown_entity"}
        )
        
        parse_result = parser.parse()
        assert parse_result["valid"] is True
        
        # Should handle missing entity gracefully (treat as False)
        result = parser.evaluate({"user123": True})  # missing unknown_entity
        assert result is False
    
    def test_case_insensitive_operators(self):
        """Test case insensitive operator handling"""
        parser = BooleanQueryParser(
            expression="user123 and transaction456 or store789",
            entity_mapping={
                "user123": "user123",
                "transaction456": "transaction456", 
                "store789": "store789"
            }
        )
        
        parse_result = parser.parse()
        assert parse_result["valid"] is True
        
        result = parser.evaluate({
            "user123": True,
            "transaction456": False,
            "store789": False
        })
        assert result is False  # True AND False OR False = False
    
    def test_whitespace_handling(self):
        """Test proper whitespace handling in expressions"""
        parser = BooleanQueryParser(
            expression="  user123   AND   transaction456  ",
            entity_mapping={"user123": "user123", "transaction456": "transaction456"}
        )
        
        parse_result = parser.parse()
        assert parse_result["valid"] is True
        
        result = parser.evaluate({"user123": True, "transaction456": True})
        assert result is True
    
    def test_empty_expression_handling(self):
        """Test handling of empty or None expressions"""
        parser = BooleanQueryParser(
            expression="",
            entity_mapping={}
        )
        
        parse_result = parser.parse()
        assert parse_result["valid"] is False
        assert "error" in parse_result
    
    def test_single_entity_expression(self):
        """Test single entity expressions (no operators)"""
        parser = BooleanQueryParser(
            expression="user123",
            entity_mapping={"user123": "user123"}
        )
        
        parse_result = parser.parse()
        assert parse_result["valid"] is True
        
        result = parser.evaluate({"user123": True})
        assert result is True
        
        result = parser.evaluate({"user123": False})
        assert result is False


class TestBooleanQueryPerformance:
    """Performance tests for Boolean query evaluation"""
    
    def test_large_expression_performance(self):
        """Test performance with large Boolean expressions"""
        # Create expression with 50 entities connected with AND/OR
        entities = [f"entity_{i}" for i in range(50)]
        expression_parts = []
        
        for i in range(0, len(entities), 2):
            if i + 1 < len(entities):
                expression_parts.append(f"({entities[i]} AND {entities[i+1]})")
            else:
                expression_parts.append(entities[i])
        
        expression = " OR ".join(expression_parts)
        entity_mapping = {entity: entity for entity in entities}
        
        parser = BooleanQueryParser(
            expression=expression,
            entity_mapping=entity_mapping
        )
        
        import time
        start_time = time.time()
        parse_result = parser.parse()
        parse_time = time.time() - start_time
        
        assert parse_result["valid"] is True
        assert parse_time < 1.0  # Should parse in under 1 second
        
        # Test evaluation performance
        entity_results = {entity: i % 2 == 0 for i, entity in enumerate(entities)}
        
        start_time = time.time()
        result = parser.evaluate(entity_results)
        eval_time = time.time() - start_time
        
        assert isinstance(result, bool)
        assert eval_time < 0.5  # Should evaluate in under 0.5 seconds
    
    def test_deep_nesting_performance(self):
        """Test performance with deeply nested expressions"""
        # Create deeply nested expression: ((((a AND b) OR c) AND d) OR e)
        expression = "a"
        entity_mapping = {"a": "a"}
        
        for i in range(10):  # 10 levels deep
            entity = f"entity_{i}"
            entity_mapping[entity] = entity
            if i % 2 == 0:
                expression = f"({expression} AND {entity})"
            else:
                expression = f"({expression} OR {entity})"
        
        parser = BooleanQueryParser(
            expression=expression,
            entity_mapping=entity_mapping
        )
        
        import time
        start_time = time.time()
        parse_result = parser.parse()
        parse_time = time.time() - start_time
        
        assert parse_result["valid"] is True
        assert parse_time < 0.1  # Should parse quickly even with deep nesting


class TestBooleanQueryEdgeCases:
    """Edge case tests for Boolean query parsing"""
    
    def test_consecutive_operators(self):
        """Test handling of consecutive operators (invalid syntax)"""
        parser = BooleanQueryParser(
            expression="user123 AND AND transaction456",
            entity_mapping={"user123": "user123", "transaction456": "transaction456"}
        )
        
        parse_result = parser.parse()
        assert parse_result["valid"] is False
    
    def test_operator_at_start(self):
        """Test handling of operator at expression start (invalid syntax)"""
        parser = BooleanQueryParser(
            expression="AND user123",
            entity_mapping={"user123": "user123"}
        )
        
        parse_result = parser.parse()
        assert parse_result["valid"] is False
    
    def test_operator_at_end(self):
        """Test handling of operator at expression end (invalid syntax)"""
        parser = BooleanQueryParser(
            expression="user123 AND",
            entity_mapping={"user123": "user123"}
        )
        
        parse_result = parser.parse()
        assert parse_result["valid"] is False
    
    def test_mismatched_parentheses(self):
        """Test handling of mismatched parentheses"""
        # Extra closing parenthesis
        parser = BooleanQueryParser(
            expression="(user123 AND transaction456))",
            entity_mapping={"user123": "user123", "transaction456": "transaction456"}
        )
        
        parse_result = parser.parse()
        assert parse_result["valid"] is False
        
        # Extra opening parenthesis
        parser = BooleanQueryParser(
            expression="((user123 AND transaction456)",
            entity_mapping={"user123": "user123", "transaction456": "transaction456"}
        )
        
        parse_result = parser.parse()
        assert parse_result["valid"] is False
    
    def test_empty_parentheses(self):
        """Test handling of empty parentheses"""
        parser = BooleanQueryParser(
            expression="user123 AND ()",
            entity_mapping={"user123": "user123"}
        )
        
        parse_result = parser.parse()
        assert parse_result["valid"] is False
    
    def test_special_characters_in_entity_names(self):
        """Test handling of special characters in entity names"""
        parser = BooleanQueryParser(
            expression="user_123 AND transaction_456",
            entity_mapping={"user_123": "user_123", "transaction_456": "transaction_456"}
        )
        
        parse_result = parser.parse()
        assert parse_result["valid"] is True
        
        result = parser.evaluate({"user_123": True, "transaction_456": False})
        assert result is False