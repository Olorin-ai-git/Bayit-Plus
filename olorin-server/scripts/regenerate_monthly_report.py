"""
Regenerate Monthly Report from Daily HTML Reports

Parses existing daily HTML reports to extract metrics and regenerates
the monthly aggregate report.

Usage:
    poetry run python scripts/regenerate_monthly_report.py --year 2024 --month 12
"""

import asyncio
import os
import re
import sys
from datetime import datetime
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.schemas.monthly_analysis import DailyAnalysisResult, MonthlyAnalysisResult
from app.service.analytics.model_blindspot_analyzer import ModelBlindspotAnalyzer
from app.service.logging import get_bridge_logger
from app.service.reporting.monthly_report_generator import generate_monthly_report

logger = get_bridge_logger(__name__)

ARTIFACTS_DIR = Path("/Users/olorin/Documents/olorin/olorin-server/artifacts")


def parse_daily_html(html_path: Path, day: int) -> DailyAnalysisResult:
    """Parse a daily HTML report to extract metrics."""
    content = html_path.read_text()

    entities = 0
    tp, fp, tn, fn = 0, 0, 0, 0
    overall_tp, overall_fp, overall_tn, overall_fn = 0, 0, 0, 0
    saved_gmv = Decimal("0")
    lost_revenues = Decimal("0")

    entities_match = re.search(r'(\d+)\s*high-risk entities analyzed', content)
    if entities_match:
        entities = int(entities_match.group(1))

    review_section = re.search(
        r'Review Precision.*?Overall Classification',
        content, re.DOTALL
    )
    if review_section:
        section = review_section.group(0)
        tp_match = re.search(r'True Positives.*?(\d+)', section)
        fp_match = re.search(r'False Positives.*?(\d+)', section)
        tn_match = re.search(r'True Negatives.*?(\d+)', section)
        fn_match = re.search(r'False Negatives.*?(\d+)', section)
        if tp_match:
            tp = int(tp_match.group(1))
        if fp_match:
            fp = int(fp_match.group(1))
        if tn_match:
            tn = int(tn_match.group(1))
        if fn_match:
            fn = int(fn_match.group(1))

    overall_section = re.search(
        r'Overall Classification.*?$',
        content, re.DOTALL
    )
    if overall_section:
        section = overall_section.group(0)
        overall_metrics = re.findall(
            r'(True Positives|False Positives|True Negatives|False Negatives).*?(\d+)',
            section[:2000]
        )
        for label, value in overall_metrics:
            if 'True Positives' in label:
                overall_tp = int(value)
            elif 'False Positives' in label:
                overall_fp = int(value)
            elif 'True Negatives' in label:
                overall_tn = int(value)
            elif 'False Negatives' in label:
                overall_fn = int(value)

    gmv_matches = re.findall(r'Saved Fraud GMV.*?\$([0-9,]+\.?\d*)', content)
    for gmv in gmv_matches:
        try:
            saved_gmv += Decimal(gmv.replace(',', ''))
        except Exception:
            pass

    rev_matches = re.findall(r'Lost Revenues.*?\$([0-9,]+\.?\d*)', content)
    for rev in rev_matches:
        try:
            lost_revenues += Decimal(rev.replace(',', ''))
        except Exception:
            pass

    return DailyAnalysisResult(
        date=datetime(2024, 12, day),
        day_of_month=day,
        entities_discovered=entities,
        tp=tp,
        fp=fp,
        tn=tn,
        fn=fn,
        overall_tp=overall_tp,
        overall_fp=overall_fp,
        overall_tn=overall_tn,
        overall_fn=overall_fn,
        saved_fraud_gmv=saved_gmv,
        lost_revenues=lost_revenues,
        net_value=saved_gmv - lost_revenues,
        started_at=datetime.now(),
        completed_at=datetime.now(),
        duration_seconds=0.0,
    )


