import json
import logging
from app.service.logging import get_bridge_logger
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import Request

from app.service.base_llm_risk_service import BaseLLMRiskService
from app.utils.prompts import SYSTEM_PROMPT_FOR_LOCATION_RISK

logger = get_bridge_logger(__name__)


# Define a simple location risk assessment model since it's not using a Pydantic model
class LocationRiskAssessment:
    """Simple class to represent location risk assessment result."""

    def __init__(
        self,
        risk_level: float,
        risk_factors: List[str],
        confidence: float,
        summary: str,
        timestamp: str,
        thoughts: Optional[str] = None,
    ):
        self.risk_level = risk_level
        self.risk_factors = risk_factors
        self.confidence = confidence
        self.summary = summary
        self.timestamp = timestamp
        self.thoughts = thoughts

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for response."""
        result = {
            "risk_level": self.risk_level,
            "risk_factors": self.risk_factors,
            "confidence": self.confidence,
            "summary": self.summary,
            "timestamp": self.timestamp,
        }
        if self.thoughts:
            result["thoughts"] = self.thoughts
        return result


class LLMLocationRiskService(BaseLLMRiskService[LocationRiskAssessment]):
    """Service for LLM-based location risk assessment."""

    def get_agent_name(self) -> str:
        """Return the agent name for location risk assessment."""
        return "Olorin.cas.hri.olorin:location-risk-analyzer"

    def get_assessment_model_class(self):
        """Return the assessment class for location risk assessment."""
        return LocationRiskAssessment

    def get_system_prompt_template(self) -> str:
        """Return the system prompt template for location risk assessment."""
        return SYSTEM_PROMPT_FOR_LOCATION_RISK

    def prepare_prompt_data(
        self, user_id: str, extracted_signals: List[Dict[str, Any]], **kwargs
    ) -> Dict[str, Any]:
        """Prepare the data to be included in the location risk LLM prompt."""
        prompt_data = {
            "user_id": user_id,
            "retrieved_locations": extracted_signals,  # Using master branch field name
            "num_device_locations": len(extracted_signals),
        }

        # Add OII data integration (restored from master branch)
        oii_results = kwargs.get("oii_results", [])
        if oii_results:
            prompt_data["oii_data_summary"] = [
                self._convert_to_dict(oii) for oii in oii_results
            ]
            prompt_data["oii_locations"] = [
                self._convert_to_dict(oii) for oii in oii_results
            ]

        # Add vector search results with proper field name from master branch
        vector_search_results = kwargs.get("vector_search_results")
        if vector_search_results:
            prompt_data["vector_search_analysis"] = vector_search_results

        return prompt_data

    def _convert_to_dict(self, obj):
        """Helper method to convert OII objects to dictionaries for LLM consumption."""
        if hasattr(obj, "model_dump"):
            return obj.model_dump()
        elif hasattr(obj, "__dict__"):
            return {k: v for k, v in obj.__dict__.items() if not k.startswith("_")}
        elif isinstance(obj, dict):
            return obj
        else:
            return str(obj)

    def create_fallback_assessment(
        self,
        user_id: str,
        extracted_signals: List[Dict[str, Any]],
        error_type: str,
        error_message: str,
        **kwargs,
    ) -> LocationRiskAssessment:
        """Create a fallback location risk assessment when LLM fails."""
        timestamp = datetime.now(timezone.utc).isoformat()

        if error_type == "json_parse_error":
            return LocationRiskAssessment(
                risk_level=0.0,
                risk_factors=["LLM response not valid JSON"],
                confidence=0.0,
                summary="LLM response was not valid JSON.",
                timestamp=timestamp,
                thoughts="No LLM assessment due to LLM JSON error.",
            )

        # For LLM errors, categorize and create intelligent fallback
        risk_factors, summary, thoughts = self.categorize_error(error_message)

        # Create rule-based fallback assessment with enhanced geographic detection
        fallback_risk_level = 0.0
        if (
            extracted_signals
        ):  # extracted_signals are device_locations for location domain
            unique_countries = set()
            unique_cities = set()
            unique_devices = set()

            for location in extracted_signals:
                # Check for country data in multiple possible field names
                country = (
                    location.get("true_ip_country")
                    or location.get("country")
                    or location.get("true_ip_geo")
                )
                if country:
                    unique_countries.add(str(country).upper())

                # Check for city data in multiple possible field names
                city = location.get("true_ip_city") or location.get("city")
                if city:
                    unique_cities.add(str(city).lower())

                # Check for device ID
                device_id = location.get("fuzzy_device_id")
                if device_id:
                    unique_devices.add(device_id)

                # Also check countries array if present
                if location.get("countries"):
                    for c in location["countries"]:
                        unique_countries.add(str(c).upper())

            # Enhanced geographic risk scoring with detailed information
            if len(unique_countries) > 2:
                fallback_risk_level = 0.7
                risk_factors.append(
                    f"Multiple countries detected in location signals: {', '.join(unique_countries)}"
                )
            elif len(unique_countries) > 1:
                fallback_risk_level = 0.5
                risk_factors.append(
                    f"Cross-country location activity: {', '.join(unique_countries)}"
                )

            # City diversity analysis
            if len(unique_cities) > 5:
                fallback_risk_level = max(fallback_risk_level, 0.4)
                risk_factors.append(
                    f"High geographic diversity: {len(unique_cities)} unique cities"
                )
            elif len(unique_cities) > 2:
                fallback_risk_level = max(fallback_risk_level, 0.3)
                risk_factors.append(
                    f"Multiple cities detected: {len(unique_cities)} locations"
                )

            # Device tracking across locations
            if len(unique_devices) > 2:
                fallback_risk_level = max(fallback_risk_level, 0.3)
                risk_factors.append(
                    f"Multiple devices across locations: {len(unique_devices)} unique devices"
                )

            # Provide baseline risk if we have any location data
            if unique_countries and fallback_risk_level == 0.0:
                fallback_risk_level = 0.3
                risk_factors.append(
                    "Location activity detected with geographic indicators"
                )

        return LocationRiskAssessment(
            risk_level=fallback_risk_level,
            risk_factors=risk_factors,
            confidence=0.0,
            summary=summary,
            timestamp=timestamp,
            thoughts=thoughts,
        )

    async def assess_risk(
        self,
        user_id: str,
        extracted_signals: List[Dict[str, Any]],
        request: Request,
        **kwargs,
    ) -> LocationRiskAssessment:
        """
        Override the base assess_risk method to handle location-specific parsing.

        Location domain doesn't use Pydantic models, so we need custom parsing.
        """
        # Prepare prompt data
        prompt_data = self.prepare_prompt_data(user_id, extracted_signals, **kwargs)

        # Prepare system prompt
        system_prompt = self.get_system_prompt_template().replace(
            "{{MODEL_SCHEMA}}",
            json.dumps(
                {
                    "type": "object",
                    "properties": {
                        "risk_assessment": {
                            "type": "object",
                            "properties": {
                                "risk_level": {"type": "number"},
                                "risk_factors": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                },
                                "confidence": {"type": "number"},
                                "summary": {"type": "string"},
                                "thoughts": {"type": "string"},
                            },
                        }
                    },
                }
            ),
        )

        # Trim prompt to token limit
        from app.utils.constants import LIST_FIELDS_PRIORITY, MAX_PROMPT_TOKENS
        from app.utils.prompt_utils import trim_prompt_to_token_limit

        prompt_data, llm_input_prompt, was_trimmed = trim_prompt_to_token_limit(
            prompt_data,
            system_prompt,
            MAX_PROMPT_TOKENS,
            LIST_FIELDS_PRIORITY,
        )

        if was_trimmed:
            logger.warning(f"Prompt was trimmed for user {user_id}")

        # Create agent context
        agent_context = self.create_agent_context(user_id, request, llm_input_prompt)

        try:
            logger.info(f"Invoking LLM for location risk assessment for user {user_id}")

            # Use agent infrastructure for LLM calls (like refactor branch)
            from app.service.agent_service import ainvoke_agent

            raw_llm_response_str, _ = await ainvoke_agent(request, agent_context)

            logger.debug(
                f"Raw LLM response for location risk for {user_id}: {raw_llm_response_str}"
            )

            # Parse the response (location domain specific)
            parsed_llm_response = json.loads(raw_llm_response_str)
            location_risk_assessment_data = parsed_llm_response.get("risk_assessment")

            if not location_risk_assessment_data:
                location_risk_assessment_data = parsed_llm_response

            if location_risk_assessment_data:
                timestamp = datetime.now(timezone.utc).isoformat()

                # Handle both "risk_level" and "risk_score" fields from LLM response
                risk_level = location_risk_assessment_data.get("risk_level")
                if risk_level is None:
                    risk_level = location_risk_assessment_data.get("risk_score", 0.0)

                assessment = LocationRiskAssessment(
                    risk_level=risk_level,
                    risk_factors=location_risk_assessment_data.get("risk_factors", []),
                    confidence=location_risk_assessment_data.get("confidence", 0.0),
                    summary=location_risk_assessment_data.get("summary", ""),
                    timestamp=timestamp,
                    thoughts=location_risk_assessment_data.get("thoughts"),
                )
            else:
                logger.warning(
                    f"LLM did not return 'risk_assessment' key for user {user_id}. Response: {raw_llm_response_str}"
                )
                assessment = LocationRiskAssessment(
                    risk_level=0.0,
                    risk_factors=["LLM assessment failed or malformed"],
                    confidence=0.0,
                    summary="Could not obtain LLM risk assessment.",
                    timestamp=datetime.now(timezone.utc).isoformat(),
                )

            logger.info(f"LLM location risk assessment successful for user {user_id}")
            return assessment

        except json.JSONDecodeError as json_err:
            logger.error(
                f"Failed to parse LLM JSON response for location risk: {json_err}. Response: {raw_llm_response_str}"
            )
            return self.create_fallback_assessment(
                user_id=user_id,
                extracted_signals=extracted_signals,
                error_type="json_parse_error",
                error_message=str(json_err),
                **kwargs,
            )

        except Exception as llm_err:
            logger.error(
                f"Error invoking LLM for location risk assessment: {llm_err}",
                exc_info=True,
            )
            return self.create_fallback_assessment(
                user_id=user_id,
                extracted_signals=extracted_signals,
                error_type="llm_error",
                error_message=str(llm_err),
                **kwargs,
            )

    async def assess_location_risk(
        self,
        user_id: str,
        device_locations: List[Dict[str, Any]],
        request: Request,
        vector_search_results: Optional[Any] = None,
        oii_results: Optional[List[Any]] = None,
    ) -> LocationRiskAssessment:
        """
        Assess location risk using LLM.

        This is the main public interface for location risk assessment.
        """
        return await self.assess_risk(
            user_id=user_id,
            extracted_signals=device_locations,
            request=request,
            vector_search_results=vector_search_results,
            oii_results=oii_results,
        )
