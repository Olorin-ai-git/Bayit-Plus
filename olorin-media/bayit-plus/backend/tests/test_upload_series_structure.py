"""
Comprehensive test suite for directory structure detection and metadata extraction.

Tests the DirectoryStructureDetector class and extraction functions for all
supported directory structure types (Type A, B, C, D).
"""

import pytest
import tempfile
import os
from pathlib import Path
from unittest.mock import MagicMock, patch, AsyncMock

import sys
script_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, os.path.join(script_dir, 'scripts', 'backend'))

from upload_series import (
    DirectoryStructureDetector,
    StructureType,
    extract_series_metadata,
    extract_episode_info,
    _extract_type_a_metadata,
    _extract_type_b_metadata,
    _extract_type_c_metadata,
    _clean_series_name,
)


class TestStructureTypeEnum:
    """Test StructureType enum values and properties."""

    def test_structure_type_values_exist(self):
        """Verify all structure type values are defined."""
        assert StructureType.TYPE_A_LEGACY_SEASONS.value == "legacy_seasons"
        assert StructureType.TYPE_B_FLAT.value == "flat"
        assert StructureType.TYPE_C_EPISODE_GROUPED.value == "episode_grouped"
        assert StructureType.TYPE_D_MIXED.value == "mixed"

    def test_structure_type_enum_count(self):
        """Verify exactly 4 structure types are defined."""
        assert len(StructureType) == 4


class TestExtractEpisodeInfo:
    """Test extract_episode_info function with various filename formats."""

    def test_extract_s01e01_format(self):
        """Test S01E01 format extraction."""
        season, episode = extract_episode_info("Game.of.Thrones.S01E01.1080p.mkv")
        assert season == 1
        assert episode == 1

    def test_extract_uppercase_format(self):
        """Test uppercase S##E## format."""
        season, episode = extract_episode_info("Breaking.Bad.S05E16.mkv")
        assert season == 5
        assert episode == 16

    def test_extract_lowercase_format(self):
        """Test lowercase s##e## format."""
        season, episode = extract_episode_info("show.s02e05.mkv")
        assert season == 2
        assert episode == 5

    def test_extract_1x01_format(self):
        """Test 1x01 format extraction."""
        season, episode = extract_episode_info("Series.1x03.mkv")
        assert season == 1
        assert episode == 3

    def test_extract_season_episode_text_format(self):
        """Test 'Season X Episode Y' text format."""
        season, episode = extract_episode_info("Show_Season_3_Episode_7.mkv")
        assert season == 3
        assert episode == 7

    def test_extract_no_match_returns_none(self):
        """Test that no match returns None values."""
        season, episode = extract_episode_info("NoSeasonInfo.mkv")
        assert season is None
        assert episode is None

    def test_extract_double_digit_episodes(self):
        """Test extraction of double-digit season and episode."""
        season, episode = extract_episode_info("Series.S12E99.mkv")
        assert season == 12
        assert episode == 99


