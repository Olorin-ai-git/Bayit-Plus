"""
Stratified Sampler
Feature: 026-llm-training-pipeline

Provides stratified sampling by class, merchant, and GMV for fraud detection training.
Supports blindspot-aware oversampling to address model blindspot zones.
"""

import os
import random
from collections import defaultdict
from typing import Dict, List, Optional

from app.service.logging import get_bridge_logger
from app.service.training.dataset.dataset_models import SamplingConfig
from app.service.training.training_models import TrainingSample

logger = get_bridge_logger(__name__)


class StratifiedSampler:
    """Stratified sampler for training datasets."""

    def __init__(self, config: SamplingConfig):
        """
        Initialize stratified sampler.

        Args:
            config: Sampling configuration
        """
        self._config = config

    def sample(
        self,
        samples: List[TrainingSample],
        random_seed: Optional[int] = None,
    ) -> List[TrainingSample]:
        """
        Perform stratified sampling on input samples.

        Args:
            samples: List of all available samples
            random_seed: Optional seed for reproducibility

        Returns:
            Stratified sample list
        """
        if random_seed is not None:
            random.seed(random_seed)

        fraud_samples = [s for s in samples if s.is_fraud]
        legit_samples = [s for s in samples if not s.is_fraud]

        logger.info(
            f"Input: {len(fraud_samples)} fraud, {len(legit_samples)} legit samples"
        )

        target_fraud = min(
            len(fraud_samples),
            self._config.target_fraud_entities,
            self._config.max_fraud_entities,
        )
        target_legit = target_fraud * self._config.legit_multiplier

        if self._config.stratify_by_merchant:
            sampled_fraud = self._stratified_by_merchant(fraud_samples, target_fraud)
            sampled_legit = self._stratified_by_merchant(legit_samples, target_legit)
        else:
            sampled_fraud = self._random_sample(fraud_samples, target_fraud)
            sampled_legit = self._random_sample(legit_samples, target_legit)

        result = sampled_fraud + sampled_legit
        random.shuffle(result)

        logger.info(f"Sampled: {len(sampled_fraud)} fraud, {len(sampled_legit)} legit")

        # Apply GMV stratification if enabled
        if self._config.gmv_stratification_enabled:
            result = self._apply_gmv_stratification(result, random_seed)

        # Apply blindspot-aware oversampling if enabled
        if self._config.score_stratification_enabled:
            result = self._apply_blindspot_oversampling(result, random_seed)

        return result

    def _stratified_by_merchant(
        self,
        samples: List[TrainingSample],
        target_count: int,
    ) -> List[TrainingSample]:
        """Sample stratified by merchant."""
        by_merchant: Dict[str, List[TrainingSample]] = defaultdict(list)
        for sample in samples:
            merchant = sample.merchant_name or "unknown"
            by_merchant[merchant].append(sample)

        merchants = list(by_merchant.keys())
        if not merchants:
            return []

        samples_per_merchant = max(
            self._config.min_samples_per_merchant,
            target_count // len(merchants),
        )

        result = []
        remaining = target_count

        for merchant in merchants:
            merchant_samples = by_merchant[merchant]
            n_take = min(len(merchant_samples), samples_per_merchant, remaining)
            sampled = random.sample(merchant_samples, n_take)
            result.extend(sampled)
            remaining -= n_take
            if remaining <= 0:
                break

        if remaining > 0:
            all_remaining = []
            for merchant, merchant_samples in by_merchant.items():
                already_sampled = set(id(s) for s in result)
                not_sampled = [
                    s for s in merchant_samples if id(s) not in already_sampled
                ]
                all_remaining.extend(not_sampled)

            if all_remaining:
                extra = random.sample(all_remaining, min(len(all_remaining), remaining))
                result.extend(extra)

        return result

    def _random_sample(
        self,
        samples: List[TrainingSample],
        target_count: int,
    ) -> List[TrainingSample]:
        """Simple random sampling."""
        if len(samples) <= target_count:
            return list(samples)
        return random.sample(samples, target_count)

    def get_merchant_distribution(
        self, samples: List[TrainingSample]
    ) -> Dict[str, Dict[str, int]]:
        """Get sample distribution by merchant."""
        distribution: Dict[str, Dict[str, int]] = {}

        for sample in samples:
            merchant = sample.merchant_name or "unknown"
            if merchant not in distribution:
                distribution[merchant] = {"fraud": 0, "legit": 0}
            if sample.is_fraud:
                distribution[merchant]["fraud"] += 1
            else:
                distribution[merchant]["legit"] += 1

        return distribution

    def _apply_gmv_stratification(
        self,
        samples: List[TrainingSample],
        random_seed: Optional[int] = None,
    ) -> List[TrainingSample]:
        """Apply GMV bin stratification to samples."""
        try:
            from app.service.training.dataset.gmv_score_stratifier import (
                GMVScoreStratifier,
            )

            stratifier = GMVScoreStratifier()
            result = stratifier.stratify(
                samples,
                target_count=len(samples),
                gmv_field="total_gmv",
                random_seed=random_seed,
            )
            logger.info(f"GMV stratification applied: {len(result)} samples")
            return result
        except ImportError as e:
            logger.warning(f"GMV stratifier not available: {e}")
            return samples
        except Exception as e:
            logger.warning(f"GMV stratification failed: {e}")
            return samples

    def _apply_blindspot_oversampling(
        self,
        samples: List[TrainingSample],
        random_seed: Optional[int] = None,
    ) -> List[TrainingSample]:
        """Apply blindspot-aware oversampling to samples."""
        try:
            from app.service.training.dataset.blindspot_aware_sampler import (
                BlindspotAwareSampler,
            )

            sampler = BlindspotAwareSampler()
            result = sampler.sample_sync(
                samples,
                gmv_field="total_gmv",
                random_seed=random_seed,
            )
            logger.info(f"Blindspot oversampling applied: {len(result)} samples")
            return result
        except ImportError as e:
            logger.warning(f"Blindspot sampler not available: {e}")
            return samples
        except Exception as e:
            logger.warning(f"Blindspot oversampling failed: {e}")
            return samples
