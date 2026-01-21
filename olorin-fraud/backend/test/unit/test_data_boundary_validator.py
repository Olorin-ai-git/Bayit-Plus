"""
Unit tests for Data Boundary Validator Module
Feature: Training Data Separation & Positive GMV
"""

import os
from datetime import date
from unittest.mock import patch

import pytest


class TestDataBoundaryValidatorConfig:
    """Tests for boundary configuration loading."""

    def test_load_boundary_config_defaults(self):
        """Test loading config with default values."""
        with patch.dict(os.environ, {}, clear=True):
            from app.service.training.data_boundary_validator import (
                load_boundary_config,
                clear_boundary_config_cache,
            )

            clear_boundary_config_cache()
            config = load_boundary_config()

            assert config is not None
            assert config.training_observation_end_date == date(2024, 6, 30)
            assert config.detection_window_start == date(2024, 7, 1)
            assert config.enforce_boundary_check is True
            assert config.min_gap_days == 1

    def test_load_boundary_config_from_env(self):
        """Test loading config from environment variables."""
        with patch.dict(os.environ, {
            "TRAINING_OBSERVATION_END_DATE": "2025-01-15",
            "DETECTION_WINDOW_START": "2025-01-20",
            "ENFORCE_DATA_BOUNDARY_CHECK": "false",
            "DATA_BOUNDARY_MIN_GAP_DAYS": "5",
        }):
            from app.service.training.data_boundary_validator import (
                load_boundary_config,
                clear_boundary_config_cache,
            )

            clear_boundary_config_cache()
            config = load_boundary_config()

            assert config.training_observation_end_date == date(2025, 1, 15)
            assert config.detection_window_start == date(2025, 1, 20)
            assert config.enforce_boundary_check is False
            assert config.min_gap_days == 5

    def test_get_boundary_config_singleton(self):
        """Test get_boundary_config returns cached instance."""
        from app.service.training.data_boundary_validator import (
            get_boundary_config,
            clear_boundary_config_cache,
        )

        clear_boundary_config_cache()
        config1 = get_boundary_config()
        config2 = get_boundary_config()
        assert config1 is config2


class TestValidateNoOverlap:
    """Tests for boundary overlap validation."""

    def test_valid_non_overlapping_boundaries(self):
        """Test validation passes for non-overlapping boundaries."""
        from app.service.training.data_boundary_validator import validate_no_overlap

        result = validate_no_overlap(
            training_end=date(2024, 6, 30),
            detection_start=date(2024, 7, 1),
            min_gap_days=1,
        )

        assert result.is_valid is True
        assert result.gap_days == 1

    def test_invalid_overlapping_boundaries(self):
        """Test validation fails for overlapping boundaries."""
        from app.service.training.data_boundary_validator import validate_no_overlap

        result = validate_no_overlap(
            training_end=date(2024, 7, 15),
            detection_start=date(2024, 7, 1),
            min_gap_days=1,
        )

        assert result.is_valid is False
        assert result.gap_days < 1

    def test_same_day_boundary_fails(self):
        """Test validation fails when boundaries are same day."""
        from app.service.training.data_boundary_validator import validate_no_overlap

        result = validate_no_overlap(
            training_end=date(2024, 7, 1),
            detection_start=date(2024, 7, 1),
            min_gap_days=1,
        )

        assert result.is_valid is False

    def test_large_gap_passes(self):
        """Test validation passes with large gap."""
        from app.service.training.data_boundary_validator import validate_no_overlap

        result = validate_no_overlap(
            training_end=date(2024, 6, 30),
            detection_start=date(2024, 12, 1),
            min_gap_days=1,
        )

        assert result.is_valid is True
        assert result.gap_days > 100


