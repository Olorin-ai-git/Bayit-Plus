"""Data fetching functions for incremental reports."""

import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


def fetch_completed_auto_comp_investigations() -> List[Dict[str, Any]]:
    """Fetch all completed auto-comp investigations from database with confusion matrices."""
    from app.models.investigation_state import InvestigationState
    from app.persistence.database import get_db

    investigations = []
    db_gen = get_db()
    db = next(db_gen)

    try:
        completed_invs = (
            db.query(InvestigationState)
            .filter(
                InvestigationState.investigation_id.like("auto-comp-%"),
                InvestigationState.status == "COMPLETED",
            )
            .order_by(InvestigationState.updated_at.desc())
            .all()
        )

        for inv in completed_invs:
            result = _build_investigation_result(inv)
            investigations.append(result)
    finally:
        db.close()

    return investigations


def _build_investigation_result(inv) -> Dict[str, Any]:
    """Build investigation result dict from database record."""
    result = {
        "investigation_id": inv.investigation_id,
        "entity_type": "email",
        "status": inv.status,
    }

    _parse_settings_json(inv, result)
    _parse_progress_json(inv, result)
    _load_confusion_matrix_if_needed(inv, result)
    _calculate_total_transactions(result)

    return result


def _parse_settings_json(inv, result: Dict[str, Any]) -> None:
    """Parse settings_json for entity and merchant info."""
    if not inv.settings_json:
        return

    try:
        settings = json.loads(inv.settings_json)
        entities = settings.get("entities", [])
        if entities:
            result["entity_value"] = entities[0].get("entity_value")
            result["email"] = entities[0].get("entity_value")

        name = settings.get("name", "")
        match = re.search(r"(?:- Merchant: |\(Merchant: )([^)]+)", name)
        result["merchant_name"] = match.group(1).strip() if match else "Unknown"

        metadata = settings.get("metadata", {})
        selector_data = metadata.get("selector_metadata") or metadata.get("analyzer_metadata")
        if selector_data:
            result["selector_metadata"] = selector_data

        revenue = settings.get("revenue_data", {})
        if revenue and "revenue_data" not in result:
            result["revenue_data"] = revenue
    except json.JSONDecodeError:
        pass


def _parse_progress_json(inv, result: Dict[str, Any]) -> None:
    """Parse progress_json for confusion matrix and revenue data."""
    if not inv.progress_json:
        return

    try:
        progress = json.loads(inv.progress_json)
        cm = progress.get("confusion_matrix", {})
        if cm:
            result["confusion_matrix"] = cm

        revenue = progress.get("revenue_implications", {})
        if revenue:
            result["revenue_data"] = revenue
    except json.JSONDecodeError:
        pass


def _load_confusion_matrix_if_needed(inv, result: Dict[str, Any]) -> None:
    """Load confusion matrix from file if not in progress_json."""
    if "confusion_matrix" in result:
        return

    cm_data = load_confusion_matrix_from_file(inv.investigation_id)
    if cm_data:
        result["confusion_matrix"] = cm_data.get("confusion_matrix", {})
        if not result.get("revenue_data"):
            result["revenue_data"] = cm_data.get("revenue_implications", {})


def _calculate_total_transactions(result: Dict[str, Any]) -> None:
    """Calculate total_transactions from confusion matrix."""
    if "confusion_matrix" in result:
        cm = result["confusion_matrix"]
        result["total_transactions"] = (
            cm.get("TP", 0) + cm.get("FP", 0) + cm.get("TN", 0) + cm.get("FN", 0)
        )
    else:
        result["total_transactions"] = 0


def load_confusion_matrix_from_file(investigation_id: str) -> Optional[Dict[str, Any]]:
    """Try to load confusion matrix data from the generated HTML file."""
    cm_path = Path(f"artifacts/comparisons/auto_startup/confusion_matrix_{investigation_id}.html")
    if not cm_path.exists():
        return None

    try:
        html_content = cm_path.read_text()
        result = {"confusion_matrix": {}, "revenue_implications": {}}

        _extract_overall_classification(html_content, result)
        _extract_review_precision(html_content, result)
        _extract_revenue_metrics(html_content, result)

        if result["confusion_matrix"]:
            return result
    except Exception as e:
        logger.debug(f"Could not parse confusion matrix from {cm_path}: {e}")

    return None


def _extract_overall_classification(html_content: str, result: Dict[str, Any]) -> None:
    """Extract Overall Classification metrics from HTML."""
    overall_section = re.search(
        r"Overall Classification \(All Transactions\)</h3>.*?</table>",
        html_content,
        re.DOTALL,
    )
    if not overall_section:
        return

    section = overall_section.group(0)
    metrics = [
        ("overall_TP", r"True Positives \(TP\).*?<td[^>]*>(\d+)</td>"),
        ("overall_FP", r"False Positives \(FP\).*?<td[^>]*>(\d+)</td>"),
        ("overall_TN", r"True Negatives \(TN\).*?<td[^>]*>(\d+)</td>"),
        ("overall_FN", r"False Negatives \(FN\).*?<td[^>]*>(\d+)</td>"),
    ]
    for key, pattern in metrics:
        match = re.search(pattern, section, re.DOTALL)
        if match:
            result["confusion_matrix"][key] = int(match.group(1))


def _extract_review_precision(html_content: str, result: Dict[str, Any]) -> None:
    """Extract Review Precision metrics from HTML."""
    review_section = re.search(r"Review Precision.*?</table>", html_content, re.DOTALL)

    if review_section:
        section = review_section.group(0)
        patterns = [
            ("TP", r"True Positives \(TP\).*?<td[^>]*>(\d+)</td>"),
            ("FP", r"False Positives \(FP\).*?<td[^>]*>(\d+)</td>"),
            ("TN", r"True Negatives \(TN\).*?<td[^>]*>(\d+)</td>"),
            ("FN", r"False Negatives \(FN\).*?<td[^>]*>(\d+)</td>"),
        ]
    else:
        patterns = [
            ("TP", r"True Positives \(TP\)</strong>.*?<td[^>]*>(\d+)</td>"),
            ("FP", r"False Positives \(FP\)</strong>.*?<td[^>]*>(\d+)</td>"),
            ("TN", r"True Negatives \(TN\)</strong>.*?<td[^>]*>(\d+)</td>"),
            ("FN", r"False Negatives \(FN\)</strong>.*?<td[^>]*>(\d+)</td>"),
        ]
        section = html_content

    for key, pattern in patterns:
        match = re.search(pattern, section, re.DOTALL)
        if match:
            result["confusion_matrix"][key] = int(match.group(1))


def _extract_revenue_metrics(html_content: str, result: Dict[str, Any]) -> None:
    """Extract revenue metrics from HTML."""
    patterns = [
        ("saved_fraud_gmv", r"<h4[^>]*>Saved Fraud GMV</h4>\s*<div[^>]*>\$([0-9,]+\.?\d*)"),
        ("lost_revenues", r"<h4[^>]*>Lost Revenues</h4>\s*<div[^>]*>\$([0-9,]+\.?\d*)"),
        ("net_value", r"<h4[^>]*>[^<]*Net Value</h4>\s*<div[^>]*>\$([0-9,]+\.?\d*)"),
    ]
    for key, pattern in patterns:
        match = re.search(pattern, html_content)
        if match:
            result["revenue_implications"][key] = float(match.group(1).replace(",", ""))
