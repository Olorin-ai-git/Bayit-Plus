"""
Investigation Log Handler

Custom logging handler that writes investigation logs to investigation.log file.
Integrates with UnifiedLoggingCore to maintain format consistency.

Author: Implementation for 001-custom-investigation-log
Date: 2025-01-11
"""

import logging
import logging.handlers
from pathlib import Path
from typing import Optional
import threading
import time

from .unified_logging_core import LogFormat


class InvestigationLogHandler(logging.Handler):
    """
    Custom log handler for investigation-specific logging.
    
    Writes logs to investigation.log file in the investigation folder
    with [investigation_id] prefix. Integrates with UnifiedLoggingCore.
    """
    
    def __init__(
        self,
        investigation_id: str,
        investigation_folder: Path,
        log_format: LogFormat = LogFormat.HUMAN,
        log_level: int = logging.DEBUG
    ):
        """
        Initialize investigation log handler.
        
        Args:
            investigation_id: Investigation identifier
            investigation_folder: Path to investigation folder
            log_format: Log format (HUMAN, JSON, STRUCTURED)
            log_level: Log level (default: DEBUG)
            
        Raises:
            ValueError: If investigation_id is empty or investigation_folder is invalid
            OSError: If log file cannot be created (permissions, disk space)
        """
        super().__init__()
        
        if not investigation_id:
            raise ValueError("investigation_id cannot be empty")
        if not investigation_folder or not isinstance(investigation_folder, Path):
            raise ValueError(f"investigation_folder must be a valid Path, got {type(investigation_folder)}")
        
        self.investigation_id = investigation_id
        self.investigation_folder = Path(investigation_folder)
        self.log_format = log_format
        self.setLevel(log_level)
        
        # Create investigation.log file path
        self.log_file_path = self.investigation_folder / "investigation.log"
        
        # Thread lock for file operations
        self._lock = threading.Lock()
        
        # Performance metrics
        self._creation_time = time.time()
        self._log_entry_count = 0
        self._total_write_time = 0.0
        
        # Create log file (will be configured with formatter later)
        try:
            creation_start = time.time()
            self.investigation_folder.mkdir(parents=True, exist_ok=True)
            creation_time = time.time() - creation_start
            # File will be created when first log entry is written
            if creation_time > 0.1:  # Log if creation took more than 100ms
                logging.getLogger(__name__).warning(
                    f"Investigation folder creation took {creation_time:.3f}s for {investigation_id}"
                )
        except OSError as e:
            raise OSError(f"Failed to create investigation folder: {e}") from e
    
    def emit(self, record: logging.LogRecord) -> None:
        """
        Emit log record to investigation.log file.
        
        Args:
            record: Log record to emit
        """
        try:
            # Check if record level meets handler level
            if record.levelno < self.level:
                return
            
            # Format the record (formatter will be set by manager)
            msg = self.format(record)
            
            # Write to file (thread-safe, with performance tracking)
            write_start = time.time()
            with self._lock:
                try:
                    # Check if file still exists (handle folder deletion case)
                    if not self.log_file_path.parent.exists():
                        # Folder was deleted - graceful degradation
                        logging.getLogger(__name__).warning(
                            f"Investigation folder deleted during active investigation: {self.investigation_id}"
                        )
                        self.handleError(record)
                        return
                    
                    # Check log file size for rotation (if file exists and is large)
                    if self.log_file_path.exists():
                        file_size = self.log_file_path.stat().st_size
                        # Rotate if file exceeds 50MB (configurable threshold)
                        if file_size > 50 * 1024 * 1024:  # 50MB
                            self._rotate_log_file()
                    
                    with open(self.log_file_path, 'a', encoding='utf-8') as f:
                        f.write(msg + '\n')
                    
                    # Track performance metrics
                    write_time = time.time() - write_start
                    self._log_entry_count += 1
                    self._total_write_time += write_time
                    
                    # Warn if write took too long
                    if write_time > 0.01:  # More than 10ms
                        logging.getLogger(__name__).warning(
                            f"Slow log write detected: {write_time:.3f}s for {self.investigation_id}"
                        )
                        
                except (OSError, IOError) as e:
                    # Log error but don't raise (logging failures shouldn't block investigation)
                    self.handleError(record)
                    
        except Exception:
            # Don't raise exceptions from log handler
            self.handleError(record)
    
    def close(self) -> None:
        """
        Close handler and flush logs.
        """
        with self._lock:
            try:
                # Flush any pending writes
                if hasattr(self, 'log_file_path') and self.log_file_path.exists():
                    # File is already closed after each write, but ensure it's flushed
                    pass
                
                # Log performance metrics before closing
                if self._log_entry_count > 0:
                    avg_write_time = self._total_write_time / self._log_entry_count
                    logging.getLogger(__name__).debug(
                        f"Investigation log handler closed for {self.investigation_id}: "
                        f"{self._log_entry_count} entries, avg write time: {avg_write_time*1000:.2f}ms"
                    )
            except Exception:
                pass
        super().close()
    
    def _rotate_log_file(self) -> None:
        """
        Rotate log file when it exceeds size threshold.
        Archives current file and creates new one.
        """
        try:
            import shutil
            from datetime import datetime
            
            # Create archive filename with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            archive_path = self.log_file_path.parent / f"investigation_{timestamp}.log"
            
            # Move current file to archive
            if self.log_file_path.exists():
                shutil.move(str(self.log_file_path), str(archive_path))
                logging.getLogger(__name__).info(
                    f"Rotated investigation log file for {self.investigation_id}: "
                    f"{self.log_file_path} -> {archive_path}"
                )
        except Exception as e:
            logging.getLogger(__name__).error(
                f"Failed to rotate log file for {self.investigation_id}: {e}",
                exc_info=True
            )
    
    def get_performance_metrics(self) -> dict:
        """
        Get performance metrics for this handler.
        
        Returns:
            Dictionary with performance metrics
        """
        with self._lock:
            avg_write_time = (self._total_write_time / self._log_entry_count 
                            if self._log_entry_count > 0 else 0.0)
            return {
                'investigation_id': self.investigation_id,
                'log_entry_count': self._log_entry_count,
                'total_write_time': self._total_write_time,
                'avg_write_time_ms': avg_write_time * 1000,
                'creation_time': self._creation_time,
                'uptime_seconds': time.time() - self._creation_time
            }

