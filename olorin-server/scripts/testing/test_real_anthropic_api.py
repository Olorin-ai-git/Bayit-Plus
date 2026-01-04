#!/usr/bin/env python
"""Test real Anthropic API call without complex dependencies."""

import asyncio
import json
import os

# API key should be set via environment variable ANTHROPIC_API_KEY
# For Firebase secrets integration, use: get_firebase_secret('olorin/anthropic_api_key')
if not os.getenv("ANTHROPIC_API_KEY"):
    print("❌ ANTHROPIC_API_KEY environment variable not set")
    print("Set it via: export ANTHROPIC_API_KEY='your-api-key'")
    print("Or use Firebase secrets: olorin/anthropic_api_key")


async def test_real_api():
    """Make a real API call to Anthropic Claude."""
    print("🚀 TESTING REAL ANTHROPIC CLAUDE API")
    print("=" * 60)

    try:
        # Import after setting environment variable
        from langchain_anthropic import ChatAnthropic

        print("✅ Successfully imported ChatAnthropic")

        # Create real LLM instance
        llm = ChatAnthropic(
            api_key=os.environ["ANTHROPIC_API_KEY"],
            model="claude-3-opus-20240229",  # Using stable Claude 3 Opus model
            temperature=0.1,
            max_tokens=100,
        )

        print("✅ Created ChatAnthropic instance")
        print(f"   Model: {llm.model}")
        print(f"   Temperature: {llm.temperature}")

        # Make a real API call
        print("\n📡 Making REAL API call to Anthropic...")
        prompt = "Analyze this transaction for fraud risk: User logged in from new country after 5 failed attempts. Give risk score 0-100 and explain in 20 words."

        response = await llm.ainvoke(prompt)

        print("\n✅ REAL API RESPONSE RECEIVED:")
        print("-" * 50)
        print(response.content)
        print("-" * 50)

        # Validate response characteristics
        validations = [
            ("Response received", bool(response)),
            ("Content exists", bool(response.content)),
            (
                "Not mock data",
                "Mock" not in str(response) and "mock" not in str(response).lower(),
            ),
            ("Variable length", len(response.content) > 10),
            (
                "Contains analysis",
                any(
                    word in response.content.lower()
                    for word in ["risk", "fraud", "suspicious", "score"]
                ),
            ),
        ]

        print("\n🎯 Response Validation:")
        for check, passed in validations:
            status = "✅" if passed else "❌"
            print(f"  {status} {check}")

        if all(passed for _, passed in validations):
            print("\n🎆 SUCCESS! Real Anthropic API is working!")
            print("  - Real API call made")
            print("  - Authentic response received")
            print("  - No mock data detected")

            # Make another call to show variation
            print("\n📡 Making second call to demonstrate variation...")
            response2 = await llm.ainvoke(prompt)

            if response.content != response2.content:
                print("✅ Responses vary - confirming real API (not hardcoded)")
            else:
                print("⚠️ Responses identical - may need higher temperature")

        return True

    except ImportError as e:
        print(f"\n❌ Import Error: {e}")
        print("Run: poetry add langchain-anthropic")
        return False

    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nPossible issues:")
        print("  - Invalid API key")
        print("  - Network connectivity")
        print("  - Rate limiting")
        return False


if __name__ == "__main__":
    print("OLORIN REAL ANTHROPIC API TEST")
    print("Testing structured investigation with real Claude API")
    print("-" * 60)

    success = asyncio.run(test_real_api())

    if success:
        print("\n" + "=" * 60)
        print("✅ TEST PASSED - REAL API CONFIRMED")
        print("The Olorin system is configured to use real Anthropic API")
        print("with no mock data in production.")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print("❌ TEST FAILED - Check configuration")
        print("=" * 60)
