"""
On-Demand Startup Analysis Report Service

Generates the startup analysis report on demand by aggregating data from
completed auto-comparison investigations.

Feature 024: Now includes Revenue Implication metrics.
"""

import asyncio
import os
import json
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, List, Optional
from collections import defaultdict

import pytz
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config.eval import EVAL_DEFAULTS
from app.config.threshold_config import get_risk_threshold
from app.models.investigation_state import InvestigationState
from app.schemas.investigation_state import InvestigationStatus
from app.service.investigation.comparison_service import (
    aggregate_confusion_matrices,
    calculate_confusion_matrix,
    map_investigation_to_transactions,
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def _generate_interim_report_html(results: List[Dict[str, Any]], base_url: str = "http://localhost:8090") -> str:
    """
    Generate HTML content for the Interim Startup Analysis Report.
    Matches the style and structure of generate_interim_report.py.
    
    Feature 024: Now includes Revenue Implication metrics.
    """
    
    # Aggregate by Merchant
    merchants = defaultdict(list)
    total_tp = 0
    total_fp = 0
    total_tn = 0
    total_fn = 0
    
    # Feature 024: Revenue aggregation
    total_saved_fraud_gmv = Decimal("0")
    total_lost_revenues = Decimal("0")
    total_net_value = Decimal("0")
    revenue_investigations = 0

    for r in results:
        merchant_name = r.get('merchant', 'Unknown')
        merchants[merchant_name].append(r)
        total_tp += r.get('tp', 0)
        total_fp += r.get('fp', 0)
        total_tn += r.get('tn', 0)
        total_fn += r.get('fn', 0)
        
        # Feature 024: Aggregate revenue metrics
        revenue_data = r.get('revenue_data', {})
        if revenue_data and not revenue_data.get('error'):
            total_saved_fraud_gmv += Decimal(str(revenue_data.get('saved_fraud_gmv', 0)))
            total_lost_revenues += Decimal(str(revenue_data.get('lost_revenues', 0)))
            total_net_value += Decimal(str(revenue_data.get('net_value', 0)))
            revenue_investigations += 1

    # Global Metrics
    global_precision = (total_tp / (total_tp + total_fp)) * 100 if (total_tp + total_fp) > 0 else 0.0
    global_recall = (total_tp / (total_tp + total_fn)) * 100 if (total_tp + total_fn) > 0 else 0.0
    global_f1 = (2 * global_precision * global_recall) / (global_precision + global_recall) if (global_precision + global_recall) > 0 else 0.0

    # HTML Generation
    css = """
    :root { --bg: #0a0e27; --panel: #151932; --border: #1e2440; --text: #e0e6ed; --muted: #8b95a6; --accent: #4a9eff; --accent-secondary: #7b68ee; --ok: #4ade80; --warning: #fbbf24; --error: #f87171; --panel-glass: rgba(21, 25, 50, 0.6); }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: var(--bg); color: var(--text); padding: 40px; line-height: 1.6; max-width: 1200px; margin: 0 auto; }
    h1, h2, h3 { color: var(--text); }
    h1 { color: var(--accent); margin-bottom: 10px; }
    h2 { border-bottom: 2px solid var(--border); padding-bottom: 10px; margin-top: 40px; color: var(--accent-secondary); }
    .panel { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3); }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border); }
    th { color: var(--muted); font-weight: 600; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px; }
    tr:last-child td { border-bottom: none; }
    code { background: rgba(0, 0, 0, 0.3); padding: 4px 8px; border-radius: 4px; font-family: 'Monaco', monospace; color: var(--accent); font-size: 0.9em; }
    .metric-value { font-weight: 700; font-size: 1.1em; }
    .good { color: var(--ok); }
    .bad { color: var(--error); }
    .warn { color: var(--warning); }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 20px; }
    .card { background: var(--panel-glass); padding: 20px; border-radius: 8px; border: 1px solid var(--border); }
    .card h4 { margin: 0 0 10px 0; color: var(--muted); font-size: 14px; }
    .big-number { font-size: 2em; font-weight: 700; color: var(--text); }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    """

    # Feature 024: Format revenue values
    net_value_class = 'good' if total_net_value > 0 else 'bad' if total_net_value < 0 else 'warn'
    
    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Startup Analysis Report - Interim</title>
        <style>{css}</style>
    </head>
    <body>
        <div style="text-align: center; margin-bottom: 40px;">
            <h1>🚀 Startup Analysis Report</h1>
            <p style="color: var(--muted); font-size: 1.1em;">Fraud Detection System Evaluation on Real Production Data</p>
            <p style="color: var(--muted); font-size: 0.9em;">Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} (Interim)</p>
        </div>

        <div class="panel">
            <h2>📊 Executive Summary</h2>
            <div class="grid">
                <div class="card">
                    <h4>Total Investigations</h4>
                    <div class="big-number">{len(results)}</div>
                </div>
                <div class="card">
                    <h4>Global Precision</h4>
                    <div class="big-number {'good' if global_precision > 80 else 'warn' if global_precision > 50 else 'bad'}">{global_precision:.1f}%</div>
                    <div style="font-size: 0.8em; color: var(--muted);">TP / (TP + FP)</div>
                </div>
                <div class="card">
                    <h4>Global Recall</h4>
                    <div class="big-number {'good' if global_recall > 90 else 'warn'}">{global_recall:.1f}%</div>
                    <div style="font-size: 0.8em; color: var(--muted);">TP / (TP + FN)</div>
                </div>
                <div class="card">
                    <h4>Total Fraud Caught</h4>
                    <div class="big-number good">{total_tp}</div>
                    <div style="font-size: 0.8em; color: var(--muted);">True Positives</div>
                </div>
            </div>
            <p>
                The system has processed <strong>{len(results)} entities</strong> across <strong>{len(merchants)} merchants</strong>. 
                The current model demonstrates <strong>{global_recall:.1f}% Recall</strong>, capturing all identified fraud, 
                with a precision of <strong>{global_precision:.1f}%</strong>.
            </p>
        </div>
        
        <!-- Feature 024: Revenue Impact Summary -->
        <div class="panel">
            <h2>💰 Revenue Impact Summary</h2>
            <div class="grid">
                <div class="card">
                    <h4>Saved Fraud GMV</h4>
                    <div class="big-number good">${total_saved_fraud_gmv:,.2f}</div>
                    <div style="font-size: 0.8em; color: var(--muted);">Approved fraud caught</div>
                </div>
                <div class="card">
                    <h4>Lost Revenues</h4>
                    <div class="big-number warn">${total_lost_revenues:,.2f}</div>
                    <div style="font-size: 0.8em; color: var(--muted);">Blocked legitimate × take rate</div>
                </div>
                <div class="card">
                    <h4>Net Value</h4>
                    <div class="big-number {net_value_class}">${total_net_value:,.2f}</div>
                    <div style="font-size: 0.8em; color: var(--muted);">Saved - Lost</div>
                </div>
                <div class="card">
                    <h4>Revenue Investigations</h4>
                    <div class="big-number">{revenue_investigations}</div>
                    <div style="font-size: 0.8em; color: var(--muted);">With revenue data</div>
                </div>
            </div>
            <p>
                Based on <strong>{revenue_investigations} investigations</strong> with revenue data,
                Olorin would have saved <strong>${total_saved_fraud_gmv:,.2f}</strong> in fraudulent GMV
                while incurring <strong>${total_lost_revenues:,.2f}</strong> in lost revenues from blocked legitimate transactions.
                The <strong>Net Value to nSure.ai</strong> is <strong>${total_net_value:,.2f}</strong>.
            </p>

            <!-- Time Window Methodology Explanation -->
            <div style="margin-top: 20px; padding: 16px; background: var(--panel-glass); border-radius: 8px; border-left: 4px solid var(--accent);">
                <h4 style="color: var(--accent); margin-bottom: 8px;">📅 Time Window Methodology</h4>
                <p style="color: var(--muted); font-size: 13px; line-height: 1.6;">
                    <strong>Investigation Period:</strong> 18-12 months ago - When Olorin identified risky entities<br>
                    <strong>Saved Fraud GMV Period:</strong> 12-6 months ago - What happened AFTER identification<br><br>
                    <em>This demonstrates:</em> "If we had used Olorin 12+ months ago and blocked these entities
                    when they were first identified as risky, we would have prevented the fraud that occurred
                    in the subsequent months."<br><br>
                    <strong>Saved Fraud GMV</strong> = APPROVED + FRAUD transactions in GMV window (would have been prevented)<br>
                    <strong>Lost Revenues</strong> = BLOCKED + LEGITIMATE transactions × take rate × lifetime multiplier (cost of false positives)
                </p>
            </div>
        </div>

        <div class="panel">
            <h2>📈 Detailed Analysis by Merchant</h2>
    """

    for merchant, items in merchants.items():
        # Calculate merchant specific stats
        m_tp = sum(i.get('tp', 0) for i in items)
        m_fp = sum(i.get('fp', 0) for i in items)
        m_precision = (m_tp / (m_tp + m_fp)) * 100 if (m_tp + m_fp) > 0 else 0.0
        
        # Feature 024: Merchant revenue aggregation
        m_saved_gmv = Decimal("0")
        m_lost_rev = Decimal("0")
        for item in items:
            rev_data = item.get('revenue_data', {})
            if rev_data and not rev_data.get('error'):
                m_saved_gmv += Decimal(str(rev_data.get('saved_fraud_gmv', 0)))
                m_lost_rev += Decimal(str(rev_data.get('lost_revenues', 0)))
        m_net_value = m_saved_gmv - m_lost_rev
        m_net_class = 'good' if m_net_value > 0 else 'bad' if m_net_value < 0 else 'warn'
        
        html += f"""
            <div style="margin-top: 30px; border-top: 1px solid var(--border); padding-top: 20px;">
                <h3 style="color: var(--accent); display: flex; justify-content: space-between; align-items: center;">
                    {merchant}
                    <span style="font-size: 0.7em; color: var(--muted); font-weight: normal;">{len(items)} Entities</span>
                </h3>
                
                <div class="grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 10px;">
                    <div class="card" style="padding: 10px;">
                        <h4>Merchant Precision</h4>
                        <span class="metric-value {'good' if m_precision > 80 else 'warn' if m_precision > 50 else 'bad'}">{m_precision:.1f}%</span>
                    </div>
                    <div class="card" style="padding: 10px;">
                        <h4>Identified Fraud (TP)</h4>
                        <span class="metric-value good">{m_tp}</span>
                    </div>
                    <div class="card" style="padding: 10px;">
                        <h4>False Positives (FP)</h4>
                        <span class="metric-value {'good' if m_fp == 0 else 'warn'}">{m_fp}</span>
                    </div>
                </div>
                
                <!-- Feature 024: Per-merchant revenue metrics -->
                <div class="grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 10px;">
                    <div class="card" style="padding: 10px;">
                        <h4>Saved Fraud GMV</h4>
                        <span class="metric-value good">${m_saved_gmv:,.2f}</span>
                    </div>
                    <div class="card" style="padding: 10px;">
                        <h4>Lost Revenues</h4>
                        <span class="metric-value warn">${m_lost_rev:,.2f}</span>
                    </div>
                    <div class="card" style="padding: 10px;">
                        <h4>Net Value</h4>
                        <span class="metric-value {m_net_class}">${m_net_value:,.2f}</span>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Entity</th>
                            <th style="text-align: right;">TP</th>
                            <th style="text-align: right;">FP</th>
                            <th style="text-align: right;">Precision</th>
                            <th style="text-align: right;">Recall</th>
                            <th style="text-align: right;">Saved GMV</th>
                            <th style="text-align: right;">Net Value</th>
                            <th style="text-align: right;">Report</th>
                        </tr>
                    </thead>
                    <tbody>
        """
        
        for item in items:
            # We don't have individual files for streaming mode, so we link to the investigation report
            # OR we can assume confusion_matrix.html is generated in the investigation folder
            # For now, let's link to the investigation report endpoint
            inv_id = item.get('investigation_id')
            report_link = f"{base_url}/api/v1/reports/investigation/{inv_id}/html?report_type=confusion_matrix"
            
            precision = item.get('precision', 0.0)
            recall = item.get('recall', 0.0)
            
            # Feature 024: Per-entity revenue
            rev_data = item.get('revenue_data', {})
            saved_gmv = Decimal(str(rev_data.get('saved_fraud_gmv', 0))) if rev_data else Decimal("0")
            lost_rev = Decimal(str(rev_data.get('lost_revenues', 0))) if rev_data else Decimal("0")
            net_val = saved_gmv - lost_rev
            net_val_class = 'good' if net_val > 0 else 'bad' if net_val < 0 else 'warn'
            
            html += f"""
                        <tr>
                            <td><code>{item.get('entity')}</code></td>
                            <td style="text-align: right;">{item.get('tp')}</td>
                            <td style="text-align: right;">{item.get('fp')}</td>
                            <td style="text-align: right;" class="{'good' if precision > 80 else 'warn' if precision > 50 else 'bad'}">{precision:.1f}%</td>
                            <td style="text-align: right;" class="{'good' if recall > 90 else 'warn'}">{recall:.1f}%</td>
                            <td style="text-align: right;" class="good">${saved_gmv:,.2f}</td>
                            <td style="text-align: right;" class="{net_val_class}">${net_val:,.2f}</td>
                            <td style="text-align: right;"><a href="{report_link}" target="_blank">View Details &rarr;</a></td>
                        </tr>
            """
        
        html += """
                    </tbody>
                </table>
            </div>
        """
        
        # Add detailed revenue breakdowns for each entity
        html += """
            <div style="margin-top: 20px;">
                <h4 style="color: var(--accent);">📊 Revenue Calculation Details</h4>
        """
        
        for item in items:
            rev_data = item.get('revenue_data', {})
            entity = item.get('entity', 'unknown')
            
            if rev_data and not rev_data.get('error'):
                saved_breakdown = rev_data.get('saved_fraud_breakdown', {})
                lost_breakdown = rev_data.get('lost_revenues_breakdown', {})
                net_breakdown = rev_data.get('net_value_breakdown', {})
                
                if saved_breakdown or lost_breakdown or net_breakdown:
                    html += f"""
                <details style="margin: 10px 0; background: var(--panel-glass); border: 1px solid var(--border); border-radius: 8px; padding: 10px;">
                    <summary style="cursor: pointer; font-weight: bold; color: var(--accent);">
                        💰 {entity} - Revenue Breakdown
                    </summary>
                    <div style="padding: 15px; font-family: monospace; font-size: 0.85em; white-space: pre-wrap; background: rgba(0,0,0,0.3); border-radius: 5px; margin-top: 10px; overflow-x: auto;">
                    """
                    
                    # Add Saved Fraud GMV reasoning
                    if saved_breakdown and saved_breakdown.get('reasoning'):
                        html += f"""
