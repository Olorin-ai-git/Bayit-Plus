#!/usr/bin/env python3
"""
Generate confusion table for a completed investigation WITH FINANCIAL REASONING.

This script calculates the confusion matrix AND revenue implications for a 
completed investigation and generates a comprehensive HTML report.

Features:
- Confusion Matrix (TP, FP, TN, FN)
- Performance Metrics (Precision, Recall, F1, Accuracy)
- Financial Analysis:
  - Saved Fraud GMV (detailed reasoning)
  - Lost Revenues (detailed reasoning)  
  - Net Value (interpretation)

Usage:
    python scripts/generate_confusion_table_for_investigation.py <investigation_id>

Example:
    python scripts/generate_confusion_table_for_investigation.py auto-comp-ee88621fd85b
"""

import asyncio
import json
import os
import sys
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, Optional

import pytz

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.persistence.database import get_db
from app.service.investigation_state_service import InvestigationStateService
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

# Import functions we need - these will be imported inside the function to avoid circular dependencies
# The imports happen at runtime when the function is called, avoiding module-level import issues


def _generate_financial_reasoning_html(revenue_data: Optional[Dict], merchant_name: str) -> str:
    """Generate HTML section for financial reasoning."""
    if not revenue_data or revenue_data.get("error") or not revenue_data.get("calculation_successful", True):
        return """
        <div class="panel" style="border-color: var(--warning);">
            <h2>💰 Financial Analysis</h2>
            <p style="color: var(--warning);">⚠️ Revenue calculation was not available for this investigation.</p>
        </div>
        """

    saved_gmv = revenue_data.get("saved_fraud_gmv", 0)
    lost_rev = revenue_data.get("lost_revenues", 0)
    net_val = revenue_data.get("net_value", 0)
    approved_fraud_count = revenue_data.get("approved_fraud_tx_count", 0)
    blocked_legit_count = revenue_data.get("blocked_legitimate_tx_count", 0)
    take_rate = revenue_data.get("take_rate_used", 0.75)
    multiplier = revenue_data.get("lifetime_multiplier_used", 1.0)
    confidence = revenue_data.get("confidence_level", "low")

    # Determine net value styling
    if net_val > 0:
        net_class = "color: var(--ok);"
        net_icon = "✅"
    elif net_val < 0:
        net_class = "color: var(--error);"
        net_icon = "⚠️"
    else:
        net_class = "color: var(--muted);"
        net_icon = "➖"

    html = f"""
    <div class="panel">
        <h2>💰 Financial Analysis</h2>
        <p style="color: var(--muted); margin-bottom: 16px;">
            Revenue impact analysis based on transaction data. Merchant: <strong>{merchant_name}</strong>
        </p>

        <!-- Summary Cards -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 20px 0;">
            <div style="background: var(--panel-glass); padding: 16px; border-radius: 8px; border: 1px solid var(--ok);">
                <h4 style="color: var(--ok); margin-bottom: 8px;">Saved Fraud GMV</h4>
                <div style="font-size: 24px; font-weight: bold; color: var(--ok);">${saved_gmv:,.2f}</div>
                <p style="color: var(--muted); font-size: 12px; margin-top: 4px;">{approved_fraud_count} approved fraud transactions</p>
            </div>
            <div style="background: var(--panel-glass); padding: 16px; border-radius: 8px; border: 1px solid var(--warning);">
                <h4 style="color: var(--warning); margin-bottom: 8px;">Lost Revenues</h4>
                <div style="font-size: 24px; font-weight: bold; color: var(--warning);">${lost_rev:,.2f}</div>
                <p style="color: var(--muted); font-size: 12px; margin-top: 4px;">{blocked_legit_count} blocked legitimate transactions</p>
            </div>
            <div style="background: var(--panel-glass); padding: 16px; border-radius: 8px; border: 1px solid {'var(--ok)' if net_val > 0 else 'var(--error)' if net_val < 0 else 'var(--border)'};">
                <h4 style="{net_class} margin-bottom: 8px;">{net_icon} Net Value</h4>
                <div style="font-size: 24px; font-weight: bold; {net_class}">${net_val:,.2f}</div>
                <p style="color: var(--muted); font-size: 12px; margin-top: 4px;">Confidence: {confidence}</p>
            </div>
        </div>
    """

    # Add Time Window Methodology section if windows are available
    inv_window_start = revenue_data.get("investigation_window_start")
    inv_window_end = revenue_data.get("investigation_window_end")
    gmv_window_start = revenue_data.get("gmv_window_start")
    gmv_window_end = revenue_data.get("gmv_window_end")

    if inv_window_start and inv_window_end and gmv_window_start and gmv_window_end:
        # Format dates for display (handle both string and datetime objects)
        if isinstance(inv_window_start, str):
            inv_start_str = inv_window_start[:10]
        else:
            inv_start_str = inv_window_start.strftime("%Y-%m-%d")
        if isinstance(inv_window_end, str):
            inv_end_str = inv_window_end[:10]
        else:
            inv_end_str = inv_window_end.strftime("%Y-%m-%d")
        if isinstance(gmv_window_start, str):
            gmv_start_str = gmv_window_start[:10]
        else:
            gmv_start_str = gmv_window_start.strftime("%Y-%m-%d")
        if isinstance(gmv_window_end, str):
            gmv_end_str = gmv_window_end[:10]
        else:
            gmv_end_str = gmv_window_end.strftime("%Y-%m-%d")

        html += f"""
        <!-- Time Window Methodology -->
        <div style="margin: 20px 0; padding: 20px; background: var(--panel-glass); border-radius: 8px; border: 1px solid var(--accent);">
            <h4 style="color: var(--accent); margin-bottom: 16px;">📅 Time Window Methodology</h4>

            <div style="font-family: monospace; font-size: 12px; background: rgba(0,0,0,0.3); padding: 16px; border-radius: 6px; overflow-x: auto;">
                <pre style="margin: 0; color: var(--text);">
STEP 1: INVESTIGATION PERIOD ({inv_start_str} to {inv_end_str})
        Olorin analyzed transaction patterns and identified risk signals.
        Entity was flagged as potentially fraudulent.

STEP 2: SAVED FRAUD GMV PERIOD ({gmv_start_str} to {gmv_end_str})
        This is AFTER the investigation completed.
        We measure what happened to this entity in the FUTURE.

STEP 3: VALUE CALCULATION
        If Olorin had BLOCKED this entity at {inv_end_str},
        we would have PREVENTED the fraud that occurred afterward.

TIMELINE:
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  [{inv_start_str}]═══════════[{inv_end_str}]═══════════[{gmv_end_str}]      │
│        │                        │                        │       │
│        ▼                        ▼                        ▼       │
│   Investigation           Block Point              GMV End       │
│   Started                 (Decision)               (Analysis)    │
│                                                                  │
│  ◄──── Investigation Window ────►◄── Saved Fraud GMV Window ──► │
│       (Risk Detection)              (Future Losses Prevented)    │
└─────────────────────────────────────────────────────────────────┘
                </pre>
            </div>

            <p style="margin-top: 12px; color: var(--muted); font-size: 13px;">
                <strong>Why different windows?</strong> The investigation window shows <em>when</em> we detected risk.
                The GMV window shows <em>what would have happened</em> if we had acted on that detection.
                This proves Olorin's predictive value.
            </p>
        </div>
        """

    html += """
        <!-- Detailed Reasoning -->
        <details style="margin-top: 20px; background: var(--panel-glass); border-radius: 8px; padding: 16px; border: 1px solid var(--border);">
            <summary style="cursor: pointer; font-weight: 600; color: var(--accent);">
                📊 Detailed Financial Reasoning (Click to Expand)
            </summary>
            <div style="margin-top: 16px;">
    """

    # Add Saved Fraud GMV reasoning
    saved_breakdown = revenue_data.get("saved_fraud_breakdown", {})
    if saved_breakdown and saved_breakdown.get("reasoning"):
        html += f"""
                <div style="margin-bottom: 24px;">
                    <h4 style="color: var(--ok); margin-bottom: 12px;">💚 Saved Fraud GMV Analysis</h4>
                    <pre style="background: rgba(0,0,0,0.3); padding: 16px; border-radius: 8px; white-space: pre-wrap; font-family: monospace; font-size: 12px; color: var(--text); overflow-x: auto;">{saved_breakdown.get('reasoning', 'No detailed reasoning available.')}</pre>
                    <div style="margin-top: 12px; padding: 12px; background: rgba(74, 158, 255, 0.1); border-radius: 6px;">
                        <strong style="color: var(--accent);">Methodology:</strong>
                        <pre style="margin-top: 8px; font-size: 11px; color: var(--muted); white-space: pre-wrap;">{saved_breakdown.get('methodology', 'N/A')}</pre>
                    </div>
                </div>
        """
    else:
        html += f"""
                <div style="margin-bottom: 24px;">
                    <h4 style="color: var(--ok); margin-bottom: 12px;">💚 Saved Fraud GMV</h4>
                    <p style="color: var(--muted);">Saved Fraud GMV represents the total GMV from transactions that were APPROVED by nSure but later confirmed as FRAUD.</p>
                    <p style="margin-top: 8px;">If Olorin had detected these, <strong style="color: var(--ok);">${saved_gmv:,.2f}</strong> would have been saved from chargebacks and fraud losses.</p>
                </div>
        """

    # Add Lost Revenues reasoning
    lost_breakdown = revenue_data.get("lost_revenues_breakdown", {})
    if lost_breakdown and lost_breakdown.get("reasoning"):
        html += f"""
                <div style="margin-bottom: 24px;">
                    <h4 style="color: var(--warning); margin-bottom: 12px;">🟡 Lost Revenues Analysis</h4>
                    <pre style="background: rgba(0,0,0,0.3); padding: 16px; border-radius: 8px; white-space: pre-wrap; font-family: monospace; font-size: 12px; color: var(--text); overflow-x: auto;">{lost_breakdown.get('reasoning', 'No detailed reasoning available.')}</pre>
                    <div style="margin-top: 12px; padding: 12px; background: rgba(251, 191, 36, 0.1); border-radius: 6px;">
                        <strong style="color: var(--warning);">Formula Applied:</strong>
                        <pre style="margin-top: 8px; font-size: 11px; color: var(--muted); white-space: pre-wrap;">{lost_breakdown.get('formula_applied', 'N/A')}</pre>
                    </div>
                </div>
        """
    else:
        html += f"""
                <div style="margin-bottom: 24px;">
                    <h4 style="color: var(--warning); margin-bottom: 12px;">🟡 Lost Revenues</h4>
                    <p style="color: var(--muted);">Lost Revenues represents revenue lost from blocking LEGITIMATE transactions (false positives).</p>
                    <p style="margin-top: 8px;">Formula: <code>Blocked GMV × {take_rate}% × {multiplier}x = ${lost_rev:,.2f}</code></p>
                </div>
        """

    # Add Net Value reasoning
    net_breakdown = revenue_data.get("net_value_breakdown", {})
    if net_breakdown and net_breakdown.get("reasoning"):
        html += f"""
                <div style="margin-bottom: 24px;">
                    <h4 style="{net_class} margin-bottom: 12px;">{net_icon} Net Value Analysis</h4>
                    <pre style="background: rgba(0,0,0,0.3); padding: 16px; border-radius: 8px; white-space: pre-wrap; font-family: monospace; font-size: 12px; color: var(--text); overflow-x: auto;">{net_breakdown.get('reasoning', 'No detailed reasoning available.')}</pre>
                </div>
        """
    else:
        interpretation = ""
        if net_val > 0:
            interpretation = f"Olorin's fraud detection is PROFITABLE. Fraud savings (${saved_gmv:,.2f}) exceed false positive costs (${lost_rev:,.2f})."
        elif net_val < 0:
            interpretation = f"⚠️ False positive costs (${lost_rev:,.2f}) exceed fraud savings (${saved_gmv:,.2f}). Consider adjusting thresholds."
        else:
            interpretation = "Break even - fraud detection value equals false positive cost."

        html += f"""
                <div style="margin-bottom: 24px;">
                    <h4 style="{net_class} margin-bottom: 12px;">{net_icon} Net Value</h4>
                    <p style="color: var(--muted);">Net Value = Saved Fraud GMV - Lost Revenues</p>
                    <p style="margin-top: 8px; {net_class}"><strong>{interpretation}</strong></p>
                </div>
        """

    html += """
            </div>
        </details>

        <!-- Configuration Used -->
        <div style="margin-top: 16px; padding: 12px; background: var(--panel-glass); border-radius: 6px; font-size: 12px; color: var(--muted);">
            <strong>Configuration:</strong> 
    """
    html += f"Take Rate = {take_rate}% | Lifetime Multiplier = {multiplier}x | Confidence = {confidence}"
    html += """
        </div>
    </div>
    """

    return html


