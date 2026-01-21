"""
Investigation Log Manager

Manages investigation-specific logging lifecycle.
Integrates with UnifiedLoggingCore to add investigation log handlers
and manage investigation log files.

Author: Implementation for 001-custom-investigation-log
Date: 2025-01-11
"""

import logging
import threading
from pathlib import Path
from typing import Any, Dict, Optional

from .investigation_log_context import (
    clear_investigation_context,
    get_investigation_id,
    set_investigation_context,
)
from .investigation_log_formatter import InvestigationLogFormatter
from .investigation_log_handler import InvestigationLogHandler
from .unified_logging_core import LogFormat, UnifiedLoggingCore


class InvestigationLogManager:
    """
    Manages investigation-specific logging.

    Integrates with UnifiedLoggingCore to add investigation log handlers
    and manage investigation log files.
    """

    def __init__(self, unified_logging_core: UnifiedLoggingCore):
        """
        Initialize investigation log manager.

        Args:
            unified_logging_core: Instance of unified logging core
        """
        self.unified_logging_core = unified_logging_core
        self._handlers: Dict[str, InvestigationLogHandler] = {}
        self._lock = threading.Lock()

    def start_investigation_logging(
        self,
        investigation_id: str,
        metadata: Dict[str, Any],
        investigation_folder: Path,
    ) -> Optional[InvestigationLogHandler]:
        """
        Start logging for an investigation.

        Args:
            investigation_id: Investigation identifier
            metadata: Investigation metadata from frontend
            investigation_folder: Path to investigation folder

        Returns:
            InvestigationLogHandler instance, or None if creation failed

        Raises:
            ValueError: If investigation_id is empty or investigation_folder is invalid
            OSError: If log file cannot be created
        """
        # Validate investigation_id
        if not investigation_id:
            raise ValueError("investigation_id cannot be empty")
        if not isinstance(investigation_id, str):
            raise TypeError(
                f"investigation_id must be a string, got {type(investigation_id)}"
            )
        if len(investigation_id.strip()) == 0:
            raise ValueError("investigation_id cannot be empty or whitespace only")

        # Validate investigation_folder
        if not investigation_folder:
            raise ValueError("investigation_folder cannot be empty")

        # Check for concurrent investigations with same ID (prevent conflicts)
        with self._lock:
            if investigation_id in self._handlers:
                # Handler already exists - log warning and reuse or create new
                logging.getLogger(__name__).warning(
                    f"Investigation {investigation_id} already has an active handler. "
                    f"Stopping existing handler before creating new one."
                )
                try:
                    existing_handler = self._handlers[investigation_id]
                    root_logger = logging.getLogger()
                    root_logger.removeHandler(existing_handler)
                    existing_handler.close()
                except Exception as e:
                    logging.getLogger(__name__).error(
                        f"Failed to clean up existing handler: {e}", exc_info=True
                    )

        try:
            # Set investigation context
            set_investigation_context(investigation_id, metadata)

            # Get unified logging format from config
            # Access _config to get current format (internal integration)
            log_format = getattr(self.unified_logging_core, "_config", {}).get(
                "log_format", LogFormat.HUMAN
            )
            if isinstance(log_format, str):
                log_format = LogFormat(log_format)

            # Create investigation log handler
            handler = InvestigationLogHandler(
                investigation_id=investigation_id,
                investigation_folder=investigation_folder,
                log_format=log_format,
                log_level=logging.DEBUG,
            )

            # Create formatter with prefix support
            # Access _formatters to get base formatter (internal integration)
            # UnifiedLoggingCore always initializes formatters in __init__, so they should always be available
            formatters = getattr(self.unified_logging_core, "_formatters", None)
            if formatters is None:
                # Ensure UnifiedLoggingCore is properly initialized
                # This should never happen if UnifiedLoggingCore is properly constructed
                raise RuntimeError(
                    f"UnifiedLoggingCore formatters not initialized. "
                    f"This indicates UnifiedLoggingCore was not properly constructed."
                )

            base_formatter = formatters.get(log_format)
            if base_formatter is None:
                # Formatter for requested format not found - this should not happen
                # UnifiedLoggingCore initializes all format formatters
                raise RuntimeError(
                    f"Formatter for log format '{log_format}' not found in UnifiedLoggingCore. "
                    f"Available formats: {list(formatters.keys())}"
                )

            formatter = InvestigationLogFormatter(base_formatter, include_prefix=True)
            handler.setFormatter(formatter)

            # Add handler to root logger (so all logs are captured)
            root_logger = logging.getLogger()
            root_logger.addHandler(handler)

            # Register handler
            with self._lock:
                self._handlers[investigation_id] = handler

            # Log initial metadata
            self.log_initial_metadata(investigation_id, metadata)

            # Log lifecycle event: start
            self.log_lifecycle_event(investigation_id, "start", {"status": "started"})

            return handler

        except Exception as e:
            # Log error but don't raise (logging failure shouldn't block investigation)
            logging.getLogger(__name__).error(
                f"Failed to start investigation logging for {investigation_id}: {e}",
                exc_info=True,
            )
            return None

    def stop_investigation_logging(
        self, investigation_id: str, handler: InvestigationLogHandler
    ) -> None:
        """
        Stop logging for an investigation.

        Args:
            investigation_id: Investigation identifier
            handler: InvestigationLogHandler instance
        """
        try:
            # Remove handler from root logger
            root_logger = logging.getLogger()
            root_logger.removeHandler(handler)

            # Close handler and flush logs
            handler.close()

            # Clear investigation context
            clear_investigation_context()

            # Remove from registry
            with self._lock:
                if investigation_id in self._handlers:
                    del self._handlers[investigation_id]

            # Log lifecycle event: stop
            self.log_lifecycle_event(investigation_id, "stop", {"status": "stopped"})

        except Exception as e:
            logging.getLogger(__name__).error(
                f"Error stopping investigation logging for {investigation_id}: {e}",
                exc_info=True,
            )

    def log_initial_metadata(
        self, investigation_id: str, metadata: Dict[str, Any]
    ) -> None:
        """
        Log initial investigation metadata as first entry in investigation.log.

        Preserves nested structures and handles optional fields gracefully.

        Args:
            investigation_id: Investigation identifier
            metadata: Investigation metadata from frontend (may contain nested structures)
        """
        try:
            # Ensure metadata is a dictionary (handle None or invalid types)
            if not isinstance(metadata, dict):
                metadata = {}

            # Create log entry with all metadata fields preserved
            # Nested structures are automatically preserved in the dict
            logger = logging.getLogger(__name__)

            # Use extra parameter to include metadata in log record
            # This ensures nested structures are preserved
            logger.info(
                "Investigation started",
                extra={
                    "investigation_id": investigation_id,
                    "metadata": metadata,
                    # Include common fields at top level for easier access
                    "entity_id": metadata.get("entity_id") or metadata.get("entityId"),
                    "entity_type": metadata.get("entity_type")
                    or metadata.get("entityType"),
                    "investigation_type": metadata.get("investigation_type")
                    or metadata.get("investigationType"),
                    "lifecycle_stage": metadata.get("lifecycle_stage")
                    or metadata.get("lifecycleStage"),
                    "status": metadata.get("status"),
                },
            )
        except Exception as e:
            # Log error but don't raise (metadata logging failure shouldn't block investigation)
            logging.getLogger(__name__).error(
                f"Failed to log initial metadata for {investigation_id}: {e}",
                exc_info=True,
            )

    def log_lifecycle_event(
        self,
        investigation_id: str,
        event_type: str,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Log investigation lifecycle event.

        Args:
            investigation_id: Investigation identifier
            event_type: Event type (start, progress, completion, cancellation, failure)
            details: Optional event details
        """
        try:
            logger = logging.getLogger(__name__)
            message = f"Investigation lifecycle event: {event_type}"
            extra = {"investigation_id": investigation_id, "event_type": event_type}
            if details:
                extra.update(details)

            if event_type in ("completion", "cancellation", "failure"):
                logger.info(message, extra=extra)
            else:
                logger.debug(message, extra=extra)
        except Exception as e:
            logging.getLogger(__name__).error(
                f"Failed to log lifecycle event for {investigation_id}: {e}",
                exc_info=True,
            )
