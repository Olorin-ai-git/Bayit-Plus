"""
Consolidated Startup Analysis Report Generator

Generates a SINGLE comprehensive HTML report with:
- Financial analysis at the top
- Hierarchical drill-down: Merchant → Entity → Transaction
- Confusion matrices grouped by merchant
- Interactive collapsible sections
- All reports packaged in a ZIP file with working internal links

This REPLACES all other report types (interim, individual entity reports, etc.)
"""

import json
import os
import shutil
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from zipfile import ZipFile, ZIP_DEFLATED

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def generate_consolidated_report(
    comparison_results: List[Dict[str, Any]],
    output_dir: Optional[Path] = None,
) -> Path:
    """
    Generate consolidated HTML report and package with individual reports in a ZIP file.
    
    Args:
        comparison_results: List of investigation comparison results
        output_dir: Optional output directory (defaults to artifacts/)
        
    Returns:
        Path to generated ZIP file containing all reports
    """
    logger.info("📊 Generating consolidated startup analysis report with ZIP packaging...")
    
    # Group entities by merchant
    merchant_groups = _group_by_merchant(comparison_results)
    
    # Calculate global aggregated metrics
    global_metrics = _calculate_global_metrics(comparison_results)
    
    # Generate HTML
    html_content = _generate_html(merchant_groups, global_metrics)
    
    # Setup output directory
    if output_dir is None:
        from app.config.file_organization_config import FileOrganizationConfig
        config = FileOrganizationConfig()
        output_dir = config.artifacts_base_dir
    
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Create temporary directory for packaging
    temp_dir = output_dir / f"temp_report_{timestamp}"
    temp_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        # Save consolidated report
        consolidated_report = temp_dir / "index.html"
        with open(consolidated_report, "w", encoding="utf-8") as f:
            f.write(html_content)
        
        # Create individual_reports subdirectory
        individual_reports_dir = temp_dir / "individual_reports"
        individual_reports_dir.mkdir(parents=True, exist_ok=True)
        
        # Copy individual entity reports
        investigation_ids = [r.get("investigation_id") for r in comparison_results if r.get("investigation_id")]
        copied_reports = _copy_individual_reports(investigation_ids, individual_reports_dir)
        
        logger.info(f"📦 Packaged {len(copied_reports)} individual entity reports")
        
        # Create ZIP file
        zip_path = output_dir / f"startup_analysis_COMPLETE_{timestamp}.zip"
        with ZipFile(zip_path, 'w', ZIP_DEFLATED) as zipf:
            # Add consolidated report as index.html
            zipf.write(consolidated_report, "index.html")
            
            # Add all individual reports
            for report_path in individual_reports_dir.glob("*.html"):
                zipf.write(report_path, f"individual_reports/{report_path.name}")
            
            # Add README
            readme_content = _generate_readme(len(investigation_ids), len(copied_reports), timestamp)
            zipf.writestr("README.txt", readme_content)
        
        logger.info(f"✅ Complete report package created: {zip_path}")
        logger.info(f"   📄 Consolidated report: index.html")
        logger.info(f"   📁 Individual reports: {len(copied_reports)} files in individual_reports/")
        
        return zip_path
        
    finally:
        # Cleanup temp directory
        if temp_dir.exists():
            shutil.rmtree(temp_dir)
            logger.debug(f"🧹 Cleaned up temporary directory: {temp_dir}")


def _group_by_merchant(
    comparison_results: List[Dict[str, Any]]
) -> Dict[str, List[Dict[str, Any]]]:
    """Group entities by merchant."""
    merchant_groups = defaultdict(list)
    
    for result in comparison_results:
        # Support both "merchant" (old) and "merchant_name" (new)
        merchant = result.get("merchant_name") or result.get("merchant", "Unknown")
        merchant_groups[merchant].append(result)
    
    return dict(merchant_groups)


