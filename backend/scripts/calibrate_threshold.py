#!/usr/bin/env python3
"""
Calibrate fraud detection threshold based on production investigation results.
Analyzes transaction scores and ground truth to find optimal threshold.
"""
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
from typing import List, Tuple, Dict
import json
from datetime import datetime


def get_database_engine():
    """Create database engine from environment."""
    db_url = os.getenv("DATABASE_URL", "postgresql://olorin:olorin@localhost:5432/olorin")
    return create_engine(db_url)


def fetch_transaction_scores(engine) -> pd.DataFrame:
    """Fetch all transaction scores with ground truth labels."""
    query = """
        SELECT
            investigation_id,
            transaction_id,
            predicted_risk,
            actual_outcome,
            created_at
        FROM transaction_scores
        WHERE predicted_risk IS NOT NULL
        ORDER BY created_at DESC
    """

    with engine.connect() as conn:
        df = pd.read_sql(text(query), conn)

    return df


def calculate_metrics_at_threshold(
    df: pd.DataFrame,
    threshold: float
) -> Dict[str, float]:
    """Calculate confusion matrix and metrics at a given threshold."""
    # Predicted labels based on threshold
    df['predicted_fraud'] = df['predicted_risk'] >= threshold

    # Ground truth (actual_outcome: 'fraud' or 'legitimate')
    df['actual_fraud'] = df['actual_outcome'] == 'fraud'

    # Confusion matrix
    tp = ((df['predicted_fraud'] == True) & (df['actual_fraud'] == True)).sum()
    fp = ((df['predicted_fraud'] == True) & (df['actual_fraud'] == False)).sum()
    tn = ((df['predicted_fraud'] == False) & (df['actual_fraud'] == False)).sum()
    fn = ((df['predicted_fraud'] == False) & (df['actual_fraud'] == True)).sum()

    # Metrics
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

    # False positive rate
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0

    return {
        'threshold': threshold,
        'tp': int(tp),
        'fp': int(fp),
        'tn': int(tn),
        'fn': int(fn),
        'precision': precision,
        'recall': recall,
        'f1': f1,
        'fpr': fpr,
    }


def find_optimal_threshold(
    df: pd.DataFrame,
    target_recall: float = 0.95,
    max_fpr: float = 0.10
) -> Tuple[float, Dict]:
    """
    Find optimal threshold that:
    1. Maintains target recall (default 95%)
    2. Minimizes false positive rate
    3. Maximizes F1 score
    """
    # Test thresholds from 0.3 to 0.95 in steps of 0.01
    thresholds = np.arange(0.30, 0.96, 0.01)
    results = []

    for threshold in thresholds:
        metrics = calculate_metrics_at_threshold(df, threshold)
        results.append(metrics)

    results_df = pd.DataFrame(results)

    # Filter to maintain target recall
    high_recall = results_df[results_df['recall'] >= target_recall]

    if len(high_recall) == 0:
        print(f"⚠️  No threshold achieves {target_recall*100}% recall")
        # Fall back to maximizing F1
        best_idx = results_df['f1'].idxmax()
        optimal = results_df.iloc[best_idx].to_dict()
    else:
        # Among high-recall thresholds, maximize F1
        best_idx = high_recall['f1'].idxmax()
        optimal = high_recall.loc[best_idx].to_dict()

    return optimal['threshold'], optimal, results_df


def analyze_score_distribution(df: pd.DataFrame) -> Dict:
    """Analyze the distribution of predicted risk scores."""
    fraud_scores = df[df['actual_outcome'] == 'fraud']['predicted_risk']
    legit_scores = df[df['actual_outcome'] == 'legitimate']['predicted_risk']

    return {
        'fraud_count': len(fraud_scores),
        'fraud_mean': float(fraud_scores.mean()) if len(fraud_scores) > 0 else 0.0,
        'fraud_median': float(fraud_scores.median()) if len(fraud_scores) > 0 else 0.0,
        'fraud_min': float(fraud_scores.min()) if len(fraud_scores) > 0 else 0.0,
        'fraud_max': float(fraud_scores.max()) if len(fraud_scores) > 0 else 0.0,
        'legit_count': len(legit_scores),
        'legit_mean': float(legit_scores.mean()) if len(legit_scores) > 0 else 0.0,
        'legit_median': float(legit_scores.median()) if len(legit_scores) > 0 else 0.0,
        'legit_min': float(legit_scores.min()) if len(legit_scores) > 0 else 0.0,
        'legit_max': float(legit_scores.max()) if len(legit_scores) > 0 else 0.0,
    }


