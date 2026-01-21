#!/usr/bin/env python3
"""Quick diagnostic to check LLM scores."""
import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

async def main():
    print("=== LLM Score Diagnostic ===")
    print(f"LLM_REASONING_ENABLED: {os.getenv('LLM_REASONING_ENABLED')}")
    print(f"LLM_FRAUD_THRESHOLD: {os.getenv('LLM_FRAUD_THRESHOLD')}")
    print(f"LLM_PROMPT_ACTIVE_VERSION: {os.getenv('LLM_PROMPT_ACTIVE_VERSION')}")
    print()
    
    from app.service.training.training_data_extractor import TrainingDataExtractor
    from app.service.training.llm_reasoning_engine import get_reasoning_engine
    
    extractor = TrainingDataExtractor()
    samples = await extractor.extract_samples()
    samples = samples[:20]  # Limit for testing
    
    fraud_samples = [s for s in samples if s.is_fraud][:3]
    legit_samples = [s for s in samples if not s.is_fraud][:3]
    
    print(f"Testing {len(fraud_samples)} fraud + {len(legit_samples)} legit samples\n")
    
    engine = get_reasoning_engine()
    print(f"Reasoning enabled: {engine.is_enabled()}")
    print()
    
    print("=== FRAUD SAMPLES ===")
    for i, sample in enumerate(fraud_samples, 1):
        assessment = await engine.analyze_entity(
            entity_type=sample.entity_type,
            entity_value=sample.entity_value,
            features=sample.features,
            merchant_name=sample.merchant_name,
        )
        print(f"Fraud #{i}: score={assessment.risk_score:.3f}, pred={assessment.prediction}, conf={assessment.confidence:.3f}")
        if assessment.error:
            print(f"         error: {assessment.error}")
        print(f"         features: tx={sample.features.get('total_transactions')}, gmv={sample.features.get('total_gmv'):.2f}")
    
    print("\n=== LEGITIMATE SAMPLES ===")
    for i, sample in enumerate(legit_samples, 1):
        assessment = await engine.analyze_entity(
            entity_type=sample.entity_type,
            entity_value=sample.entity_value,
            features=sample.features,
            merchant_name=sample.merchant_name,
        )
        print(f"Legit #{i}: score={assessment.risk_score:.3f}, pred={assessment.prediction}, conf={assessment.confidence:.3f}")
        if assessment.error:
            print(f"          error: {assessment.error}")
        print(f"          features: tx={sample.features.get('total_transactions')}, gmv={sample.features.get('total_gmv'):.2f}")

if __name__ == "__main__":
    asyncio.run(main())