class TestValidateEntityDate:
    """Tests for entity date validation."""

    def test_entity_date_after_training_passes(self):
        """Test entity date after training period passes."""
        with patch.dict(os.environ, {
            "TRAINING_OBSERVATION_END_DATE": "2024-06-30",
            "ENFORCE_DATA_BOUNDARY_CHECK": "false",
        }):
            from app.service.training.data_boundary_validator import (
                validate_entity_date,
                clear_boundary_config_cache,
            )

            clear_boundary_config_cache()
            is_valid, message = validate_entity_date(date(2024, 7, 15))
            assert is_valid is True

    def test_entity_date_during_training_fails(self):
        """Test entity date during training period fails."""
        with patch.dict(os.environ, {
            "TRAINING_OBSERVATION_END_DATE": "2024-06-30",
            "ENFORCE_DATA_BOUNDARY_CHECK": "false",
        }):
            from app.service.training.data_boundary_validator import (
                validate_entity_date,
                clear_boundary_config_cache,
            )

            clear_boundary_config_cache()
            is_valid, message = validate_entity_date(date(2024, 5, 15))
            assert is_valid is False

    def test_entity_date_enforce_mode_raises_error(self):
        """Test enforce mode raises exception on violation."""
        with patch.dict(os.environ, {
            "TRAINING_OBSERVATION_END_DATE": "2024-06-30",
            "ENFORCE_DATA_BOUNDARY_CHECK": "true",
        }):
            from app.service.training.data_boundary_validator import (
                validate_entity_date,
                DataBoundaryViolationError,
                clear_boundary_config_cache,
            )

            clear_boundary_config_cache()
            with pytest.raises(DataBoundaryViolationError):
                validate_entity_date(date(2024, 5, 15))


class TestGetSafeDetectionStartDate:
    """Tests for safe detection start date calculation."""

    def test_returns_day_after_training_end(self):
        """Test returns day after training observation end."""
        with patch.dict(os.environ, {
            "TRAINING_OBSERVATION_END_DATE": "2024-06-30",
        }):
            from app.service.training.data_boundary_validator import (
                get_safe_detection_start_date,
                clear_boundary_config_cache,
            )

            clear_boundary_config_cache()
            safe_date = get_safe_detection_start_date()
            assert safe_date == date(2024, 7, 1)


class TestValidateDateRange:
    """Tests for date range validation."""

    def test_valid_date_range(self):
        """Test valid date range passes validation."""
        with patch.dict(os.environ, {
            "TRAINING_OBSERVATION_END_DATE": "2024-06-30",
            "ENFORCE_DATA_BOUNDARY_CHECK": "false",
        }):
            from app.service.training.data_boundary_validator import (
                validate_date_range,
                clear_boundary_config_cache,
            )

            clear_boundary_config_cache()
            is_valid, message = validate_date_range(
                start_date=date(2024, 7, 1),
                end_date=date(2024, 7, 31),
            )
            assert is_valid is True

    def test_invalid_date_range_overlapping_training(self):
        """Test date range overlapping training fails."""
        with patch.dict(os.environ, {
            "TRAINING_OBSERVATION_END_DATE": "2024-06-30",
            "ENFORCE_DATA_BOUNDARY_CHECK": "false",
        }):
            from app.service.training.data_boundary_validator import (
                validate_date_range,
                clear_boundary_config_cache,
            )

            clear_boundary_config_cache()
            is_valid, message = validate_date_range(
                start_date=date(2024, 6, 1),
                end_date=date(2024, 7, 31),
            )
            assert is_valid is False


class TestValidateConfigurationBoundaries:
    """Tests for configuration boundary validation at startup."""

    def test_valid_configuration(self):
        """Test valid configuration passes startup validation."""
        with patch.dict(os.environ, {
            "TRAINING_OBSERVATION_END_DATE": "2024-06-30",
            "DETECTION_WINDOW_START": "2024-07-01",
        }):
            from app.service.training.data_boundary_validator import (
                validate_configuration_boundaries,
                clear_boundary_config_cache,
            )

            clear_boundary_config_cache()
            result = validate_configuration_boundaries()
            assert result.is_valid is True

    def test_invalid_configuration_overlapping(self):
        """Test invalid configuration fails at config load time."""
        from pydantic import ValidationError

        with patch.dict(os.environ, {
            "TRAINING_OBSERVATION_END_DATE": "2024-07-15",
            "DETECTION_WINDOW_START": "2024-07-01",
        }):
            from app.service.training.data_boundary_validator import (
                load_boundary_config,
                clear_boundary_config_cache,
            )

            clear_boundary_config_cache()
            # Config validation should raise error for overlapping boundaries
            with pytest.raises(ValidationError):
                load_boundary_config()
