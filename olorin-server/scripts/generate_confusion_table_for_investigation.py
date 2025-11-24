#!/usr/bin/env python3
"""
Generate confusion table for a completed investigation.

This script calculates the confusion matrix for a completed investigation
and generates a confusion table HTML section.

Usage:
    python scripts/generate_confusion_table_for_investigation.py <investigation_id>
    
Example:
    python scripts/generate_confusion_table_for_investigation.py auto-comp-ee88621fd85b
"""

import sys
import json
import asyncio
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.persistence.database import get_db
from app.service.investigation_state_service import InvestigationStateService
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

# Import functions we need - these will be imported inside the function to avoid circular dependencies
# The imports happen at runtime when the function is called, avoiding module-level import issues


async def generate_confusion_table(investigation_id: str, output_path: Optional[Path] = None):
    """Generate confusion table for a specific investigation."""
    
    logger.info(f"📊 Generating confusion table for investigation: {investigation_id}")
    
    # Get investigation state
    db_gen = get_db()
    db = next(db_gen)
    try:
        service = InvestigationStateService(db)
        state = service.get_state_with_auth(
            investigation_id=investigation_id,
            user_id="auto-comparison-system"
        )
        
        if state.status != "COMPLETED":
            logger.warning(f"⚠️ Investigation {investigation_id} is not completed (status: {state.status})")
            return None
        
        # Extract entity information from state.settings (preferred) or settings_json (fallback)
        entity_type = None
        entity_value = None
        
        # Try to get from state.settings first
        if state.settings and state.settings.entities and len(state.settings.entities) > 0:
            entity = state.settings.entities[0]
            entity_type = entity.entity_type.value if hasattr(entity.entity_type, 'value') else str(entity.entity_type) if entity.entity_type else None
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
                entity_type = entity_type or (entities[0].get("entity_type") if isinstance(entities[0], dict) else getattr(entities[0], "entity_type", None))
                entity_value = entity_value or (entities[0].get("entity_value") if isinstance(entities[0], dict) else getattr(entities[0], "entity_value", None))
        
        logger.info(f"   Entity: {entity_type}={entity_value}")
        
        # Extract risk score from progress_json
        risk_score = None
        if state.progress_json:
            try:
                progress_dict = json.loads(state.progress_json)
                raw_risk_score = progress_dict.get("overall_risk_score") or progress_dict.get("risk_score")
                
                # Validate and normalize risk score (must be between 0 and 1)
                if raw_risk_score is not None:
                    try:
                        risk_score = float(raw_risk_score)
                        # Clamp to valid range [0, 1]
                        if risk_score < 0:
                            logger.warning(f"⚠️ Risk score {risk_score} is negative, clamping to 0")
                            risk_score = 0.0
                        elif risk_score > 1:
                            logger.warning(f"⚠️ Risk score {risk_score} is > 1, clamping to 1.0")
                            risk_score = 1.0
                    except (ValueError, TypeError):
                        logger.warning(f"⚠️ Invalid risk score format: {raw_risk_score}, using None")
                        risk_score = None
            except json.JSONDecodeError:
                pass
        
        logger.info(f"   Risk Score: {risk_score}")
        
        # Import here to avoid module-level import issues
        from app.service.investigation.comparison_service import (
            calculate_confusion_matrix,
            aggregate_confusion_matrices
        )
        from app.service.investigation.investigation_transaction_mapper import (
            map_investigation_to_transactions,
            get_investigation_by_id
        )
        from app.service.reporting.startup_report_generator import _generate_confusion_table_section
        
        # Get investigation details (window dates)
        investigation = get_investigation_by_id(investigation_id)
        if not investigation:
            logger.error(f"❌ Investigation {investigation_id} not found in database")
            return None
        
        window_start = investigation.get('from_date')
        window_end = investigation.get('to_date')
        if not window_start or not window_end:
            logger.error(f"❌ Investigation {investigation_id} missing window dates")
            return None
        
        # Parse dates if strings
        import pytz
        utc = pytz.UTC
        if isinstance(window_start, str):
            window_start = datetime.fromisoformat(window_start.replace('Z', '+00:00'))
        if isinstance(window_end, str):
            window_end = datetime.fromisoformat(window_end.replace('Z', '+00:00'))
        
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
                'id': investigation_id,
                'investigation_id': investigation_id,
                'entity_type': entity_type,
                'entity_id': entity_value,
                'from_date': window_start,
                'to_date': window_end,
                'overall_risk_score': risk_score,
                'risk_score': risk_score,
                'progress_json': state.progress_json  # CRITICAL: Include progress_json for transaction_scores lookup
            }
            
            transactions, _, _ = await map_investigation_to_transactions(
                investigation=investigation_dict,
                window_start=window_start,
                window_end=window_end,
                entity_type=entity_type,
                entity_id=entity_value
            )
            
            if not transactions:
                logger.warning(f"⚠️ No transactions found for {entity_type}:{entity_value}")
                return None
            
            logger.info(f"   Found {len(transactions)} transactions")
            
        except Exception as e:
            logger.error(f"❌ Failed to map investigation to transactions: {e}", exc_info=True)
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
                investigation_risk_score=risk_score
            )
            
            logger.info(f"✅ Confusion matrix calculated:")
            logger.info(f"   TP={confusion_matrix.TP}, FP={confusion_matrix.FP}")
            logger.info(f"   TN={confusion_matrix.TN}, FN={confusion_matrix.FN}")
            logger.info(f"   Excluded={confusion_matrix.excluded_count}")
            logger.info(f"   Precision={confusion_matrix.precision:.3f}, Recall={confusion_matrix.recall:.3f}")
            logger.info(f"   F1={confusion_matrix.f1_score:.3f}, Accuracy={confusion_matrix.accuracy:.3f}")
            
        except Exception as e:
            logger.error(f"❌ Failed to calculate confusion matrix: {e}", exc_info=True)
            return None
        
        # Aggregate confusion matrices (single entity, but using aggregation function for consistency)
        logger.info("📊 Aggregating confusion matrices...")
        try:
            aggregated_matrix = aggregate_confusion_matrices(
                matrices=[confusion_matrix],
                risk_threshold=risk_threshold
            )
            
            logger.info(f"✅ Aggregated confusion matrix:")
            logger.info(f"   Total TP={aggregated_matrix.total_TP}, FP={aggregated_matrix.total_FP}")
            logger.info(f"   Total TN={aggregated_matrix.total_TN}, FN={aggregated_matrix.total_FN}")
            logger.info(f"   Aggregated Precision={aggregated_matrix.aggregated_precision:.3f}")
            logger.info(f"   Aggregated Recall={aggregated_matrix.aggregated_recall:.3f}")
            
        except Exception as e:
            logger.error(f"❌ Failed to aggregate confusion matrices: {e}", exc_info=True)
            return None
        
        # Generate confusion table HTML
        logger.info("📄 Generating confusion table HTML...")
        try:
            # Create data structure matching what startup_report_generator expects
            data = {
                "confusion_matrix": {
                    "aggregated": aggregated_matrix
                }
            }
            
            confusion_table_html = _generate_confusion_table_section(data)
            
            logger.info("✅ Confusion table HTML generated")
            
        except Exception as e:
            logger.error(f"❌ Failed to generate confusion table HTML: {e}", exc_info=True)
            return None
        
        # Save to file
        if output_path is None:
            output_dir = Path("artifacts/comparisons/auto_startup")
            output_dir.mkdir(parents=True, exist_ok=True)
            timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = output_dir / f"confusion_table_{investigation_id}_{timestamp_str}.html"
        
        # Create full HTML document
        full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confusion Table - {investigation_id}</title>
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
    </style>
