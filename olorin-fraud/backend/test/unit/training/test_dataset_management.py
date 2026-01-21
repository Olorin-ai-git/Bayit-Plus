"""
Unit tests for Dataset Management Module
Feature: 026-llm-training-pipeline
"""

from datetime import datetime

import pytest

from app.service.training.dataset.dataset_models import (
    DatasetMetadata,
    DatasetSplit,
    SamplingConfig,
)
from app.service.training.dataset.dataset_splitter import DatasetSplitter
from app.service.training.dataset.stratified_sampler import StratifiedSampler
from app.service.training.training_models import TrainingSample


def create_test_samples(n_fraud: int, n_legit: int) -> list:
    """Helper to create test samples."""
    samples = []
    for i in range(n_fraud):
        samples.append(
            TrainingSample(
                entity_type="EMAIL",
                entity_value=f"fraud{i}@test.com",
                is_fraud=True,
                merchant_name=f"merchant_{i % 3}",
                features={"tx_count": i * 10},
            )
        )
    for i in range(n_legit):
        samples.append(
            TrainingSample(
                entity_type="EMAIL",
                entity_value=f"legit{i}@test.com",
                is_fraud=False,
                merchant_name=f"merchant_{i % 5}",
                features={"tx_count": i * 5},
            )
        )
    return samples


class TestSamplingConfig:
    """Tests for sampling configuration."""

    def test_sampling_config_creation(self):
        """Test creating sampling config."""
        config = SamplingConfig(
            target_fraud_entities=500,
            legit_multiplier=20,
            stratify_by_merchant=True,
        )
        assert config.target_fraud_entities == 500
        assert config.legit_multiplier == 20

    def test_sampling_config_defaults(self):
        """Test sampling config default values."""
        config = SamplingConfig()
        assert config.target_fraud_entities > 0
        assert config.legit_multiplier > 0


class TestDatasetSplit:
    """Tests for dataset split dataclass."""

    def test_dataset_split_creation(self):
        """Test creating dataset split."""
        train = create_test_samples(10, 50)
        val = create_test_samples(2, 10)
        test = create_test_samples(3, 15)

        split = DatasetSplit(
            train=train,
            validation=val,
            test=test,
        )
        assert split.get_train_count() == 60
        assert split.get_validation_count() == 12
        assert split.get_test_count() == 18

    def test_dataset_split_fraud_counts(self):
        """Test getting fraud counts from split."""
        train = create_test_samples(10, 50)
        split = DatasetSplit(
            train=train,
            validation=[],
            test=[],
        )
        fraud_counts = split.get_fraud_counts()
        assert fraud_counts["train"] == 10

    def test_dataset_split_total_count(self):
        """Test getting total count."""
        train = create_test_samples(10, 50)
        val = create_test_samples(2, 10)
        split = DatasetSplit(train=train, validation=val, test=[])
        assert split.get_total_count() == 72


class TestDatasetMetadata:
    """Tests for dataset metadata."""

    def test_dataset_metadata_creation(self):
        """Test creating dataset metadata."""
        metadata = DatasetMetadata(
            version="v1.0",
            created_at=datetime.utcnow(),
            total_samples=1000,
            fraud_samples=50,
            legit_samples=950,
            train_samples=700,
            validation_samples=150,
            test_samples=150,
        )
        assert metadata.version == "v1.0"
        assert metadata.get_fraud_ratio() == 50 / 1000

    def test_dataset_metadata_to_dict(self):
        """Test dataset metadata to dict."""
        metadata = DatasetMetadata(
            version="v2.0",
            created_at=datetime.utcnow(),
            total_samples=500,
            fraud_samples=25,
            legit_samples=475,
            train_samples=350,
            validation_samples=75,
            test_samples=75,
        )
        d = metadata.to_dict()
        assert d["version"] == "v2.0"
        assert d["total_samples"] == 500


class TestStratifiedSampler:
    """Tests for stratified sampler."""

    def test_stratified_sampler_init(self):
        """Test stratified sampler initialization."""
        config = SamplingConfig(
            target_fraud_entities=50,
            legit_multiplier=10,
            stratify_by_merchant=True,
        )
        sampler = StratifiedSampler(config)
        assert sampler is not None

    def test_stratified_sampler_sample(self):
        """Test stratified sampling."""
        config = SamplingConfig(
            target_fraud_entities=50,
            legit_multiplier=10,
            stratify_by_merchant=True,
        )
        sampler = StratifiedSampler(config)
        samples = create_test_samples(100, 500)

        sampled = sampler.sample(samples)
        assert len(sampled) > 0

        fraud_count = sum(1 for s in sampled if s.is_fraud)
        assert fraud_count <= 100

    def test_stratified_sampler_preserves_distribution(self):
        """Test that stratified sampling preserves merchant distribution."""
        config = SamplingConfig(
            target_fraud_entities=15,
            legit_multiplier=5,
            stratify_by_merchant=True,
            min_samples_per_merchant=2,
        )
        sampler = StratifiedSampler(config)
        samples = create_test_samples(30, 150)

        sampled = sampler.sample(samples)
        merchants = set(s.merchant_name for s in sampled if s.merchant_name)
        assert len(merchants) >= 2


class TestDatasetSplitter:
    """Tests for dataset splitter."""

    def test_dataset_splitter_init(self):
        """Test dataset splitter initialization."""
        splitter = DatasetSplitter(
            train_ratio=0.70,
            validation_ratio=0.15,
            test_ratio=0.15,
        )
        assert splitter is not None

    def test_dataset_splitter_init_invalid_ratios(self):
        """Test dataset splitter rejects invalid ratios."""
        with pytest.raises(ValueError):
            DatasetSplitter(
                train_ratio=0.5,
                validation_ratio=0.3,
                test_ratio=0.3,  # Sum > 1.0
            )

    def test_dataset_splitter_split_random(self):
        """Test random splitting dataset."""
        splitter = DatasetSplitter(
            train_ratio=0.70,
            validation_ratio=0.15,
            test_ratio=0.15,
        )
        samples = create_test_samples(50, 250)

        split = splitter.split_random(samples)
        assert isinstance(split, DatasetSplit)

        total = split.get_total_count()
        assert total == len(samples)

    def test_dataset_splitter_ratios(self):
        """Test split ratios are respected."""
        splitter = DatasetSplitter(
            train_ratio=0.70,
            validation_ratio=0.15,
            test_ratio=0.15,
        )
        samples = create_test_samples(100, 400)

        split = splitter.split_random(samples)
        total = len(samples)

        train_ratio = split.get_train_count() / total
        val_ratio = split.get_validation_count() / total
        test_ratio = split.get_test_count() / total

        assert 0.5 <= train_ratio <= 0.8
        assert 0.05 <= val_ratio <= 0.25
        assert 0.05 <= test_ratio <= 0.25
