#!/usr/bin/env python3
"""
Verify Domain Findings Persistence Script

This script queries the database to verify that domain_findings (including LLM analysis)
are correctly persisted in progress_json and results_json fields.

Usage:
    python scripts/verify_domain_findings_persistence.py <investigation_id>

Example:
    python scripts/verify_domain_findings_persistence.py inv-1762538988633
"""

import json
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.models.investigation_state import InvestigationState
from app.persistence.database import get_db_session, init_database
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def verify_domain_findings(investigation_id: str):
    """Verify domain findings persistence for a specific investigation."""

    init_database()

    with get_db_session() as db:
        # Query investigation state
        state = (
            db.query(InvestigationState)
            .filter(InvestigationState.investigation_id == investigation_id)
            .first()
        )

        if not state:
            print(f"❌ Investigation {investigation_id} not found in database")
            return False

        print(f"\n{'='*80}")
        print(f"📊 Domain Findings Persistence Verification")
        print(f"{'='*80}")
        print(f"\nInvestigation ID: {investigation_id}")
        print(f"Status: {state.status}")
        print(f"Lifecycle Stage: {state.lifecycle_stage}")
        print(f"Version: {state.version}")
        print(f"Created: {state.created_at}")
        print(f"Updated: {state.updated_at}")

        # Check progress_json
        print(f"\n{'─'*80}")
        print(f"📋 PROGRESS_JSON Analysis")
        print(f"{'─'*80}")

        if not state.progress_json:
            print("⚠️  progress_json is NULL/empty")
        else:
            try:
                progress_data = json.loads(state.progress_json)
                print(f"✅ progress_json exists ({len(state.progress_json)} chars)")

                # Check for domain_findings
                domain_findings = progress_data.get("domain_findings", {})

                if domain_findings:
                    print(
                        f"✅ domain_findings found in progress_json: {len(domain_findings)} domains"
                    )
                    print(f"\n   Domains: {', '.join(domain_findings.keys())}")

                    # Show details for each domain
                    for domain, findings in domain_findings.items():
                        print(f"\n   📊 {domain.upper()} Domain:")
                        if isinstance(findings, dict):
                            print(
                                f"      - Risk Score: {findings.get('risk_score', 'N/A')}"
                            )
                            print(
                                f"      - Confidence: {findings.get('confidence', 'N/A')}"
                            )
                            print(
                                f"      - Evidence Count: {len(findings.get('evidence', []))}"
                            )
                            print(
                                f"      - Risk Indicators: {len(findings.get('risk_indicators', []))}"
                            )

                            # Check for LLM analysis
                            llm_analysis = findings.get("llm_analysis", {})
                            if llm_analysis:
                                print(f"      - ✅ Has LLM Analysis:")
                                print(
                                    f"         * LLM Confidence: {llm_analysis.get('confidence', 'N/A')}"
                                )
                                print(
                                    f"         * Analysis Duration: {llm_analysis.get('analysis_duration', 'N/A')}s"
                                )
                                print(
                                    f"         * Analysis Type: {llm_analysis.get('analysis_type', 'N/A')}"
                                )
                                llm_response = llm_analysis.get("llm_response", "")
                                if llm_response:
                                    preview = (
                                        llm_response[:200]
                                        if len(llm_response) > 200
                                        else llm_response
                                    )
                                    print(
                                        f"         * LLM Response Preview: {preview}..."
                                    )
                                    print(
                                        f"         * LLM Response Length: {len(llm_response)} chars"
                                    )
                            else:
                                print(f"      - ⚠️  No LLM analysis found")

                            # Show metrics
                            metrics = findings.get("metrics", {})
                            if metrics:
                                print(f"      - Metrics: {len(metrics)} items")
                                for key, value in list(metrics.items())[:5]:
                                    print(f"         * {key}: {value}")
                        else:
                            print(
                                f"      - ⚠️  Findings is not a dict (type: {type(findings).__name__})"
                            )
                else:
                    print(f"⚠️  No domain_findings found in progress_json")
                    print(
                        f"   Available keys in progress_json: {list(progress_data.keys())[:10]}"
                    )

            except json.JSONDecodeError as e:
                print(f"❌ Failed to parse progress_json: {str(e)}")
                print(f"   Raw data (first 500 chars): {state.progress_json[:500]}")

        # Check results_json
        print(f"\n{'─'*80}")
        print(f"📋 RESULTS_JSON Analysis")
        print(f"{'─'*80}")

        if not state.results_json:
            print("⚠️  results_json is NULL/empty")
        else:
            try:
                results_data = json.loads(state.results_json)
                print(f"✅ results_json exists ({len(state.results_json)} chars)")

                # Check for domain_findings
                domain_findings = results_data.get("domain_findings", {})

                if domain_findings:
                    print(
                        f"✅ domain_findings found in results_json: {len(domain_findings)} domains"
                    )
                    print(f"\n   Domains: {', '.join(domain_findings.keys())}")

                    # Show summary for each domain
                    for domain, findings in domain_findings.items():
                        print(f"\n   📊 {domain.upper()} Domain:")
                        if isinstance(findings, dict):
                            print(
                                f"      - Risk Score: {findings.get('risk_score', 'N/A')}"
                            )
                            print(
                                f"      - Confidence: {findings.get('confidence', 'N/A')}"
                            )
                            has_llm = bool(findings.get("llm_analysis", {}))
                            print(f"      - Has LLM Analysis: {has_llm}")
                else:
                    print(f"⚠️  No domain_findings found in results_json")
                    print(
                        f"   Available keys in results_json: {list(results_data.keys())[:10]}"
                    )

                    # Check if risk_score exists (to confirm it's a valid results structure)
                    if "risk_score" in results_data:
                        print(
                            f"   ✅ results_json has risk_score: {results_data['risk_score']}"
                        )

            except json.JSONDecodeError as e:
                print(f"❌ Failed to parse results_json: {str(e)}")
                print(f"   Raw data (first 500 chars): {state.results_json[:500]}")

        # Summary
        print(f"\n{'─'*80}")
        print(f"📊 SUMMARY")
        print(f"{'─'*80}")

        progress_has_domain_findings = False
        results_has_domain_findings = False

        if state.progress_json:
            try:
                progress_data = json.loads(state.progress_json)
                progress_has_domain_findings = bool(
                    progress_data.get("domain_findings")
                )
            except:
                pass

        if state.results_json:
            try:
                results_data = json.loads(state.results_json)
                results_has_domain_findings = bool(results_data.get("domain_findings"))
            except:
                pass

        print(f"✅ Progress JSON has domain_findings: {progress_has_domain_findings}")
        print(f"✅ Results JSON has domain_findings: {results_has_domain_findings}")

        if progress_has_domain_findings and results_has_domain_findings:
            print(
                f"\n✅ SUCCESS: Domain findings are persisted in both progress_json and results_json"
            )
        elif progress_has_domain_findings:
            print(
                f"\n⚠️  PARTIAL: Domain findings only in progress_json (not in results_json)"
            )
        elif results_has_domain_findings:
            print(
                f"\n⚠️  PARTIAL: Domain findings only in results_json (not in progress_json)"
            )
        else:
            print(
                f"\n❌ FAILURE: Domain findings not found in either progress_json or results_json"
            )

        print(f"\n{'='*80}\n")

        return progress_has_domain_findings or results_has_domain_findings


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print(
            "Usage: python scripts/verify_domain_findings_persistence.py <investigation_id>"
        )
        print("\nExample:")
        print(
            "  python scripts/verify_domain_findings_persistence.py inv-1762538988633"
        )
        sys.exit(1)

    investigation_id = sys.argv[1]

    try:
        success = verify_domain_findings(investigation_id)
        sys.exit(0 if success else 1)
    except Exception as e:
        logger.error(f"Error verifying domain findings: {str(e)}", exc_info=True)
        print(f"\n❌ Error: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
