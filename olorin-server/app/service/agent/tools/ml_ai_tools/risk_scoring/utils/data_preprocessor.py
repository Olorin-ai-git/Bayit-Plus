"""
Risk Data Preprocessor

Utility for preprocessing and normalizing risk data.
"""

from typing import Any, Dict, List, Optional
from collections import defaultdict


class RiskDataPreprocessor:
    """Preprocesses and normalizes risk data for scoring."""

    def preprocess(self, risk_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Preprocess risk data for analysis.

        Args:
            risk_data: Raw risk data

        Returns:
            Processed and normalized risk data
        """
        processed_data = {
            "financial_data": self._process_financial_data(risk_data),
            "behavioral_data": self._process_behavioral_data(risk_data),
            "contextual_data": self._process_contextual_data(risk_data),
            "risk_indicators": self._extract_risk_indicators(risk_data),
            "data_quality": self._assess_data_quality(risk_data),
            "data_completeness": self._assess_data_completeness(risk_data)
        }

        return processed_data

    def _process_financial_data(self, risk_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process financial-related data."""
        financial_data = {}

        # Extract financial fields
        for key, value in risk_data.items():
            key_lower = key.lower()
            if any(term in key_lower for term in ['amount', 'balance', 'income', 'debt', 'credit']):
                if isinstance(value, (int, float)):
                    financial_data[key] = float(value)
                elif isinstance(value, str) and value.replace('.', '').replace('-', '').isdigit():
                    financial_data[key] = float(value)

        return financial_data

    def _process_behavioral_data(self, risk_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process behavioral-related data."""
        behavioral_data = {}

        # Extract behavioral fields
        for key, value in risk_data.items():
            key_lower = key.lower()
            if any(term in key_lower for term in ['behavior', 'pattern', 'frequency', 'usage']):
                if isinstance(value, (int, float)):
                    behavioral_data[key] = self._normalize_score(float(value))

        return behavioral_data

    def _process_contextual_data(self, risk_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process contextual data."""
        contextual_data = {}

        # Extract contextual fields
        for key, value in risk_data.items():
            key_lower = key.lower()
            if any(term in key_lower for term in ['location', 'time', 'device', 'environment']):
                contextual_data[key] = value

        return contextual_data

    def _extract_risk_indicators(self, risk_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract risk indicator fields."""
        indicators = {}

        # Extract risk-related fields
        for key, value in risk_data.items():
            key_lower = key.lower()
            if any(term in key_lower for term in ['risk', 'fraud', 'suspicious', 'alert', 'violation']):
                if isinstance(value, (int, float)):
                    indicators[key] = float(value)

        return indicators

    def _assess_data_quality(self, risk_data: Dict[str, Any]) -> float:
        """Assess overall data quality."""
        quality_score = 0.0
        total_fields = len(risk_data)

        if total_fields == 0:
            return 0.0

        # Check for valid values
        valid_fields = 0
        for key, value in risk_data.items():
            if value is not None and value != "" and value != 0:
                valid_fields += 1

        # Base quality from data presence
        quality_score = valid_fields / total_fields

        # Bonus for numeric data (more reliable)
        numeric_fields = sum(1 for value in risk_data.values() if isinstance(value, (int, float)))
        numeric_bonus = min(numeric_fields / total_fields * 0.2, 0.2)

        return min(quality_score + numeric_bonus, 1.0)

    def _assess_data_completeness(self, risk_data: Dict[str, Any]) -> float:
        """Assess data completeness."""
        expected_categories = [
            'financial', 'behavioral', 'contextual', 'temporal', 'geographic'
        ]

        present_categories = set()
        for key in risk_data.keys():
            key_lower = key.lower()
            for category in expected_categories:
                if category in key_lower:
                    present_categories.add(category)

        return len(present_categories) / len(expected_categories)

    def _normalize_score(self, value: float, min_val: float = 0.0, max_val: float = 1.0) -> float:
        """Normalize a score to 0-1 range."""
        if max_val == min_val:
            return 0.0
        return max(0.0, min(1.0, (value - min_val) / (max_val - min_val)))

    def validate_input(self, risk_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate input data and return validation results."""
        validation_result = {
            "is_valid": True,
            "errors": [],
            "warnings": [],
            "data_summary": {}
        }

        # Check for empty data
        if not risk_data:
            validation_result["is_valid"] = False
            validation_result["errors"].append("Risk data is empty")
            return validation_result

        # Check data types
        numeric_fields = 0
        string_fields = 0
        none_fields = 0

        for key, value in risk_data.items():
            if value is None:
                none_fields += 1
            elif isinstance(value, (int, float)):
                numeric_fields += 1
            elif isinstance(value, str):
                string_fields += 1

        # Warnings for data quality issues
        if none_fields > len(risk_data) * 0.3:
            validation_result["warnings"].append("More than 30% of fields are None/null")

        if numeric_fields < len(risk_data) * 0.2:
            validation_result["warnings"].append("Less than 20% of fields are numeric")

        validation_result["data_summary"] = {
            "total_fields": len(risk_data),
            "numeric_fields": numeric_fields,
            "string_fields": string_fields,
            "none_fields": none_fields
        }

        return validation_result