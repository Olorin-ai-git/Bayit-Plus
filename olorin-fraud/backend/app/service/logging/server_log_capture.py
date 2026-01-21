"""
Server Log Capture for Investigations

Captures server logs during investigation execution and saves them to the investigation folder.
This provides a complete audit trail of what happened on the server during each investigation.

Author: Gil Klainert
Date: 2025-09-09
"""

import asyncio
import io
import json
import logging
import queue
import threading
import time
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, TextIO

from .investigation_folder_manager import get_folder_manager


@dataclass
class ServerLogEntry:
    """Individual server log entry"""

    timestamp: str
    level: str
    logger_name: str
    message: str
    thread_id: str
    process_id: str
    source_file: Optional[str] = None
    line_number: Optional[int] = None
    extra_data: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "timestamp": self.timestamp,
            "level": self.level,
            "logger_name": self.logger_name,
            "message": self.message,
            "thread_id": self.thread_id,
            "process_id": self.process_id,
            "source_file": self.source_file,
            "line_number": self.line_number,
            "extra_data": self.extra_data,
        }


class InvestigationLogCapture:
    """
    Captures server logs during investigation execution.

    This class creates a custom log handler that captures all server logs
    during an investigation and saves them to the investigation folder.
    """

    def __init__(self):
        self.active_captures: Dict[str, "LogCaptureSession"] = {}
        self._lock = threading.Lock()

    def start_capture(self, investigation_id: str, investigation_folder: Path) -> None:
        """
        Start capturing server logs for an investigation.

        Args:
            investigation_id: Investigation identifier
            investigation_folder: Path to investigation folder where logs will be saved
        """
        with self._lock:
            if investigation_id in self.active_captures:
                # Stop existing capture if any
                self.stop_capture(investigation_id)

            # Create new capture session
            session = LogCaptureSession(investigation_id, investigation_folder)
            session.start()
            self.active_captures[investigation_id] = session

    def stop_capture(self, investigation_id: str) -> Optional[Path]:
        """
        Stop capturing logs and save to investigation folder.

        Args:
            investigation_id: Investigation identifier

        Returns:
            Path to saved server logs file, or None if capture was not active
        """
        with self._lock:
            session = self.active_captures.pop(investigation_id, None)
            if session:
                return session.stop()
            return None

    def is_capturing(self, investigation_id: str) -> bool:
        """Check if log capture is active for investigation"""
        with self._lock:
            return investigation_id in self.active_captures

    def get_capture_stats(self, investigation_id: str) -> Optional[Dict[str, Any]]:
        """Get statistics for active log capture"""
        with self._lock:
            session = self.active_captures.get(investigation_id)
            return session.get_stats() if session else None


