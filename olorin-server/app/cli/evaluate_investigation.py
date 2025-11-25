"""
CLI Entry Point for Investigation Evaluation

Command: python -m app.cli.evaluate_investigation

Accepts same parameters as API endpoint and persists artifacts.
"""

import argparse
import asyncio
import os
import sys
from pathlib import Path
from typing import List, Optional

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from app.router.models.investigation_comparison_models import (
    ComparisonRequest,
    WindowSpec,
)
from app.service.investigation.comparison_service import compare_windows
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def parse_entity_type(value: str) -> str:
    """Validate entity type."""
    valid_types = [
        "email",
        "phone",
        "device_id",
        "ip",
        "account_id",
        "card_fingerprint",
        "merchant_id",
    ]
    if value not in valid_types:
        raise argparse.ArgumentTypeError(
            f"Entity type must be one of: {', '.join(valid_types)}"
        )
    return value


def parse_window_spec(value: str) -> WindowSpec:
    """Parse window specification from string."""
    if value.startswith("preset:"):
        preset = value.split(":", 1)[1]
        if preset not in ["recent_14d", "retro_14d_6mo_back", "custom"]:
            raise argparse.ArgumentTypeError(
                f"Preset must be one of: recent_14d, retro_14d_6mo_back, custom"
            )
        return {"preset": preset}
    elif value.startswith("custom:"):
        parts = value.split(":")
        if len(parts) != 3:
            raise argparse.ArgumentTypeError(
                "Custom window format: custom:START:END (ISO 8601)"
            )
        return {"preset": "custom", "start": parts[1], "end": parts[2]}
    else:
        raise argparse.ArgumentTypeError(
            "Window format: preset:PRESET or custom:START:END"
        )


