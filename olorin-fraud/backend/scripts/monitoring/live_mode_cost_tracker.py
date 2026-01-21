#!/usr/bin/env python3
"""
Live Mode Cost Tracker
======================

Monitors and tracks real costs associated with live mode investigations.
Provides real-time cost monitoring, budget alerts, and cost optimization insights.

Author: Gil Klainert
Date: September 10, 2025
"""

import datetime
import glob
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple


@dataclass
class CostBreakdown:
    snowflake_cost: float = 0.0
    external_apis_cost: float = 0.0
    llm_cost: float = 0.0
    total_cost: float = 0.0
    duration_seconds: float = 0.0
    timestamp: str = ""
    investigation_id: str = ""


class LiveModeCostTracker:
    """Track costs for live mode investigations."""

    def __init__(self, logs_dir: str = "logs/investigations"):
        self.logs_dir = Path(logs_dir)
        self.cost_estimates = {
            "snowflake_per_second": 0.0167,  # $0.01 per minute compute
            "virustotal_per_query": 0.05,  # Estimated $0.05 per query
            "claude_per_1k_tokens": 0.015,  # Claude Opus pricing
            "openai_per_1k_tokens": 0.03,  # GPT-4 pricing
        }

    def find_live_investigations(self) -> List[Path]:
        """Find all live mode investigation directories."""
        pattern = str(self.logs_dir / "LIVE_*")
        live_dirs = [Path(d) for d in glob.glob(pattern) if os.path.isdir(d)]
        return sorted(live_dirs, key=lambda x: x.stat().st_mtime, reverse=True)

    def analyze_investigation_cost(self, investigation_dir: Path) -> CostBreakdown:
        """Analyze cost breakdown for a single investigation."""
        cost = CostBreakdown()
        cost.investigation_id = investigation_dir.name

        # Load metadata
        metadata_file = investigation_dir / "metadata.json"
        if metadata_file.exists():
            with open(metadata_file) as f:
                metadata = json.load(f)
                cost.timestamp = metadata.get("created_at", "")

        # Load unified test report
        report_files = list(investigation_dir.glob("unified_test_report_*.json"))
        if report_files:
            with open(report_files[0]) as f:
                report = json.load(f)

                # Extract duration
                if report.get("results") and len(report["results"]) > 0:
                    cost.duration_seconds = report["results"][0].get("duration", 0)

                # Estimate Snowflake cost
                cost.snowflake_cost = (
                    cost.duration_seconds * self.cost_estimates["snowflake_per_second"]
                )

        # Count external API usage
        server_logs_file = investigation_dir / "server_logs"
        if server_logs_file.exists():
            with open(server_logs_file) as f:
                content = f.read()

                # Count VirusTotal API calls
                virustotal_calls = content.count("virustotal")
                cost.external_apis_cost += (
                    virustotal_calls * self.cost_estimates["virustotal_per_query"]
                )

        # Estimate LLM costs (rough approximation)
        thought_files = list(investigation_dir.glob("thought_process_*.json"))
        for thought_file in thought_files:
            with open(thought_file) as f:
                try:
                    thought_data = json.load(f)
                    # Estimate tokens based on content length
                    content_length = len(str(thought_data))
                    estimated_tokens = content_length / 4  # Rough estimate

                    if "claude" in thought_file.name.lower():
                        cost.llm_cost += (
                            estimated_tokens / 1000
                        ) * self.cost_estimates["claude_per_1k_tokens"]
                    else:
                        cost.llm_cost += (
                            estimated_tokens / 1000
                        ) * self.cost_estimates["openai_per_1k_tokens"]
                except json.JSONDecodeError:
                    continue

        cost.total_cost = cost.snowflake_cost + cost.external_apis_cost + cost.llm_cost
        return cost

    def generate_cost_report(self, days_back: int = 7) -> Dict:
        """Generate comprehensive cost report for recent investigations."""
        cutoff_date = datetime.datetime.now() - datetime.timedelta(days=days_back)
        investigations = self.find_live_investigations()

        costs = []
        total_cost = 0.0
        total_duration = 0.0

        for inv_dir in investigations:
            # Check if investigation is within date range
            if inv_dir.stat().st_mtime < cutoff_date.timestamp():
                continue

            cost = self.analyze_investigation_cost(inv_dir)
            costs.append(cost)
            total_cost += cost.total_cost
            total_duration += cost.duration_seconds

        # Calculate averages and insights
        num_investigations = len(costs)
        avg_cost = total_cost / max(num_investigations, 1)
        avg_duration = total_duration / max(num_investigations, 1)
        cost_per_minute = (
            (total_cost / (total_duration / 60)) if total_duration > 0 else 0
        )

        return {
            "summary": {
                "date_range_days": days_back,
                "total_investigations": num_investigations,
                "total_cost": round(total_cost, 2),
                "total_duration_minutes": round(total_duration / 60, 2),
                "average_cost_per_investigation": round(avg_cost, 2),
                "average_duration_minutes": round(avg_duration / 60, 2),
                "cost_per_minute": round(cost_per_minute, 2),
            },
            "cost_breakdown": {
                "snowflake_total": sum(c.snowflake_cost for c in costs),
                "external_apis_total": sum(c.external_apis_cost for c in costs),
                "llm_total": sum(c.llm_cost for c in costs),
            },
            "investigations": [
                {
                    "id": cost.investigation_id,
                    "timestamp": cost.timestamp,
                    "duration_minutes": round(cost.duration_seconds / 60, 2),
                    "total_cost": round(cost.total_cost, 2),
                    "snowflake_cost": round(cost.snowflake_cost, 2),
                    "api_cost": round(cost.external_apis_cost, 2),
                    "llm_cost": round(cost.llm_cost, 2),
                }
                for cost in costs
            ],
        }

    def check_budget_status(
        self, daily_budget: float = 500.0, monthly_budget: float = 15000.0
    ) -> Dict:
        """Check current budget status and alert if approaching limits."""
        today_report = self.generate_cost_report(days_back=1)
        month_report = self.generate_cost_report(days_back=30)

        daily_usage = today_report["summary"]["total_cost"]
        monthly_usage = month_report["summary"]["total_cost"]

        daily_percentage = (daily_usage / daily_budget) * 100
        monthly_percentage = (monthly_usage / monthly_budget) * 100

        alerts = []
        if daily_percentage > 80:
            alerts.append(
                f"🚨 Daily budget at {daily_percentage:.1f}% (${daily_usage:.2f}/${daily_budget:.2f})"
            )
        if monthly_percentage > 80:
            alerts.append(
                f"🚨 Monthly budget at {monthly_percentage:.1f}% (${monthly_usage:.2f}/${monthly_budget:.2f})"
            )

        return {
            "daily_usage": daily_usage,
            "daily_budget": daily_budget,
            "daily_percentage": daily_percentage,
            "monthly_usage": monthly_usage,
            "monthly_budget": monthly_budget,
            "monthly_percentage": monthly_percentage,
            "alerts": alerts,
            "status": "WARNING" if alerts else "OK",
        }

    def print_cost_report(self, days_back: int = 7):
        """Print formatted cost report to console."""
        report = self.generate_cost_report(days_back)
        budget_status = self.check_budget_status()

        print("=" * 60)
        print(f"🏦 LIVE MODE COST REPORT - Last {days_back} Days")
        print("=" * 60)

        summary = report["summary"]
        print(f"📊 SUMMARY:")
        print(f"   Total Investigations: {summary['total_investigations']}")
        print(f"   Total Cost: ${summary['total_cost']:.2f}")
        print(
            f"   Average Cost/Investigation: ${summary['average_cost_per_investigation']:.2f}"
        )
        print(f"   Average Duration: {summary['average_duration_minutes']:.1f} minutes")
        print(f"   Cost per Minute: ${summary['cost_per_minute']:.2f}")

        breakdown = report["cost_breakdown"]
        print(f"\n💰 COST BREAKDOWN:")
        print(f"   Snowflake Compute: ${breakdown['snowflake_total']:.2f}")
        print(f"   External APIs: ${breakdown['external_apis_total']:.2f}")
        print(f"   LLM Usage: ${breakdown['llm_total']:.2f}")

        print(f"\n📈 BUDGET STATUS:")
        print(
            f"   Daily Usage: ${budget_status['daily_usage']:.2f} ({budget_status['daily_percentage']:.1f}%)"
        )
        print(
            f"   Monthly Usage: ${budget_status['monthly_usage']:.2f} ({budget_status['monthly_percentage']:.1f}%)"
        )

        if budget_status["alerts"]:
            print(f"\n🚨 ALERTS:")
            for alert in budget_status["alerts"]:
                print(f"   {alert}")

        print(f"\n📋 RECENT INVESTIGATIONS:")
        for inv in report["investigations"][:5]:  # Show last 5
            print(
                f"   {inv['id'][:30]}... | ${inv['total_cost']:.2f} | {inv['duration_minutes']:.1f}min"
            )

        print("=" * 60)


def main():
    """Main function for command line usage."""
    import argparse

    parser = argparse.ArgumentParser(description="Live Mode Cost Tracker")
    parser.add_argument(
        "--days", type=int, default=7, help="Days back to analyze (default: 7)"
    )
    parser.add_argument(
        "--logs-dir", default="logs/investigations", help="Investigations directory"
    )
    parser.add_argument("--json", action="store_true", help="Output JSON format")

    args = parser.parse_args()

    tracker = LiveModeCostTracker(args.logs_dir)

    if args.json:
        report = tracker.generate_cost_report(args.days)
        budget = tracker.check_budget_status()
        combined = {"cost_report": report, "budget_status": budget}
        print(json.dumps(combined, indent=2))
    else:
        tracker.print_cost_report(args.days)


if __name__ == "__main__":
    main()