def _build_saved_fraud_reasoning_from_txs(
    entity_type: str, entity_value: str, merchant_name: str,
    saved_gmv: "Decimal", count: int, sample_txs: list,
    window_start: datetime, window_end: datetime, total_txs: int
) -> str:
    """Build reasoning for Saved Fraud GMV from investigation transactions."""
    from decimal import Decimal
    merchant_text = f" (Merchant: {merchant_name})" if merchant_name else ""
    
    if count == 0:
        return (
            f"SAVED FRAUD GMV ANALYSIS for {entity_type}='{entity_value}'{merchant_text}\n"
            f"═══════════════════════════════════════════════════════════════\n\n"
            f"RESULT: $0.00 - No approved fraud transactions found.\n\n"
            f"DATA SOURCE: Investigation's {total_txs} transactions\n"
            f"WINDOW: {window_start.date()} to {window_end.date()}\n\n"
            f"EXPLANATION:\n"
            f"Among the {total_txs} transactions investigated, none were both:\n"
            f"  • APPROVED by nSure (decision let the transaction through), AND\n"
            f"  • Later confirmed as FRAUD (IS_FRAUD_TX = 1)\n\n"
            f"This is GOOD NEWS - it means:\n"
            f"  1. All fraud transactions were correctly BLOCKED (no fraud slipped through), OR\n"
            f"  2. This entity had no fraud in the investigation period\n\n"
            f"SAVED FRAUD GMV = $0.00 because no fraud was approved.\n"
        )
    
    avg_val = saved_gmv / count if count > 0 else Decimal("0")
    sample_text = ""
    if sample_txs:
        sample_text = "\nSAMPLE TRANSACTIONS (APPROVED + FRAUD):\n"
        for tx in sample_txs[:5]:
            sample_text += f"  • TX {str(tx['tx_id'])[:20]}...: ${tx['gmv']:,.2f} (Decision: {tx['decision']}, Fraud: {tx['is_fraud']})\n"
    
    return (
        f"SAVED FRAUD GMV ANALYSIS for {entity_type}='{entity_value}'{merchant_text}\n"
        f"═══════════════════════════════════════════════════════════════\n\n"
        f"RESULT: ${saved_gmv:,.2f} SAVED from fraud detection\n\n"
        f"DATA SOURCE: Investigation's {total_txs} transactions\n"
        f"WINDOW: {window_start.date()} to {window_end.date()}\n\n"
        f"WHAT THIS MEANS:\n"
        f"Among the {total_txs} transactions investigated, {count} were:\n"
        f"  • APPROVED by nSure (transaction was let through), AND\n"
        f"  • Later confirmed as FRAUD (IS_FRAUD_TX = 1)\n\n"
        f"These {count} transactions totaled ${saved_gmv:,.2f} in GMV that was LOST to fraud.\n"
        f"If Olorin had detected and blocked these, this amount would have been SAVED.\n\n"
        f"STATISTICS:\n"
        f"  • Total Investigation Transactions: {total_txs}\n"
        f"  • Approved Fraud Transactions: {count}\n"
        f"  • Total Saved Fraud GMV: ${saved_gmv:,.2f}\n"
        f"  • Average Fraud Transaction: ${avg_val:,.2f}\n"
        f"{sample_text}"
    )


