#!/usr/bin/env python3
"""
Test Investigation Comparison Feature

Tests the investigation comparison backend by:
1. Fetching existing investigations from the database
2. Finding two investigations with matching entities
3. Running a comparison between them
4. Validating the response structure and metrics

Constitutional Compliance:
- Uses real database queries (no mocks)
- Tests actual comparison logic
- Validates response structure
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from typing import Any, Dict, List, Optional

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.persistence import list_investigations
from app.router.models.investigation_comparison_models import (
    ComparisonRequest,
    WindowSpec,
)
from app.service.investigation.comparison_service import compare_windows
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def get_investigations_with_entities() -> List[Dict[str, Any]]:
    """Fetch investigations that have entity_type and entity_id."""
    try:
        investigations = list_investigations()
        logger.info(f"Found {len(investigations)} total investigations")

        # Filter investigations with entity information
        valid_investigations = []
        for inv in investigations:
            if inv.get("entity_type") and inv.get("entity_id"):
                # Also check for time windows
                if inv.get("from") and inv.get("to"):
                    valid_investigations.append(inv)

        logger.info(
            f"Found {len(valid_investigations)} investigations with entity and time window"
        )
        return valid_investigations
    except Exception as e:
        logger.error(f"Error fetching investigations: {e}")
        return []


def find_comparable_investigations(
    investigations: List[Dict[str, Any]],
) -> Optional[tuple]:
    """Find two investigations with matching entities that can be compared."""
    # Group by entity type and value
    entity_groups: Dict[str, List[Dict[str, Any]]] = {}

    for inv in investigations:
        entity_type = inv.get("entity_type", "").lower()
        entity_id = inv.get("entity_id", "")

        if entity_type and entity_id:
            key = f"{entity_type}:{entity_id}"
            if key not in entity_groups:
                entity_groups[key] = []
            entity_groups[key].append(inv)

    # Find a group with at least 2 investigations
    for key, group in entity_groups.items():
        if len(group) >= 2:
            logger.info(f"Found {len(group)} investigations for entity {key}")
            return (group[0], group[1])

    logger.warning("No matching entity pairs found for comparison")
    return None


async def test_comparison(
    inv_a: Dict[str, Any], inv_b: Dict[str, Any]
) -> Dict[str, Any]:
    """Run comparison between two investigations."""
    try:
        # Map investigation entity_type to comparison entity type
        entity_type_map = {
            "email": "email",
            "phone": "phone",
            "device_id": "device_id",
            "ip": "ip",
            "account_id": "account_id",
            "card_fingerprint": "card_fingerprint",
            "merchant_id": "merchant_id",
            "user_id": "account_id",
        }

        inv_entity_type = inv_a.get("entity_type", "").lower()
        mapped_type = entity_type_map.get(inv_entity_type, inv_entity_type)

        # Build comparison request
        request = ComparisonRequest(
            entity=(
                {"type": mapped_type, "value": inv_a.get("entity_id", "")}
                if mapped_type and inv_a.get("entity_id")
                else None
            ),
            windowA=WindowSpec(
                preset="custom",
                start=inv_a.get("from"),
                end=inv_a.get("to"),
                label=inv_a.get("name") or f"Investigation {inv_a.get('id', 'A')}",
            ),
            windowB=WindowSpec(
                preset="custom",
                start=inv_b.get("from"),
                end=inv_b.get("to"),
                label=inv_b.get("name") or f"Investigation {inv_b.get('id', 'B')}",
            ),
            risk_threshold=0.7,
            options={
                "include_per_merchant": True,
                "max_merchants": 25,
                "include_histograms": False,
                "include_timeseries": False,
            },
        )

        logger.info(f"Running comparison:")
        logger.info(f"  Entity: {request.entity['type']}:{request.entity['value']}")
        logger.info(f"  Window A: {request.windowA.start} to {request.windowA.end}")
        logger.info(f"  Window B: {request.windowB.start} to {request.windowB.end}")

        # Run comparison
        response = await compare_windows(request)

        # Validate response structure
        assert hasattr(response, "entity"), "Response missing entity"
        assert hasattr(response, "threshold"), "Response missing threshold"
        assert hasattr(response, "windowA"), "Response missing windowA"
        assert hasattr(response, "windowB"), "Response missing windowB"
        assert hasattr(response, "A"), "Response missing A metrics"
        assert hasattr(response, "B"), "Response missing B metrics"
        assert hasattr(response, "delta"), "Response missing delta"
        assert hasattr(
            response, "investigation_summary"
        ), "Response missing investigation_summary"

        # Validate metrics structure
        metrics_a = response.A
        metrics_b = response.B
        delta = response.delta

        assert hasattr(
            metrics_a, "total_transactions"
        ), "Window A missing total_transactions"
        assert hasattr(metrics_a, "over_threshold"), "Window A missing over_threshold"
        assert hasattr(metrics_a, "TP"), "Window A missing TP"
        assert hasattr(metrics_a, "FP"), "Window A missing FP"
        assert hasattr(metrics_a, "TN"), "Window A missing TN"
        assert hasattr(metrics_a, "FN"), "Window A missing FN"
        assert hasattr(metrics_a, "precision"), "Window A missing precision"
        assert hasattr(metrics_a, "recall"), "Window A missing recall"
        assert hasattr(metrics_a, "f1"), "Window A missing f1"
        assert hasattr(metrics_a, "accuracy"), "Window A missing accuracy"
        assert hasattr(metrics_a, "fraud_rate"), "Window A missing fraud_rate"

        assert hasattr(
            metrics_b, "total_transactions"
        ), "Window B missing total_transactions"
        assert hasattr(metrics_b, "over_threshold"), "Window B missing over_threshold"
        assert hasattr(metrics_b, "TP"), "Window B missing TP"
        assert hasattr(metrics_b, "FP"), "Window B missing FP"
        assert hasattr(metrics_b, "TN"), "Window B missing TN"
        assert hasattr(metrics_b, "FN"), "Window B missing FN"
        assert hasattr(metrics_b, "precision"), "Window B missing precision"
        assert hasattr(metrics_b, "recall"), "Window B missing recall"
        assert hasattr(metrics_b, "f1"), "Window B missing f1"
        assert hasattr(metrics_b, "accuracy"), "Window B missing accuracy"
        assert hasattr(metrics_b, "fraud_rate"), "Window B missing fraud_rate"

        assert hasattr(delta, "precision"), "Delta missing precision"
        assert hasattr(delta, "recall"), "Delta missing recall"
        assert hasattr(delta, "f1"), "Delta missing f1"
        assert hasattr(delta, "accuracy"), "Delta missing accuracy"
        assert hasattr(delta, "fraud_rate"), "Delta missing fraud_rate"

        # Validate delta calculation (B - A)
        assert (
            abs(delta.precision - (metrics_b.precision - metrics_a.precision)) < 0.0001
        ), f"Delta precision mismatch: {delta.precision} != {metrics_b.precision - metrics_a.precision}"
        assert (
            abs(delta.recall - (metrics_b.recall - metrics_a.recall)) < 0.0001
        ), f"Delta recall mismatch: {delta.recall} != {metrics_b.recall - metrics_a.recall}"
        assert (
            abs(delta.f1 - (metrics_b.f1 - metrics_a.f1)) < 0.0001
        ), f"Delta f1 mismatch: {delta.f1} != {metrics_b.f1 - metrics_a.f1}"
        assert (
            abs(delta.accuracy - (metrics_b.accuracy - metrics_a.accuracy)) < 0.0001
        ), f"Delta accuracy mismatch: {delta.accuracy} != {metrics_b.accuracy - metrics_a.accuracy}"
        assert (
            abs(delta.fraud_rate - (metrics_b.fraud_rate - metrics_a.fraud_rate))
            < 0.0001
        ), f"Delta fraud_rate mismatch: {delta.fraud_rate} != {metrics_b.fraud_rate - metrics_a.fraud_rate}"

        # Validate summary is non-empty
        assert (
            response.investigation_summary and len(response.investigation_summary) > 0
        ), "Investigation summary is empty"

        logger.info("✅ Comparison test passed!")
        logger.info(
            f"  Window A: {metrics_a.total_transactions} transactions, "
            f"precision={metrics_a.precision:.3f}, recall={metrics_a.recall:.3f}"
        )
        logger.info(
            f"  Window B: {metrics_b.total_transactions} transactions, "
            f"precision={metrics_b.precision:.3f}, recall={metrics_b.recall:.3f}"
        )
        logger.info(
            f"  Delta: precision={delta.precision:+.3f}, recall={delta.recall:+.3f}"
        )

        return {
            "status": "success",
            "investigation_a": inv_a.get("id"),
            "investigation_b": inv_b.get("id"),
            "entity": request.entity,
            "metrics_a": {
                "total_transactions": metrics_a.total_transactions,
                "precision": metrics_a.precision,
                "recall": metrics_a.recall,
                "f1": metrics_a.f1,
                "accuracy": metrics_a.accuracy,
                "fraud_rate": metrics_a.fraud_rate,
            },
            "metrics_b": {
                "total_transactions": metrics_b.total_transactions,
                "precision": metrics_b.precision,
                "recall": metrics_b.recall,
                "f1": metrics_b.f1,
                "accuracy": metrics_b.accuracy,
                "fraud_rate": metrics_b.fraud_rate,
            },
            "delta": {
                "precision": delta.precision,
                "recall": delta.recall,
                "f1": delta.f1,
                "accuracy": delta.accuracy,
                "fraud_rate": delta.fraud_rate,
            },
            "summary": response.investigation_summary,
        }

    except Exception as e:
        logger.error(f"❌ Comparison test failed: {e}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "investigation_a": inv_a.get("id"),
            "investigation_b": inv_b.get("id"),
        }


async def main():
    """Main test function."""
    logger.info("=" * 60)
    logger.info("Investigation Comparison Backend Test")
    logger.info("=" * 60)

    # Fetch investigations
    logger.info("\n1. Fetching investigations...")
    investigations = get_investigations_with_entities()

    if len(investigations) < 2:
        logger.error(
            f"❌ Need at least 2 investigations with entities and time windows. Found: {len(investigations)}"
        )
        logger.info("\nTo create test investigations, use:")
        logger.info("  POST /api/investigation")
        logger.info("  with entity_type, entity_id, from, and to fields")
        return 1

    # Find comparable investigations
    logger.info("\n2. Finding comparable investigations...")
    pair = find_comparable_investigations(investigations)

    if not pair:
        logger.error("❌ No matching entity pairs found for comparison")
        logger.info("\nInvestigations need:")
        logger.info("  - Same entity_type and entity_id")
        logger.info("  - Valid 'from' and 'to' time windows")
        return 1

    inv_a, inv_b = pair
    logger.info(f"✅ Found comparable pair:")
    logger.info(f"   Investigation A: {inv_a.get('id')} ({inv_a.get('name', 'N/A')})")
    logger.info(f"   Investigation B: {inv_b.get('id')} ({inv_b.get('name', 'N/A')})")
    logger.info(f"   Entity: {inv_a.get('entity_type')}:{inv_a.get('entity_id')}")

    # Run comparison
    logger.info("\n3. Running comparison...")
    result = await test_comparison(inv_a, inv_b)

    # Print results
    logger.info("\n4. Test Results:")
    logger.info("=" * 60)
    print(json.dumps(result, indent=2, default=str))

    if result.get("status") == "success":
        logger.info("\n✅ All tests passed!")
        return 0
    else:
        logger.error(f"\n❌ Test failed: {result.get('error')}")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
