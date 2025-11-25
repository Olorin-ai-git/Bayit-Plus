#!/usr/bin/env python3
"""
Tool Converter Test
Tests the conversion between LangGraph and OpenAI tool formats
"""
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from app.service.agent.patterns.openai.tool_converter import ToolConverter
from app.service.agent.tools.snowflake_tool.snowflake_tool import SnowflakeTool
from app.service.agent.tools.splunk_tool.splunk_tool import SplunkTool


def test_splunk_tool_conversion():
    """Test Splunk tool conversion to OpenAI format."""
    print("🔍 Testing Splunk Tool Conversion")

    try:
        splunk_tool = SplunkTool()
        converter = ToolConverter()

        # Convert to OpenAI format
        openai_function = converter.langchain_tool_to_openai_function(splunk_tool)

        print(f"✅ Splunk Tool Converted:")
        print(f"   Name: {openai_function['function']['name']}")
        print(f"   Description: {openai_function['function']['description']}")
        print(
            f"   Parameters: {list(openai_function['function']['parameters']['properties'].keys())}"
        )

        return True

    except Exception as e:
        print(f"❌ Splunk tool conversion failed: {e}")
        return False


def test_snowflake_tool_conversion():
    """Test Snowflake tool conversion to OpenAI format."""
    print("\n🔍 Testing Snowflake Tool Conversion")

    try:
        snowflake_tool = SnowflakeTool()
        converter = ToolConverter()

        # Convert to OpenAI format
        openai_function = converter.langchain_tool_to_openai_function(snowflake_tool)

        print(f"✅ Snowflake Tool Converted:")
        print(f"   Name: {openai_function['function']['name']}")
        print(f"   Description: {openai_function['function']['description']}")
        print(
            f"   Parameters: {list(openai_function['function']['parameters']['properties'].keys())}"
        )

        return True

    except Exception as e:
        print(f"❌ Snowflake tool conversion failed: {e}")
        return False


def test_batch_tool_conversion():
    """Test batch conversion of multiple tools."""
    print("\n🔍 Testing Batch Tool Conversion")

    try:
        tools = [SplunkTool(), SnowflakeTool()]
        converter = ToolConverter()

        # Convert all tools
        openai_functions = []
        for tool in tools:
            openai_function = converter.langchain_tool_to_openai_function(tool)
            openai_functions.append(openai_function)

        print(f"✅ Batch Conversion Successful:")
        print(f"   Total Tools Converted: {len(openai_functions)}")

        for func in openai_functions:
            print(f"   - {func['function']['name']}")

        return True

    except Exception as e:
        print(f"❌ Batch tool conversion failed: {e}")
        return False


def main():
    """Main test execution."""
    print("=" * 60)
    print("🔧 TOOL CONVERTER TEST SUITE")
    print("=" * 60)

    test_results = []

    # Run tests
    test_results.append(test_splunk_tool_conversion())
    test_results.append(test_snowflake_tool_conversion())
    test_results.append(test_batch_tool_conversion())

    # Summary
    passed = sum(test_results)
    total = len(test_results)

    print(f"\n📊 Test Summary:")
    print(f"   Passed: {passed}/{total}")
    print(f"   Success Rate: {(passed/total)*100:.1f}%")

    return 0 if passed == total else 1


if __name__ == "__main__":
    exit(main())
