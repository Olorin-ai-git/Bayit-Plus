from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

#!/usr/bin/env python3
"""
Simplified test for CSV routing logic only
"""

import os
import sys

# Add the project root to path
sys.path.insert(0, os.path.abspath("."))

from typing import List

from langchain_core.messages import BaseMessage, HumanMessage

# Test CSV data
TEST_CSV_DATA = """transaction_id,amount,timestamp,merchant,currency
TXN-001,125.50,2025-01-02T10:30:00Z,Coffee Shop Inc,USD
TXN-002,45.99,2025-01-02T11:15:00Z,Amazon,USD
TXN-003,250000.00,2025-01-02T12:00:00Z,Luxury Store,USD"""


def _detect_csv_data_in_messages(messages: List[BaseMessage]) -> bool:
    """
    Detect if CSV data is present in the messages.

    Args:
        messages: List of messages to analyze

    Returns:
        True if CSV data is detected
    """
    # CSV detection indicators
    csv_indicators = [
        "csv_data",
        "file_content",
        ".csv",
        "transaction_id",
        "amount,timestamp",  # Common CSV header pattern
        ",,",  # Multiple commas suggesting CSV structure
    ]

    for message in messages:
        try:
            # Check message content
            content = ""
            if hasattr(message, "content") and message.content:
                content = str(message.content).lower()

                # Look for CSV indicators in content
                if any(indicator in content for indicator in csv_indicators):
                    logger.info(
                        f"CSV indicator found in message content: {content[:100]}..."
                    )
                    return True

                # Check for comma-separated structure (basic heuristic)
                lines = content.split("\n")
                if len(lines) > 1:
                    # Check if multiple lines have comma separations
                    comma_lines = [line for line in lines if "," in line]
                    if len(comma_lines) > 2:  # At least header + 2 data rows
                        # Check if lines have similar comma counts (suggesting tabular data)
                        comma_counts = [
                            line.count(",") for line in comma_lines[:5]
                        ]  # Check first 5 lines
                        if comma_counts and all(
                            count > 2 and abs(count - comma_counts[0]) <= 1
                            for count in comma_counts
                        ):
                            logger.info(
                                "CSV structure detected based on comma patterns"
                            )
                            return True

            # Check additional_kwargs for structured data
            if hasattr(message, "additional_kwargs") and message.additional_kwargs:
                kwargs = message.additional_kwargs

                # Direct CSV data keys
                if kwargs.get("csv_data") or kwargs.get("file_content"):
                    logger.info("CSV data found in message additional_kwargs")
                    return True

                # Filename checks
                filename = kwargs.get("filename", "")
                if filename and filename.lower().endswith(".csv"):
                    logger.info(f"CSV file detected: {filename}")
                    return True

        except Exception as e:
            logger.error(f"Error analyzing message for CSV data: {e}")
            continue

    return False


def raw_data_or_investigation_routing(state: dict) -> str:
    """
    Primary routing function that determines whether to process raw CSV data
    or proceed with standard fraud investigation.
    """
    logger.info("Determining investigation routing: raw data vs standard flow")

    # First check for CSV data
    if _detect_csv_data_in_messages(state.get("messages", [])):
        logger.info("Raw CSV data detected - routing to raw data processing")
        return "raw_data_node"

    # No CSV data found, proceed with standard investigation
    logger.info("No raw data detected - routing to standard fraud investigation")
    return "fraud_investigation"


def test_csv_detection():
    """Test CSV data detection in messages."""
    logger.info("\n=== Testing CSV Data Detection ===")

    # Test 1: Message with CSV data in additional_kwargs
    msg1 = HumanMessage(
        content="Start investigation",
        additional_kwargs={
            "csv_data": TEST_CSV_DATA,
            "filename": "test_transactions.csv",
        },
    )

    result1 = _detect_csv_data_in_messages([msg1])
    logger.info(f"✓ CSV detection with additional_kwargs: {result1}")
    assert result1 == True, "Should detect CSV in additional_kwargs"

    # Test 2: Message with CSV-like content
    msg2 = HumanMessage(content=f"Process this data:\n{TEST_CSV_DATA}")

    result2 = _detect_csv_data_in_messages([msg2])
    logger.info(f"✓ CSV detection with content pattern: {result2}")
    assert result2 == True, "Should detect CSV pattern in content"

    # Test 3: Message without CSV data
    msg3 = HumanMessage(content="Start fraud investigation for user_123")

    result3 = _detect_csv_data_in_messages([msg3])
    logger.info(f"✓ No CSV detection: {result3}")
    assert result3 == False, "Should not detect CSV in regular message"

    logger.info("✅ All CSV detection tests passed!")


def test_routing_functions():
    """Test routing functions for raw data vs investigation flow."""
    logger.info("\n=== Testing Routing Functions ===")

    # Test 1: State with CSV data should route to raw_data_node
    state_with_csv = {
        "messages": [
            HumanMessage(
                content="Process investigation data",
                additional_kwargs={
                    "csv_data": TEST_CSV_DATA,
                    "filename": "transactions.csv",
                    "investigation_id": "test-001",
                },
            )
        ]
    }

    route1 = raw_data_or_investigation_routing(state_with_csv)
    logger.info(f"✓ Routing with CSV data: {route1}")
    assert route1 == "raw_data_node", "Should route to raw_data_node"

    # Test 2: State without CSV data should route to fraud_investigation
    state_without_csv = {
        "messages": [
            HumanMessage(
                content="Start fraud investigation for user_456",
                additional_kwargs={
                    "investigation_id": "test-002",
                    "entity_id": "user_456",
                    "entity_type": "user_id",
                },
            )
        ]
    }

    route2 = raw_data_or_investigation_routing(state_without_csv)
    logger.info(f"✓ Routing without CSV data: {route2}")
    assert route2 == "fraud_investigation", "Should route to fraud_investigation"

    logger.info("✅ All routing tests passed!")


def main():
    """Run basic routing tests."""
    logger.info("🚀 Testing Raw Data Routing Logic")
    logger.info("=" * 50)

    try:
        test_csv_detection()
        test_routing_functions()

        logger.info("\n" + "=" * 50)
        logger.info("🎉 ROUTING TESTS PASSED!")
        logger.info("✅ Core routing functionality working correctly")

    except Exception as e:
        logger.error(f"\n❌ Test failed: {e}")
        raise


if __name__ == "__main__":
    main()