class TestDirectoryStructureDetector:
    """Test DirectoryStructureDetector class for all structure types."""

    def _create_file_structure(self, temp_dir, structure):
        """Helper to create directory structure for testing."""
        for path in structure:
            full_path = os.path.join(temp_dir, path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            Path(full_path).touch()

    def test_detect_type_a_legacy_seasons(self):
        """Test detection of Type A (Legacy Season) structure."""
        with tempfile.TemporaryDirectory() as temp_dir:
            structure = [
                "Game_of_Thrones/Season_1/S01E01.mkv",
                "Game_of_Thrones/Season_1/S01E02.mkv",
                "Game_of_Thrones/Season_2/S02E01.mkv",
            ]
            self._create_file_structure(temp_dir, structure)

            detector = DirectoryStructureDetector(temp_dir)
            analysis = detector.analyze_directory_structure()

            assert analysis.structure_type == StructureType.TYPE_A_LEGACY_SEASONS
            assert analysis.confidence == "high"
            assert "Game_of_Thrones" in analysis.series_boundaries

    def test_detect_type_b_flat(self):
        """Test detection of Type B (Flat) structure."""
        with tempfile.TemporaryDirectory() as temp_dir:
            structure = [
                "Breaking_Bad/S01E01.mkv",
                "Breaking_Bad/S01E02.mkv",
                "Breaking_Bad/S02E01.mkv",
            ]
            self._create_file_structure(temp_dir, structure)

            detector = DirectoryStructureDetector(temp_dir)
            analysis = detector.analyze_directory_structure()

            assert analysis.structure_type == StructureType.TYPE_B_FLAT
            assert analysis.confidence == "high"
            assert "Breaking_Bad" in analysis.series_boundaries

    def test_detect_type_c_episode_grouped(self):
        """Test detection of Type C (Episode-grouped) structure."""
        with tempfile.TemporaryDirectory() as temp_dir:
            structure = [
                "Stranger_Things/S01E01-Pilot/video.mkv",
                "Stranger_Things/S01E02-The_Vanishing/video.mkv",
                "Stranger_Things/S02E01-Chapter_One/video.mkv",
            ]
            self._create_file_structure(temp_dir, structure)

            detector = DirectoryStructureDetector(temp_dir)
            analysis = detector.analyze_directory_structure()

            assert analysis.structure_type == StructureType.TYPE_C_EPISODE_GROUPED
            assert analysis.confidence == "high"
            assert "Stranger_Things" in analysis.series_boundaries

    def test_detect_type_d_mixed_structure(self):
        """Test detection of Type D (Mixed) structure."""
        with tempfile.TemporaryDirectory() as temp_dir:
            structure = [
                "Series1/Season_1/S01E01.mkv",
                "Series2/S01E01.mkv",
                "Series3/S01E01-Episode/video.mkv",
            ]
            self._create_file_structure(temp_dir, structure)

            detector = DirectoryStructureDetector(temp_dir)
            analysis = detector.analyze_directory_structure()

            assert analysis.structure_type == StructureType.TYPE_D_MIXED
            assert analysis.confidence == "low"

    def test_detect_empty_directory(self):
        """Test detection with empty directory."""
        with tempfile.TemporaryDirectory() as temp_dir:
            detector = DirectoryStructureDetector(temp_dir)
            analysis = detector.analyze_directory_structure()

            assert analysis.structure_type == StructureType.TYPE_D_MIXED
            assert analysis.confidence == "low"
            assert analysis.total_files == 0
            assert "No video files found" in analysis.detection_notes

    def test_sample_size_respected(self):
        """Test that detector only analyzes sample_size files."""
        with tempfile.TemporaryDirectory() as temp_dir:
            for i in range(20):
                full_path = os.path.join(temp_dir, f"Series/Season_1/S01E{i+1:02d}.mkv")
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                Path(full_path).touch()

            detector = DirectoryStructureDetector(temp_dir)
            analysis = detector.analyze_directory_structure()

            assert analysis.sample_files_analyzed == 10
            assert analysis.total_files == 20

    def test_is_season_directory_patterns(self):
        """Test season directory pattern matching."""
        detector = DirectoryStructureDetector(".")

        assert detector._is_season_directory("Season 1") is True
        assert detector._is_season_directory("Season_1") is True
        assert detector._is_season_directory("Season.1") is True
        assert detector._is_season_directory("season 1") is True
        assert detector._is_season_directory("S1") is True
        assert detector._is_season_directory("S01") is True
        assert detector._is_season_directory("NotASeason") is False

    def test_is_episode_grouped_directory_patterns(self):
        """Test episode-grouped directory pattern matching."""
        detector = DirectoryStructureDetector(".")

        assert detector._is_episode_grouped_directory("S01E01") is True
        assert detector._is_episode_grouped_directory("s01e01") is True
        assert detector._is_episode_grouped_directory("S01E01-Title") is True
        assert detector._is_episode_grouped_directory("S01E01_Title") is True
        assert detector._is_episode_grouped_directory("NotEpisode") is False

    def test_get_relative_path(self):
        """Test relative path calculation."""
        with tempfile.TemporaryDirectory() as temp_dir:
            detector = DirectoryStructureDetector(temp_dir)
            file_path = os.path.join(temp_dir, "Series/S01E01.mkv")
            rel_path = detector._get_relative_path(file_path)

            assert rel_path == os.path.join("Series", "S01E01.mkv")

    def test_calculate_confidence_high(self):
        """Test high confidence calculation."""
        with tempfile.TemporaryDirectory() as temp_dir:
            structure = [
                "Series/Season_1/S01E01.mkv",
                "Series/Season_1/S01E02.mkv",
                "Series/Season_1/S01E03.mkv",
            ]
            self._create_file_structure(temp_dir, structure)

            detector = DirectoryStructureDetector(temp_dir)
            sample_files = [os.path.join(temp_dir, p) for p in structure]

            confidence = detector._calculate_confidence(
                sample_files,
                StructureType.TYPE_A_LEGACY_SEASONS
            )
            assert confidence == "high"

    def test_detect_series_boundaries(self):
        """Test series boundary detection."""
        with tempfile.TemporaryDirectory() as temp_dir:
            structure = [
                "GameOfThrones/Season_1/S01E01.mkv",
                "GameOfThrones/Season_1/S01E02.mkv",
                "BreakingBad/Season_1/S01E01.mkv",
            ]
            self._create_file_structure(temp_dir, structure)

            detector = DirectoryStructureDetector(temp_dir)
            sample_files = [os.path.join(temp_dir, p) for p in structure]
            boundaries = detector._detect_series_boundaries(
                sample_files,
                StructureType.TYPE_A_LEGACY_SEASONS
            )

            assert "GameOfThrones" in boundaries
            assert "BreakingBad" in boundaries
            assert len(boundaries["GameOfThrones"]) == 2
            assert len(boundaries["BreakingBad"]) == 1


class TestExtractTypeAMetadata:
    """Test metadata extraction for Type A (Legacy Season) structure."""

    def test_extract_type_a_from_directory(self):
        """Test extracting season from directory."""
        parts = ("GameOfThrones", "Season 1", "S01E01.mkv")
        path_obj = Path("S01E01.mkv")

        metadata = _extract_type_a_metadata(parts, path_obj)

        assert metadata["season"] == 1
        assert metadata["episode"] == 1
        assert metadata["extraction_source"] == "type_a_legacy"

    def test_extract_type_a_season_variations(self):
        """Test extracting season with different naming patterns."""
        path_obj = Path("S01E01.mkv")

        variations = [
            ("Series", "Season_1", "S01E01.mkv"),
            ("Series", "Season.1", "S01E01.mkv"),
            ("Series", "S1", "S01E01.mkv"),
        ]

        for parts in variations:
            metadata = _extract_type_a_metadata(parts, path_obj)
            assert metadata["season"] == 1


class TestExtractTypeBMetadata:
    """Test metadata extraction for Type B (Flat) structure."""

    def test_extract_type_b_from_filename(self):
        """Test extracting season/episode from filename in flat structure."""
        path_obj = Path("Breaking.Bad.S05E16.mkv")

        metadata = _extract_type_b_metadata(path_obj)

        assert metadata["season"] == 5
        assert metadata["episode"] == 16
        assert metadata["extraction_source"] == "type_b_flat"

    def test_extract_type_b_no_episode_data(self):
        """Test handling when no episode data in filename."""
        path_obj = Path("NoEpisodeInfo.mkv")

        metadata = _extract_type_b_metadata(path_obj)

        assert metadata["season"] is None
        assert metadata["episode"] is None


class TestExtractTypeCMetadata:
    """Test metadata extraction for Type C (Episode-grouped) structure."""

    def test_extract_type_c_from_directory(self):
        """Test extracting season/episode from episode-grouped directory."""
        parts = ("StrangerThings", "S01E02-Episode_Title", "video.mkv")
        path_obj = Path("video.mkv")

        metadata = _extract_type_c_metadata(parts, path_obj)

        assert metadata["season"] == 1
        assert metadata["episode"] == 2
        assert metadata["extraction_source"] == "type_c_episode_grouped"

    def test_extract_type_c_lowercase(self):
        """Test extracting from lowercase episode directory."""
        parts = ("Series", "s05e08-title", "video.mkv")
        path_obj = Path("video.mkv")

        metadata = _extract_type_c_metadata(parts, path_obj)

        assert metadata["season"] == 5
        assert metadata["episode"] == 8


class TestCleanSeriesName:
    """Test series name cleaning function."""

    def test_clean_dots_to_spaces(self):
        """Test replacing dots with spaces."""
        metadata = {"series_name": "Game.of.Thrones"}
        _clean_series_name(metadata)
        assert metadata["series_name"] == "Game of Thrones"

    def test_clean_underscores_to_spaces(self):
        """Test replacing underscores with spaces."""
        metadata = {"series_name": "Breaking_Bad"}
        _clean_series_name(metadata)
        assert metadata["series_name"] == "Breaking Bad"

    def test_clean_multiple_spaces(self):
        """Test collapsing multiple spaces."""
        metadata = {"series_name": "Game  of   Thrones"}
        _clean_series_name(metadata)
        assert metadata["series_name"] == "Game of Thrones"

    def test_clean_mixed_separators(self):
        """Test cleaning mixed separators."""
        metadata = {"series_name": "Game_of.Thrones"}
        _clean_series_name(metadata)
        assert metadata["series_name"] == "Game of Thrones"


class TestExtractSeriesMetadata:
    """Test main extract_series_metadata function with all structure types."""

    def test_extract_type_a_metadata(self):
        """Test extracting metadata with Type A structure."""
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = os.path.join(temp_dir, "Game of Thrones/Season 1/S01E01.mkv")
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            Path(file_path).touch()

            metadata = extract_series_metadata(
                file_path,
                temp_dir,
                StructureType.TYPE_A_LEGACY_SEASONS
            )

            assert metadata["series_name"] == "Game of Thrones"
            assert metadata["season"] == 1
            assert metadata["episode"] == 1
            assert metadata["extraction_source"] == "type_a_legacy"

    def test_extract_type_b_metadata(self):
        """Test extracting metadata with Type B structure."""
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = os.path.join(temp_dir, "Breaking Bad/S05E16.mkv")
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            Path(file_path).touch()

            metadata = extract_series_metadata(
                file_path,
                temp_dir,
                StructureType.TYPE_B_FLAT
            )

            assert metadata["series_name"] == "Breaking Bad"
            assert metadata["season"] == 5
            assert metadata["episode"] == 16
            assert metadata["extraction_source"] == "type_b_flat"

    def test_extract_type_c_metadata(self):
        """Test extracting metadata with Type C structure."""
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = os.path.join(temp_dir, "Stranger Things/S01E02-Title/video.mkv")
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            Path(file_path).touch()

            metadata = extract_series_metadata(
                file_path,
                temp_dir,
                StructureType.TYPE_C_EPISODE_GROUPED
            )

            assert metadata["series_name"] == "Stranger Things"
            assert metadata["season"] == 1
            assert metadata["episode"] == 2
            assert metadata["extraction_source"] == "type_c_episode_grouped"

    def test_extract_with_insufficient_parts(self):
        """Test handling of paths with insufficient parts."""
        metadata = extract_series_metadata(
            "file.mkv",
            "/root",
            StructureType.TYPE_A_LEGACY_SEASONS
        )

        assert metadata["series_name"] is None
        assert metadata["season"] is None
        assert metadata["episode"] is None

    def test_extract_preserves_filename(self):
        """Test that filename is always preserved."""
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = os.path.join(temp_dir, "Series/S01E01.mkv")
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            Path(file_path).touch()

            metadata = extract_series_metadata(
                file_path,
                temp_dir,
                StructureType.TYPE_B_FLAT
            )

            assert metadata["filename"] == "S01E01.mkv"


class TestIntegration:
    """Integration tests for full workflow with all structure types."""

    def test_full_workflow_type_a(self):
        """Test complete workflow with Type A structure."""
        with tempfile.TemporaryDirectory() as temp_dir:
            structure = [
                "Game of Thrones/Season 1/S01E01.mkv",
                "Game of Thrones/Season 1/S01E02.mkv",
                "Breaking Bad/Season 5/S05E15.mkv",
            ]
            for path in structure:
                full_path = os.path.join(temp_dir, path)
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                Path(full_path).touch()

            detector = DirectoryStructureDetector(temp_dir)
            analysis = detector.analyze_directory_structure()

            assert analysis.structure_type == StructureType.TYPE_A_LEGACY_SEASONS
            assert len(analysis.series_boundaries) == 2

    def test_full_workflow_type_b(self):
        """Test complete workflow with Type B structure."""
        with tempfile.TemporaryDirectory() as temp_dir:
            structure = [
                "The Office/S01E01.mkv",
                "The Office/S01E02.mkv",
            ]
            for path in structure:
                full_path = os.path.join(temp_dir, path)
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                Path(full_path).touch()

            detector = DirectoryStructureDetector(temp_dir)
            analysis = detector.analyze_directory_structure()

            assert analysis.structure_type == StructureType.TYPE_B_FLAT

    def test_backward_compatibility(self):
        """Test that legacy Type A structure still works with default parameters."""
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = os.path.join(temp_dir, "Series/Season 1/S01E01.mkv")
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            Path(file_path).touch()

            metadata = extract_series_metadata(file_path, temp_dir)

            assert metadata["season"] == 1
            assert metadata["episode"] == 1