def _calculate_global_metrics(
    comparison_results: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Calculate global aggregated metrics across all entities."""
    total_tp = total_fp = total_tn = total_fn = 0
    total_saved = total_lost = 0.0
    total_entities = len(comparison_results)
    total_transactions = 0
    
    for result in comparison_results:
        cm = result.get("confusion_matrix", {})
        total_tp += cm.get("TP", 0)
        total_fp += cm.get("FP", 0)
        total_tn += cm.get("TN", 0)
        total_fn += cm.get("FN", 0)
        
        # Support both "revenue_implications" (old) and "revenue_data" (new)
        revenue = result.get("revenue_data") or result.get("revenue_implications", {})
        total_saved += revenue.get("saved_fraud_gmv", 0.0)
        total_lost += revenue.get("lost_revenues", 0.0)
        
        # Calculate total_transactions from confusion matrix if not present
        txs = result.get("total_transactions", 0)
        if txs == 0:
            txs = cm.get("TP", 0) + cm.get("FP", 0) + cm.get("TN", 0) + cm.get("FN", 0)
        total_transactions += txs
    
    total_all = total_tp + total_fp + total_tn + total_fn
    precision = total_tp / (total_tp + total_fp) if (total_tp + total_fp) > 0 else 0.0
    recall = total_tp / (total_tp + total_fn) if (total_tp + total_fn) > 0 else 0.0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    accuracy = (total_tp + total_tn) / total_all if total_all > 0 else 0.0
    net_value = total_saved - total_lost
    
    return {
        "total_entities": total_entities,
        "total_transactions": total_transactions,
        "tp": total_tp,
        "fp": total_fp,
        "tn": total_tn,
        "fn": total_fn,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "accuracy": accuracy,
        "saved_fraud_gmv": total_saved,
        "lost_revenues": total_lost,
        "net_value": net_value,
    }


def _generate_html(
    merchant_groups: Dict[str, List[Dict[str, Any]]],
    global_metrics: Dict[str, Any],
) -> str:
    """Generate consolidated HTML report."""
    
    # Generate merchant sections
    merchant_sections = ""
    for merchant, entities in sorted(merchant_groups.items()):
        merchant_sections += _generate_merchant_section(merchant, entities)
    
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Olorin Startup Analysis - Consolidated Report</title>
    <style>
        :root {{
            --bg: #0a0e27;
            --panel: #151932;
            --border: #1e2440;
            --text: #e0e6ed;
            --muted: #8b95a6;
            --accent: #4a9eff;
            --accent-secondary: #7b68ee;
            --ok: #4ade80;
            --warning: #fbbf24;
            --error: #f87171;
            --panel-glass: rgba(21, 25, 50, 0.6);
        }}
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg);
            color: var(--text);
            padding: 24px;
            line-height: 1.6;
            max-width: 1400px;
            margin: 0 auto;
        }}
        .header {{
            text-align: center;
            margin-bottom: 40px;
            padding: 32px;
            background: linear-gradient(135deg, var(--panel) 0%, var(--bg) 100%);
            border-radius: 16px;
            border: 1px solid var(--border);
        }}
        h1 {{
            color: var(--accent);
            font-size: 2.5em;
            margin-bottom: 8px;
        }}
        .subtitle {{
            color: var(--muted);
            font-size: 1.1em;
        }}
        .panel {{
            background: var(--panel);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
        }}
        .metrics-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin: 20px 0;
        }}
        .metric-card {{
            background: var(--panel-glass);
            padding: 20px;
            border-radius: 8px;
            border: 1px solid var(--border);
            text-align: center;
        }}
        .metric-value {{
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 8px;
        }}
        .metric-label {{
            color: var(--muted);
            font-size: 0.9em;
        }}
        .merchant-section {{
            background: var(--panel);
            border: 2px solid var(--border);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
        }}
        .merchant-header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 2px solid var(--accent);
        }}
        .merchant-title {{
            color: var(--accent-secondary);
            font-size: 1.8em;
            font-weight: bold;
        }}
        .entity-card {{
            background: var(--panel-glass);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 16px;
        }}
        .entity-header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            cursor: pointer;
        }}
        .entity-header:hover {{
            opacity: 0.8;
        }}
        .entity-name {{
            color: var(--accent);
            font-size: 1.2em;
            font-weight: 600;
        }}
        .toggle-icon {{
            color: var(--muted);
            font-size: 1.5em;
        }}
        .entity-details {{
            display: none;
            margin-top: 16px;
        }}
        .entity-details.expanded {{
            display: block;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
        }}
        th, td {{
            padding: 12px 8px;
            text-align: left;
            border-bottom: 1px solid var(--border);
        }}
        th {{
            font-weight: 600;
            color: var(--accent);
            background: var(--panel-glass);
        }}
        .confusion-matrix {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin: 16px 0;
        }}
        .cm-cell {{
            padding: 16px;
            border-radius: 8px;
            text-align: center;
        }}
        .cm-tp {{ background: rgba(74, 222, 128, 0.2); border: 1px solid var(--ok); }}
        .cm-fp {{ background: rgba(251, 191, 36, 0.2); border: 1px solid var(--warning); }}
        .cm-tn {{ background: rgba(74, 158, 255, 0.2); border: 1px solid var(--accent); }}
        .cm-fn {{ background: rgba(248, 113, 113, 0.2); border: 1px solid var(--error); }}
        .cm-label {{
            font-size: 0.9em;
            color: var(--muted);
            margin-bottom: 8px;
        }}
        .cm-value {{
            font-size: 2em;
            font-weight: bold;
        }}
        code {{
            background: rgba(0, 0, 0, 0.3);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Monaco', monospace;
            font-size: 0.9em;
        }}
        .good {{ color: var(--ok); }}
        .warn {{ color: var(--warning); }}
        .bad {{ color: var(--error); }}
        .transactions-table {{
            width: 100%;
            font-size: 0.85em;
            margin-top: 16px;
        }}
        .transactions-table th {{
            background: var(--panel-glass);
            font-size: 0.8em;
        }}
        .transactions-table tr:hover {{
            background: var(--panel-glass);
        }}
        .tx-fraud {{ color: var(--error); font-weight: bold; }}
        .tx-legit {{ color: var(--ok); }}
        .financial-reasoning {{
            background: var(--panel-glass);
            border-left: 4px solid var(--accent);
            padding: 16px;
            margin: 16px 0;
            border-radius: 4px;
        }}
        .calculation-step {{
            margin: 8px 0;
            padding: 8px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 4px;
            font-family: 'Monaco', monospace;
            font-size: 0.9em;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Olorin Startup Analysis</h1>
        <div class="subtitle">Consolidated Fraud Detection Report</div>
        <div class="subtitle" style="margin-top: 8px; font-size: 0.9em;">
            Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")}
        </div>
    </div>

    <!-- FINANCIAL ANALYSIS AT TOP -->
    <div class="panel">
        <h2 style="color: var(--accent); margin-bottom: 20px;">💰 Financial Impact Summary</h2>
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value good">${global_metrics['saved_fraud_gmv']:,.2f}</div>
                <div class="metric-label">Saved Fraud GMV</div>
            </div>
            <div class="metric-card">
                <div class="metric-value warn">${global_metrics['lost_revenues']:,.2f}</div>
                <div class="metric-label">Lost Revenues</div>
            </div>
            <div class="metric-card">
                <div class="metric-value {'good' if global_metrics['net_value'] >= 0 else 'bad'}">${global_metrics['net_value']:,.2f}</div>
                <div class="metric-label">Net Value</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">{global_metrics['total_entities']}</div>
                <div class="metric-label">Entities Analyzed</div>
            </div>
        </div>
    </div>

    <!-- GLOBAL METRICS -->
    <div class="panel">
        <h2 style="color: var(--accent); margin-bottom: 20px;">📊 Global Performance Metrics</h2>
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">{global_metrics['total_transactions']:,}</div>
                <div class="metric-label">Total Transactions</div>
            </div>
            <div class="metric-card">
                <div class="metric-value good">{global_metrics['recall']:.1%}</div>
                <div class="metric-label">Recall (Fraud Caught)</div>
            </div>
            <div class="metric-card">
                <div class="metric-value {'good' if global_metrics['precision'] > 0.5 else 'warn'}">{global_metrics['precision']:.1%}</div>
                <div class="metric-label">Precision</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">{global_metrics['f1']:.1%}</div>
                <div class="metric-label">F1 Score</div>
            </div>
        </div>
        
        <h3 style="color: var(--text); margin: 24px 0 16px 0;">Global Confusion Matrix</h3>
        <div class="confusion-matrix">
            <div class="cm-cell cm-tp">
                <div class="cm-label">True Positives</div>
                <div class="cm-value">{global_metrics['tp']}</div>
            </div>
            <div class="cm-cell cm-fp">
                <div class="cm-label">False Positives</div>
                <div class="cm-value">{global_metrics['fp']}</div>
            </div>
            <div class="cm-cell cm-fn">
                <div class="cm-label">False Negatives</div>
                <div class="cm-value">{global_metrics['fn']}</div>
            </div>
            <div class="cm-cell cm-tn">
                <div class="cm-label">True Negatives</div>
                <div class="cm-value">{global_metrics['tn']}</div>
            </div>
        </div>
    </div>

    <!-- MERCHANT DRILL-DOWN SECTIONS -->
    <div class="panel">
        <h2 style="color: var(--accent); margin-bottom: 20px;">🏢 Analysis by Merchant</h2>
        {merchant_sections}
    </div>

    <script>
        function toggleEntity(entityId) {{
            const details = document.getElementById('entity-' + entityId);
            const icon = document.getElementById('icon-' + entityId);
            
            if (details.classList.contains('expanded')) {{
                details.classList.remove('expanded');
                icon.textContent = '▶';
            }} else {{
                details.classList.add('expanded');
                icon.textContent = '▼';
            }}
        }}
        
        function expandAll() {{
            document.querySelectorAll('.entity-details').forEach(el => el.classList.add('expanded'));
            document.querySelectorAll('.toggle-icon').forEach(el => el.textContent = '▼');
        }}
        
        function collapseAll() {{
            document.querySelectorAll('.entity-details').forEach(el => el.classList.remove('expanded'));
            document.querySelectorAll('.toggle-icon').forEach(el => el.textContent = '▶');
        }}
        
        function toggleTransactions(entityId) {{
            const txDiv = document.getElementById('transactions-' + entityId);
            const btn = document.getElementById('tx-btn-' + entityId);
            
            if (txDiv.style.display === 'none') {{
                txDiv.style.display = 'block';
                btn.textContent = 'Hide Transactions';
            }} else {{
                txDiv.style.display = 'none';
                btn.textContent = 'Show Transactions';
            }}
        }}
    </script>
</body>
</html>"""
    
    return html


def _generate_merchant_section(merchant: str, entities: List[Dict[str, Any]]) -> str:
    """Generate merchant section with entity drill-down."""
    
    # Calculate merchant-level aggregated metrics
    merchant_tp = merchant_fp = merchant_tn = merchant_fn = 0
    merchant_saved = merchant_lost = 0.0
    merchant_txs = 0
    
    for entity in entities:
        cm = entity.get("confusion_matrix", {})
        merchant_tp += cm.get("TP", 0)
        merchant_fp += cm.get("FP", 0)
        merchant_tn += cm.get("TN", 0)
        merchant_fn += cm.get("FN", 0)
        
        # Support both "revenue_implications" (old) and "revenue_data" (new)
        revenue = entity.get("revenue_data") or entity.get("revenue_implications", {})
        merchant_saved += revenue.get("saved_fraud_gmv", 0.0)
        merchant_lost += revenue.get("lost_revenues", 0.0)
        
        # Calculate total_transactions from confusion matrix if not present
        txs = entity.get("total_transactions", 0)
        if txs == 0:
            txs = cm.get("TP", 0) + cm.get("FP", 0) + cm.get("TN", 0) + cm.get("FN", 0)
        merchant_txs += txs
    
    merchant_net = merchant_saved - merchant_lost
    
    # Generate entity cards
    entity_cards = ""
    for i, entity in enumerate(entities):
        entity_cards += _generate_entity_card(merchant, i, entity)
    
    return f"""
    <div class="merchant-section">
        <div class="merchant-header">
            <div class="merchant-title">🏢 {merchant}</div>
            <div style="text-align: right;">
                <button onclick="expandAll()" style="background: var(--accent); color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 8px;">Expand All</button>
                <button onclick="collapseAll()" style="background: var(--panel-glass); color: var(--text); border: 1px solid var(--border); padding: 8px 16px; border-radius: 4px; cursor: pointer;">Collapse All</button>
            </div>
        </div>
        
        <div class="metrics-grid" style="margin-bottom: 24px;">
            <div class="metric-card">
                <div class="metric-value">{len(entities)}</div>
                <div class="metric-label">Entities</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">{merchant_txs:,}</div>
                <div class="metric-label">Transactions</div>
            </div>
            <div class="metric-card">
                <div class="metric-value good">${merchant_saved:,.2f}</div>
                <div class="metric-label">Saved Fraud GMV</div>
            </div>
            <div class="metric-card">
                <div class="metric-value warn">${merchant_lost:,.2f}</div>
                <div class="metric-label">Lost Revenues</div>
            </div>
            <div class="metric-card">
                <div class="metric-value {'good' if merchant_net >= 0 else 'bad'}">${merchant_net:,.2f}</div>
                <div class="metric-label">Net Value</div>
            </div>
        </div>
        
        <h3 style="color: var(--text); margin-bottom: 16px;">Entities ({len(entities)})</h3>
        {entity_cards}
    </div>
    """


def _generate_entity_card(merchant: str, index: int, entity: Dict[str, Any]) -> str:
    """Generate entity card with collapsible details."""
    
    # Support both "entity_id" (old) and "entity_value" (new)
    entity_id = entity.get("entity_value") or entity.get("email") or entity.get("entity_id", "Unknown")
    entity_type = entity.get("entity_type", "email")
    cm = entity.get("confusion_matrix", {})
    # Support both "revenue_implications" (old) and "revenue_data" (new)
    revenue = entity.get("revenue_data") or entity.get("revenue_implications", {})
    investigation_id = entity.get("investigation_id", "N/A")
    
    tp = cm.get("TP", 0)
    fp = cm.get("FP", 0)
    tn = cm.get("TN", 0)
    fn = cm.get("FN", 0)
    precision = cm.get("precision", 0.0)
    recall = cm.get("recall", 0.0)
    
    # Calculate total_transactions from confusion matrix if not present
    total_txs = entity.get("total_transactions", 0)
    if total_txs == 0:
        total_txs = tp + fp + tn + fn
    
    saved = revenue.get("saved_fraud_gmv", 0.0)
    lost = revenue.get("lost_revenues", 0.0)
    net = saved - lost
    
    # Sanitize entity_id for HTML ID
    safe_id = f"{merchant}_{index}"
    
    return f"""
    <div class="entity-card">
        <div class="entity-header" onclick="toggleEntity('{safe_id}')">
            <div>
                <div class="entity-name">{entity_type}: {entity_id}</div>
                <div style="color: var(--muted); font-size: 0.9em; margin-top: 4px;">
                    Investigation ID: <code>{investigation_id}</code>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 24px;">
                <div style="text-align: center;">
                    <div style="font-size: 1.3em; font-weight: bold; color: var(--{'good' if net >= 0 else 'bad'})">${net:,.2f}</div>
                    <div style="font-size: 0.8em; color: var(--muted);">Net Value</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 1.3em; font-weight: bold;">{total_txs}</div>
                    <div style="font-size: 0.8em; color: var(--muted);">Transactions</div>
                </div>
                <span class="toggle-icon" id="icon-{safe_id}">▶</span>
            </div>
        </div>
        
        <div class="entity-details" id="entity-{safe_id}">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 20px;">
                <div>
                    <h4 style="color: var(--accent); margin-bottom: 12px;">Financial Impact</h4>
                    <table>
                        <tr>
                            <td>Saved Fraud GMV</td>
                            <td style="text-align: right; color: var(--ok); font-weight: bold;">${saved:,.2f}</td>
                        </tr>
                        <tr>
                            <td>Lost Revenues</td>
                            <td style="text-align: right; color: var(--warning); font-weight: bold;">${lost:,.2f}</td>
                        </tr>
                        <tr style="font-weight: bold;">
                            <td>Net Value</td>
                            <td style="text-align: right; color: var(--{'good' if net >= 0 else 'bad'})">${net:,.2f}</td>
                        </tr>
                    </table>
                </div>
                
                <div>
                    <h4 style="color: var(--accent); margin-bottom: 12px;">Performance Metrics</h4>
                    <table>
                        <tr>
                            <td>Precision</td>
                            <td style="text-align: right; font-weight: bold;">{precision:.1%}</td>
                        </tr>
                        <tr>
                            <td>Recall</td>
                            <td style="text-align: right; font-weight: bold; color: var(--{'good' if recall == 1.0 else 'warn'})">{recall:.1%}</td>
                        </tr>
                        <tr>
                            <td>Total Transactions</td>
                            <td style="text-align: right; font-weight: bold;">{total_txs}</td>
                        </tr>
                    </table>
                </div>
            </div>
            
            <!-- FINANCIAL REASONING -->
            <div class="financial-reasoning">
                <h4 style="color: var(--accent); margin-bottom: 12px;">💡 Financial Calculation Reasoning</h4>
                <p style="color: var(--muted); margin-bottom: 12px;">
                    This section explains how the financial metrics were calculated based on transaction outcomes:
                </p>
                
                <div style="margin: 16px 0;">
                    <strong style="color: var(--ok);">1. Saved Fraud GMV = ${saved:,.2f}</strong>
                    <div class="calculation-step">
                        • True Positives (TP): {tp} transactions correctly flagged as fraud
                        <br>• These represent APPROVED + FRAUD transactions that would have been blocked
                        <br>• Calculation: Sum of GMV from {tp} TP transactions
                        <br>• <span style="color: var(--ok);">Saved GMV = ${saved:,.2f}</span>
                    </div>
                </div>
                
                <div style="margin: 16px 0;">
                    <strong style="color: var(--warning);">2. Lost Revenues = ${lost:,.2f}</strong>
                    <div class="calculation-step">
                        • False Positives (FP): {fp} legitimate transactions incorrectly flagged
                        <br>• These represent APPROVED + LEGIT transactions that would have been blocked
                        <br>• Calculation: Sum of GMV from {fp} FP transactions × Take Rate × Multiplier
                        <br>• Default: Take Rate = 0.75%, Multiplier = 1.0
                        <br>• <span style="color: var(--warning);">Lost Revenue = ${lost:,.2f}</span>
                    </div>
                </div>
                
                <div style="margin: 16px 0;">
                    <strong style="color: var(--{'good' if net >= 0 else 'bad'});">3. Net Value = ${net:,.2f}</strong>
                    <div class="calculation-step">
                        • Formula: Net Value = Saved Fraud GMV - Lost Revenues
                        <br>• Calculation: ${saved:,.2f} - ${lost:,.2f}
                        <br>• <span style="color: var(--{'good' if net >= 0 else 'bad'}); font-weight: bold;">Net Value = ${net:,.2f}</span>
                        <br>• {'✅ POSITIVE ROI - Blocking is financially beneficial' if net >= 0 else '⚠️ NEGATIVE ROI - Review threshold or model'}
                    </div>
                </div>
                
                <div style="margin-top: 16px; padding: 12px; background: rgba(74, 158, 255, 0.1); border-radius: 4px;">
                    <strong>📊 Confusion Matrix Breakdown:</strong>
                    <ul style="margin: 8px 0; padding-left: 20px;">
                        <li>TP ({tp}): Predicted FRAUD + Actually FRAUD → Saved GMV</li>
                        <li>FP ({fp}): Predicted FRAUD + Actually LEGIT → Lost Revenue</li>
                        <li>TN ({tn}): Predicted LEGIT + Actually LEGIT → No impact</li>
                        <li>FN ({fn}): Predicted LEGIT + Actually FRAUD → Missed fraud (critical!)</li>
                    </ul>
                </div>
            </div>
            
            <h4 style="color: var(--accent); margin-bottom: 12px;">Confusion Matrix</h4>
            <div class="confusion-matrix">
                <div class="cm-cell cm-tp">
                    <div class="cm-label">True Positives</div>
                    <div class="cm-value">{tp}</div>
                    <div style="font-size: 0.8em; color: var(--muted); margin-top: 4px;">Correctly flagged fraud</div>
                </div>
                <div class="cm-cell cm-fp">
                    <div class="cm-label">False Positives</div>
                    <div class="cm-value">{fp}</div>
                    <div style="font-size: 0.8em; color: var(--muted); margin-top: 4px;">Legitimate flagged as fraud</div>
                </div>
                <div class="cm-cell cm-fn">
                    <div class="cm-label">False Negatives</div>
                    <div class="cm-value">{fn}</div>
                    <div style="font-size: 0.8em; color: var(--muted); margin-top: 4px;">Missed fraud</div>
                </div>
                <div class="cm-cell cm-tn">
                    <div class="cm-label">True Negatives</div>
                    <div class="cm-value">{tn}</div>
                    <div style="font-size: 0.8em; color: var(--muted); margin-top: 4px;">Correctly identified legitimate</div>
                </div>
            </div>
            
            <!-- TRANSACTION-LEVEL DRILL-DOWN -->
            <div style="margin-top: 24px;">
                <h4 style="color: var(--accent); margin-bottom: 12px;">
                    📋 Transaction-Level Details
                    <button onclick="toggleTransactions('{safe_id}')" id="tx-btn-{safe_id}" style="background: var(--accent); color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; margin-left: 12px; font-size: 0.9em;">
                        Show Transactions
                    </button>
                </h4>
                
                <div id="transactions-{safe_id}" style="display: none;">
                    <p style="color: var(--muted); margin-bottom: 12px;">
                        Detailed transaction-level data for this entity:
                    </p>
                    
                    <div style="background: rgba(74, 158, 255, 0.1); padding: 12px; border-radius: 4px; margin-bottom: 12px;">
                        <strong>📊 Transaction Summary:</strong>
                        <ul style="margin: 8px 0; padding-left: 20px; color: var(--text);">
                            <li>Total: {total_txs} transactions</li>
                            <li>Predicted Fraud: {tp + fp} transactions</li>
                            <li>Predicted Legit: {tn + fn} transactions</li>
                            <li>Actual Fraud (IS_FRAUD_TX=1): {tp + fn} transactions</li>
                            <li>Actual Legit (IS_FRAUD_TX=0): {fp + tn} transactions</li>
                        </ul>
                    </div>
                    
                    <div style="background: var(--panel-glass); padding: 16px; border-radius: 8px;">
                        <p style="color: var(--muted); margin-bottom: 12px;">
                            💡 <strong>Transaction-level details are available in the individual investigation report:</strong>
                        </p>
                        <div style="margin: 12px 0;">
                            <a href="individual_reports/confusion_matrix_{investigation_id}.html" 
                               target="_blank"
                               style="color: var(--accent); text-decoration: none; display: inline-block; padding: 8px 16px; background: var(--panel); border: 1px solid var(--accent); border-radius: 4px;">
                                📄 View Full Investigation Report →
                            </a>
                        </div>
                        <p style="color: var(--muted); font-size: 0.9em; margin-top: 12px;">
                            The full report includes:
                        </p>
                        <ul style="margin: 8px 0; padding-left: 20px; color: var(--muted); font-size: 0.9em;">
                            <li>Complete transaction list with TX_ID_KEY, amounts, timestamps</li>
                            <li>Per-transaction risk scores and predictions</li>
                            <li>Ground truth (IS_FRAUD_TX) for each transaction</li>
                            <li>Prediction vs. actual comparison</li>
                            <li>Detailed financial breakdown per transaction</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
    """


def _copy_individual_reports(
    investigation_ids: List[str], target_dir: Path
) -> List[Path]:
    """
    Copy individual entity confusion matrix reports to target directory.
    
    Args:
        investigation_ids: List of investigation IDs
        target_dir: Target directory to copy reports to
        
    Returns:
        List of copied report paths
    """
    from app.config.file_organization_config import FileOrganizationConfig
    
    config = FileOrganizationConfig()
    source_dir = config.artifacts_base_dir / "comparisons" / "auto_startup"
    
    if not source_dir.exists():
        logger.warning(f"⚠️ Source directory not found: {source_dir}")
        return []
    
    copied_reports = []
    
    for inv_id in investigation_ids:
        # Look for confusion matrix report
        report_name = f"confusion_matrix_{inv_id}.html"
        source_path = source_dir / report_name
        
        if source_path.exists():
            target_path = target_dir / report_name
            shutil.copy2(source_path, target_path)
            copied_reports.append(target_path)
            logger.debug(f"📄 Copied: {report_name}")
        else:
            logger.warning(f"⚠️ Individual report not found: {report_name}")
    
    return copied_reports


def _generate_readme(
    total_entities: int, packaged_reports: int, timestamp: str
) -> str:
    """Generate README content for the ZIP package."""
    return f"""
╔════════════════════════════════════════════════════════════════════════╗
║                                                                        ║
║          OLORIN STARTUP ANALYSIS - COMPLETE REPORT PACKAGE             ║
║                                                                        ║
╚════════════════════════════════════════════════════════════════════════╝

Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")}
Package ID: {timestamp}

═══════════════════════════════════════════════════════════════════════════
                              PACKAGE CONTENTS
═══════════════════════════════════════════════════════════════════════════

📊 CONSOLIDATED REPORT (index.html)
   • Open this file first for the complete overview
   • Includes:
     - Financial impact summary (Saved Fraud GMV, Lost Revenues, Net Value)
     - Global performance metrics (Precision, Recall, F1, Accuracy)
     - Merchant-level aggregation
     - Entity-level drill-down with financial reasoning
     - Links to individual investigation reports

📁 INDIVIDUAL REPORTS (individual_reports/)
   • Total entities analyzed: {total_entities}
   • Individual reports packaged: {packaged_reports}
   • Each report includes:
     - Complete transaction list with TX_ID_KEY, amounts, timestamps
     - Per-transaction risk scores and predictions
     - Ground truth (IS_FRAUD_TX) for each transaction
     - Detailed confusion matrix
     - Financial breakdown per entity

═══════════════════════════════════════════════════════════════════════════
                              HOW TO USE
═══════════════════════════════════════════════════════════════════════════

1. EXTRACT THE ZIP FILE
   - Unzip this package to a folder on your computer

2. OPEN THE MAIN REPORT
   - Open "index.html" in your web browser
   - This is the consolidated report with all entities

3. NAVIGATE THE HIERARCHY
   - Global Metrics → Merchant → Entity → Transaction
   - Click merchant names to expand/collapse
   - Click "Show Transactions" to see entity details
   - Click "View Full Investigation Report" to open individual reports

4. EXPLORE INDIVIDUAL REPORTS
   - Individual reports open in new tabs
   - Each contains transaction-level details
   - All links work within the extracted folder

═══════════════════════════════════════════════════════════════════════════
                              FILE STRUCTURE
═══════════════════════════════════════════════════════════════════════════

startup_analysis_COMPLETE_{timestamp}.zip/
├── index.html                          (Main consolidated report)
├── README.txt                          (This file)
└── individual_reports/
    ├── confusion_matrix_auto-comp-xxxxx.html
    ├── confusion_matrix_auto-comp-yyyyy.html
    └── ... ({packaged_reports} total files)

═══════════════════════════════════════════════════════════════════════════
                              SUPPORT
═══════════════════════════════════════════════════════════════════════════

For questions or issues:
- Check the consolidated report first (index.html)
- All reports are static HTML files (no server required)
- Works in any modern web browser
- Best viewed in Chrome, Firefox, or Safari

═══════════════════════════════════════════════════════════════════════════
                              OLORIN FRAUD DETECTION SYSTEM
═══════════════════════════════════════════════════════════════════════════
"""

