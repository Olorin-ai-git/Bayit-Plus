#!/usr/bin/env python3
"""
Direct SQL Query to Verify Domain Findings Persistence

This script runs direct SQL queries to check domain_findings persistence.
It works with both SQLite and PostgreSQL databases.

Usage:
    python scripts/verify_domain_findings_direct.py <investigation_id>

Example:
    python scripts/verify_domain_findings_direct.py inv-1762553138822-ej74xpa
"""

import json
import os
import sys
from pathlib import Path

# Use the app's database system
sys.path.insert(0, str(Path(__file__).parent.parent))
from sqlalchemy import text

from app.persistence.database import get_db_session, get_engine, init_database


def run_sql_query(investigation_id: str):
    """Run SQL queries to verify domain findings."""

    init_database()

    # Detect database type
    engine = get_engine()
    db_type = engine.dialect.name  # 'postgresql' or 'sqlite'

    try:
        with get_db_session() as session:
            print(f"\n{'='*80}")
            print(f"📊 Domain Findings Persistence Verification (Direct SQL)")
            print(f"{'='*80}")
            print(f"\nInvestigation ID: {investigation_id}")
            print(f"Database Type: {db_type.upper()}")

            # Query 1: Basic investigation info (including JSON fields)
            query1 = text(
                """
                SELECT 
                    investigation_id,
                    status,
                    lifecycle_stage,
                    version,
                    created_at,
                    updated_at,
                    CASE WHEN progress_json IS NULL THEN 0 ELSE length(progress_json) END AS progress_json_length,
                    CASE WHEN results_json IS NULL THEN 0 ELSE length(results_json) END AS results_json_length,
                    progress_json,
                    results_json
                FROM investigation_states
                WHERE investigation_id = :inv_id
            """
            )

            result1 = session.execute(query1, {"inv_id": investigation_id}).fetchone()

            if not result1:
                print(f"\n❌ Investigation {investigation_id} not found in database")
                return False

            print(f"\n📋 Investigation Info:")
            print(f"   Status: {result1.status}")
            print(f"   Lifecycle Stage: {result1.lifecycle_stage}")
            print(f"   Version: {result1.version}")
            print(f"   Progress JSON Length: {result1.progress_json_length} chars")
            print(f"   Results JSON Length: {result1.results_json_length} chars")

            # Parse JSON fields (works for both SQLite and PostgreSQL)
            progress_data = None
            results_data = None

            if result1.progress_json:
                try:
                    progress_data = json.loads(result1.progress_json)
                except json.JSONDecodeError as e:
                    print(f"   ⚠️  Failed to parse progress_json: {str(e)}")

            if result1.results_json:
                try:
                    results_data = json.loads(result1.results_json)
                except json.JSONDecodeError as e:
                    print(f"   ⚠️  Failed to parse results_json: {str(e)}")

            # Extract domain findings from progress_json
            progress_domain_findings = (
                progress_data.get("domain_findings", {}) if progress_data else {}
            )
            results_domain_findings = (
                results_data.get("domain_findings", {}) if results_data else {}
            )

            print(f"\n{'─'*80}")
            print(f"📋 PROGRESS_JSON Domain Findings")
            print(f"{'─'*80}")

            if progress_domain_findings:
                domains_in_progress = set(progress_domain_findings.keys())
                print(f"✅ Found {len(domains_in_progress)} domains in progress_json")
                print(f"   Domains: {', '.join(sorted(domains_in_progress))}")

                print(f"\n   Detailed Domain Findings:")
                for domain_name in sorted(domains_in_progress):
                    domain_data = progress_domain_findings.get(domain_name, {})
                    print(f"      📊 {domain_name}:")
                    print(
                        f"         - Risk Score: {domain_data.get('risk_score', 'N/A')}"
                    )
                    print(
                        f"         - Confidence: {domain_data.get('confidence', 'N/A')}"
                    )

                    llm_analysis = domain_data.get("llm_analysis", {})
                    has_llm = bool(llm_analysis)
                    print(f"         - Has LLM Analysis: {'YES' if has_llm else 'NO'}")
                    if has_llm:
                        print(
                            f"         - LLM Confidence: {llm_analysis.get('confidence', 'N/A')}"
                        )
                        print(
                            f"         - LLM Duration: {llm_analysis.get('analysis_duration', 'N/A')}s"
                        )
                        llm_response = llm_analysis.get("llm_response", "")
                        if llm_response:
                            preview = (
                                llm_response[:200]
                                if len(llm_response) > 200
                                else llm_response
                            )
                            print(f"         - LLM Response Preview: {preview}...")
            else:
                print(f"⚠️  No domain_findings found in progress_json")

            # Extract domain findings from results_json
            print(f"\n{'─'*80}")
            print(f"📋 RESULTS_JSON Domain Findings")
            print(f"{'─'*80}")

            if results_domain_findings:
                domains_in_results = set(results_domain_findings.keys())
                print(f"✅ Found {len(domains_in_results)} domains in results_json")
                print(f"   Domains: {', '.join(sorted(domains_in_results))}")

                print(f"\n   Detailed Domain Findings:")
                for domain_name in sorted(domains_in_results):
                    domain_data = results_domain_findings.get(domain_name, {})
                    print(f"      📊 {domain_name}:")
                    print(
                        f"         - Risk Score: {domain_data.get('risk_score', 'N/A')}"
                    )
                    print(
                        f"         - Confidence: {domain_data.get('confidence', 'N/A')}"
                    )

                    llm_analysis = domain_data.get("llm_analysis", {})
                    has_llm = bool(llm_analysis)
                    print(f"         - Has LLM Analysis: {'YES' if has_llm else 'NO'}")
                    if has_llm:
                        print(
                            f"         - LLM Confidence: {llm_analysis.get('confidence', 'N/A')}"
                        )
            else:
                print(f"⚠️  No domain_findings found in results_json")

            # Summary
            print(f"\n{'─'*80}")
            print(f"📊 SUMMARY")
            print(f"{'─'*80}")

            has_progress = len(progress_domain_findings) > 0
            has_results = len(results_domain_findings) > 0

            print(
                f"✅ Progress JSON has domain_findings: {has_progress} ({len(progress_domain_findings)} domains)"
            )
            print(
                f"✅ Results JSON has domain_findings: {has_results} ({len(results_domain_findings)} domains)"
            )

            if has_progress and has_results:
                print(
                    f"\n✅ SUCCESS: Domain findings are persisted in both progress_json and results_json"
                )
            elif has_progress:
                print(
                    f"\n⚠️  PARTIAL: Domain findings only in progress_json (not in results_json)"
                )
            elif has_results:
                print(
                    f"\n⚠️  PARTIAL: Domain findings only in results_json (not in progress_json)"
                )
            else:
                print(
                    f"\n❌ FAILURE: Domain findings not found in either progress_json or results_json"
                )

            print(f"\n{'='*80}\n")

            return has_progress or has_results

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback

        traceback.print_exc()
        return False


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print(
            "Usage: python scripts/verify_domain_findings_direct.py <investigation_id>"
        )
        print("\nExample:")
        print(
            "  python scripts/verify_domain_findings_direct.py inv-1762553138822-ej74xpa"
        )
        sys.exit(1)

    investigation_id = sys.argv[1]
    success = run_sql_query(investigation_id)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