def _build_lost_revenues_reasoning_from_txs(
    entity_type: str, entity_value: str, merchant_name: str,
    blocked_gmv: "Decimal", lost_revenues: "Decimal", count: int, sample_txs: list,
    take_rate: "Decimal", multiplier: "Decimal",
    window_start: datetime, window_end: datetime, total_txs: int
) -> str:
    """Build reasoning for Lost Revenues from investigation transactions."""
    from decimal import Decimal
    merchant_text = f" (Merchant: {merchant_name})" if merchant_name else ""
    
    if count == 0:
        return (
            f"LOST REVENUES ANALYSIS for {entity_type}='{entity_value}'{merchant_text}\n"
            f"═══════════════════════════════════════════════════════════════\n\n"
            f"RESULT: $0.00 - No false positives found.\n\n"
            f"DATA SOURCE: Investigation's {total_txs} transactions\n"
            f"WINDOW: {window_start.date()} to {window_end.date()}\n\n"
            f"EXPLANATION:\n"
            f"Among the {total_txs} transactions investigated, none were both:\n"
            f"  • BLOCKED by the system (rejected), AND\n"
            f"  • Actually LEGITIMATE (IS_FRAUD_TX = 0)\n\n"
            f"This is EXCELLENT - it means:\n"
            f"  1. All blocked transactions were genuine fraud (no legitimate customers blocked), OR\n"
            f"  2. No transactions were blocked for this entity\n\n"
            f"ZERO FALSE POSITIVES = ZERO LOST REVENUES\n"
        )
    
    sample_text = ""
    if sample_txs:
        sample_text = "\nSAMPLE TRANSACTIONS (BLOCKED + LEGITIMATE):\n"
        for tx in sample_txs[:5]:
            sample_text += f"  • TX {str(tx['tx_id'])[:20]}...: ${tx['gmv']:,.2f} (Decision: {tx['decision']}, Fraud: {tx['is_fraud']})\n"
    
    return (
        f"LOST REVENUES ANALYSIS for {entity_type}='{entity_value}'{merchant_text}\n"
        f"═══════════════════════════════════════════════════════════════\n\n"
        f"RESULT: ${lost_revenues:,.2f} LOST in potential revenues\n\n"
        f"DATA SOURCE: Investigation's {total_txs} transactions\n"
        f"WINDOW: {window_start.date()} to {window_end.date()}\n\n"
        f"WHAT THIS MEANS:\n"
        f"Among the {total_txs} transactions investigated, {count} were:\n"
        f"  • BLOCKED by the system (transaction was rejected), AND\n"
        f"  • Actually LEGITIMATE (IS_FRAUD_TX = 0) - FALSE POSITIVES\n\n"
        f"REVENUE CALCULATION:\n"
        f"  ┌─────────────────────────────────────────────────────────────┐\n"
        f"  │ Blocked GMV (legitimate tx):     ${blocked_gmv:>15,.2f}      │\n"
        f"  │ × Take Rate:                     {take_rate:>15.2f}%             │\n"
        f"  │ × Lifetime Multiplier:           {multiplier:>15.1f}x             │\n"
        f"  ├─────────────────────────────────────────────────────────────┤\n"
        f"  │ = LOST REVENUES:                 ${lost_revenues:>15,.2f}      │\n"
        f"  └─────────────────────────────────────────────────────────────┘\n\n"
        f"STATISTICS:\n"
        f"  • Total Investigation Transactions: {total_txs}\n"
        f"  • Blocked Legitimate Transactions: {count}\n"
        f"  • Total Blocked GMV: ${blocked_gmv:,.2f}\n"
        f"{sample_text}"
    )