</head>
<body>
    <div class="panel">
        <h1>📊 Confusion Table Report</h1>
        <div class="metadata">
            <p><strong>Investigation ID:</strong> <code>{investigation_id}</code></p>
            <p><strong>Entity:</strong> <code>{entity_type}:{entity_value}</code></p>
            <p><strong>Risk Score:</strong> {risk_score if risk_score is not None else 'N/A'}</p>
            <p><strong>Risk Threshold:</strong> {risk_threshold:.1%}</p>
            <p><strong>Window:</strong> {window_start.strftime('%Y-%m-%d %H:%M:%S UTC')} to {window_end.strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
            <p><strong>Total Transactions:</strong> {len(transactions)}</p>
            <p><strong>Generated:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
        </div>
    </div>
    
    {confusion_table_html}
</body>
</html>
"""
        
        output_path.write_text(full_html)
        logger.info(f"✅ Confusion table saved to: {output_path}")
        
        return {
            "confusion_matrix": confusion_matrix,
            "aggregated_matrix": aggregated_matrix,
            "html_path": output_path,
            "transactions_count": len(transactions)
        }
        
    finally:
        db.close()


async def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python scripts/generate_confusion_table_for_investigation.py <investigation_id> [output_path]")
        print("\nExample:")
        print("  python scripts/generate_confusion_table_for_investigation.py auto-comp-ee88621fd85b")
        print("  python scripts/generate_confusion_table_for_investigation.py auto-comp-ee88621fd85b output.html")
        sys.exit(1)
    
    investigation_id = sys.argv[1]
    output_path = Path(sys.argv[2]) if len(sys.argv) > 2 else None
    
    try:
        result = await generate_confusion_table(investigation_id, output_path)
        if result:
            print(f"\n✅ Success! Confusion table generated:")
            print(f"   HTML Report: {result['html_path']}")
            print(f"   Transactions Analyzed: {result['transactions_count']}")
            print(f"   TP={result['confusion_matrix'].TP}, FP={result['confusion_matrix'].FP}")
            print(f"   TN={result['confusion_matrix'].TN}, FN={result['confusion_matrix'].FN}")
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

