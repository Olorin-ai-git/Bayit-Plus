"""
State Validation and Error Handling for Hybrid Intelligence System

Validates investigation states and handles errors during
hybrid graph execution.
"""

from typing import Dict, Any, Optional, List, Union
from enum import Enum

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ValidationSeverity(Enum):
    """Severity levels for validation issues"""
    INFO = "info"
    WARNING = "warning"  
    ERROR = "error"
    CRITICAL = "critical"


class ValidationResult:
    """Result of state validation"""
    
    def __init__(self):
        self.is_valid = True
        self.issues = []
        self.suggestions = []
    
    def add_issue(
        self, 
        severity: ValidationSeverity,
        message: str,
        field: Optional[str] = None,
        suggestion: Optional[str] = None
    ):
        """Add a validation issue"""
        
        issue = {
            "severity": severity.value,
            "message": message,
            "field": field,
            "suggestion": suggestion
        }
        
        self.issues.append(issue)
        
        # Mark as invalid for errors and critical issues
        if severity in [ValidationSeverity.ERROR, ValidationSeverity.CRITICAL]:
            self.is_valid = False
        
        if suggestion:
            self.suggestions.append(suggestion)


class StateValidator:
    """
    Validates investigation states and handles errors.
    
    Ensures state consistency and provides error recovery
    mechanisms for the hybrid intelligence system.
    """
    
    def __init__(self):
        self.validation_rules = self._initialize_validation_rules()
        self.error_recovery_handlers = {}
    
    def validate_investigation_state(
        self, 
        state: Dict[str, Any],
        investigation_id: str
    ) -> ValidationResult:
        """
        Validate investigation state for consistency and completeness.
        
        Args:
            state: Investigation state to validate
            investigation_id: Investigation identifier
            
        Returns:
            Validation result with issues and suggestions
        """
        
        logger.debug(f"🔍 Validating investigation state: {investigation_id}")
        
        result = ValidationResult()
        
        try:
            # Core validation checks
            self._validate_required_fields(state, result)
            self._validate_field_types(state, result)
            self._validate_state_consistency(state, result)
            self._validate_investigation_progress(state, result)
            self._validate_tool_results(state, result)
            
            # Log validation summary
            if result.is_valid:
                logger.debug(f"✅ State validation passed: {investigation_id}")
            else:
                error_count = len([i for i in result.issues if i["severity"] in ["error", "critical"]])
                logger.warning(f"⚠️ State validation issues: {investigation_id} ({error_count} errors)")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ State validation failed: {str(e)}")
            result.add_issue(
                ValidationSeverity.CRITICAL,
                f"Validation process failed: {str(e)}",
                suggestion="Check state structure and try again"
            )
            return result
    
    def _validate_required_fields(self, state: Dict[str, Any], result: ValidationResult):
        """Validate that required fields are present"""
        
        required_fields = [
            "investigation_id",
            "entity_value", 
            "entity_type",
            "status",
            "tool_results"
        ]
        
        for field in required_fields:
            if field not in state:
                result.add_issue(
                    ValidationSeverity.ERROR,
                    f"Missing required field: {field}",
                    field=field,
                    suggestion=f"Ensure {field} is properly initialized"
                )
            elif state[field] is None:
                result.add_issue(
                    ValidationSeverity.WARNING,
                    f"Required field is None: {field}",
                    field=field,
                    suggestion=f"Initialize {field} with appropriate default value"
                )
    
    def _validate_field_types(self, state: Dict[str, Any], result: ValidationResult):
        """Validate field types are correct"""
        
        expected_types = {
            "investigation_id": str,
            "entity_value": str,
            "entity_type": str,
            "status": str,
            "tool_results": dict,
            "confidence_scores": dict,
            "analysis_complete": bool
        }
        
        for field, expected_type in expected_types.items():
            if field in state and state[field] is not None:
                if not isinstance(state[field], expected_type):
                    result.add_issue(
                        ValidationSeverity.ERROR,
                        f"Field {field} has wrong type: expected {expected_type.__name__}, got {type(state[field]).__name__}",
                        field=field,
                        suggestion=f"Convert {field} to {expected_type.__name__}"
                    )
    
    def _validate_state_consistency(self, state: Dict[str, Any], result: ValidationResult):
        """Validate state internal consistency"""
        
        # Check status consistency
        status = state.get("status", "")
        analysis_complete = state.get("analysis_complete", False)
        
        if status in ["completed", "failed"] and not analysis_complete:
            result.add_issue(
                ValidationSeverity.WARNING,
                "Investigation marked as completed but analysis_complete is False",
                field="analysis_complete",
                suggestion="Set analysis_complete to True for completed investigations"
            )
        
        # Check tool results consistency
        tool_results = state.get("tool_results", {})
        if isinstance(tool_results, dict):
            for tool_name, tool_result in tool_results.items():
                if not isinstance(tool_result, dict):
                    result.add_issue(
                        ValidationSeverity.ERROR,
                        f"Tool result for {tool_name} should be a dictionary",
                        field=f"tool_results.{tool_name}",
                        suggestion="Ensure tool results are properly formatted dictionaries"
                    )
    
    def _validate_investigation_progress(self, state: Dict[str, Any], result: ValidationResult):
        """Validate investigation progress indicators"""
        
        status = state.get("status", "")
        valid_statuses = ["initialized", "running", "completed", "failed", "cancelled"]
        
        if status not in valid_statuses:
            result.add_issue(
                ValidationSeverity.ERROR,
                f"Invalid status: {status}",
                field="status",
                suggestion=f"Use one of: {', '.join(valid_statuses)}"
            )
        
        # Check for stale investigations
        if status == "running":
            # This would check timestamps in a real implementation
            result.add_issue(
                ValidationSeverity.INFO,
                "Investigation is currently running",
                field="status"
            )
    
    def _validate_tool_results(self, state: Dict[str, Any], result: ValidationResult):
        """Validate tool results structure and content"""
        
        tool_results = state.get("tool_results", {})
        
        if not isinstance(tool_results, dict):
            result.add_issue(
                ValidationSeverity.ERROR,
                "tool_results must be a dictionary",
                field="tool_results",
                suggestion="Initialize tool_results as an empty dictionary"
            )
            return
        
        # Validate individual tool results
        for tool_name, tool_result in tool_results.items():
            if not isinstance(tool_result, dict):
                continue
            
            # Check for required tool result fields
            if "status" not in tool_result:
                result.add_issue(
                    ValidationSeverity.WARNING,
                    f"Tool result {tool_name} missing status field",
                    field=f"tool_results.{tool_name}.status",
                    suggestion="Add status field to tool results"
                )
            
            # Validate tool result status
            tool_status = tool_result.get("status", "")
            valid_tool_statuses = ["success", "failed", "skipped", "pending"]
            
            if tool_status and tool_status not in valid_tool_statuses:
                result.add_issue(
                    ValidationSeverity.WARNING,
                    f"Invalid tool status for {tool_name}: {tool_status}",
                    field=f"tool_results.{tool_name}.status",
                    suggestion=f"Use one of: {', '.join(valid_tool_statuses)}"
                )
    
    def _initialize_validation_rules(self) -> Dict[str, Any]:
        """Initialize validation rules configuration"""
        
        return {
            "required_fields": [
                "investigation_id",
                "entity_value",
                "entity_type", 
                "status",
                "tool_results"
            ],
            "optional_fields": [
                "confidence_scores",
                "analysis_complete",
                "error_message",
                "created_at",
                "updated_at"
            ],
            "valid_statuses": [
                "initialized",
                "running", 
                "completed",
                "failed",
                "cancelled"
            ],
            "valid_entity_types": [
                "ip",
                "domain",
                "email",
                "hash",
                "url"
            ]
        }
    
    def handle_validation_error(
        self,
        validation_result: ValidationResult,
        state: Dict[str, Any],
        investigation_id: str
    ) -> Dict[str, Any]:
        """
        Handle validation errors and attempt recovery.
        
        Args:
            validation_result: Result of validation
            state: Investigation state with issues
            investigation_id: Investigation identifier
            
        Returns:
            Corrected state (if possible)
        """
        
        logger.warning(f"🔧 Attempting validation error recovery: {investigation_id}")
        
        corrected_state = state.copy()
        
        try:
            # Apply automatic corrections
            for issue in validation_result.issues:
                if issue["severity"] in ["error", "critical"]:
                    corrected_state = self._apply_error_correction(
                        corrected_state, issue, investigation_id
                    )
            
            # Re-validate corrected state
            revalidation_result = self.validate_investigation_state(
                corrected_state, investigation_id
            )
            
            if revalidation_result.is_valid:
                logger.info(f"✅ Validation error recovery successful: {investigation_id}")
            else:
                logger.warning(f"⚠️ Partial validation error recovery: {investigation_id}")
            
            return corrected_state
            
        except Exception as e:
            logger.error(f"❌ Validation error recovery failed: {str(e)}")
            return state  # Return original state if recovery fails
    
    def _apply_error_correction(
        self,
        state: Dict[str, Any],
        issue: Dict[str, Any],
        investigation_id: str
    ) -> Dict[str, Any]:
        """Apply automatic correction for validation issue"""
        
        field = issue.get("field", "")
        message = issue.get("message", "")
        
        # Handle missing required fields
        if "Missing required field" in message:
            if field == "tool_results":
                state[field] = {}
            elif field == "status":
                state[field] = "initialized"
            elif field in ["investigation_id", "entity_value", "entity_type"]:
                # These should be provided by caller, log error
                logger.error(f"❌ Cannot auto-correct missing critical field: {field}")
            
            logger.debug(f"🔧 Auto-corrected missing field: {field}")
        
        # Handle type errors
        elif "has wrong type" in message:
            if field == "tool_results" and not isinstance(state.get(field), dict):
                state[field] = {}
                logger.debug(f"🔧 Auto-corrected field type: {field}")
        
        return state
    
    def register_error_handler(
        self,
        error_type: str,
        handler_function: callable
    ):
        """
        Register custom error recovery handler.
        
        Args:
            error_type: Type of error to handle
            handler_function: Function to handle the error
        """
        
        self.error_recovery_handlers[error_type] = handler_function
        logger.debug(f"🔧 Error handler registered: {error_type}")
    
    def get_validation_summary(self, validation_result: ValidationResult) -> Dict[str, Any]:
        """
        Get summary of validation results.
        
        Args:
            validation_result: Validation result to summarize
            
        Returns:
            Summary dictionary
        """
        
        severity_counts = {}
        for issue in validation_result.issues:
            severity = issue["severity"]
            severity_counts[severity] = severity_counts.get(severity, 0) + 1
        
        return {
            "is_valid": validation_result.is_valid,
            "total_issues": len(validation_result.issues),
            "severity_counts": severity_counts,
            "suggestions_count": len(validation_result.suggestions),
            "has_critical_issues": any(
                issue["severity"] == "critical" for issue in validation_result.issues
            )
        }