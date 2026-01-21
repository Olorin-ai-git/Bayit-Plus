#!/usr/bin/env python3
"""
Check latest investigations and their confusion table status.

This script queries the database directly to analyze recent investigations.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import json
from datetime import datetime


def main():
    """Main function."""
    print("=" * 80)
    print("LATEST INVESTIGATIONS ANALYSIS")
    print("=" * 80)
    print()

    try:
        from app.models.investigation_state import InvestigationState
        from app.persistence.database import get_db_session

        with get_db_session() as session:
            # Get last 10 completed investigations
            invs = (
                session.query(InvestigationState)
                .filter(InvestigationState.status == "COMPLETED")
                .order_by(InvestigationState.updated_at.desc())
                .limit(10)
                .all()
            )

            print(f"Found {len(invs)} completed investigations")
            print()

            for i, inv in enumerate(invs, 1):
                print(f"{i}. Investigation: {inv.investigation_id}")
                print(f"   Updated: {inv.updated_at}")

                # Parse progress_json
                if inv.progress_json:
                    try:
                        progress = json.loads(inv.progress_json)
                        risk_score = progress.get("overall_risk_score") or progress.get(
                            "risk_score"
                        )
                        transaction_scores = progress.get("transaction_scores")
                        domain_findings = progress.get("domain_findings", {})

                        print(f"   Risk Score: {risk_score}")
                        print(
                            f"   Has Transaction Scores: {transaction_scores is not None}"
                        )
                        if transaction_scores:
                            print(f"     Count: {len(transaction_scores)}")
                            # Show sample scores
                            sample_scores = list(transaction_scores.items())[:3]
                            for tx_id, score in sample_scores:
                                print(f"       {tx_id}: {score:.3f}")
                        print(f"   Domain Findings: {len(domain_findings)} domains")

                        # Check entity info from settings_json
                        if inv.settings_json:
                            try:
                                settings = json.loads(inv.settings_json)
                                entities = settings.get("entities", [])
                                if entities:
                                    entity = (
                                        entities[0]
                                        if isinstance(entities[0], dict)
                                        else {}
                                    )
                                    entity_type = entity.get("entity_type", "unknown")
                                    entity_id = entity.get(
                                        "entity_value"
                                    ) or entity.get("entity_id", "unknown")
                                    print(f"   Entity: {entity_type}={entity_id[:50]}")
                            except:
                                pass

                        print()
                    except json.JSONDecodeError as e:
                        print(f"   Error parsing progress_json: {e}")
                        print()
                else:
                    print("   No progress_json")
                    print()

    except Exception as e:
        print(f"Error: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    main()
