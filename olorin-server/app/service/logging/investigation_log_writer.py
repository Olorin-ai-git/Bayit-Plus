"""
Investigation Log Writer

Handles writing investigation logs to files in JSON format.
"""

import json
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime


class InvestigationLogWriter:
    """Writes investigation logs to file"""

    def __init__(self, investigation_id: str, output_dir: Optional[str] = None):
        """
        Initialize log writer.

        Args:
            investigation_id: Investigation identifier
            output_dir: Directory for log files
        """
        self.investigation_id = investigation_id
        self.output_dir = Path(output_dir or "./investigation_logs")
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.log_file = self.output_dir / f"investigation_{investigation_id}.log"
        self.json_file = self.output_dir / f"investigation_{investigation_id}.json"

        self._init_log_file()

    def _init_log_file(self) -> None:
        """Initialize log file with header"""
        header = f"""
{'='*100}
INVESTIGATION INSTRUMENTATION LOG
Investigation ID: {self.investigation_id}
Start Time: {datetime.utcnow().isoformat()}
{'='*100}

Format: Each entry is a JSON line for easy parsing and analysis.
{'='*100}
"""
        with open(self.log_file, 'w') as f:
            f.write(header)

    def write_entry(self, entry_type: str, data: Dict[str, Any]) -> None:
        """Write entry to log file"""
        entry = {
            "type": entry_type,
            "data": data
        }

        try:
            with open(self.log_file, 'a') as f:
                f.write(json.dumps(entry) + "\n")
        except Exception as e:
            print(f"Error writing to log file: {e}")

    def write_summary(self, summary: Dict[str, Any]) -> None:
        """Write JSON summary file"""
        with open(self.json_file, 'w') as f:
            json.dump(summary, f, indent=2)

    def append_to_log(self, text: str) -> None:
        """Append text to log file"""
        try:
            with open(self.log_file, 'a') as f:
                f.write(text)
        except Exception as e:
            print(f"Error appending to log file: {e}")

    def get_log_file_path(self) -> str:
        """Get path to text log file"""
        return str(self.log_file)

    def get_json_file_path(self) -> str:
        """Get path to JSON log file"""
        return str(self.json_file)