def _build_net_value_reasoning(
    saved_gmv: "Decimal", lost_revenues: "Decimal", net_value: "Decimal",
    entity_type: str, entity_value: str, merchant_name: str
) -> str:
    """Build reasoning for Net Value."""
    from decimal import Decimal
    merchant_text = f" for {merchant_name}" if merchant_name else ""
    
    if net_value > 0:
        return (
            f"NET VALUE ANALYSIS{merchant_text}\n"
            f"═══════════════════════════════════════════════════════════════\n\n"
            f"RESULT: +${net_value:,.2f} NET POSITIVE VALUE ✅\n\n"
            f"CALCULATION:\n"
            f"  Saved Fraud GMV:   ${saved_gmv:>12,.2f}  (fraud we would catch)\n"
            f"  - Lost Revenues:   ${lost_revenues:>12,.2f}  (false positive cost)\n"
            f"  ────────────────────────────────────────\n"
            f"  = NET VALUE:       ${net_value:>12,.2f}\n\n"
            f"INTERPRETATION:\n"
            f"Olorin's fraud detection for {entity_type}='{entity_value}' is PROFITABLE.\n"
            f"The value saved from catching fraud exceeds the cost of false positives.\n"
        )
    elif net_value < 0:
        return (
            f"NET VALUE ANALYSIS{merchant_text}\n"
            f"═══════════════════════════════════════════════════════════════\n\n"
            f"RESULT: ${net_value:,.2f} NET NEGATIVE VALUE ⚠️\n\n"
            f"CALCULATION:\n"
            f"  Saved Fraud GMV:   ${saved_gmv:>12,.2f}\n"
            f"  - Lost Revenues:   ${lost_revenues:>12,.2f}\n"
            f"  ────────────────────────────────────────\n"
            f"  = NET VALUE:       ${net_value:>12,.2f}\n\n"
            f"⚠️ FALSE POSITIVES EXCEED FRAUD DETECTION VALUE\n"
            f"Consider adjusting thresholds to reduce false positives.\n"
        )
    else:
        return (
            f"NET VALUE ANALYSIS{merchant_text}\n"
            f"═══════════════════════════════════════════════════════════════\n\n"
            f"RESULT: $0.00 - BREAK EVEN\n\n"
            f"Saved Fraud GMV equals Lost Revenues.\n"
            f"Fraud detection is neither adding nor subtracting value.\n"
        )