class LogCaptureSession:
    """
    Individual log capture session for one investigation.
    """

    def __init__(self, investigation_id: str, investigation_folder: Path):
        self.investigation_id = investigation_id
        self.investigation_folder = investigation_folder
        self.start_time = datetime.now(timezone.utc)
        self.end_time = None

        # Log storage
        self.captured_logs: List[ServerLogEntry] = []
        self.log_queue: queue.Queue = queue.Queue()

        # Handler and processing
        self.log_handler: Optional[InvestigationLogHandler] = None
        self.processing_thread: Optional[threading.Thread] = None
        self.stop_event = threading.Event()

        # Statistics
        self.log_count = 0
        self.level_counts = {
            "DEBUG": 0,
            "INFO": 0,
            "WARNING": 0,
            "ERROR": 0,
            "CRITICAL": 0,
        }

    def start(self) -> None:
        """Start log capture session"""
        # Create custom log handler
        self.log_handler = InvestigationLogHandler(
            investigation_id=self.investigation_id, log_queue=self.log_queue
        )

        # Add handler to root logger to capture all logs
        root_logger = logging.getLogger()
        root_logger.addHandler(self.log_handler)

        # Start processing thread
        self.processing_thread = threading.Thread(
            target=self._process_logs, name=f"LogCapture-{self.investigation_id}"
        )
        self.processing_thread.daemon = True
        self.processing_thread.start()

    def stop(self) -> Path:
        """Stop capture session and save logs"""
        self.end_time = datetime.now(timezone.utc)

        # Signal stop to processing thread
        self.stop_event.set()

        # Remove handler from root logger
        if self.log_handler:
            root_logger = logging.getLogger()
            root_logger.removeHandler(self.log_handler)

        # Wait for processing thread to finish
        if self.processing_thread and self.processing_thread.is_alive():
            self.processing_thread.join(timeout=5.0)

        # Process any remaining logs in queue
        self._process_remaining_logs()

        # Save logs to file
        return self._save_logs_to_file()

    def _process_logs(self) -> None:
        """Process logs from queue in background thread"""
        while not self.stop_event.is_set():
            try:
                # Get log entry with timeout
                log_entry = self.log_queue.get(timeout=0.1)
                self.captured_logs.append(log_entry)
                self.log_count += 1

                # Update level counts
                if log_entry.level in self.level_counts:
                    self.level_counts[log_entry.level] += 1

                self.log_queue.task_done()

            except queue.Empty:
                continue
            except Exception as e:
                # Log processing error (but don't use logging to avoid recursion)
                print(
                    f"Error processing log in capture session {self.investigation_id}: {e}"
                )

    def _process_remaining_logs(self) -> None:
        """Process any remaining logs in queue"""
        while not self.log_queue.empty():
            try:
                log_entry = self.log_queue.get_nowait()
                self.captured_logs.append(log_entry)
                self.log_count += 1

                if log_entry.level in self.level_counts:
                    self.level_counts[log_entry.level] += 1

            except queue.Empty:
                break
            except Exception as e:
                print(f"Error processing remaining logs: {e}")

    def _save_logs_to_file(self) -> Path:
        """Save captured logs to server_logs file in investigation folder"""
        # Ensure investigation folder exists
        self.investigation_folder.mkdir(parents=True, exist_ok=True)

        # Create server_logs file
        server_logs_file = self.investigation_folder / "server_logs"

        # Prepare log data
        log_data = {
            "investigation_id": self.investigation_id,
            "capture_session": {
                "start_time": self.start_time.isoformat(),
                "end_time": self.end_time.isoformat() if self.end_time else None,
                "duration_seconds": (
                    (self.end_time - self.start_time).total_seconds()
                    if self.end_time
                    else 0
                ),
                "total_log_count": self.log_count,
                "level_counts": self.level_counts,
            },
            "server_logs": [log.to_dict() for log in self.captured_logs],
        }

        # Write to file as JSON
        with open(server_logs_file, "w", encoding="utf-8") as f:
            json.dump(log_data, f, indent=2, ensure_ascii=False)

        return server_logs_file

    def get_stats(self) -> Dict[str, Any]:
        """Get current capture statistics"""
        duration = (datetime.now(timezone.utc) - self.start_time).total_seconds()

        return {
            "investigation_id": self.investigation_id,
            "start_time": self.start_time.isoformat(),
            "duration_seconds": duration,
            "logs_captured": self.log_count,
            "level_counts": self.level_counts.copy(),
            "queue_size": self.log_queue.qsize(),
            "is_active": not self.stop_event.is_set(),
        }


class InvestigationLogHandler(logging.Handler):
    """
    Custom log handler that captures logs for investigation.
    """

    def __init__(self, investigation_id: str, log_queue: queue.Queue):
        super().__init__()
        self.investigation_id = investigation_id
        self.log_queue = log_queue

        # Set level to capture all logs
        self.setLevel(logging.DEBUG)

    def emit(self, record: logging.LogRecord) -> None:
        """Emit log record by adding to queue"""
        try:
            # Create server log entry
            log_entry = ServerLogEntry(
                timestamp=datetime.fromtimestamp(
                    record.created, timezone.utc
                ).isoformat(),
                level=record.levelname,
                logger_name=record.name,
                message=record.getMessage(),
                thread_id=str(record.thread) if hasattr(record, "thread") else "",
                process_id=str(record.process) if hasattr(record, "process") else "",
                source_file=record.pathname if hasattr(record, "pathname") else None,
                line_number=record.lineno if hasattr(record, "lineno") else None,
                extra_data={
                    "module": record.module if hasattr(record, "module") else None,
                    "funcName": (
                        record.funcName if hasattr(record, "funcName") else None
                    ),
                    "investigation_id": self.investigation_id,
                },
            )

            # Add to queue (non-blocking)
            try:
                self.log_queue.put_nowait(log_entry)
            except queue.Full:
                # Queue full, skip this log to prevent blocking
                pass

        except Exception:
            # Don't raise exceptions from log handler
            self.handleError(record)


# Global instance
_server_log_capture = InvestigationLogCapture()


def get_server_log_capture() -> InvestigationLogCapture:
    """Get global server log capture instance"""
    return _server_log_capture


@contextmanager
def capture_server_logs(investigation_id: str, investigation_folder: Path):
    """
    Context manager to capture server logs during investigation.

    Usage:
        with capture_server_logs(investigation_id, folder_path):
            # Run investigation
            pass
        # Logs are automatically saved to server_logs file
    """
    capture = get_server_log_capture()

    try:
        capture.start_capture(investigation_id, investigation_folder)
        yield capture
    finally:
        log_file_path = capture.stop_capture(investigation_id)
        if log_file_path:
            print(f"Server logs saved to: {log_file_path}")