def save_calibration_results(
    optimal_threshold: float,
    optimal_metrics: Dict,
    distribution: Dict,
    all_results: pd.DataFrame,
    output_dir: str = "data/calibration"
):
    """Save calibration results to files."""
    os.makedirs(output_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Save optimal configuration
    config_file = f"{output_dir}/optimal_threshold_{timestamp}.json"
    config = {
        'optimal_threshold': optimal_threshold,
        'metrics': optimal_metrics,
        'distribution': distribution,
        'calibrated_at': datetime.now().isoformat()
    }

    with open(config_file, 'w') as f:
        json.dump(config, f, indent=2)

    # Save full threshold sweep
    sweep_file = f"{output_dir}/threshold_sweep_{timestamp}.csv"
    all_results.to_csv(sweep_file, index=False)

    print(f"\n📁 Results saved:")
    print(f"   - Configuration: {config_file}")
    print(f"   - Threshold sweep: {sweep_file}")

    return config_file


def main():
    """Main calibration workflow."""
    print("🔧 Fraud Detection Threshold Calibration")
    print("=" * 60)

    # 1. Fetch data
    print("\n📊 Fetching transaction scores from database...")
    engine = get_database_engine()
    df = fetch_transaction_scores(engine)

    if len(df) == 0:
        print("❌ No transaction scores found in database")
        sys.exit(1)

    print(f"✅ Loaded {len(df)} transaction scores")
    print(f"   - Fraud: {(df['actual_outcome'] == 'fraud').sum()}")
    print(f"   - Legitimate: {(df['actual_outcome'] == 'legitimate').sum()}")

    # 2. Analyze score distribution
    print("\n📈 Analyzing score distribution...")
    distribution = analyze_score_distribution(df)

    print(f"\n   Fraud Transactions ({distribution['fraud_count']}):")
    print(f"      Mean: {distribution['fraud_mean']:.3f}")
    print(f"      Median: {distribution['fraud_median']:.3f}")
    print(f"      Range: [{distribution['fraud_min']:.3f}, {distribution['fraud_max']:.3f}]")

    print(f"\n   Legitimate Transactions ({distribution['legit_count']}):")
    print(f"      Mean: {distribution['legit_mean']:.3f}")
    print(f"      Median: {distribution['legit_median']:.3f}")
    print(f"      Range: [{distribution['legit_min']:.3f}, {distribution['legit_max']:.3f}]")

    # 3. Find optimal threshold
    print("\n🎯 Finding optimal threshold...")
    print("   Target: 95% recall, maximize F1 score")

    optimal_threshold, optimal_metrics, all_results = find_optimal_threshold(
        df,
        target_recall=0.95,
        max_fpr=0.10
    )

    # 4. Display results
    print("\n" + "=" * 60)
    print("✅ CALIBRATION COMPLETE")
    print("=" * 60)

    print(f"\n🎯 Optimal Threshold: {optimal_threshold:.3f}")
    print(f"\n📊 Performance Metrics:")
    print(f"   Precision:  {optimal_metrics['precision']*100:.2f}%")
    print(f"   Recall:     {optimal_metrics['recall']*100:.2f}%")
    print(f"   F1 Score:   {optimal_metrics['f1']:.4f}")
    print(f"   FPR:        {optimal_metrics['fpr']*100:.2f}%")

    print(f"\n🔢 Confusion Matrix:")
    print(f"   TP: {optimal_metrics['tp']}")
    print(f"   FP: {optimal_metrics['fp']}")
    print(f"   TN: {optimal_metrics['tn']}")
    print(f"   FN: {optimal_metrics['fn']}")

    # 5. Save results
    config_file = save_calibration_results(
        optimal_threshold,
        optimal_metrics,
        distribution,
        all_results
    )

    # 6. Provide update instructions
    print("\n" + "=" * 60)
    print("📝 NEXT STEPS:")
    print("=" * 60)
    print(f"\n1. Update .env:")
    print(f"   RISK_THRESHOLD_DEFAULT={optimal_threshold:.2f}")
    print(f"   LLM_FRAUD_THRESHOLD={optimal_threshold:.2f}")

    print(f"\n2. Update config/llm_training_config.yaml:")
    print(f"   scoring:")
    print(f"     fraud_threshold: ${{LLM_FRAUD_THRESHOLD:{optimal_threshold:.2f}}}")

    print(f"\n3. Restart server to apply changes")

    return optimal_threshold, optimal_metrics


if __name__ == "__main__":
    main()
