"""
Investigation Folder Manager

Manages unified folder structure for investigation logs and results.
Creates folders with format: {MODE}_{INVESTIGATION_ID}_{TIMESTAMP}/

Example: LIVE_unified_test_account_takeover_1757296960_20250907_220236/
"""

import os
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List
from enum import Enum
from dataclasses import dataclass, asdict

class InvestigationMode(Enum):
    LIVE = "LIVE"
    MOCK = "MOCK" 
    DEMO = "DEMO"

@dataclass
class InvestigationMetadata:
    """Metadata for investigation folder"""
    investigation_id: str
    mode: InvestigationMode
    created_at: str
    scenario: str
    folder_path: str
    status: str = "initialized"
    config: Dict[str, Any] = None
    
    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data['mode'] = data['mode'].value if isinstance(data['mode'], InvestigationMode) else data['mode']
        return data

class InvestigationFolderManager:
    """
    Manages unified investigation folder structure.
    
    Creates and manages investigation folders with consistent naming:
    {MODE}_{INVESTIGATION_ID}_{TIMESTAMP}/
    """
    
    def __init__(self, base_logs_dir: Optional[Path] = None):
        """
        Initialize investigation folder manager.
        
        Args:
            base_logs_dir: Base directory for investigation logs. 
                         Defaults to olorin-server/logs/investigations/
        """
        self.base_logs_dir = base_logs_dir or Path("logs/investigations")
        self.base_logs_dir.mkdir(parents=True, exist_ok=True)
        
        # Track active investigations
        self._active_investigations: Dict[str, InvestigationMetadata] = {}
    
    def create_investigation_folder(
        self,
        investigation_id: str,
        mode: InvestigationMode,
        scenario: str = "",
        config: Dict[str, Any] = None,
        custom_timestamp: Optional[str] = None
    ) -> Tuple[Path, InvestigationMetadata]:
        """
        Create unified investigation folder with standardized structure.
        
        Args:
            investigation_id: Unique investigation identifier
            mode: Investigation mode (LIVE, MOCK, DEMO)
            scenario: Investigation scenario name
            config: Investigation configuration data
            custom_timestamp: Custom timestamp (for testing), otherwise uses current time
            
        Returns:
            Tuple of (folder_path, metadata)
        """
        # Generate timestamp
        if custom_timestamp:
            timestamp = custom_timestamp
        else:
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        
        # Create folder name: {MODE}_{INVESTIGATION_ID}_{TIMESTAMP}
        folder_name = f"{mode.value}_{investigation_id}_{timestamp}"
        folder_path = self.base_logs_dir / folder_name
        
        # Create directory structure
        folder_path.mkdir(parents=True, exist_ok=True)
        (folder_path / "results").mkdir(exist_ok=True)
        
        # Create metadata
        metadata = InvestigationMetadata(
            investigation_id=investigation_id,
            mode=mode,
            created_at=datetime.now(timezone.utc).isoformat(),
            scenario=scenario,
            folder_path=str(folder_path),
            config=config or {}
        )
        
        # Write metadata file
        metadata_file = folder_path / "metadata.json"
        with open(metadata_file, 'w') as f:
            json.dump(metadata.to_dict(), f, indent=2)
        
        # Track active investigation
        self._active_investigations[investigation_id] = metadata
        
        return folder_path, metadata
    
    def get_investigation_folder(self, investigation_id: str) -> Optional[Path]:
        """
        Get folder path for active investigation.
        
        Args:
            investigation_id: Investigation identifier
            
        Returns:
            Path to investigation folder or None if not found
        """
        if investigation_id in self._active_investigations:
            metadata = self._active_investigations[investigation_id]
            return Path(metadata.folder_path)
        
        # Search existing folders if not in active tracking
        for folder_path in self.base_logs_dir.iterdir():
            if folder_path.is_dir() and investigation_id in folder_path.name:
                metadata_file = folder_path / "metadata.json"
                if metadata_file.exists():
                    with open(metadata_file) as f:
                        metadata_dict = json.load(f)
                        if metadata_dict.get('investigation_id') == investigation_id:
                            return folder_path
        
        return None
    
    def get_log_file_paths(self, investigation_id: str) -> Dict[str, Path]:
        """
        Get standardized file paths for investigation logs.
        
        Args:
            investigation_id: Investigation identifier
            
        Returns:
            Dictionary mapping log types to file paths
        """
        folder_path = self.get_investigation_folder(investigation_id)
        if not folder_path:
            raise ValueError(f"Investigation folder not found for: {investigation_id}")
        
        return {
            "main_log": folder_path / "investigation.log",
            "autonomous_log": folder_path / "autonomous_activities.jsonl",
            "journey_log": folder_path / "journey_tracking.json",
            "metadata": folder_path / "metadata.json",
            "results_dir": folder_path / "results"
        }
    
    def update_investigation_status(self, investigation_id: str, status: str) -> None:
        """
        Update investigation status in metadata.
        
        Args:
            investigation_id: Investigation identifier
            status: New status (running, completed, failed, etc.)
        """
        if investigation_id in self._active_investigations:
            self._active_investigations[investigation_id].status = status
            
            # Update metadata file
            folder_path = Path(self._active_investigations[investigation_id].folder_path)
            metadata_file = folder_path / "metadata.json"
            if metadata_file.exists():
                with open(metadata_file, 'w') as f:
                    json.dump(self._active_investigations[investigation_id].to_dict(), f, indent=2)
    
    def list_investigations(self, mode: Optional[InvestigationMode] = None) -> List[InvestigationMetadata]:
        """
        List all investigations, optionally filtered by mode.
        
        Args:
            mode: Optional mode filter
            
        Returns:
            List of investigation metadata
        """
        investigations = []
        
        for folder_path in self.base_logs_dir.iterdir():
            if folder_path.is_dir():
                metadata_file = folder_path / "metadata.json"
                if metadata_file.exists():
                    try:
                        with open(metadata_file) as f:
                            metadata_dict = json.load(f)
                            # Convert mode string back to enum
                            if 'mode' in metadata_dict and isinstance(metadata_dict['mode'], str):
                                metadata_dict['mode'] = InvestigationMode(metadata_dict['mode'])
                            
                            metadata = InvestigationMetadata(**metadata_dict)
                            
                            # Apply mode filter
                            if mode is None or metadata.mode == mode:
                                investigations.append(metadata)
                                
                    except (json.JSONDecodeError, TypeError, ValueError) as e:
                        # Skip invalid metadata files
                        continue
        
        # Sort by creation date (newest first)
        investigations.sort(key=lambda x: x.created_at, reverse=True)
        return investigations
    
    def cleanup_old_investigations(self, days_old: int = 30) -> int:
        """
        Clean up investigation folders older than specified days.
        
        Args:
            days_old: Number of days after which to delete investigations
            
        Returns:
            Number of investigations cleaned up
        """
        from datetime import timedelta
        
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_old)
        cleaned_count = 0
        
        investigations = self.list_investigations()
        for metadata in investigations:
            created_at = datetime.fromisoformat(metadata.created_at.replace('Z', '+00:00'))
            if created_at < cutoff_date:
                try:
                    import shutil
                    folder_path = Path(metadata.folder_path)
                    if folder_path.exists():
                        shutil.rmtree(folder_path)
                        cleaned_count += 1
                        
                    # Remove from active tracking if present
                    if metadata.investigation_id in self._active_investigations:
                        del self._active_investigations[metadata.investigation_id]
                        
                except Exception as e:
                    # Log error but continue cleanup
                    print(f"Error cleaning up investigation {metadata.investigation_id}: {e}")
        
        return cleaned_count
    
    def get_investigation_summary(self, investigation_id: str) -> Dict[str, Any]:
        """
        Get summary information for an investigation.
        
        Args:
            investigation_id: Investigation identifier
            
        Returns:
            Investigation summary dictionary
        """
        folder_path = self.get_investigation_folder(investigation_id)
        if not folder_path:
            return {"error": f"Investigation not found: {investigation_id}"}
        
        file_paths = self.get_log_file_paths(investigation_id)
        
        summary = {
            "investigation_id": investigation_id,
            "folder_path": str(folder_path),
            "files": {}
        }
        
        # Check file existence and sizes
        for file_type, file_path in file_paths.items():
            if file_path.exists():
                if file_path.is_file():
                    summary["files"][file_type] = {
                        "path": str(file_path),
                        "size_bytes": file_path.stat().st_size,
                        "modified": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
                    }
                elif file_path.is_dir():
                    # Count files in directory
                    file_count = len([f for f in file_path.iterdir() if f.is_file()])
                    summary["files"][file_type] = {
                        "path": str(file_path),
                        "type": "directory",
                        "file_count": file_count
                    }
            else:
                summary["files"][file_type] = {"path": str(file_path), "exists": False}
        
        # Load metadata if available
        if file_paths["metadata"].exists():
            try:
                with open(file_paths["metadata"]) as f:
                    summary["metadata"] = json.load(f)
            except json.JSONDecodeError:
                summary["metadata"] = {"error": "Invalid JSON"}
        
        return summary

# Global instance
investigation_folder_manager = InvestigationFolderManager()

def get_folder_manager() -> InvestigationFolderManager:
    """Get the global investigation folder manager instance"""
    return investigation_folder_manager