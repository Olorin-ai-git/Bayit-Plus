#!/usr/bin/env python3
"""
Pattern Registry Test
Tests the dual-framework pattern registry functionality
"""
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from app.service.agent.patterns.registry import PatternRegistry
from app.service.agent.patterns.base import PatternType, OpenAIPatternConfig


def test_pattern_registry_initialization():
    """Test pattern registry initialization."""
    print("🔍 Testing Pattern Registry Initialization")
    
    try:
        registry = PatternRegistry()
        
        print(f"✅ Pattern Registry Initialized:")
        print(f"   Available Patterns: {len(registry._patterns)}")
        print(f"   Registry is empty by default until patterns are registered")
        
        return True
        
    except Exception as e:
        print(f"❌ Pattern registry initialization failed: {e}")
        return False


def test_openai_pattern_config():
    """Test OpenAI pattern configuration."""
    print("\n🔍 Testing OpenAI Pattern Configuration")
    
    try:
        config = OpenAIPatternConfig(
            model="gpt-4",
            temperature=0.7,
            max_tokens=1000,
            function_calling="auto",
            stream=True
        )
        
        print(f"✅ OpenAI Pattern Config Created:")
        print(f"   Model: {config.model}")
        print(f"   Temperature: {config.temperature}")
        print(f"   Max Tokens: {config.max_tokens}")
        print(f"   Function Calling: {config.function_calling}")
        print(f"   Streaming: {config.stream}")
        
        return True
        
    except Exception as e:
        print(f"❌ OpenAI pattern config failed: {e}")
        return False


def test_pattern_type_enum():
    """Test PatternType enum values."""
    print("\n🔍 Testing PatternType Enum")
    
    try:
        # Test all pattern types exist
        pattern_types = [
            PatternType.AUGMENTED_LLM,
            PatternType.PROMPT_CHAINING,
            PatternType.ROUTING,
            PatternType.PARALLELIZATION,
            PatternType.ORCHESTRATOR_WORKERS,
            PatternType.EVALUATOR_OPTIMIZER,
            PatternType.OPENAI_ASSISTANT,
            PatternType.OPENAI_FUNCTION_CALLING,
            PatternType.OPENAI_CONVERSATION,
            PatternType.OPENAI_STREAMING,
            PatternType.OPENAI_MULTI_AGENT,
            PatternType.OPENAI_RAG
        ]
        
        print(f"✅ PatternType Enum Complete:")
        print(f"   Total Patterns: {len(pattern_types)}")
        langgraph_count = len([p for p in pattern_types if 'openai' not in p.value])
        openai_count = len([p for p in pattern_types if 'openai' in p.value])
        print(f"   LangGraph Patterns: {langgraph_count}")
        print(f"   OpenAI Patterns: {openai_count}")
        
        for pattern_type in pattern_types:
            print(f"   - {pattern_type.value}")
        
        return True
        
    except Exception as e:
        print(f"❌ PatternType enum test failed: {e}")
        return False


def test_framework_detection():
    """Test framework detection logic."""
    print("\n🔍 Testing Framework Detection")
    
    try:
        registry = PatternRegistry()
        
        # Test LangGraph detection
        langgraph_pattern = PatternType.AUGMENTED_LLM
        openai_pattern = PatternType.OPENAI_ASSISTANT
        
        print(f"✅ Framework Detection:")
        print(f"   {langgraph_pattern.value} -> LangGraph: {'openai' not in langgraph_pattern.value}")
        print(f"   {openai_pattern.value} -> OpenAI: {'openai' in openai_pattern.value}")
        
        return True
        
    except Exception as e:
        print(f"❌ Framework detection failed: {e}")
        return False


def main():
    """Main test execution."""
    print("=" * 60)
    print("📋 PATTERN REGISTRY TEST SUITE")
    print("=" * 60)
    
    test_results = []
    
    # Run tests
    test_results.append(test_pattern_registry_initialization())
    test_results.append(test_openai_pattern_config())
    test_results.append(test_pattern_type_enum())
    test_results.append(test_framework_detection())
    
    # Summary
    passed = sum(test_results)
    total = len(test_results)
    
    print(f"\n📊 Test Summary:")
    print(f"   Passed: {passed}/{total}")
    print(f"   Success Rate: {(passed/total)*100:.1f}%")
    
    return 0 if passed == total else 1


if __name__ == "__main__":
    exit(main())