def create_parser() -> argparse.ArgumentParser:
    """Create command line argument parser."""
    parser = argparse.ArgumentParser(
        description="Evaluate investigation comparison across time windows",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Compare recent vs retro windows for an email
  python -m app.cli.evaluate_investigation \\
    --entity-type email --entity-value user@example.com

  # Custom windows with risk threshold
  python -m app.cli.evaluate_investigation \\
    --entity-type phone --entity-value +1234567890 \\
    --window-a custom:2025-01-01T00:00:00-05:00:2025-01-15T00:00:00-05:00 \\
    --window-b custom:2025-07-01T00:00:00-05:00:2025-07-15T00:00:00-05:00 \\
    --risk-threshold 0.75

  # Merchant-scoped comparison
  python -m app.cli.evaluate_investigation \\
    --merchant-ids m_123 m_456 \\
    --include-histograms --include-timeseries
        """,
    )

    # Entity parameters
    parser.add_argument(
        "--entity-type",
        type=parse_entity_type,
        help="Entity type (email, phone, device_id, ip, account_id, card_fingerprint, merchant_id)",
    )
    parser.add_argument(
        "--entity-value", type=str, help="Entity value (normalized automatically)"
    )

    # Window parameters
    parser.add_argument(
        "--window-a",
        type=parse_window_spec,
        default={"preset": "retro_14d_6mo_back"},
        help="Window A specification (default: retro_14d_6mo_back)",
    )
    parser.add_argument(
        "--window-b",
        type=parse_window_spec,
        default={"preset": "recent_14d"},
        help="Window B specification (default: recent_14d)",
    )

    # Risk threshold
    parser.add_argument(
        "--risk-threshold",
        type=float,
        default=float(os.getenv("RISK_THRESHOLD_DEFAULT", "0.7")),
        help=f'Risk threshold (default: {os.getenv("RISK_THRESHOLD_DEFAULT", "0.7")})',
    )

    # Merchant filter
    parser.add_argument(
        "--merchant-ids", nargs="+", help="Merchant IDs to filter (space-separated)"
    )

    # Options
    parser.add_argument(
        "--include-per-merchant",
        action="store_true",
        default=True,
        help="Include per-merchant breakdown (default: True)",
    )
    parser.add_argument(
        "--no-include-per-merchant",
        dest="include_per_merchant",
        action="store_false",
        help="Exclude per-merchant breakdown",
    )
    parser.add_argument(
        "--max-merchants",
        type=int,
        default=25,
        help="Maximum merchants in breakdown (default: 25)",
    )
    parser.add_argument(
        "--include-histograms", action="store_true", help="Include risk histograms"
    )
    parser.add_argument(
        "--include-timeseries", action="store_true", help="Include daily timeseries"
    )

    # Output options
    parser.add_argument(
        "--output-dir",
        type=str,
        default="artifacts",
        help="Output directory for artifacts (default: artifacts/)",
    )
    parser.add_argument(
        "--quiet", action="store_true", help="Suppress non-error output"
    )

    return parser


async def main():
    """Main CLI entry point."""
    parser = create_parser()
    args = parser.parse_args()

    # Validate entity parameters
    if args.entity_type and not args.entity_value:
        parser.error("--entity-value required when --entity-type is specified")
    if args.entity_value and not args.entity_type:
        parser.error("--entity-type required when --entity-value is specified")
    if not args.entity_type and not args.merchant_ids:
        parser.error(
            "Either --entity-type/--entity-value or --merchant-ids must be specified"
        )

    # Build request
    request = ComparisonRequest(
        entity=(
            {"type": args.entity_type, "value": args.entity_value}
            if args.entity_type and args.entity_value
            else None
        ),
        windowA=args.window_a,
        windowB=args.window_b,
        risk_threshold=args.risk_threshold,
        merchant_ids=args.merchant_ids,
        options={
            "include_per_merchant": args.include_per_merchant,
            "max_merchants": args.max_merchants,
            "include_histograms": args.include_histograms,
            "include_timeseries": args.include_timeseries,
        },
    )

    try:
        if not args.quiet:
            logger.info("Starting investigation comparison...")
            logger.info(
                f"Entity: {args.entity_type}={args.entity_value}"
                if args.entity_type
                else "Entity: Global"
            )
            logger.info(f"Window A: {args.window_a}")
            logger.info(f"Window B: {args.window_b}")
            logger.info(f"Risk threshold: {args.risk_threshold}")

        # Execute comparison
        response = await compare_windows(request)

        # Print summary
        if not args.quiet:
            print("\n" + "=" * 80)
            print("COMPARISON RESULTS")
            print("=" * 80)
            print(f"\nWindow A ({response.windowA.label}):")
            print(f"  Total transactions: {response.A.total_transactions}")
            print(f"  Over threshold: {response.A.over_threshold}")
            print(
                f"  TP: {response.A.TP}, FP: {response.A.FP}, TN: {response.A.TN}, FN: {response.A.FN}"
            )
            print(
                f"  Precision: {response.A.precision:.2%}, Recall: {response.A.recall:.2%}, F1: {response.A.f1:.2%}"
            )
            print(
                f"  Accuracy: {response.A.accuracy:.2%}, Fraud rate: {response.A.fraud_rate:.2%}"
            )

            print(f"\nWindow B ({response.windowB.label}):")
            print(f"  Total transactions: {response.B.total_transactions}")
            print(f"  Over threshold: {response.B.over_threshold}")
            print(
                f"  TP: {response.B.TP}, FP: {response.B.FP}, TN: {response.B.TN}, FN: {response.B.FN}"
            )
            print(
                f"  Precision: {response.B.precision:.2%}, Recall: {response.B.recall:.2%}, F1: {response.B.f1:.2%}"
            )
            print(
                f"  Accuracy: {response.B.accuracy:.2%}, Fraud rate: {response.B.fraud_rate:.2%}"
            )
            if response.B.pending_label_count:
                print(f"  Pending labels: {response.B.pending_label_count}")

            print(f"\nDeltas (B - A):")
            print(
                f"  Precision: {response.delta.precision:+.2%}, Recall: {response.delta.recall:+.2%}"
            )
            print(
                f"  F1: {response.delta.f1:+.2%}, Accuracy: {response.delta.accuracy:+.2%}"
            )
            print(f"  Fraud rate: {response.delta.fraud_rate:+.2%}")
            if response.delta.psi_predicted_risk is not None:
                print(f"  PSI: {response.delta.psi_predicted_risk:.3f}")
            if response.delta.ks_stat_predicted_risk is not None:
                print(f"  KS Stat: {response.delta.ks_stat_predicted_risk:.3f}")

            if response.per_merchant:
                print(
                    f"\nPer-merchant breakdown: {len(response.per_merchant)} merchants"
                )

            print(f"\nInvestigation Summary:")
            print(f"  {response.investigation_summary}")

            artifact_path = (
                response.metadata.get("artifact_path")
                if hasattr(response, "metadata")
                else None
            )
            if artifact_path:
                print(f"\nArtifact saved: {artifact_path}")
            print("=" * 80)

        sys.exit(0)

    except KeyboardInterrupt:
        logger.info("\nOperation cancelled by user")
        sys.exit(130)
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
