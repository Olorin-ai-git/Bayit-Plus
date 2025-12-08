"""
Incremental Report Generation

Generates and updates a SINGLE incremental HTML file after each investigation completes.
Fetches data directly from the database to ensure all confusion matrices are included.
"""

import json
import logging
import re
import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Global lock to prevent concurrent report generation
_report_generation_lock = threading.Lock()

INCREMENTAL_FILE = Path("artifacts/startup_analysis_INCREMENTAL.html")


def generate_incremental_report(triggering_investigation_id: str) -> Optional[Path]:
    """
    Generate/update the INCREMENTAL HTML report.
    
    Fetches ALL completed auto-comp investigations from DB and generates report.
    This creates a SINGLE HTML file that gets overwritten each time.
    """
    acquired = _report_generation_lock.acquire(blocking=False)
    if not acquired:
        logger.info(f"⏭️ Report generation in progress, skipping {triggering_investigation_id}")
        return None
    
    try:
        logger.info(f"🔄 Generating incremental report (triggered by {triggering_investigation_id})")
        
        # Fetch completed investigations from database
        investigations = _fetch_completed_auto_comp_investigations()
        
        logger.info(f"   Found {len(investigations)} completed auto-comp investigations")
        
        if not investigations:
            logger.info("   No completed investigations to report")
            return None
        
        # Ensure directory exists
        INCREMENTAL_FILE.parent.mkdir(parents=True, exist_ok=True)
        
        # Generate HTML
        html = _generate_incremental_html(investigations)
        INCREMENTAL_FILE.write_text(html)
        
        logger.info(f"✅ Incremental report updated: {INCREMENTAL_FILE}")
        return INCREMENTAL_FILE
        
    except Exception as e:
        logger.error(f"❌ Failed to generate incremental report: {e}", exc_info=True)
        return None
    finally:
        _report_generation_lock.release()


def _fetch_completed_auto_comp_investigations() -> List[Dict[str, Any]]:
    """Fetch all completed auto-comp investigations from database with their confusion matrices."""
    from app.models.investigation_state import InvestigationState
    from app.persistence.database import get_db
    
    investigations = []
    
    db_gen = get_db()
    db = next(db_gen)
    
    try:
        completed_invs = db.query(InvestigationState).filter(
            InvestigationState.investigation_id.like("auto-comp-%"),
            InvestigationState.status == "COMPLETED"
        ).order_by(InvestigationState.updated_at.desc()).all()
        
        for inv in completed_invs:
            result = {
                "investigation_id": inv.investigation_id,
                "entity_type": "email",
                "status": inv.status,
            }
            
            # Parse settings for entity and merchant
            if inv.settings_json:
                try:
                    settings = json.loads(inv.settings_json)
                    entities = settings.get("entities", [])
                    if entities:
                        result["entity_value"] = entities[0].get("entity_value")
                        result["email"] = entities[0].get("entity_value")
                    
                    # Extract merchant from name
                    name = settings.get("name", "")
                    match = re.search(r"\(Merchant: (.*?)\)", name)
                    result["merchant_name"] = match.group(1) if match else "Unknown"
                except json.JSONDecodeError:
                    pass
            
            # Parse progress for confusion matrix and revenue data
            if inv.progress_json:
                try:
                    progress = json.loads(inv.progress_json)
                    
                    # Get confusion matrix
                    cm = progress.get("confusion_matrix", {})
                    if cm:
                        result["confusion_matrix"] = cm
                    
                    # Get revenue implications (including breakdowns with sample transactions)
                    revenue = progress.get("revenue_implications", {})
                    if revenue:
                        result["revenue_data"] = revenue
                except json.JSONDecodeError:
                    pass
            
            # Also check settings_json for revenue_data (stored by auto_comparison)
            if inv.settings_json and "revenue_data" not in result:
                try:
                    settings = json.loads(inv.settings_json)
                    revenue = settings.get("revenue_data", {})
                    if revenue:
                        result["revenue_data"] = revenue
                except json.JSONDecodeError:
                    pass
            
            # Try to load confusion matrix from file if not in progress_json
            if "confusion_matrix" not in result:
                cm_data = _load_confusion_matrix_from_file(inv.investigation_id)
                if cm_data:
                    result["confusion_matrix"] = cm_data.get("confusion_matrix", {})
                    if not result.get("revenue_data"):
                        result["revenue_data"] = cm_data.get("revenue_implications", {})
            
            # Calculate total_transactions from confusion matrix
            if "confusion_matrix" in result:
                cm = result["confusion_matrix"]
                result["total_transactions"] = (
                    cm.get("TP", 0) + cm.get("FP", 0) + 
                    cm.get("TN", 0) + cm.get("FN", 0)
                )
            else:
                result["total_transactions"] = 0
            
            investigations.append(result)
    
    finally:
        db.close()
    
    return investigations