async def generate_confusion_table(
    investigation_id: str, output_path: Optional[Path] = None
):
    """Generate confusion table for a specific investigation."""

    logger.info(f"📊 Generating confusion table for investigation: {investigation_id}")

    # Get investigation state
    db_gen = get_db()
    db = next(db_gen)
    try:
        service = InvestigationStateService(db)
        # Use get_state instead of get_state_with_auth to avoid strict auth issues for system tasks
        state = service.get_state(
            investigation_id=investigation_id, user_id="auto-comparison-system"
        )

        if state.status != "COMPLETED":
            logger.warning(
                f"⚠️ Investigation {investigation_id} is not completed (status: {state.status})"
            )
            return None

        # Extract entity information from state.settings (preferred) or settings_json (fallback)
        entity_type = None
        entity_value = None

        # Try to get from state.settings first
        if (
            state.settings
            and state.settings.entities
            and len(state.settings.entities) > 0
        ):
            entity = state.settings.entities[0]
            entity_type = (
                entity.entity_type.value
                if hasattr(entity.entity_type, "value")
                else str(entity.entity_type) if entity.entity_type else None
            )
            entity_value = entity.entity_value

        # Fallback to settings_json if not found
        if not entity_type or not entity_value:
            settings_dict = {}
            if state.settings_json:
                try:
                    settings_dict = json.loads(state.settings_json)
                except json.JSONDecodeError:
                    pass

            entities = settings_dict.get("entities", [])
            if entities and len(entities) > 0:
                entity_type = entity_type or (
                    entities[0].get("entity_type")
                    if isinstance(entities[0], dict)
                    else getattr(entities[0], "entity_type", None)
                )
                entity_value = entity_value or (
                    entities[0].get("entity_value")
                    if isinstance(entities[0], dict)
                    else getattr(entities[0], "entity_value", None)
                )

        # Extract merchant name from investigation name
        merchant_name = "Unknown"
        if state.settings and state.settings.name:
            import re
            match = re.search(r"\(Merchant: (.*?)\)", state.settings.name)
            if match:
                merchant_name = match.group(1)
        
        # Fallback to checking settings_json for raw name if state.settings not populated or match failed
        if merchant_name == "Unknown" and state.settings_json:
             try:
                s_dict = json.loads(state.settings_json)
                name = s_dict.get("name", "")
                match = re.search(r"\(Merchant: (.*?)\)", name)
                if match:
                    merchant_name = match.group(1)
             except:
                 pass

        logger.info(f"   Entity: {entity_type}={entity_value}")
        logger.info(f"   Merchant: {merchant_name}")

        # Extract risk score from progress_json
        risk_score = None
        if state.progress_json:
            try:
                progress_dict = json.loads(state.progress_json)
                raw_risk_score = progress_dict.get(
                    "overall_risk_score"
                ) or progress_dict.get("risk_score")

                # Validate and normalize risk score (must be between 0 and 1)
                if raw_risk_score is not None:
                    try:
                        risk_score = float(raw_risk_score)
                        # Clamp to valid range [0, 1]
                        if risk_score < 0:
                            logger.warning(
                                f"⚠️ Risk score {risk_score} is negative, clamping to 0"
                            )
                            risk_score = 0.0
                        elif risk_score > 1:
                            logger.warning(
                                f"⚠️ Risk score {risk_score} is > 1, clamping to 1.0"
                            )
                            risk_score = 1.0
                    except (ValueError, TypeError):
                        logger.warning(
                            f"⚠️ Invalid risk score format: {raw_risk_score}, using None"
                        )
                        risk_score = None
            except json.JSONDecodeError:
                pass

        logger.info(f"   Risk Score: {risk_score}")

        # Import here to avoid module-level import issues
        from app.service.investigation.comparison_service import (
            aggregate_confusion_matrices,
            calculate_confusion_matrix,
        )
        from app.service.investigation.investigation_transaction_mapper import (
            get_investigation_by_id,
            map_investigation_to_transactions,
        )
        from app.service.reporting.startup_report_generator import (
            _generate_confusion_table_section,
        )

        # Get investigation details (window dates)
        investigation = get_investigation_by_id(investigation_id)
        if not investigation:
            logger.error(f"❌ Investigation {investigation_id} not found in database")
            return None

        window_start = investigation.get("from_date")
        window_end = investigation.get("to_date")
        if not window_start or not window_end:
            logger.error(f"❌ Investigation {investigation_id} missing window dates")
            return None

        # Parse dates if strings
        import pytz

        utc = pytz.UTC
        if isinstance(window_start, str):
            window_start = datetime.fromisoformat(window_start.replace("Z", "+00:00"))
        if isinstance(window_end, str):
            window_end = datetime.fromisoformat(window_end.replace("Z", "+00:00"))

        if window_start.tzinfo is None:
            window_start = utc.localize(window_start)
        if window_end.tzinfo is None:
            window_end = utc.localize(window_end)

        logger.info(f"   Window: {window_start} to {window_end}")

        # Get risk threshold
        import os

        risk_threshold = float(os.getenv("RISK_THRESHOLD_DEFAULT", "0.3"))
        logger.info(f"   Risk Threshold: {risk_threshold}")

        # Map investigation to transactions
        logger.info("📋 Mapping investigation to transactions...")
        try:
            # Prepare investigation dict for mapping - MUST include progress_json for transaction_scores
            investigation_dict = {
                "id": investigation_id,
                "investigation_id": investigation_id,
                "entity_type": entity_type,
                "entity_id": entity_value,
                "from_date": window_start,
                "to_date": window_end,
                "overall_risk_score": risk_score,
                "risk_score": risk_score,
                "progress_json": state.progress_json,  # CRITICAL: Include progress_json for transaction_scores lookup
            }

            transactions, _, _ = await map_investigation_to_transactions(
                investigation=investigation_dict,
                window_start=window_start,
                window_end=window_end,
                entity_type=entity_type,
                entity_id=entity_value,
            )

            if not transactions:
                logger.warning(
                    f"⚠️ No transactions found for {entity_type}:{entity_value}"
                )
                # If no transactions found, we cannot generate a confusion matrix
                return None

            logger.info(f"   Found {len(transactions)} transactions")

        except Exception as e:
            logger.error(
                f"❌ Failed to map investigation to transactions: {e}", exc_info=True
            )
            return None

        # Calculate confusion matrix
        logger.info("📊 Calculating confusion matrix...")
        try:
            confusion_matrix = calculate_confusion_matrix(
                transactions=transactions,
                risk_threshold=risk_threshold,
                entity_type=entity_type,
                entity_id=entity_value,
                investigation_id=investigation_id,
                window_start=window_start,
                window_end=window_end,
                investigation_risk_score=risk_score,
            )

            logger.info(f"✅ Confusion matrix calculated:")
            logger.info(f"   TP={confusion_matrix.TP}, FP={confusion_matrix.FP}")
            logger.info(f"   TN={confusion_matrix.TN}, FN={confusion_matrix.FN}")
            logger.info(f"   Excluded={confusion_matrix.excluded_count}")
            logger.info(
                f"   Precision={confusion_matrix.precision:.3f}, Recall={confusion_matrix.recall:.3f}"
            )
            logger.info(
                f"   F1={confusion_matrix.f1_score:.3f}, Accuracy={confusion_matrix.accuracy:.3f}"
            )

        except Exception as e:
            logger.error(f"❌ Failed to calculate confusion matrix: {e}", exc_info=True)
            return None

        # Aggregate confusion matrices (single entity, but using aggregation function for consistency)
        logger.info("📊 Aggregating confusion matrices...")
        try:
            aggregated_matrix = aggregate_confusion_matrices(
                matrices=[confusion_matrix], risk_threshold=risk_threshold
            )

            logger.info(f"✅ Aggregated confusion matrix:")
            logger.info(
                f"   Total TP={aggregated_matrix.total_TP}, FP={aggregated_matrix.total_FP}"
            )
            logger.info(
                f"   Total TN={aggregated_matrix.total_TN}, FN={aggregated_matrix.total_FN}"
            )
            logger.info(
                f"   Aggregated Precision={aggregated_matrix.aggregated_precision:.3f}"
            )
            logger.info(
                f"   Aggregated Recall={aggregated_matrix.aggregated_recall:.3f}"
            )

        except Exception as e:
            logger.error(
                f"❌ Failed to aggregate confusion matrices: {e}", exc_info=True
            )
            return None

        # Calculate revenue implications FROM THE SAME TRANSACTIONS used in confusion matrix
        logger.info("💰 Calculating revenue implications FROM INVESTIGATION TRANSACTIONS...")
        revenue_data = None
        try:
            from app.config.revenue_config import get_revenue_config
            from decimal import Decimal

            revenue_config = get_revenue_config()
            take_rate = revenue_config.take_rate_percent
            lifetime_multiplier = revenue_config.lifetime_multiplier

            # Calculate revenue DIRECTLY from the investigation transactions
            # These are the SAME transactions used for the confusion matrix
            
            # Saved Fraud GMV: APPROVED transactions that were fraud (IS_FRAUD_TX = 1)
            # These are fraud that slipped through - if Olorin blocked them, we'd save this GMV
            approved_fraud_txs = []
            saved_fraud_gmv = Decimal("0")
            
            # Lost Revenues: BLOCKED transactions that were legitimate (IS_FRAUD_TX = 0 or NULL)
            # These are false positives - blocking good customers costs revenue
            blocked_legit_txs = []
            blocked_gmv = Decimal("0")
            
            for tx in transactions:
                # Get decision and fraud status from transaction
                decision = str(tx.get("NSURE_LAST_DECISION", tx.get("nSure_last_decision", ""))).upper()
                is_fraud = tx.get("IS_FRAUD_TX", tx.get("is_fraud_tx", tx.get("actual_outcome")))
                gmv = Decimal(str(tx.get("PAID_AMOUNT_VALUE_IN_CURRENCY", tx.get("paid_amount_value_in_currency", tx.get("AMOUNT", tx.get("amount", 0)))) or 0))
                tx_id = tx.get("TRANSACTION_ID", tx.get("transaction_id", tx.get("TX_ID_KEY", "unknown")))
                
                # Normalize is_fraud to boolean
                if isinstance(is_fraud, str):
                    is_fraud = is_fraud.lower() in ("1", "true", "fraud")
                elif is_fraud is None:
                    is_fraud = False
                else:
                    is_fraud = bool(int(is_fraud)) if is_fraud else False
                
                # Saved Fraud GMV: APPROVED + FRAUD
                if decision == "APPROVED" and is_fraud:
                    saved_fraud_gmv += gmv
                    approved_fraud_txs.append({"tx_id": tx_id, "gmv": float(gmv), "decision": decision, "is_fraud": is_fraud})
                
                # Blocked Legit (for Lost Revenues): BLOCKED + NOT FRAUD
                if decision in ("BLOCK", "BLOCKED", "REJECT", "REJECTED", "DECLINE", "DECLINED") and not is_fraud:
                    blocked_gmv += gmv
                    blocked_legit_txs.append({"tx_id": tx_id, "gmv": float(gmv), "decision": decision, "is_fraud": is_fraud})
            
            # Calculate Lost Revenues: blocked_gmv × take_rate × lifetime_multiplier
            lost_revenues = blocked_gmv * (take_rate / Decimal("100")) * lifetime_multiplier
            
            # Net Value: Saved - Lost
            net_value = saved_fraud_gmv - lost_revenues
            
            logger.info(f"   Analyzed {len(transactions)} transactions from investigation")
            logger.info(f"   APPROVED + FRAUD (Saved GMV source): {len(approved_fraud_txs)} tx = ${saved_fraud_gmv:,.2f}")
            logger.info(f"   BLOCKED + LEGIT (Lost Rev source): {len(blocked_legit_txs)} tx = ${blocked_gmv:,.2f}")
            logger.info(f"   Lost Revenues = ${blocked_gmv:,.2f} × {take_rate}% × {lifetime_multiplier} = ${lost_revenues:,.2f}")
            
            # Build detailed reasoning
            saved_reasoning = _build_saved_fraud_reasoning_from_txs(
                entity_type, entity_value, merchant_name,
                saved_fraud_gmv, len(approved_fraud_txs), approved_fraud_txs,
                window_start, window_end, len(transactions)
            )
            
            lost_reasoning = _build_lost_revenues_reasoning_from_txs(
                entity_type, entity_value, merchant_name,
                blocked_gmv, lost_revenues, len(blocked_legit_txs), blocked_legit_txs,
                take_rate, lifetime_multiplier, window_start, window_end, len(transactions)
            )
            
            net_reasoning = _build_net_value_reasoning(
                saved_fraud_gmv, lost_revenues, net_value, entity_type, entity_value, merchant_name
            )
            
            revenue_data = {
                "saved_fraud_gmv": float(saved_fraud_gmv),
                "lost_revenues": float(lost_revenues),
                "net_value": float(net_value),
                "approved_fraud_tx_count": len(approved_fraud_txs),
                "blocked_legitimate_tx_count": len(blocked_legit_txs),
                "total_tx_count": len(transactions),
                "take_rate_used": float(take_rate),
                "lifetime_multiplier_used": float(lifetime_multiplier),
                "confidence_level": "high" if len(transactions) >= 100 else "medium" if len(transactions) >= 10 else "low",
                "calculation_successful": True,
                "saved_fraud_breakdown": {
                    "reasoning": saved_reasoning,
                    "methodology": f"From {len(transactions)} investigation transactions, found {len(approved_fraud_txs)} APPROVED + FRAUD",
                    "sample_transactions": approved_fraud_txs[:5],
                },
                "lost_revenues_breakdown": {
                    "reasoning": lost_reasoning,
                    "methodology": f"From {len(transactions)} investigation transactions, found {len(blocked_legit_txs)} BLOCKED + LEGITIMATE",
                    "formula_applied": f"${blocked_gmv:,.2f} × ({take_rate}% / 100) × {lifetime_multiplier} = ${lost_revenues:,.2f}",
                    "blocked_gmv_total": float(blocked_gmv),
                    "sample_transactions": blocked_legit_txs[:5],
                },
                "net_value_breakdown": {
                    "reasoning": net_reasoning,
                    "formula": f"${saved_fraud_gmv:,.2f} - ${lost_revenues:,.2f} = ${net_value:,.2f}",
                    "is_positive": net_value >= 0,
                    "roi_percentage": float((net_value / lost_revenues) * 100) if lost_revenues > 0 else None,
                },
            }

            logger.info(f"✅ Revenue calculated FROM INVESTIGATION TRANSACTIONS:")
            logger.info(f"   Saved Fraud GMV: ${saved_fraud_gmv:,.2f} ({len(approved_fraud_txs)} tx)")
            logger.info(f"   Lost Revenues: ${lost_revenues:,.2f} ({len(blocked_legit_txs)} tx)")
            logger.info(f"   Net Value: ${net_value:,.2f}")

        except Exception as e:
            logger.warning(f"⚠️ Revenue calculation failed (non-fatal): {e}")
            revenue_data = {"error": str(e), "calculation_successful": False}

        # Generate confusion table HTML
        logger.info("📄 Generating confusion table HTML with financial data...")
        try:
            # Create data structure matching what startup_report_generator expects
            data = {"confusion_matrix": {"aggregated": aggregated_matrix}}

            confusion_table_html = _generate_confusion_table_section(data)

            # Generate financial reasoning HTML
            financial_html = _generate_financial_reasoning_html(revenue_data, merchant_name)

            logger.info("✅ Confusion table and financial HTML generated")

        except Exception as e:
            logger.error(
                f"❌ Failed to generate confusion table HTML: {e}", exc_info=True
            )
            return None

        # Save to file
        if output_path is None:
            output_dir = Path("artifacts/comparisons/auto_startup")
            
            # Use merchant folder if available
            if merchant_name and merchant_name != "Unknown":
                # Sanitize merchant name for folder usage
                safe_merchant = "".join(c for c in merchant_name if c.isalnum() or c in (' ', '-', '_')).strip()
                output_dir = output_dir / safe_merchant
                
            output_dir.mkdir(parents=True, exist_ok=True)
            timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = (
                output_dir / f"confusion_table_{investigation_id}_{timestamp_str}.html"
            )

        # Create full HTML document with financial analysis
        net_val = revenue_data.get("net_value", 0) if revenue_data else 0
        saved_gmv = revenue_data.get("saved_fraud_gmv", 0) if revenue_data else 0
        lost_rev = revenue_data.get("lost_revenues", 0) if revenue_data else 0

        full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confusion Table & Financial Analysis - {investigation_id}</title>
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
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: var(--bg);
            color: var(--text);
            padding: 24px;
            line-height: 1.6;
        }}
        .panel {{
            background: var(--panel);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
        }}
        h1 {{
            color: var(--accent);
            margin-bottom: 8px;
        }}
        h2 {{
            color: var(--accent-secondary);
            margin-top: 24px;
            margin-bottom: 16px;
        }}
        h3 {{
            color: var(--text);
            margin-top: 16px;
            margin-bottom: 12px;
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
        }}
        code {{
            background: var(--panel-glass);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 0.9em;
        }}
        .metadata {{
            color: var(--muted);
            font-size: 14px;
            margin-top: 16px;
        }}
        pre {{
            overflow-x: auto;
        }}
    </style>
