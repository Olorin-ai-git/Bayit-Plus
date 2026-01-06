"""Blindspot analysis functions for incremental reports."""

import asyncio
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


def run_blindspot_analysis(
    start_date: datetime = None, end_date: datetime = None
) -> Optional[Dict[str, Any]]:
    """
    Run blindspot analysis for the heatmap section.

    Args:
        start_date: Optional start date for analysis (e.g., month start)
        end_date: Optional end date for analysis (e.g., month end)

    Returns the blindspot analysis data or None if analysis fails.
    """
    try:
        from app.service.analytics.model_blindspot_analyzer import ModelBlindspotAnalyzer

        analyzer = ModelBlindspotAnalyzer()
        loop = asyncio.new_event_loop()
        try:
            result = loop.run_until_complete(
                analyzer.analyze_blindspots(
                    export_csv=False,
                    start_date=start_date,
                    end_date=end_date,
                )
            )
            if result.get("status") == "success":
                period = result.get("analysis_period", {})
                logger.info(
                    f"Blindspot analysis ({period.get('start_date')} to {period.get('end_date')}): "
                    f"{len(result.get('matrix', {}).get('cells', []))} cells, "
                    f"{len(result.get('blindspots', []))} blindspots identified"
                )
                return result
            logger.warning(f"Blindspot analysis returned non-success: {result.get('error')}")
            return None
        finally:
            loop.close()
    except Exception as e:
        logger.warning(f"Could not run blindspot analysis: {e}")
        return None


def run_investigated_entities_analysis(
    entity_ids: List[str],
    start_date: datetime = None,
    end_date: datetime = None,
) -> Optional[Dict[str, Any]]:
    """
    Run blindspot analysis filtered to specific investigated entity IDs.

    Args:
        entity_ids: List of entity IDs (emails) to filter by
        start_date: Optional start date for analysis
        end_date: Optional end date for analysis

    Returns the analysis data for investigated entities or None if fails.
    """
    if not entity_ids:
        return None

    try:
        from app.service.analytics.model_blindspot_analyzer import ModelBlindspotAnalyzer

        analyzer = ModelBlindspotAnalyzer()
        loop = asyncio.new_event_loop()
        try:
            result = loop.run_until_complete(
                analyzer.analyze_investigated_entities(
                    entity_ids=entity_ids,
                    start_date=start_date,
                    end_date=end_date,
                )
            )
            if result.get("status") == "success":
                logger.info(
                    f"Investigated entities analysis: {len(entity_ids)} entities, "
                    f"{result.get('summary', {}).get('total_transactions', 0)} transactions"
                )
                return result
            logger.warning(f"Investigated entities analysis failed: {result.get('error')}")
            return None
        finally:
            loop.close()
    except Exception as e:
        logger.warning(f"Could not run investigated entities analysis: {e}")
        return None