def _load_confusion_matrix_from_file(investigation_id: str) -> Optional[Dict[str, Any]]:
    """Try to load confusion matrix data from the generated HTML file."""
    # Check auto_startup folder
    cm_path = Path(f"artifacts/comparisons/auto_startup/confusion_matrix_{investigation_id}.html")
    if cm_path.exists():
        try:
            html_content = cm_path.read_text()
            result = {"confusion_matrix": {}, "revenue_implications": {}}
            
            # Extract TP, FP, TN, FN from HTML
            # Match pattern: True Positives (TP)...font-size: 12px...next <td> tag contains the actual value
            tp_match = re.search(r'True Positives \(TP\)</strong>.*?<td[^>]*>(\d+)</td>', html_content, re.DOTALL)
            fp_match = re.search(r'False Positives \(FP\)</strong>.*?<td[^>]*>(\d+)</td>', html_content, re.DOTALL)
            tn_match = re.search(r'True Negatives \(TN\)</strong>.*?<td[^>]*>(\d+)</td>', html_content, re.DOTALL)
            fn_match = re.search(r'False Negatives \(FN\)</strong>.*?<td[^>]*>(\d+)</td>', html_content, re.DOTALL)
            
            if tp_match:
                result["confusion_matrix"]["TP"] = int(tp_match.group(1))
            if fp_match:
                result["confusion_matrix"]["FP"] = int(fp_match.group(1))
            if tn_match:
                result["confusion_matrix"]["TN"] = int(tn_match.group(1))
            if fn_match:
                result["confusion_matrix"]["FN"] = int(fn_match.group(1))
            
            # Extract revenue metrics - look for h4 label followed by div with value
            # Pattern: <h4...>Saved Fraud GMV</h4>\s*<div...>$VALUE</div>
            saved_match = re.search(
                r'<h4[^>]*>Saved Fraud GMV</h4>\s*<div[^>]*>\$([0-9,]+\.?\d*)',
                html_content
            )
            lost_match = re.search(
                r'<h4[^>]*>Lost Revenues</h4>\s*<div[^>]*>\$([0-9,]+\.?\d*)',
                html_content
            )
            net_match = re.search(
                r'<h4[^>]*>[^<]*Net Value</h4>\s*<div[^>]*>\$([0-9,]+\.?\d*)',
                html_content
            )
            
            if saved_match:
                result["revenue_implications"]["saved_fraud_gmv"] = float(saved_match.group(1).replace(',', ''))
            if lost_match:
                result["revenue_implications"]["lost_revenues"] = float(lost_match.group(1).replace(',', ''))
            if net_match:
                result["revenue_implications"]["net_value"] = float(net_match.group(1).replace(',', ''))
            
            if result["confusion_matrix"]:
                return result
        except Exception as e:
            logger.debug(f"Could not parse confusion matrix from {cm_path}: {e}")
    
    return None


