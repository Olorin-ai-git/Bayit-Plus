#!/usr/bin/env python3
"""
Test Context Propagation and Entity Drift Prevention

Validates that investigation context is properly propagated to tools
and entity drift is detected and prevented.
"""

import sys
import os
import pytest
from unittest.mock import Mock, patch

# Add the project root to Python path
sys.path.insert(0, os.path.abspath('../..'))

from app.service.agent.orchestration.hybrid.state.query_context import (
    QueryContext, create_query_context, validate_tool_context
)


def test_query_context_creation():
    """Test QueryContext creation and validation."""
    print("🧪 Testing QueryContext Creation")
    print("=" * 35)
    
    # Test valid context creation
    context = create_query_context(
        investigation_id="test_context_001",
        entity_id="192.168.1.100",
        entity_type="ip_address",
        date_range_days=7
    )
    
    print(f"   Created context: {context}")
    
    # Validate basic properties
    assert context.investigation_id == "test_context_001"
    assert context.entity_id == "192.168.1.100"
    assert context.entity_type == "ip_address"
    assert context.date_range_days == 7
    
    print("   ✅ Basic properties validated")
    
    # Test query parameters
    params = context.get_query_parameters()
    required_fields = ["investigation_id", "entity_id", "entity_type", "start_date", "end_date", "date_range_days"]
    
    for field in required_fields:
        assert field in params, f"Missing required field: {field}"
    
    print(f"   ✅ Query parameters contain all required fields: {list(params.keys())}")
    
    # Test tool context creation
    tool_context = context.create_tool_context("snowflake_query")
    
    assert "investigation_context" in tool_context
    assert "query_parameters" in tool_context
    assert tool_context["tool_name"] == "snowflake_query"
    
    print("   ✅ Tool context creation validated")
    
    return True


def test_entity_consistency_validation():
    """Test entity consistency validation to prevent drift."""
    print("\n🧪 Testing Entity Consistency Validation")
    print("=" * 40)
    
    context = create_query_context(
        investigation_id="test_drift_001",
        entity_id="203.0.113.45",
        entity_type="ip_address"
    )
    
    # Test cases for entity validation
    test_cases = [
        ("203.0.113.45", True, "Exact match"),
        ("203.0.113.45 ", True, "With trailing space"),
        (" 203.0.113.45", True, "With leading space"),
        ("203.0.113.45\n", True, "With newline"),
        ("192.168.1.100", False, "Different IP"),
        ("", False, "Empty string"),
        (None, False, "None value"),
        ("unknown", False, "Unknown entity")
    ]
    
    for test_entity, expected, description in test_cases:
        result = context.validate_entity_consistency(test_entity)
        status = "✅" if result == expected else "❌"
        print(f"   {status} {description}: '{test_entity}' -> {result}")
        
        if result != expected:
            print(f"     Expected: {expected}, Got: {result}")
            return False
    
    print("   ✅ All entity consistency tests passed")
    return True


def test_query_formatting():
    """Test entity formatting for different query types."""
    print("\n🧪 Testing Query Formatting")
    print("=" * 28)
    
    context = create_query_context(
        investigation_id="test_format_001",
        entity_id="user@domain.com",
        entity_type="email"
    )
    
    # Test SQL formatting (escape single quotes)
    sql_formatted = context.format_entity_for_query("sql")
    print(f"   SQL formatted: {sql_formatted}")
    
    # Test API formatting (URL encode)
    api_formatted = context.format_entity_for_query("api")
    print(f"   API formatted: {api_formatted}")
    
    # Test default formatting
    default_formatted = context.format_entity_for_query("default")
    print(f"   Default formatted: {default_formatted}")
    
    # Validate SQL escaping works
    context_with_quotes = create_query_context(
        investigation_id="test_quotes_001",
        entity_id="user's email",
        entity_type="text"
    )
    
    sql_escaped = context_with_quotes.format_entity_for_query("sql")
    expected_escaped = "user''s email"
    
    if sql_escaped == expected_escaped:
        print("   ✅ SQL escaping works correctly")
    else:
        print(f"   ❌ SQL escaping failed: expected '{expected_escaped}', got '{sql_escaped}'")
        return False
    
    return True


