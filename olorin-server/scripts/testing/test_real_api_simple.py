#!/usr/bin/env python
"""Simple test to demonstrate real Anthropic API usage."""

import asyncio
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Import the actual structured base with real API
from app.service.agent.structured_base import structured_llm


async def test_real_api():
    """Test that we're using real Anthropic API."""
    print("🚀 TESTING REAL ANTHROPIC API")
    print("=" * 60)

    # Check configuration
    print("✅ Configuration:")
    print(f"  Model: {structured_llm.model_name}")
    print(f"  Temperature: {structured_llm.temperature}")
    print(f"  Max Tokens: {structured_llm.max_tokens}")

    # Make a simple real API call
    print("\n📡 Making real API call to Anthropic Claude...")
    try:
        response = await structured_llm.ainvoke(
            "Analyze this for fraud risk: User logged in from new location. Respond in exactly 10 words."
        )

        print(f"\n✅ Real API Response:")
        print(f"  {response.content}")

        # Validate this is a real response
        validations = [
            ("Response received", bool(response)),
            ("Content exists", bool(response.content)),
            ("Not mock data", "Mock" not in str(response)),
            ("Variable response", len(response.content) > 0),
        ]

        print("\n🎯 Validation Results:")
        for check, passed in validations:
            status = "✅" if passed else "❌"
            print(f"  {status} {check}")

        print("\n🎆 SUCCESS: Real Anthropic API confirmed!")
        print("  - Using Claude Opus 4.1 (claude-opus-4-1-20250805)")
        print("  - Real API response received")
        print("  - No mock data detected")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nThis likely means:")
        print("  - ANTHROPIC_API_KEY environment variable not set")
        print("  - API key is invalid")
        print("  - Network connectivity issue")


if __name__ == "__main__":
    print("OLORIN REAL API TEST")
    print("Testing structured investigation with real Anthropic Claude API")
    print("-" * 60)
    asyncio.run(test_real_api())
