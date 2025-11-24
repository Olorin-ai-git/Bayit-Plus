"""
Evaluation Configuration

Default settings for investigation comparison evaluation metrics,
confidence intervals, and auto-expansion.

Constitutional Compliance:
- All values configurable via environment variables
- No hardcoded business logic
"""

import os
from typing import Dict, Any

EVAL_DEFAULTS: Dict[str, Any] = {
    "ci_confidence": float(os.getenv("EVAL_CI_CONFIDENCE", "0.95")),  # Wilson interval confidence
    
    "min_support": {  # Thresholds to call a window "stable"
        "min_transactions": int(os.getenv("EVAL_MIN_TRANSACTIONS", "100")),
        "min_actual_frauds": int(os.getenv("EVAL_MIN_ACTUAL_FRAUDS", "10")),
        "min_predicted_positives": int(os.getenv("EVAL_MIN_PREDICTED_POSITIVES", "30"))
    },
    
    "auto_expand": {
        "enabled": os.getenv("EVAL_AUTO_EXPAND", "true").lower() == "true",
        "max_days": int(os.getenv("EVAL_MAX_DAYS", "56")),  # Cap total window length
        "step_days": int(os.getenv("EVAL_STEP_DAYS", "7")),  # Expand in 1-week steps
        "label_maturity_days": int(os.getenv("EVAL_LABEL_MATURITY_DAYS", "14"))  # Retro windows must end ≤ today-14d
    }
}

