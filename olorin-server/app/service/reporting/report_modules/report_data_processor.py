"""
Report Data Processing Module

Extracted data processing methods from comprehensive_investigation_report.py
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


class ReportDataProcessor:
    """Processes investigation folder files and extracts data"""

    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)

    def process_investigation_folder(self, folder_path: Path) -> Dict[str, Any]:
        """Process all files in investigation folder."""
        self.logger.info(f"📁 Processing investigation folder: {folder_path}")

        data = {
            "folder_path": folder_path,
            "folder_name": folder_path.name,
            "metadata": {},
            "summary": None,
            "agents": {},
            "tools": {},
            "journey": {},
            "thought_processes": [],
            "activities": [],
            "performance": {},
            "validation": {},
            "test_results": {},
            "server_logs": {},
            "files_processed": 0,
            "processing_errors": [],
        }

        # Process each file type
        for file_path in folder_path.rglob("*"):
            if file_path.is_file():
                try:
                    self.process_file(file_path, data)
                    data["files_processed"] += 1
                except Exception as e:
                    error_msg = f"Error processing {file_path.name}: {str(e)}"
                    data["processing_errors"].append(error_msg)
                    self.logger.warning(error_msg)

        self.logger.info(
            f"📊 Processed {data['files_processed']} files with {len(data['processing_errors'])} errors"
        )
        return data

    def process_file(self, file_path: Path, data: Dict[str, Any]) -> None:
        """Process individual file based on its type."""
        filename = file_path.name.lower()

        if filename == "metadata.json":
            data["metadata"] = self.load_json_file(file_path)

        elif filename == "summary.json":
            data["summary_raw"] = self.load_json_file(file_path)

        elif filename.startswith("investigation_result"):
            data["agents"] = self.load_json_file(file_path)

        elif filename == "performance_metrics.json":
            data["performance"] = self.load_json_file(file_path)

        elif filename == "validation_results.json":
            data["validation"] = self.load_json_file(file_path)

        elif filename == "merchant_validation_results.json":
            merchant_validation = self.load_json_file(file_path)
            if "validation" not in data:
                data["validation"] = {}
            data["validation"]["merchant"] = merchant_validation

        elif filename == "journey_tracking.json":
            data["journey"] = self.load_json_file(file_path)

        elif filename.startswith("thought_process_"):
            thought_data = self.load_json_file(file_path)
            if thought_data:
                data["thought_processes"].append(thought_data)

        elif filename == "structured_activities.jsonl":
            data["activities"] = self.load_jsonl_file(file_path)

        elif filename.startswith("unified_test_report") and filename.endswith(".json"):
            data["test_results"] = self.load_json_file(file_path)

        elif filename == "server_logs" or filename == "server_logs.json":
            data["server_logs"] = self.load_json_file(file_path)

        elif filename == "server_logs.txt" or filename.endswith("_logs.txt"):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    log_content = f.read()
                    data["server_logs"] = {
                        "raw_logs": log_content,
                        "log_count": len(log_content.split("\n")),
                    }
            except Exception as e:
                self.logger.warning(f"Failed to load text log file {file_path}: {e}")
                data["server_logs"] = {}

    def load_json_file(self, file_path: Path) -> Dict[str, Any]:
        """Load JSON file safely."""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            self.logger.warning(f"Failed to load JSON file {file_path}: {e}")
            return {}

    def load_jsonl_file(self, file_path: Path) -> List[Dict[str, Any]]:
        """Load JSONL file safely."""
        try:
            data = []
            with open(file_path, "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip():
                        data.append(json.loads(line))
            return data
        except Exception as e:
            self.logger.warning(f"Failed to load JSONL file {file_path}: {e}")
            return []