def _generate_incremental_html(investigations: List[Dict[str, Any]]) -> str:
    """Generate the incremental HTML report with full financial analysis."""
    
    # Group by merchant
    by_merchant: Dict[str, List[Dict[str, Any]]] = {}
    for inv in investigations:
        merchant = inv.get("merchant_name", "Unknown Merchant")
        if merchant not in by_merchant:
            by_merchant[merchant] = []
        by_merchant[merchant].append(inv)
    
    # Calculate global totals
    total_saved = sum(_safe_float(inv.get("revenue_data", {}).get("saved_fraud_gmv", 0)) for inv in investigations)
    total_lost = sum(_safe_float(inv.get("revenue_data", {}).get("lost_revenues", 0)) for inv in investigations)
    total_net = total_saved - total_lost
    total_tp = sum(_safe_int(inv.get("confusion_matrix", {}).get("TP", 0)) for inv in investigations)
    total_fp = sum(_safe_int(inv.get("confusion_matrix", {}).get("FP", 0)) for inv in investigations)
    total_tn = sum(_safe_int(inv.get("confusion_matrix", {}).get("TN", 0)) for inv in investigations)
    total_fn = sum(_safe_int(inv.get("confusion_matrix", {}).get("FN", 0)) for inv in investigations)
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fraud Detection - Incremental Report</title>
    <style>
        :root {{
            --bg: #0f172a;
            --card: #1e293b;
            --border: #334155;
            --text: #e2e8f0;
            --muted: #94a3b8;
            --ok: #22c55e;
            --warn: #f59e0b;
            --danger: #ef4444;
            --accent: #3b82f6;
        }}
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            font-family: 'Segoe UI', system-ui, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.6;
            padding: 20px;
        }}
        .header {{
            text-align: center;
            padding: 30px;
            border-bottom: 2px solid var(--accent);
            margin-bottom: 30px;
        }}
        h1 {{ color: var(--accent); font-size: 2rem; }}
        .subtitle {{ color: var(--muted); margin-top: 10px; }}
        .status-badge {{
            display: inline-block;
            background: var(--warn);
            color: #000;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            margin-top: 15px;
        }}
        .global-metrics {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }}
        .metric-card {{
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
        }}
        .metric-value {{
            font-size: 2rem;
            font-weight: bold;
        }}
        .metric-value.positive {{ color: var(--ok); }}
        .metric-value.negative {{ color: var(--danger); }}
        .metric-label {{ color: var(--muted); margin-top: 5px; }}
        .confusion-grid {{
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            max-width: 400px;
            margin: 20px auto;
        }}
        .cm-cell {{
            padding: 15px;
            text-align: center;
            border-radius: 8px;
            font-weight: bold;
        }}
        .cm-tp {{ background: rgba(34, 197, 94, 0.2); color: var(--ok); }}
        .cm-fp {{ background: rgba(239, 68, 68, 0.2); color: var(--danger); }}
        .cm-tn {{ background: rgba(59, 130, 246, 0.2); color: var(--accent); }}
        .cm-fn {{ background: rgba(245, 158, 11, 0.2); color: var(--warn); }}
        .merchant-section {{
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 12px;
            margin-bottom: 20px;
            overflow: hidden;
        }}
        .merchant-header {{
            background: linear-gradient(135deg, var(--accent), #6366f1);
            padding: 15px 20px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        .merchant-header h3 {{ color: white; }}
        .merchant-content {{ padding: 20px; display: none; }}
        .merchant-content.open {{ display: block; }}
        .entity-card {{
            background: rgba(0,0,0,0.2);
            border: 1px solid var(--border);
            border-radius: 8px;
            margin-bottom: 15px;
            overflow: hidden;
        }}
        .entity-header {{
            padding: 12px 15px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(59, 130, 246, 0.1);
        }}
        .entity-details {{ padding: 15px; display: none; }}
        .entity-details.open {{ display: block; }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
        }}
        th, td {{
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid var(--border);
        }}
        th {{ color: var(--muted); font-weight: normal; }}
        .toggle {{ font-size: 1.2rem; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Fraud Detection - Incremental Report</h1>
        <p class="subtitle">Real-time results as investigations complete</p>
        <div class="status-badge">⏳ IN PROGRESS - {len(investigations)} completed</div>
        <p class="subtitle" style="margin-top: 10px;">Last updated: {timestamp}</p>
    </div>

    <h2 style="margin-bottom: 20px;">💰 Financial Impact Summary</h2>
    <div class="global-metrics">
        <div class="metric-card">
            <div class="metric-value positive">${total_saved:,.2f}</div>
            <div class="metric-label">Saved Fraud GMV</div>
        </div>
        <div class="metric-card">
            <div class="metric-value negative">${total_lost:,.2f}</div>
            <div class="metric-label">Lost Revenues</div>
        </div>
        <div class="metric-card">
            <div class="metric-value {'positive' if total_net >= 0 else 'negative'}">${total_net:,.2f}</div>
            <div class="metric-label">Net Value</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">{len(investigations)}</div>
            <div class="metric-label">Investigations</div>
        </div>
    </div>

    <h2 style="margin-bottom: 20px;">📊 Global Confusion Matrix</h2>
    <div class="confusion-grid">
        <div class="cm-cell cm-tp">TP: {total_tp}<br><small>Fraud Caught</small></div>
        <div class="cm-cell cm-fp">FP: {total_fp}<br><small>False Alarms</small></div>
        <div class="cm-cell cm-fn">FN: {total_fn}<br><small>Fraud Missed</small></div>
        <div class="cm-cell cm-tn">TN: {total_tn}<br><small>Legit Confirmed</small></div>
    </div>

    <h2 style="margin: 30px 0 20px;">🏢 Results by Merchant</h2>
"""
    
    # Add merchant sections
    for merchant, entities in by_merchant.items():
        merchant_saved = sum(_safe_float(inv.get("revenue_data", {}).get("saved_fraud_gmv", 0)) for inv in entities)
        merchant_net = merchant_saved - sum(_safe_float(inv.get("revenue_data", {}).get("lost_revenues", 0)) for inv in entities)
        safe_merchant_id = merchant.replace(" ", "_").replace("@", "_").replace(".", "_")
        
        html += f"""
    <div class="merchant-section">
        <div class="merchant-header" onclick="toggleMerchant('{safe_merchant_id}')">
            <h3>{merchant} ({len(entities)} entities)</h3>
            <span>Net: ${merchant_net:,.2f} <span class="toggle">▼</span></span>
        </div>
        <div class="merchant-content" id="merchant-{safe_merchant_id}">
"""
        
        for inv in entities:
            entity_id = inv.get("email") or inv.get("entity_value") or "Unknown"
            inv_id = inv.get("investigation_id", "unknown")
            safe_entity_id = f"{safe_merchant_id}_{entity_id.replace('@', '_').replace('.', '_')}"
            
            cm = inv.get("confusion_matrix", {})
            rev = inv.get("revenue_data", {})
            tp = _safe_int(cm.get("TP", 0))
            fp = _safe_int(cm.get("FP", 0))
            tn = _safe_int(cm.get("TN", 0))
            fn = _safe_int(cm.get("FN", 0))
            saved = _safe_float(rev.get("saved_fraud_gmv", 0))
            lost = _safe_float(rev.get("lost_revenues", 0))
            net = saved - lost
            
            # Get transaction details
            tx_link = _get_transaction_details_link(inv_id)
            tx_section = _generate_transaction_section(inv, tx_link, tp + fp + tn + fn)
            
            html += f"""
            <div class="entity-card">
                <div class="entity-header" onclick="toggleEntity('{safe_entity_id}')">
                    <span><strong>{entity_id}</strong></span>
                    <span>Net: ${net:,.2f} <span class="toggle">▶</span></span>
                </div>
                <div class="entity-details" id="entity-{safe_entity_id}">
                    <p style="color: var(--muted); margin-bottom: 10px;">Investigation: {inv_id}</p>
                    
                    <h4 style="margin: 15px 0 10px;">Confusion Matrix</h4>
                    <div class="confusion-grid" style="max-width: 300px;">
                        <div class="cm-cell cm-tp">TP: {tp}</div>
                        <div class="cm-cell cm-fp">FP: {fp}</div>
                        <div class="cm-cell cm-fn">FN: {fn}</div>
                        <div class="cm-cell cm-tn">TN: {tn}</div>
                    </div>
                    
                    <h4 style="margin: 15px 0 10px;">Financial Impact</h4>
                    <table>
                        <tr><th>Saved Fraud GMV</th><td style="color: var(--ok);">${saved:,.2f}</td></tr>
                        <tr><th>Lost Revenues</th><td style="color: var(--danger);">${lost:,.2f}</td></tr>
                        <tr><th>Net Value</th><td style="color: {'var(--ok)' if net >= 0 else 'var(--danger)'}; font-weight: bold;">${net:,.2f}</td></tr>
                    </table>
                    
                    <h4 style="margin: 15px 0 10px;">Financial Reasoning</h4>
                    <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; font-size: 0.9rem;">
                        <p><strong>Saved Fraud GMV:</strong> Sum of transaction amounts for True Positives (TP={tp})</p>
                        <p><strong>Lost Revenues:</strong> Sum of transaction amounts for False Positives (FP={fp}) × merchant commission rate</p>
                        <p><strong>Net Value:</strong> Saved Fraud GMV - Lost Revenues = ${net:,.2f}</p>
                    </div>
                    {tx_section}
                </div>
            </div>
"""
        
        html += """
        </div>
    </div>
"""
    
    html += """
    <script>
        function toggleMerchant(id) {
            const content = document.getElementById('merchant-' + id);
            content.classList.toggle('open');
        }
        function toggleEntity(id) {
            const content = document.getElementById('entity-' + id);
            content.classList.toggle('open');
        }
        // Auto-expand first merchant
        document.querySelector('.merchant-content')?.classList.add('open');
    </script>
</body>
</html>
"""
    return html


def _generate_transaction_section(inv: Dict[str, Any], tx_link: Optional[str], total_tx: int) -> str:
    """Generate the transaction-level drill-down section."""
    cm = inv.get("confusion_matrix", {})
    rev = inv.get("revenue_data", {})
    
    tp = _safe_int(cm.get("TP", 0))
    fp = _safe_int(cm.get("FP", 0))
    tn = _safe_int(cm.get("TN", 0))
    fn = _safe_int(cm.get("FN", 0))
    
    html = """
                    <h4 style="margin: 15px 0 10px;">📋 Transaction Breakdown</h4>
"""
    
    # Show transaction classification summary
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
    
    # Add link to full confusion matrix with transaction details
    if tx_link:
        html += f"""
                    <a href="{tx_link}" target="_blank" style="display: inline-block; background: var(--accent); color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none;">
                        📊 View Full Transaction Analysis →
                    </a>
                    <p style="color: var(--muted); font-size: 0.8rem; margin-top: 8px;">
                        Opens detailed report with {total_tx} individual transactions, risk scores, and financial calculations
                    </p>
"""
    
    return html


def _get_transaction_details_link(investigation_id: str) -> Optional[str]:
    """Get link to the transaction-level confusion matrix HTML file."""
    # Check for confusion matrix file in auto_startup folder
    cm_path = Path(f"artifacts/comparisons/auto_startup/confusion_matrix_{investigation_id}.html")
    if cm_path.exists():
        return str(cm_path.absolute())
    
    # Check in investigation folder
    from app.service.logging.investigation_folder_manager import get_folder_manager
    try:
        folder_manager = get_folder_manager()
        inv_folder = folder_manager.get_investigation_folder(investigation_id)
        if inv_folder:
            cm_in_folder = inv_folder / "confusion_matrix.html"
            if cm_in_folder.exists():
                return str(cm_in_folder.absolute())
    except Exception:
        pass
    
    return None


def _safe_float(val: Any) -> float:
    """Safely convert to float."""
    try:
        return float(val) if val else 0.0
    except (ValueError, TypeError):
        return 0.0


def _safe_int(val: Any) -> int:
    """Safely convert to int."""
    try:
        return int(val) if val else 0
    except (ValueError, TypeError):
        return 0
