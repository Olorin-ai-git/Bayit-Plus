"""
Precision Model Training Pipeline

Trains XGBoost model using precision-focused features and mature ground-truth labels,
calibrates model for accurate probability estimates, and scores all transactions.
"""

import os
import pickle
from datetime import datetime
from app.service.logging import get_bridge_logger
from scripts.model_helpers import (
    load_features_and_labels, temporal_split, train_xgboost_model,
    calibrate_model, score_all_transactions, store_scores
)
from app.service.precision_detection.performance_monitor import monitor_execution_time, track_pipeline_metrics

try:
    import xgboost as xgb
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False

try:
    from sklearn.calibration import CalibratedClassifierCV
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

logger = get_bridge_logger(__name__)


@monitor_execution_time("Model Training Pipeline")
def main():
    """Main model training pipeline orchestration."""
    import time
    start_time = time.time()
    if not XGBOOST_AVAILABLE or not SKLEARN_AVAILABLE:
        logger.error("Required dependencies not available. Install xgboost and scikit-learn.")
        return
    try:
        import pandas as pd
        features, labels = load_features_and_labels()
        X_train, X_val, y_train, y_val = temporal_split(features, labels)
        model = train_xgboost_model(X_train, y_train, X_val, y_val)
        calibration_method = os.getenv("CALIBRATION_METHOD", "isotonic")
        calibrated_model = calibrate_model(model, X_val, y_val, method=calibration_method)
        scores = score_all_transactions(calibrated_model, X_val)
        model_version = f"precision_v1_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        txn_ids = features.attrs.get("txn_ids", pd.Series(features.index, index=features.index))
        store_scores(txn_ids.loc[X_val.index], scores, model_version=model_version)
        model_dir = os.getenv("MODEL_DIR", "models")
        os.makedirs(model_dir, exist_ok=True)
        model_path = os.path.join(model_dir, f"{model_version}.pkl")
        with open(model_path, "wb") as f:
            pickle.dump(calibrated_model, f)
        duration = time.time() - start_time
        track_pipeline_metrics("Model Training Pipeline", {
            "training_samples": len(X_train),
            "validation_samples": len(X_val),
            "execution_time_seconds": duration,
            "model_version": model_version
        })
        logger.info(f"Model training pipeline complete. Model saved to {model_path}")
    except Exception as e:
        logger.error(f"Model training pipeline failed: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    main()