def test_tool_context_validation():
    """Test tool context validation function."""
    print("\n🧪 Testing Tool Context Validation")
    print("=" * 35)
    
    # Valid tool context
    valid_context = {
        "tool_name": "snowflake_query",
        "investigation_context": {
            "investigation_id": "test_valid_001",
            "entity_id": "192.168.1.100",
            "entity_type": "ip_address"
        },
        "query_parameters": {},
        "execution_timestamp": "2025-01-01T12:00:00"
    }
    
    if validate_tool_context(valid_context):
        print("   ✅ Valid context accepted")
    else:
        print("   ❌ Valid context rejected")
        return False
    
    # Invalid contexts
    invalid_contexts = [
        ({}, "Empty context"),
        ({"tool_name": "test"}, "Missing investigation_context"),
        ({
            "investigation_context": {
                "investigation_id": "test"
                # Missing entity_id and entity_type
            }
        }, "Missing required fields"),
        ({
            "investigation_context": {
                "investigation_id": "",
                "entity_id": "test",
                "entity_type": "ip"
            }
        }, "Empty investigation_id")
    ]
    
    for invalid_context, description in invalid_contexts:
        if validate_tool_context(invalid_context):
            print(f"   ❌ Invalid context accepted: {description}")
            return False
        else:
            print(f"   ✅ Invalid context rejected: {description}")
    
    return True


def test_state_integration():
    """Test QueryContext integration with state objects."""
    print("\n🧪 Testing State Integration")
    print("=" * 26)
    
    # Mock investigation state
    state = {
        "investigation_id": "test_state_001",
        "entity_id": "67.76.8.209",
        "entity_type": "ip_address",
        "date_range_days": 14,
        "current_phase": "tool_execution"
    }
    
    # Create context from state
    context = QueryContext.from_state(state)
    
    print(f"   Context from state: {context}")
    
    # Validate state mapping
    assert context.investigation_id == state["investigation_id"]
    assert context.entity_id == state["entity_id"]
    assert context.entity_type == state["entity_type"]
    assert context.date_range_days == state["date_range_days"]
    
    print("   ✅ State mapping validated")
    
    # Test serialization
    context_dict = context.to_dict()
    required_fields = ["investigation_id", "entity_id", "entity_type", "date_range_days", "start_date", "end_date"]
    
    for field in required_fields:
        if field not in context_dict:
            print(f"   ❌ Missing field in serialization: {field}")
            return False
    
    print("   ✅ Serialization validated")
    
    return True


def run_all_tests():
    """Run all context propagation tests."""
    print("🎯 Running Context Propagation Tests\n")
    
    tests = [
        ("QueryContext Creation", test_query_context_creation),
        ("Entity Consistency Validation", test_entity_consistency_validation),
        ("Query Formatting", test_query_formatting),
        ("Tool Context Validation", test_tool_context_validation),
        ("State Integration", test_state_integration)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*60}")
        print(f"Running: {test_name}")
        print('='*60)
        
        try:
            result = test_func()
            results.append((test_name, result))
            
            if result:
                print(f"\n✅ {test_name}: PASSED")
            else:
                print(f"\n❌ {test_name}: FAILED")
                
        except Exception as e:
            print(f"\n💥 {test_name}: ERROR - {str(e)}")
            results.append((test_name, False))
    
    # Summary
    print(f"\n{'='*60}")
    print("TEST SUMMARY")
    print('='*60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {status}: {test_name}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL CONTEXT PROPAGATION TESTS PASSED!")
        print("   ✅ Entity drift prevention working")
        print("   ✅ Context validation working")
        print("   ✅ Query formatting working")
        print("   ✅ State integration working")
        return True
    else:
        print("⚠️ Some tests failed - context propagation needs more work")
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)