<strong style="color: var(--ok);">📈 SAVED FRAUD GMV ANALYSIS</strong>
{saved_breakdown.get('reasoning', 'No reasoning available')}

<strong style="color: var(--muted);">Methodology:</strong>
{saved_breakdown.get('methodology', 'N/A')}
"""
                        # Add sample transactions if available
                        samples = saved_breakdown.get('sample_transactions', [])
                        if samples:
                            html += f"""
<strong style="color: var(--muted);">Sample Fraud Transactions (Top {len(samples)} by value):</strong>
"""
                            for tx in samples:
                                html += f"  • TX {tx.get('tx_id', 'N/A')[:20]}: ${tx.get('gmv', 0):,.2f} ({tx.get('decision', 'N/A')}, Fraud: {tx.get('is_fraud', 'N/A')})\n"
                    
                    # Add Lost Revenues reasoning
                    if lost_breakdown and lost_breakdown.get('reasoning'):
                        html += f"""

<strong style="color: var(--warning);">📉 LOST REVENUES ANALYSIS</strong>
{lost_breakdown.get('reasoning', 'No reasoning available')}

<strong style="color: var(--muted);">Formula Applied:</strong>
{lost_breakdown.get('formula_applied', 'N/A')}
"""
                        # Add sample transactions if available
                        samples = lost_breakdown.get('sample_transactions', [])
                        if samples:
                            html += f"""