</head>
<body>
    <div class="panel">
        <h1>📊 Confusion Table & Financial Analysis Report</h1>
        <div class="metadata">
            <p><strong>Investigation ID:</strong> <code>{investigation_id}</code></p>
            <p><strong>Entity:</strong> <code>{entity_type}:{entity_value}</code></p>
            <p><strong>Merchant:</strong> <span style="color: var(--accent-secondary); font-weight: bold;">{merchant_name}</span></p>
            <p><strong>Risk Score:</strong> {risk_score if risk_score is not None else 'N/A'}</p>
            <p><strong>Risk Threshold:</strong> {risk_threshold:.1%}</p>
            <p><strong>Window:</strong> {window_start.strftime('%Y-%m-%d %H:%M:%S UTC')} to {window_end.strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
            <p><strong>Total Transactions:</strong> {len(transactions)}</p>
            <p><strong>Generated:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
        </div>
        
        <!-- Quick Financial Summary in Header -->
        <div style="margin-top: 16px; padding: 16px; background: var(--panel-glass); border-radius: 8px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; text-align: center;">
            <div>
                <div style="color: var(--ok); font-size: 18px; font-weight: bold;">${saved_gmv:,.2f}</div>
                <div style="color: var(--muted); font-size: 11px;">Saved Fraud GMV</div>
            </div>
            <div>
                <div style="color: var(--warning); font-size: 18px; font-weight: bold;">${lost_rev:,.2f}</div>
                <div style="color: var(--muted); font-size: 11px;">Lost Revenues</div>
            </div>
            <div>
                <div style="color: {'var(--ok)' if net_val >= 0 else 'var(--error)'}; font-size: 18px; font-weight: bold;">${net_val:,.2f}</div>
                <div style="color: var(--muted); font-size: 11px;">Net Value</div>
            </div>
        </div>
    </div>
    
    {confusion_table_html}
    
    {financial_html}
</body>
</html>
"""

        output_path.write_text(full_html)
        logger.info(f"✅ Confusion table with financial analysis saved to: {output_path}")

        return {
            "confusion_matrix": confusion_matrix,
            "aggregated_matrix": aggregated_matrix,
            "html_path": output_path,
            "transactions_count": len(transactions),
            "revenue_data": revenue_data,
        }

    finally:
        db.close()


async def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print(
            "Usage: python scripts/generate_confusion_table_for_investigation.py <investigation_id> [output_path]"
        )
        print("\nExample:")
        print(
            "  python scripts/generate_confusion_table_for_investigation.py auto-comp-ee88621fd85b"
        )
        print(
            "  python scripts/generate_confusion_table_for_investigation.py auto-comp-ee88621fd85b output.html"
        )
        sys.exit(1)

    investigation_id = sys.argv[1]
    output_path = Path(sys.argv[2]) if len(sys.argv) > 2 else None

    try:
        result = await generate_confusion_table(investigation_id, output_path)
        if result:
            print(f"\n✅ Success! Confusion table generated:")
            print(f"   HTML Report: {result['html_path']}")
            print(f"   Transactions Analyzed: {result['transactions_count']}")
            print(
                f"   TP={result['confusion_matrix'].TP}, FP={result['confusion_matrix'].FP}"
            )
            print(
                f"   TN={result['confusion_matrix'].TN}, FN={result['confusion_matrix'].FN}"
            )
            print(f"   Precision={result['confusion_matrix'].precision:.3f}")
            print(f"   Recall={result['confusion_matrix'].recall:.3f}")
            print(f"   F1={result['confusion_matrix'].f1_score:.3f}")
            print(f"   Accuracy={result['confusion_matrix'].accuracy:.3f}")
            sys.exit(0)
        else:
            print("\n⚠️ Confusion table generation skipped")
            sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Failed to generate confusion table: {e}", exc_info=True)
        print(f"\n❌ Error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
