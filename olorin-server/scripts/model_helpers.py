"""
Model Training Helper Functions

Shared utilities for model training pipeline.
"""

import os
from typing import Dict, Any, Optional
import numpy as np
import pandas as pd
from sqlalchemy import text
from app.persistence.database import get_db_session
from app.service.logging import get_bridge_logger

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


def load_features_and_labels() -> tuple[pd.DataFrame, pd.Series]:
    """Load feature vectors from mv_features_txn and labels from labels_truth."""
    if not XGBOOST_AVAILABLE:
        raise ImportError("XGBoost is required for model training")
    with get_db_session() as db:
        query = text("""
            SELECT f.*, l.y_true
            FROM mv_features_txn f
            INNER JOIN labels_truth l ON f.txn_id = l.txn_id
            WHERE l.y_true IS NOT NULL
            ORDER BY f.txn_ts
        """)
        result = db.execute(query)
        rows = result.fetchall()
        if not rows:
            raise ValueError("No features and labels found. Run ETL pipeline first.")
        df = pd.DataFrame([dict(row._mapping) for row in rows])
        txn_ids = df["txn_id"].copy()
        txn_ts = df["txn_ts"].copy()
        labels = df["y_true"].copy()
        df = df.drop(columns=["txn_id", "txn_ts", "merchant_id", "card_id", "currency", "y_true"])
        df.attrs["txn_ids"] = txn_ids
        df.attrs["txn_ts"] = txn_ts
        df = df.replace([np.inf, -np.inf], np.nan)
        logger.info(f"Loaded {len(df)} feature vectors with {len(df.columns)} features")
        logger.info(f"Label distribution: {labels.value_counts().to_dict()}")
        return df, labels


def temporal_split(features: pd.DataFrame, labels: pd.Series, train_ratio: float = 0.8) -> tuple:
    """Split data by transaction timestamp (train on older, validate on newer)."""
    sorted_idx = features.index
    split_idx = int(len(sorted_idx) * train_ratio)
    train_idx = sorted_idx[:split_idx]
    val_idx = sorted_idx[split_idx:]
    X_train = features.loc[train_idx]
    X_val = features.loc[val_idx]
    y_train = labels.loc[train_idx]
    y_val = labels.loc[val_idx]
    logger.info(f"Temporal split: {len(X_train)} train, {len(X_val)} validation")
    return X_train, X_val, y_train, y_val


def train_xgboost_model(X_train: pd.DataFrame, y_train: pd.Series,
                       X_val: pd.DataFrame, y_val: pd.Series,
                       params: Optional[Dict[str, Any]] = None) -> xgb.XGBClassifier:
    """Train XGBoost model with precision features."""
    if not XGBOOST_AVAILABLE:
        raise ImportError("XGBoost is required for model training")
    default_params = {
        "objective": "binary:logistic", "eval_metric": "logloss",
        "max_depth": 6, "learning_rate": 0.1, "n_estimators": 100,
        "subsample": 0.8, "colsample_bytree": 0.8, "random_state": 42, "n_jobs": -1
    }
    if params:
        default_params.update(params)
    model = xgb.XGBClassifier(**default_params)
    logger.info("Training XGBoost model...")
    model.fit(X_train, y_train, eval_set=[(X_val, y_val)], early_stopping_rounds=10, verbose=False)
    logger.info("XGBoost model training complete")
    return model


def calibrate_model(model: xgb.XGBClassifier, X_val: pd.DataFrame, y_val: pd.Series,
                   method: str = "isotonic") -> CalibratedClassifierCV:
    """Apply isotonic or Platt calibration to trained model."""
    if not SKLEARN_AVAILABLE:
        raise ImportError("scikit-learn is required for model calibration")
    if method not in ["isotonic", "sigmoid"]:
        raise ValueError(f"Invalid calibration method: {method}. Use 'isotonic' or 'sigmoid'")
    logger.info(f"Calibrating model using {method} method...")
    calibrated = CalibratedClassifierCV(model, method=method, cv="prefit")
    calibrated.fit(X_val, y_val)
    logger.info(f"Model calibration complete ({method})")
    return calibrated


def score_all_transactions(model: CalibratedClassifierCV, features: pd.DataFrame) -> pd.Series:
    """Score all transactions with calibrated model."""
    logger.info(f"Scoring {len(features)} transactions...")
    probabilities = model.predict_proba(features)[:, 1]
    logger.info(f"Scoring complete. Mean probability: {probabilities.mean():.4f}")
    return pd.Series(probabilities, index=features.index)


def store_scores(txn_ids: pd.Series, scores: pd.Series, model_version: str,
                threshold_cohort: Optional[str] = None, precision_at_k: Optional[float] = None) -> None:
    """Store model scores in pg_alerts table."""
    if len(txn_ids) != len(scores):
        raise ValueError("txn_ids and scores must have same length")
    threshold = float(os.getenv("MODEL_THRESHOLD", "0.5"))
    with get_db_session() as db:
        insert_query = text("""
            INSERT INTO pg_alerts (
                txn_id, model_version, score, threshold, threshold_cohort, precision_at_k
            ) VALUES (
                :txn_id, :model_version, :score, :threshold, :threshold_cohort, :precision_at_k
            )
            ON CONFLICT (txn_id) DO UPDATE SET
                model_version = EXCLUDED.model_version,
                score = EXCLUDED.score,
                threshold = EXCLUDED.threshold,
                threshold_cohort = EXCLUDED.threshold_cohort,
                precision_at_k = EXCLUDED.precision_at_k,
                created_at = NOW()
        """)
        for idx, score in scores.items():
            txn_id = txn_ids.loc[idx] if idx in txn_ids.index else None
            if not txn_id:
                continue
            params = {
                "txn_id": txn_id, "model_version": model_version, "score": float(score),
                "threshold": threshold, "threshold_cohort": threshold_cohort, "precision_at_k": precision_at_k
            }
            db.execute(insert_query, params)
        db.commit()
        logger.info(f"Stored {len(scores)} model scores in pg_alerts")