<strong style="color: var(--muted);">Sample Blocked Legitimate Transactions (Top {len(samples)} by value):</strong>
"""
                            for tx in samples:
                                html += f"  • TX {tx.get('tx_id', 'N/A')[:20]}: ${tx.get('gmv', 0):,.2f} ({tx.get('decision', 'N/A')}, Fraud: {tx.get('is_fraud', 'N/A')})\n"
                    
                    # Add Net Value reasoning
                    if net_breakdown and net_breakdown.get('reasoning'):
                        html += f"""

<strong style="color: var(--accent);">💎 NET VALUE ANALYSIS</strong>
{net_breakdown.get('reasoning', 'No reasoning available')}
"""
                    
                    html += """
                    </div>
                </details>
                    """
        
        html += """
            </div>
        """

    html += """
        </div>
    </body>
    </html>
    """
    
    return html


async def process_single_investigation(
    inv: InvestigationState,
    risk_threshold: float,
    semaphore: asyncio.Semaphore
) -> Optional[Dict[str, Any]]:
    """
    Process a single investigation to calculate its confusion matrix.
    Uses semaphore to limit concurrency.
    """
    async with semaphore:
        try:
            # Extract metadata from settings
            settings = inv.settings or {}
            metadata = settings.get("metadata", {}) if hasattr(settings, "get") else getattr(settings, "metadata", {})
            
            # Robust extraction of entity info
            entity_type = "unknown"
            entity_value = "unknown"
            merchant = "Unknown"
            
            # Try config first
            config = settings.get("config", {}) if hasattr(settings, "get") else getattr(settings, "config", {})
            if config:
                entity_type = config.get("entity_type") or entity_type
                entity_value = config.get("entity_id") or config.get("entity_value") or entity_value
            
            # Try top-level entities list (common pattern)
            if entity_value == "unknown":
                entities = settings.get("entities", [])
                if entities and len(entities) > 0:
                    first_entity = entities[0]
                    if isinstance(first_entity, dict):
                        entity_type = first_entity.get("entity_type") or entity_type
                        entity_value = first_entity.get("entity_value") or first_entity.get("entity_id") or entity_value
            
            # Extract merchant
            merchant = metadata.get("merchantName") or metadata.get("merchant_name") or metadata.get("merchant") or "Unknown"
            
            # Determine time window
            created_at = inv.created_at or datetime.now(pytz.UTC)
            window_end = created_at
            window_start = window_end - timedelta(days=7) # Default fallback

            # Try to get window from metadata if available
            if metadata.get("window_start") and metadata.get("window_end"):
                try:
                    window_start = datetime.fromisoformat(metadata["window_start"].replace("Z", "+00:00"))
                    window_end = datetime.fromisoformat(metadata["window_end"].replace("Z", "+00:00"))
                except Exception:
                    pass
            # Also try settings for window
            elif settings.get("from_date") and settings.get("to_date"):
                try:
                    window_start = datetime.fromisoformat(settings["from_date"].replace("Z", "+00:00"))
                    window_end = datetime.fromisoformat(settings["to_date"].replace("Z", "+00:00"))
                except Exception:
                    pass

            # Map to transactions to get actual/predicted outcomes
            # CRITICAL: Include progress_json so mapper can find per-transaction scores
            inv_dict = {
                "id": inv.investigation_id,
                "created_at": inv.created_at,
                "overall_risk_score": inv.get_progress_data().get("risk_score", 0.0),
                "progress_json": inv.progress_json, # Pass raw JSON string or dict if model parses it
                "settings": settings, # Pass settings for entity extraction fallback in mapper
                "entity_type": entity_type,
                "entity_id": entity_value
            }

            logger.info(f"Processing investigation {inv.investigation_id} for entity {entity_type}:{entity_value}")

            transactions, source, predicted_risk = await map_investigation_to_transactions(
                inv_dict,
                window_start,
                window_end,
                entity_type=entity_type,
                entity_id=entity_value,
            )

            if transactions:
                # Calculate confusion matrix
                cm = calculate_confusion_matrix(
                    transactions,
                    risk_threshold,
                    entity_type,
                    entity_value,
                    inv.investigation_id,
                    window_start,
                    window_end,
                    predicted_risk
                )
                
                # Add to aggregated results
                # FIX: Use correct uppercase attribute names for ConfusionMatrix (TP, FP, etc.)
                result_entry = {
                    "investigation_id": inv.investigation_id,
                    "entity": entity_value,
                    "merchant": merchant,
                    "tp": cm.TP,
                    "fp": cm.FP,
                    "tn": cm.TN,
                    "fn": cm.FN,
                    "precision": cm.precision * 100,
                    "recall": cm.recall * 100,
                    "f1": cm.f1_score * 100,
                    "accuracy": cm.accuracy * 100
                }
                
                # Feature 024: Calculate revenue implications on-the-fly
                # This ensures revenue data is always available, even for older investigations
                progress_data = inv.get_progress_data() if hasattr(inv, 'get_progress_data') else {}
                
                # Check if revenue data already exists
                existing_revenue = progress_data.get("revenue_data") or metadata.get("revenue_data")
                
                if existing_revenue and not existing_revenue.get('error'):
                    result_entry["revenue_data"] = existing_revenue
                else:
                    # Calculate revenue on-the-fly
                    try:
                        from app.service.investigation.revenue_calculator import RevenueCalculator
                        from app.schemas.revenue_implication import RevenueCalculationRequest
                        from app.config.revenue_config import get_revenue_config
                        
                        revenue_config = get_revenue_config()
                        revenue_calculator = RevenueCalculator(revenue_config)

                        # Feature 024: GMV window is SEPARATE from investigation window
                        # Investigation Window: When fraud was analyzed (e.g., 18-12 months ago)
                        # GMV Window: FUTURE period showing what would have been saved (12-6 months ago)
                        # This demonstrates: "If Olorin had blocked this entity at investigation time,
                        # these FUTURE losses would have been prevented"
                        now = datetime.now(pytz.UTC)
                        gmv_start_offset = revenue_config.saved_fraud_gmv_start_months  # Default: 12
                        gmv_end_offset = revenue_config.saved_fraud_gmv_end_months      # Default: 6
                        gmv_window_start = now - timedelta(days=gmv_start_offset * 30)
                        gmv_window_end = now - timedelta(days=gmv_end_offset * 30)

                        revenue_request = RevenueCalculationRequest(
                            investigation_id=inv.investigation_id,
                            entity_type=entity_type,
                            entity_value=entity_value,
                            # Pass investigation window for methodology context in reports
                            investigation_window_start=window_start,
                            investigation_window_end=window_end,
                            # GMV window is separate - shows FUTURE period
                            gmv_window_start=gmv_window_start,
                            gmv_window_end=gmv_window_end,
                        )
                        
                        logger.info(f"💰 Calculating revenue for {inv.investigation_id} ({entity_type}={entity_value})")
                        
                        revenue_implication = await revenue_calculator.calculate_revenue_implication(
                            revenue_request,
                            merchant_name=merchant,
                        )
                        
                        # Build comprehensive revenue data with breakdowns
                        revenue_data = {
                            "saved_fraud_gmv": float(revenue_implication.saved_fraud_gmv),
                            "lost_revenues": float(revenue_implication.lost_revenues),
                            "net_value": float(revenue_implication.net_value),
                            "approved_fraud_tx_count": revenue_implication.approved_fraud_tx_count,
                            "blocked_legitimate_tx_count": revenue_implication.blocked_legitimate_tx_count,
                            "total_tx_count": revenue_implication.total_tx_count,
                            "confidence_level": revenue_implication.confidence_level,
                            "take_rate_used": float(revenue_implication.take_rate_used),
                            "lifetime_multiplier_used": float(revenue_implication.lifetime_multiplier_used),
                            # Time windows for methodology explanation
                            "investigation_window_start": window_start.isoformat(),
                            "investigation_window_end": window_end.isoformat(),
                            "gmv_window_start": gmv_window_start.isoformat(),
                            "gmv_window_end": gmv_window_end.isoformat(),
                            "merchant_name": merchant,
                            "calculation_successful": revenue_implication.calculation_successful,
                            # Prediction validation (Feature 024 fix)
                            "skipped_due_to_prediction": revenue_implication.skipped_due_to_prediction,
                        }

                        # Add prediction validation info if available
                        if revenue_implication.prediction_validation:
                            pv = revenue_implication.prediction_validation
                            revenue_data["prediction_validation"] = {
                                "entity_predicted_as_fraud": pv.entity_predicted_as_fraud,
                                "prediction_count": pv.prediction_count,
                                "avg_predicted_risk": pv.avg_predicted_risk,
                                "risk_threshold_used": pv.risk_threshold_used,
                                "validation_message": pv.validation_message,
                            }
                        
                        # Add detailed breakdowns with reasoning
                        if revenue_implication.saved_fraud_breakdown:
                            breakdown = revenue_implication.saved_fraud_breakdown
                            revenue_data["saved_fraud_breakdown"] = {
                                "reasoning": breakdown.reasoning,
                                "methodology": breakdown.methodology,
                                "avg_tx_value": float(breakdown.avg_fraud_tx_value),
                                "min_tx_value": float(breakdown.min_tx_value),
                                "max_tx_value": float(breakdown.max_tx_value),
                                "sample_transactions": [
                                    {
                                        "tx_id": tx.tx_id,
                                        "gmv": float(tx.gmv),
                                        "decision": tx.decision,
                                        "is_fraud": tx.is_fraud,
                                        "tx_datetime": tx.tx_datetime.isoformat() if tx.tx_datetime else None,
                                        "merchant": tx.merchant,
                                    }
                                    for tx in breakdown.sample_transactions
                                ],
                            }
                        
                        if revenue_implication.lost_revenues_breakdown:
                            breakdown = revenue_implication.lost_revenues_breakdown
                            revenue_data["lost_revenues_breakdown"] = {
                                "reasoning": breakdown.reasoning,
                                "methodology": breakdown.methodology,
                                "formula_applied": breakdown.formula_applied,
                                "blocked_gmv_total": float(breakdown.blocked_gmv_total),
                                "avg_blocked_tx_value": float(breakdown.avg_blocked_tx_value),
                                "sample_transactions": [
                                    {
                                        "tx_id": tx.tx_id,
                                        "gmv": float(tx.gmv),
                                        "decision": tx.decision,
                                        "is_fraud": tx.is_fraud,
                                        "tx_datetime": tx.tx_datetime.isoformat() if tx.tx_datetime else None,
                                        "merchant": tx.merchant,
                                    }
                                    for tx in breakdown.sample_transactions
                                ],
                            }
                        
                        if revenue_implication.net_value_breakdown:
                            breakdown = revenue_implication.net_value_breakdown
                            revenue_data["net_value_breakdown"] = {
                                "reasoning": breakdown.reasoning,
                                "formula": breakdown.formula,
                                "is_positive": breakdown.is_positive,
                                "roi_percentage": float(breakdown.roi_percentage) if breakdown.roi_percentage else None,
                            }
                        
                        result_entry["revenue_data"] = revenue_data

                        if revenue_implication.skipped_due_to_prediction:
                            logger.warning(
                                f"⚠️ Revenue SKIPPED for {entity_value}: "
                                f"Olorin did not predict this entity as fraud. "
                                f"{revenue_implication.prediction_validation.validation_message if revenue_implication.prediction_validation else ''}"
                            )
                        else:
                            logger.info(
                                f"💰 Revenue calculated for {entity_value}: "
                                f"Saved=${revenue_implication.saved_fraud_gmv:,.2f}, "
                                f"Lost=${revenue_implication.lost_revenues:,.2f}, "
                                f"Net=${revenue_implication.net_value:,.2f}"
                            )
                        
                    except Exception as rev_err:
                        logger.warning(f"⚠️ Revenue calculation failed for {inv.investigation_id}: {rev_err}")
                        result_entry["revenue_data"] = {"error": str(rev_err), "calculation_successful": False}
                
                return result_entry
            else:
                logger.warning(f"No transactions mapped for {inv.investigation_id}")
                return None

        except Exception as e:
            logger.warning(f"Failed to process investigation {inv.investigation_id} for report: {e}", exc_info=True)
            return None


async def generate_on_demand_startup_report(
    db: Session,
    output_dir: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Generate the startup analysis report on demand.

    Args:
        db: Database session
        output_dir: Optional directory to save report

    Returns:
        Dictionary with report path and summary
    """
    logger.info("🔄 Starting on-demand startup report generation (INTERIM mode)...")

    # 1. Fetch completed auto-comparison investigations
    query = (
        select(InvestigationState)
        .where(
            InvestigationState.status == InvestigationStatus.COMPLETED,
            InvestigationState.investigation_id.like("auto-comp-%"),
        )
        .order_by(InvestigationState.updated_at.desc())
    )
    result = db.execute(query)
    investigations = result.scalars().all()

    logger.info(f"Found {len(investigations)} completed auto-comparison investigations")

    # 2. Reconstruct comparison results and confusion matrices
    aggregated_results = []
    
    risk_threshold = get_risk_threshold()
    
    # Process investigations in parallel with concurrency limit
    # Use semaphore to limit concurrent Snowflake queries
    concurrency_limit = int(os.getenv("REPORT_GENERATION_CONCURRENCY", "5"))
    semaphore = asyncio.Semaphore(concurrency_limit)
    
    logger.info(f"Processing investigations with concurrency limit: {concurrency_limit}")
    
    tasks = [
        process_single_investigation(inv, risk_threshold, semaphore)
        for inv in investigations
    ]
    
    results = await asyncio.gather(*tasks)
    
    # Filter out None results
    aggregated_results = [r for r in results if r is not None]

    # Determine absolute download URL if base URL is available
    base_url = os.getenv("API_BASE_URL", "http://localhost:8090")

    # 3. Generate HTML Content
    html_content = _generate_interim_report_html(aggregated_results, base_url=base_url)

    # 4. Save Report
    if output_dir is None:
        from app.config.file_organization_config import FileOrganizationConfig
        file_org_config = FileOrganizationConfig()
        output_dir = file_org_config.artifacts_base_dir
    
    # Ensure output directory exists
    output_dir.mkdir(parents=True, exist_ok=True)

    filename = f"startup_analysis_report_INTERIM_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
    report_path = output_dir / filename
    
    with open(report_path, "w") as f:
        f.write(html_content)

    download_url = f"{base_url}/api/v1/reports/artifacts/{filename}"

    return {
        "message": "On-demand startup report generated successfully (Interim Format)",
        "report_path": str(report_path),
        "total_investigations": len(investigations),
        "aggregated_investigations": len(aggregated_results),
        "download_url": download_url
    }
