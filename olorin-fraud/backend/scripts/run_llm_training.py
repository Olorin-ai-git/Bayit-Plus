#!/usr/bin/env python3
"""
Run LLM Training Pipeline
Feature: 026-llm-training-pipeline

Extracts training data from Snowflake and evaluates LLM-based fraud detection.
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

load_dotenv()


async def main():
    """Run the training pipeline."""
    from app.service.training import (
        TrainingPipeline,
        get_training_config,
        get_prompt_registry,
        get_feedback_collector,
    )

    print("=" * 80)
    print("LLM TRAINING PIPELINE")
    print("=" * 80)

    # Load configuration
    config = get_training_config()
    print(f"\nConfiguration loaded:")
    print(f"  - LLM Training Enabled: {config.enabled}")
    print(f"  - LLM Reasoning Enabled: {config.reasoning_enabled}")
    print(f"  - Provider: {config.provider.primary}")
    print(f"  - Model: {config.provider.model_id}")
    print(f"  - Fraud Threshold: {config.scoring.fraud_threshold}")
    print(f"  - Batch Size: {config.batch_processing.batch_size}")
    print(f"  - Max Concurrent: {config.batch_processing.max_concurrent}")

    # Get prompt registry
    registry = get_prompt_registry()
    active_version = registry.get_active_version()
    print(f"\nPrompt Registry:")
    print(f"  - Active Version: {active_version}")

    # Initialize training pipeline
    pipeline = TrainingPipeline()

    print("\n" + "=" * 80)
    print("EXTRACTING TRAINING DATA FROM SNOWFLAKE")
    print("=" * 80)

    try:
        # Extract training samples
        samples = await pipeline.extract_training_samples_from_snowflake()
        print(f"\nExtracted {len(samples)} training samples")

        if len(samples) == 0:
            print("No training samples found. Exiting.")
            return

        # Count fraud vs legitimate
        fraud_count = sum(1 for s in samples if s.is_fraud)
        legit_count = len(samples) - fraud_count
        print(f"  - Fraud samples: {fraud_count}")
        print(f"  - Legitimate samples: {legit_count}")
        print(f"  - Fraud ratio: {fraud_count / len(samples):.2%}")

        print("\n" + "=" * 80)
        print("RUNNING TRAINING EVALUATION")
        print("=" * 80)

        # Run training evaluation
        metrics = await pipeline.run_training_evaluation(samples)

        print("\n" + "=" * 80)
        print("TRAINING RESULTS")
        print("=" * 80)
        print(f"\nConfusion Matrix:")
        print(f"  True Positives:  {metrics.true_positives}")
        print(f"  False Positives: {metrics.false_positives}")
        print(f"  True Negatives:  {metrics.true_negatives}")
        print(f"  False Negatives: {metrics.false_negatives}")
        print(f"\nMetrics:")
        print(f"  Accuracy:  {metrics.accuracy:.4f}")
        print(f"  Precision: {metrics.precision:.4f}")
        print(f"  Recall:    {metrics.recall:.4f}")
        print(f"  F1 Score:  {metrics.f1_score:.4f}")

        # Collect feedback
        feedback_collector = get_feedback_collector()
        if feedback_collector.is_enabled():
            summary = feedback_collector.collect_from_metrics(metrics, active_version)
            print(f"\nFeedback Summary:")
            print(f"  - Total entries: {summary.total_entries}")
            print(f"  - Needs optimization: {summary.needs_optimization}")
            if summary.optimization_reason:
                print(f"  - Reason: {summary.optimization_reason}")

    except Exception as e:
        print(f"\nError during training: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
