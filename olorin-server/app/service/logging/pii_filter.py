"""
PII Logging Filter

Filters log records to redact PII (Personally Identifiable Information) from log messages.
Integrates with existing PII redaction service for consistent masking across all logs.
"""

import logging
from typing import Optional
from app.service.logstream.pii_redaction_service import get_pii_redaction_service

# Use standard logger to avoid circular import
logger = logging.getLogger(__name__)


class PIILoggingFilter(logging.Filter):
    """
    Logging filter that redacts PII from log messages.
    
    Applies PII redaction to both the message and any extra context data.
    """
    
    def __init__(self, name: str = ""):
        """Initialize PII logging filter."""
        super().__init__(name)
        self._redaction_service = None
        self._service_initialized = False
    
    def _get_redaction_service(self):
        """Lazy initialization of PII redaction service."""
        if not self._service_initialized:
            try:
                self._redaction_service = get_pii_redaction_service()
                self._service_initialized = True
            except Exception as e:
                logger.warning(f"Failed to initialize PII redaction service: {e}")
                self._service_initialized = True  # Don't retry
        return self._redaction_service
    
    def filter(self, record: logging.LogRecord) -> bool:
        """
        Filter log record by redacting PII from message and context.
        
        Args:
            record: Log record to filter
            
        Returns:
            True (always passes, but modifies record)
        """
        redaction_service = self._get_redaction_service()
        
        if redaction_service and redaction_service.is_enabled():
            # Redact message
            if hasattr(record, 'msg') and record.msg:
                if isinstance(record.msg, str):
                    record.msg = redaction_service.redact_message(record.msg)
                elif isinstance(record.msg, (dict, list)):
                    record.msg = redaction_service.redact_context(record.msg) if isinstance(record.msg, dict) else [
                        redaction_service.redact_message(str(item)) if isinstance(item, str)
                        else redaction_service.redact_context(item) if isinstance(item, dict)
                        else item
                        for item in record.msg
                    ]
            
            # Redact args (format arguments)
            if hasattr(record, 'args') and record.args:
                if isinstance(record.args, tuple):
                    record.args = tuple(
                        redaction_service.redact_message(str(arg)) if isinstance(arg, str)
                        else redaction_service.redact_context(arg) if isinstance(arg, dict)
                        else arg
                        for arg in record.args
                    )
            
            # Redact extra context
            if hasattr(record, '__dict__'):
                for key, value in record.__dict__.items():
                    if key not in ['name', 'msg', 'args', 'created', 'filename', 'funcName', 
                                   'levelname', 'levelno', 'lineno', 'module', 'msecs', 
                                   'message', 'pathname', 'process', 'processName', 'relativeCreated',
                                   'thread', 'threadName', 'exc_info', 'exc_text', 'stack_info']:
                        if isinstance(value, str):
                            record.__dict__[key] = redaction_service.redact_message(value)
                        elif isinstance(value, dict):
                            record.__dict__[key] = redaction_service.redact_context(value)
                        elif isinstance(value, list):
                            record.__dict__[key] = [
                                redaction_service.redact_message(str(item)) if isinstance(item, str)
                                else redaction_service.redact_context(item) if isinstance(item, dict)
                                else item
                                for item in value
                            ]
        
        return True