async def regenerate_monthly(year: int, month: int) -> Path:
    """Regenerate monthly report from existing daily reports."""
    import calendar

    month_name = calendar.month_name[month]
    days_in_month = calendar.monthrange(year, month)[1]

    print(f"DEBUG: ARTIFACTS_DIR = {ARTIFACTS_DIR}")
    print(f"DEBUG: ARTIFACTS_DIR exists = {ARTIFACTS_DIR.exists()}")

    daily_results = []

    for day in range(1, days_in_month + 1):
        html_path = ARTIFACTS_DIR / f"startup_analysis_DAILY_{year}-{month:02d}-{day:02d}.html"
        if day == 1:
            print(f"DEBUG: Day 1 path = {html_path}")
            print(f"DEBUG: Day 1 exists = {html_path.exists()}")
        if html_path.exists():
            logger.info(f"Parsing Day {day}: {html_path}")
            result = parse_daily_html(html_path, day)
            daily_results.append(result)
            logger.info(
                f"  Entities: {result.entities_discovered}, "
                f"TP={result.tp}, FP={result.fp}, "
                f"GMV=${result.saved_fraud_gmv:.2f}"
            )
        else:
            logger.warning(f"Day {day} report not found: {html_path}")

    if not daily_results:
        logger.error("No daily reports found!")
        return None

    monthly_result = MonthlyAnalysisResult(
        year=year,
        month=month,
        month_name=month_name,
        total_days=days_in_month,
        daily_results=daily_results,
        started_at=datetime.now(),
        completed_at=datetime.now(),
    )
    monthly_result.aggregate_from_daily()

    logger.info(f"\n{'='*60}")
    logger.info(f"MONTHLY AGGREGATION: {month_name} {year}")
    logger.info(f"Days parsed: {len(daily_results)}")
    logger.info(f"Total entities: {monthly_result.total_entities}")
    logger.info(
        f"Confusion: TP={monthly_result.total_tp}, FP={monthly_result.total_fp}, "
        f"TN={monthly_result.total_tn}, FN={monthly_result.total_fn}"
    )
    logger.info(f"Saved Fraud GMV: ${monthly_result.total_saved_fraud_gmv:.2f}")
    logger.info(f"Lost Revenues: ${monthly_result.total_lost_revenues:.2f}")
    logger.info(f"Net Value: ${monthly_result.total_net_value:.2f}")
    if monthly_result.precision:
        logger.info(f"Precision: {monthly_result.precision:.2%}")
    if monthly_result.recall:
        logger.info(f"Recall: {monthly_result.recall:.2%}")
    if monthly_result.f1_score:
        logger.info(f"F1 Score: {monthly_result.f1_score:.2%}")
    logger.info(f"{'='*60}")

    # Run blindspot analysis for the heatmap
    logger.info("\nRunning blindspot analysis for heatmap...")
    blindspot_data = None
    try:
        analyzer = ModelBlindspotAnalyzer()
        blindspot_data = await analyzer.analyze_blindspots(export_csv=True)
        if blindspot_data.get("status") == "success":
            logger.info(
                f"Blindspot analysis complete: "
                f"{len(blindspot_data.get('matrix', {}).get('cells', []))} cells, "
                f"{len(blindspot_data.get('blindspots', []))} blindspots identified"
            )
        else:
            logger.warning(f"Blindspot analysis failed: {blindspot_data.get('error')}")
            blindspot_data = None
    except Exception as e:
        logger.warning(f"Could not run blindspot analysis: {e}")
        blindspot_data = None

    output_path = await generate_monthly_report(monthly_result, blindspot_data)
    logger.info(f"\nMonthly report regenerated: {output_path}")

    return output_path


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Regenerate monthly report")
    parser.add_argument("--year", type=int, default=2024)
    parser.add_argument("--month", type=int, default=12)
    args = parser.parse_args()

    result = asyncio.run(regenerate_monthly(args.year, args.month))
    if result:
        print(f"\nSuccess: {result}")
    else:
        print("\nFailed to regenerate report")
        sys.exit(1)
