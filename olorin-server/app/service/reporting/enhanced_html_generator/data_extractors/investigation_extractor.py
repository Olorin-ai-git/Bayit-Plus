#!/usr/bin/env python3
"""
Investigation data extraction module.

Handles extraction of raw data from investigation folder files.
"""

import json
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional

from ..data_models import ExtractedData
from ..utils import LogLineParser

logger = logging.getLogger(__name__)


class InvestigationDataExtractor:
    """Extracts raw data from investigation folder files."""

    def extract_investigation_data(self, folder_path: Path) -> ExtractedData:
        """
        Extract all data from investigation folder files.

        Args:
            folder_path: Path to investigation folder

        Returns:
            Dictionary containing extracted data from all files
        """
        data = ExtractedData(
            metadata={},
<<<<<<< HEAD
            autonomous_activities=[],
=======
            structured_activities=[],
>>>>>>> 001-modify-analyzer-method
            journey_tracking={},
            investigation_log=[],
            files_info={}
        )

        # Extract metadata
        self._extract_metadata(folder_path, data)

<<<<<<< HEAD
        # Extract autonomous activities (JSONL format)
=======
        # Extract structured activities (JSONL format)
>>>>>>> 001-modify-analyzer-method
        self._extract_activities(folder_path, data)

        # Extract journey tracking
        self._extract_journey_tracking(folder_path, data)

        # Extract investigation log (text format)
        self._extract_investigation_log(folder_path, data)

        # Get file information
        self._extract_file_info(folder_path, data)

        logger.info(f"Extracted data from {folder_path.name}: "
<<<<<<< HEAD
                   f"{len(data.autonomous_activities)} activities, "
=======
                   f"{len(data.structured_activities)} activities, "
>>>>>>> 001-modify-analyzer-method
                   f"{len(data.investigation_log)} log entries")

        return data

    def _extract_metadata(self, folder_path: Path, data: ExtractedData) -> None:
        """Extract metadata from metadata.json."""
        metadata_file = folder_path / "metadata.json"
        if metadata_file.exists():
            try:
                with open(metadata_file, 'r', encoding='utf-8') as f:
                    data.metadata = json.load(f)
            except Exception as e:
                logger.error(f"Failed to load metadata: {e}")

    def _extract_activities(self, folder_path: Path, data: ExtractedData) -> None:
<<<<<<< HEAD
        """Extract autonomous activities from JSONL file."""
        activities_file = folder_path / "autonomous_activities.jsonl"
=======
        """Extract structured activities from JSONL file."""
        activities_file = folder_path / "structured_activities.jsonl"
>>>>>>> 001-modify-analyzer-method
        if activities_file.exists():
            try:
                with open(activities_file, 'r', encoding='utf-8') as f:
                    for line_no, line in enumerate(f, 1):
                        line = line.strip()
                        if line:
                            try:
                                activity = json.loads(line)
<<<<<<< HEAD
                                data.autonomous_activities.append(activity)
                            except json.JSONDecodeError as e:
                                logger.warning(f"Invalid JSON on line {line_no} in {activities_file}: {e}")
            except Exception as e:
                logger.error(f"Failed to load autonomous activities: {e}")
=======
                                data.structured_activities.append(activity)
                            except json.JSONDecodeError as e:
                                logger.warning(f"Invalid JSON on line {line_no} in {activities_file}: {e}")
            except Exception as e:
                logger.error(f"Failed to load structured activities: {e}")
>>>>>>> 001-modify-analyzer-method

    def _extract_journey_tracking(self, folder_path: Path, data: ExtractedData) -> None:
        """Extract journey tracking from JSON file."""
        journey_file = folder_path / "journey_tracking.json"
        if journey_file.exists():
            try:
                with open(journey_file, 'r', encoding='utf-8') as f:
                    data.journey_tracking = json.load(f)
            except Exception as e:
                logger.error(f"Failed to load journey tracking: {e}")

    def _extract_investigation_log(self, folder_path: Path, data: ExtractedData) -> None:
        """Extract investigation log from text file."""
        log_file = folder_path / "investigation.log"
        if log_file.exists():
            try:
                with open(log_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line:
                            log_entry = LogLineParser.parse_log_line(line)
                            if log_entry:
                                data.investigation_log.append(log_entry)
            except Exception as e:
                logger.error(f"Failed to load investigation log: {e}")

    def _extract_file_info(self, folder_path: Path, data: ExtractedData) -> None:
        """Extract file information for all investigation files."""
<<<<<<< HEAD
        file_names = ['metadata.json', 'autonomous_activities.jsonl',
=======
        file_names = ['metadata.json', 'structured_activities.jsonl',
>>>>>>> 001-modify-analyzer-method
                     'journey_tracking.json', 'investigation.log']

        for file_name in file_names:
            file_path = folder_path / file_name
            if file_path.exists():
                stat = file_path.stat()
                data.files_info[file_name] = {
                    'size_bytes': stat.st_size,
                    'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    'exists': True
                }
            else:
                data.files_info[file_name] = {'exists': False}