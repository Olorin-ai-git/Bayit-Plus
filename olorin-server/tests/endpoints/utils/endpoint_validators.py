"""
Response Validation Utilities for Olorin Endpoint Testing.

Provides comprehensive validation utilities for API responses,
ensuring correctness of status codes, headers, JSON structure,
and business logic validation.
"""

import json
import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional, Set, Union

import httpx

logger = logging.getLogger(__name__)


class ValidationError(Exception):
    """Raised when response validation fails."""

    pass


@dataclass
class ValidationResult:
    """Result of endpoint validation."""

    passed: bool
    errors: List[str]
    warnings: List[str]
    response_time_ms: float
    status_code: int

    def add_error(self, message: str):
        """Add an error to the validation result."""
        self.errors.append(message)
        self.passed = False

    def add_warning(self, message: str):
        """Add a warning to the validation result."""
        self.warnings.append(message)

    def get_summary(self) -> str:
        """Get validation summary."""
        status = "PASSED" if self.passed else "FAILED"
        return (
            f"Validation {status} - "
            f"Status: {self.status_code}, "
            f"Time: {self.response_time_ms:.1f}ms, "
            f"Errors: {len(self.errors)}, "
            f"Warnings: {len(self.warnings)}"
        )


class EndpointValidator:
    """
    Comprehensive validator for API endpoint responses.

    Validates status codes, response structure, performance,
    and business logic constraints.
    """

    def __init__(self):
        self.performance_thresholds = {
            "health": 100,  # Health endpoints should be very fast
            "auth": 500,  # Authentication can be slower
            "analysis": 30000,  # Analysis endpoints can take time
            "agent": 120000,  # Agent endpoints can be very slow
            "default": 5000,  # Default threshold
        }

    def validate_response(
        self,
        response: httpx.Response,
        metrics: Dict[str, Any],
        expected_status: Union[int, List[int]] = 200,
        endpoint_type: str = "default",
        required_fields: Optional[List[str]] = None,
        business_validators: Optional[List[callable]] = None,
    ) -> ValidationResult:
        """
        Comprehensive response validation.

        Args:
            response: HTTP response object
            metrics: Response metrics from client
            expected_status: Expected status code(s)
            endpoint_type: Type of endpoint for performance validation
            required_fields: Required fields in JSON response
            business_validators: Custom business logic validators

        Returns:
            ValidationResult with validation details
        """
        result = ValidationResult(
            passed=True,
            errors=[],
            warnings=[],
            response_time_ms=metrics.get("response_time_ms", 0),
            status_code=response.status_code,
        )

        # Status code validation
        if isinstance(expected_status, list):
            if response.status_code not in expected_status:
                result.add_error(
                    f"Unexpected status code: {response.status_code}, "
                    f"expected one of {expected_status}"
                )
        else:
            if response.status_code != expected_status:
                result.add_error(
                    f"Unexpected status code: {response.status_code}, "
                    f"expected {expected_status}"
                )

        # Performance validation
        threshold = self.performance_thresholds.get(
            endpoint_type, self.performance_thresholds["default"]
        )
        if result.response_time_ms > threshold:
            result.add_warning(
                f"Slow response: {result.response_time_ms:.1f}ms "
                f"(threshold: {threshold}ms)"
            )

        # Header validation
        self._validate_headers(response, result)

        # Content validation for successful responses
        if 200 <= response.status_code < 300:
            self._validate_content(response, result, required_fields)

            # Business logic validation
            if business_validators:
                self._run_business_validators(response, result, business_validators)

        # Error response validation
        elif 400 <= response.status_code < 600:
            self._validate_error_response(response, result)

        return result

    def _validate_headers(self, response: httpx.Response, result: ValidationResult):
        """Validate response headers."""
        # Check for security headers
        security_headers = [
            "olorin_tid",  # Olorin transaction ID
        ]

        for header in security_headers:
            if header not in response.headers:
                result.add_warning(f"Missing recommended header: {header}")

        # Validate Content-Type for JSON responses
        content_type = response.headers.get("content-type", "")
        if response.content and not content_type.startswith("application/json"):
            if response.status_code == 200:
                result.add_warning(
                    f"Non-JSON content type for 200 response: {content_type}"
                )

    def _validate_content(
        self,
        response: httpx.Response,
        result: ValidationResult,
        required_fields: Optional[List[str]] = None,
    ):
        """Validate response content and structure."""
        if not response.content:
            result.add_error("Empty response body for successful request")
            return

        # JSON validation
        try:
            data = response.json()
        except json.JSONDecodeError as e:
            result.add_error(f"Invalid JSON response: {str(e)}")
            return

        # Required fields validation
        if required_fields:
            missing_fields = []
            for field in required_fields:
                if not self._has_nested_field(data, field):
                    missing_fields.append(field)

            if missing_fields:
                result.add_error(f"Missing required fields: {missing_fields}")

        # Common structure validation
        self._validate_common_structures(data, result)

    def _has_nested_field(self, data: Any, field_path: str) -> bool:
        """Check if nested field exists in data (e.g., 'user.profile.email')."""
        try:
            current = data
            for part in field_path.split("."):
                if isinstance(current, dict) and part in current:
                    current = current[part]
                else:
                    return False
            return True
        except:
            return False

    def _validate_common_structures(self, data: Any, result: ValidationResult):
        """Validate common API response structures."""
        if isinstance(data, dict):
            # Timestamp validation
            timestamp_fields = ["timestamp", "created_at", "updated_at"]
            for field in timestamp_fields:
                if field in data:
                    self._validate_timestamp(data[field], field, result)

            # Risk score validation
            if "risk_score" in data:
                self._validate_risk_score(data["risk_score"], result)

            # ID field validation
            id_fields = ["id", "user_id", "investigation_id", "entity_id"]
            for field in id_fields:
                if field in data:
                    self._validate_id_field(data[field], field, result)

    def _validate_timestamp(
        self, value: Any, field_name: str, result: ValidationResult
    ):
        """Validate timestamp format and reasonableness."""
        if not isinstance(value, str):
            result.add_error(
                f"Timestamp field {field_name} should be string, got {type(value)}"
            )
            return

        try:
            # Try to parse ISO format
            parsed_time = datetime.fromisoformat(value.replace("Z", "+00:00"))

            # Check if timestamp is reasonable (not too far in past/future)
            now = datetime.now(parsed_time.tzinfo or None)
            time_diff = abs((now - parsed_time).total_seconds())

            if time_diff > 365 * 24 * 3600:  # More than 1 year
                result.add_warning(
                    f"Timestamp {field_name} seems unreasonable: {value}"
                )
        except ValueError:
            result.add_error(f"Invalid timestamp format for {field_name}: {value}")

    def _validate_risk_score(self, value: Any, result: ValidationResult):
        """Validate risk score is within expected range."""
        if not isinstance(value, (int, float)):
            result.add_error(f"Risk score should be numeric, got {type(value)}")
            return

        if not 0.0 <= value <= 1.0:
            result.add_error(f"Risk score should be between 0.0 and 1.0, got {value}")

    def _validate_id_field(self, value: Any, field_name: str, result: ValidationResult):
        """Validate ID field format."""
        if not isinstance(value, str):
            result.add_error(
                f"ID field {field_name} should be string, got {type(value)}"
            )
            return

        if not value.strip():
            result.add_error(f"ID field {field_name} cannot be empty")
            return

        # Check for reasonable length
        if len(value) > 255:
            result.add_warning(
                f"ID field {field_name} is very long: {len(value)} chars"
            )

    def _validate_error_response(
        self, response: httpx.Response, result: ValidationResult
    ):
        """Validate error response structure."""
        try:
            data = response.json()

            # Check for standard error fields
            if "detail" not in data and "error" not in data and "message" not in data:
                result.add_warning(
                    "Error response missing standard error fields (detail/error/message)"
                )

        except json.JSONDecodeError:
            # Error responses might not be JSON
            pass

    def _run_business_validators(
        self,
        response: httpx.Response,
        result: ValidationResult,
        validators: List[callable],
    ):
        """Run custom business logic validators."""
        try:
            data = response.json()

            for validator in validators:
                try:
                    validator(data, result)
                except Exception as e:
                    result.add_error(f"Business validator failed: {str(e)}")

        except json.JSONDecodeError:
            result.add_error("Cannot run business validators on non-JSON response")

    def validate_health_response(
        self, response: httpx.Response, metrics: Dict[str, Any]
    ) -> ValidationResult:
        """Validate health check endpoint response."""
        return self.validate_response(
            response,
            metrics,
            expected_status=200,
            endpoint_type="health",
            required_fields=["status"],
            business_validators=[self._validate_health_status],
        )

    def _validate_health_status(self, data: Dict[str, Any], result: ValidationResult):
        """Business validator for health status."""
        status = data.get("status")
        if status not in ["healthy", "ok", "UP"]:
            result.add_error(f"Unexpected health status: {status}")

    def validate_auth_response(
        self, response: httpx.Response, metrics: Dict[str, Any]
    ) -> ValidationResult:
        """Validate authentication endpoint response."""
        return self.validate_response(
            response,
            metrics,
            expected_status=200,
            endpoint_type="auth",
            required_fields=["access_token"],
            business_validators=[self._validate_jwt_token],
        )

    def _validate_jwt_token(self, data: Dict[str, Any], result: ValidationResult):
        """Business validator for JWT token format."""
        token = data.get("access_token")
        if not token:
            return

        # Basic JWT format check (3 parts separated by dots)
        parts = token.split(".")
        if len(parts) != 3:
            result.add_error(
                f"Invalid JWT token format: expected 3 parts, got {len(parts)}"
            )

    def validate_investigation_response(
        self, response: httpx.Response, metrics: Dict[str, Any]
    ) -> ValidationResult:
        """Validate investigation endpoint response."""
        return self.validate_response(
            response,
            metrics,
            expected_status=200,
            endpoint_type="default",
            required_fields=["id", "status"],
            business_validators=[self._validate_investigation_status],
        )

    def _validate_investigation_status(
        self, data: Dict[str, Any], result: ValidationResult
    ):
        """Business validator for investigation status."""
        status = data.get("status")
        valid_statuses = [
            "IN_PROGRESS",
            "COMPLETED",
            "PENDING",
            "UNDER_REVIEW",
            "CLOSED",
        ]

        if status not in valid_statuses:
            result.add_error(f"Invalid investigation status: {status}")

    def validate_analysis_response(
        self,
        response: httpx.Response,
        metrics: Dict[str, Any],
        analysis_type: str = "generic",
    ) -> ValidationResult:
        """Validate analysis endpoint response."""
        validators = []

        if analysis_type == "device":
            validators.append(self._validate_device_analysis)
        elif analysis_type == "network":
            validators.append(self._validate_network_analysis)
        elif analysis_type == "location":
            validators.append(self._validate_location_analysis)
        elif analysis_type == "logs":
            validators.append(self._validate_logs_analysis)

        return self.validate_response(
            response,
            metrics,
            expected_status=200,
            endpoint_type="analysis",
            business_validators=validators,
        )

    def _validate_device_analysis(self, data: Dict[str, Any], result: ValidationResult):
        """Business validator for device analysis response."""
        if "device_signals" in data:
            signals = data["device_signals"]
            if not isinstance(signals, list):
                result.add_error("Device signals should be a list")

    def _validate_network_analysis(
        self, data: Dict[str, Any], result: ValidationResult
    ):
        """Business validator for network analysis response."""
        if "network_risk_assessment" in data:
            assessment = data["network_risk_assessment"]
            if "risk_level" in assessment:
                risk_level = assessment["risk_level"]
                if not isinstance(risk_level, (int, float)) or not 0 <= risk_level <= 1:
                    result.add_error(f"Invalid network risk level: {risk_level}")

    def _validate_location_analysis(
        self, data: Dict[str, Any], result: ValidationResult
    ):
        """Business validator for location analysis response."""
        if "location_sources" in data or "oii_location_info" in data:
            # Location analysis should have at least one location source
            has_location_data = False

            for field in [
                "oii_location_info",
                "business_location_info",
                "phone_location_info",
            ]:
                if data.get(field) is not None:
                    has_location_data = True
                    break

            if not has_location_data:
                result.add_warning(
                    "No location data found in location analysis response"
                )

    def _validate_logs_analysis(self, data: Dict[str, Any], result: ValidationResult):
        """Business validator for logs analysis response."""
        if "risk_assessment" in data:
            assessment = data["risk_assessment"]
            required_assessment_fields = ["risk_level", "confidence", "summary"]

            for field in required_assessment_fields:
                if field not in assessment:
                    result.add_error(f"Missing required assessment field: {field}")

    def validate_agent_response(
        self, response: httpx.Response, metrics: Dict[str, Any]
    ) -> ValidationResult:
        """Validate agent endpoint response."""
        return self.validate_response(
            response,
            metrics,
            expected_status=[200, 202],  # Agent calls might be async
            endpoint_type="agent",
            business_validators=[self._validate_agent_response_structure],
        )

    def _validate_agent_response_structure(
        self, data: Dict[str, Any], result: ValidationResult
    ):
        """Business validator for agent response structure."""
        # Agent responses should have some indication of processing
        if not any(key in data for key in ["result", "status", "response", "output"]):
            result.add_warning("Agent response missing result indicators")

    def validate_websocket_compatible_response(
        self, response: httpx.Response, metrics: Dict[str, Any]
    ) -> ValidationResult:
        """Validate response that should be WebSocket compatible."""
        # For HTTP endpoints that support WebSocket upgrades
        return self.validate_response(
            response,
            metrics,
            expected_status=[
                200,
                101,
                426,
            ],  # 101 for upgrade, 426 for upgrade required
            endpoint_type="default",
        )
