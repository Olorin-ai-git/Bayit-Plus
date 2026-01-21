"""Transaction section HTML generation for incremental reports."""

from pathlib import Path
from typing import Any, Dict, Optional

from .utils import safe_int


def generate_transaction_section(
    inv: Dict[str, Any], tx_link: Optional[str], total_tx: int
) -> str:
    """Generate the transaction-level drill-down section."""
    cm = inv.get("confusion_matrix", {})

    tp = safe_int(cm.get("TP", 0))
    fp = safe_int(cm.get("FP", 0))
    tn = safe_int(cm.get("TN", 0))
    fn = safe_int(cm.get("FN", 0))

    html = """
                    <h4 style="margin: 15px 0 10px;">Transaction Breakdown</h4>
"""

    html += f"""
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 15px;">
                        <div style="background: rgba(34, 197, 94, 0.1); padding: 12px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: var(--ok);">{tp}</div>
                            <div style="font-size: 0.8rem; color: var(--muted);">Fraud Caught (TP)</div>
                            <div style="font-size: 0.75rem; color: var(--ok);">IS_FRAUD=1 & Predicted=Fraud</div>
                        </div>
                        <div style="background: rgba(239, 68, 68, 0.1); padding: 12px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: var(--danger);">{fp}</div>
                            <div style="font-size: 0.8rem; color: var(--muted);">False Alarms (FP)</div>
                            <div style="font-size: 0.75rem; color: var(--danger);">IS_FRAUD=0 & Predicted=Fraud</div>
                        </div>
                        <div style="background: rgba(245, 158, 11, 0.1); padding: 12px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: var(--warn);">{fn}</div>
                            <div style="font-size: 0.8rem; color: var(--muted);">Fraud Missed (FN)</div>
                            <div style="font-size: 0.75rem; color: var(--warn);">IS_FRAUD=1 & Predicted=Legit</div>
                        </div>
                        <div style="background: rgba(59, 130, 246, 0.1); padding: 12px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent);">{tn}</div>
                            <div style="font-size: 0.8rem; color: var(--muted);">Legit Confirmed (TN)</div>
                            <div style="font-size: 0.75rem; color: var(--accent);">IS_FRAUD=0 & Predicted=Legit</div>
                        </div>
                    </div>
"""

    if tx_link:
        html += f"""
                    <a href="{tx_link}" target="_blank" style="display: inline-block; background: var(--accent);
                        color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none;">
                        View Full Transaction Analysis
                    </a>
                    <p style="color: var(--muted); font-size: 0.8rem; margin-top: 8px;">
                        Opens detailed report with {total_tx} individual transactions, risk scores, and financial calculations
                    </p>
"""

    return html


def get_transaction_details_link(investigation_id: str) -> Optional[str]:
    """Get link to the transaction-level confusion matrix HTML file."""
    auto_startup_dir = Path("artifacts/comparisons/auto_startup")

    if auto_startup_dir.exists():
        link = _find_in_auto_startup(auto_startup_dir, investigation_id)
        if link:
            return link

    return _find_in_investigation_folder(investigation_id)


def _find_in_auto_startup(auto_startup_dir: Path, investigation_id: str) -> Optional[str]:
    """Find transaction details file in auto_startup directory."""
    patterns = [
        f"confusion_table_{investigation_id}_*.html",
        f"confusion_matrix_{investigation_id}.html",
    ]

    for pattern in patterns:
        matches = list(auto_startup_dir.glob(pattern))
        if matches:
            return str(sorted(matches, key=lambda p: p.stat().st_mtime, reverse=True)[0].absolute())

    for merchant_dir in auto_startup_dir.iterdir():
        if merchant_dir.is_dir():
            for pattern in patterns:
                matches = list(merchant_dir.glob(pattern))
                if matches:
                    return str(
                        sorted(matches, key=lambda p: p.stat().st_mtime, reverse=True)[0].absolute()
                    )

    return None


def _find_in_investigation_folder(investigation_id: str) -> Optional[str]:
    """Find transaction details file in investigation folder."""
    try:
        from app.service.logging.investigation_folder_manager import get_folder_manager

        folder_manager = get_folder_manager()
        inv_folder = folder_manager.get_investigation_folder(investigation_id)
        if inv_folder:
            cm_in_folder = inv_folder / "confusion_matrix.html"
            if cm_in_folder.exists():
                return str(cm_in_folder.absolute())
    except Exception:
        pass

    return None
