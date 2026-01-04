"""
Dataset Management Module
Feature: 026-llm-training-pipeline

Provides dataset sampling, splitting, and management for training.
Includes blindspot-aware stratification for improved model coverage.
"""

from app.service.training.dataset.blindspot_aware_sampler import BlindspotAwareSampler
from app.service.training.dataset.dataset_manager import (
    DatasetManager,
    get_dataset_manager,
)
from app.service.training.dataset.dataset_models import (
    BlindspotSamplingConfig,
    DatasetMetadata,
    DatasetSplit,
    SamplingConfig,
)
from app.service.training.dataset.dataset_splitter import DatasetSplitter
from app.service.training.dataset.gmv_score_stratifier import GMVScoreStratifier
from app.service.training.dataset.stratified_sampler import StratifiedSampler

__all__ = [
    "DatasetManager",
    "get_dataset_manager",
    "DatasetSplit",
    "DatasetMetadata",
    "SamplingConfig",
    "BlindspotSamplingConfig",
    "DatasetSplitter",
    "StratifiedSampler",
    "GMVScoreStratifier",
    "BlindspotAwareSampler",
]
