#!/usr/bin/env python3
"""
Simple OpenAI Assistant Pattern Test

Basic test to verify the OpenAI Assistant pattern works with the fraud detection tools.
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add the project root to the path
sys.path.append(str(Path(__file__).parent.parent))

from langchain_core.messages import HumanMessage

from app.service.agent.orchestration.graph_builder import _get_configured_tools
from app.service.agent.patterns.base import (
    OpenAIPatternConfig,
    PatternConfig,
    PatternType,
)
from app.service.agent.patterns.openai import (
    convert_langgraph_tools_to_openai_functions,
    get_function_calling_stats,
)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_basic_functionality():
    """Test basic OpenAI Assistant pattern functionality"""

    print("🧪 Testing OpenAI Assistant Pattern - Basic Functionality")
    print("=" * 60)

    try:
        # Test 1: Get configured tools
        print("\n1️⃣ Testing tool configuration...")
        tools = _get_configured_tools()
        print(f"✅ Found {len(tools)} configured tools:")
        for tool in tools:
            print(f"   • {tool.name}: {tool.description[:50]}...")

        if not tools:
            print("❌ No tools found - this may be due to missing dependencies")
            return False

        # Test 2: Convert tools to OpenAI functions
        print("\n2️⃣ Testing tool conversion...")
        function_definitions = convert_langgraph_tools_to_openai_functions(tools)
        print(f"✅ Converted {len(function_definitions)} tools to OpenAI functions:")

        for func_def in function_definitions:
            print(f"   • {func_def['name']}: {func_def['description'][:50]}...")

        if not function_definitions:
            print("❌ Tool conversion failed")
            return False

        # Test 3: Check conversion stats
        print("\n3️⃣ Testing conversion statistics...")
        stats = get_function_calling_stats(tools)
        print(f"✅ Conversion Statistics:")
        print(f"   • Total tools: {stats['total_tools']}")
        print(f"   • Convertible tools: {stats['convertible_tools']}")
        print(
            f"   • Success rate: {(stats['convertible_tools']/stats['total_tools']*100):.1f}%"
        )
        print(f"   • Tools by type: {stats['tools_by_type']}")

        # Test 4: Pattern configuration
        print("\n4️⃣ Testing pattern configuration...")

        pattern_config = PatternConfig(
            pattern_type=PatternType.OPENAI_ASSISTANT,
            max_iterations=3,
            confidence_threshold=0.8,
            timeout_seconds=60,
        )

        openai_config = OpenAIPatternConfig(
            model="gpt-4o",
            temperature=0.1,
            assistant_name="Fraud Detective Test",
            stream=False,  # Disable streaming for basic test
        )

        print("✅ Pattern configuration created successfully")
        print(f"   • Pattern type: {pattern_config.pattern_type}")
        print(f"   • OpenAI model: {openai_config.model}")
        print(f"   • Temperature: {openai_config.temperature}")

        # Test 5: Import the pattern class (without instantiation)
        print("\n5️⃣ Testing pattern import...")

        from app.service.agent.patterns.openai import OpenAIAssistantPattern

        print("✅ OpenAI Assistant pattern imported successfully")

        # Test 6: Check pattern registry
        print("\n6️⃣ Testing pattern registry...")

        from app.service.agent.patterns.registry import get_pattern_registry

        registry = get_pattern_registry()
        available_patterns = registry.get_available_patterns()

        if PatternType.OPENAI_ASSISTANT in available_patterns:
            print("✅ OpenAI Assistant pattern registered in registry")
        else:
            print("❌ OpenAI Assistant pattern NOT registered")
            return False

        registry_info = registry.get_registry_info()
        print(
            f"✅ Registry info: {registry_info['openai_patterns']} OpenAI patterns available"
        )

        print("\n🎉 All basic tests PASSED!")
        print("The OpenAI Assistant pattern is ready for fraud detection!")
        return True

    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(test_basic_functionality())
    exit(0 if success else 1)
