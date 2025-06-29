import json
import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, Generic, List, Optional, Type, TypeVar

from fastapi import Request
from pydantic import BaseModel

from app.models.agent_context import AgentContext
from app.models.agent_headers import AuthContext, OlorinHeader
from app.models.upi_response import Metadata
from app.service.agent_service import ainvoke_agent
from app.service.config import get_settings_for_env
from app.utils.auth_utils import get_auth_token
from app.utils.constants import LIST_FIELDS_PRIORITY, MAX_PROMPT_TOKENS
from app.utils.prompt_utils import trim_prompt_to_token_limit

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class BaseLLMRiskService(ABC, Generic[T]):
    """
    Generic base service for LLM-based risk assessments.

    This class provides common functionality for all risk assessment domains:
    - Error handling and fallback logic
    - Token management and prompt trimming
    - Agent context creation
    - Structured output validation
    - Consistent error categorization
    """

    def __init__(self):
        self.settings = get_settings_for_env()

    @abstractmethod
    def get_agent_name(self) -> str:
        """Return the agent name for this risk assessment type."""
        pass

    @abstractmethod
    def get_assessment_model_class(self) -> Type[T]:
        """Return the Pydantic model class for the assessment result."""
        pass

    @abstractmethod
    def get_system_prompt_template(self) -> str:
        """Return the system prompt template with {{MODEL_SCHEMA}} placeholder."""
        pass

    @abstractmethod
    def prepare_prompt_data(
        self, user_id: str, extracted_signals: List[Dict[str, Any]], **kwargs
    ) -> Dict[str, Any]:
        """Prepare the data to be included in the LLM prompt."""
        pass

    @abstractmethod
    def create_fallback_assessment(
        self,
        user_id: str,
        extracted_signals: List[Dict[str, Any]],
        error_type: str,
        error_message: str,
        **kwargs,
    ) -> T:
        """Create a fallback assessment when LLM fails."""
        pass

    def get_interaction_group_id(self, user_id: str) -> str:
        """Generate interaction group ID for this assessment type."""
        assessment_type = (
            self.__class__.__name__.lower()
            .replace("llmservice", "")
            .replace("service", "")
        )
        return f"{assessment_type}-risk-assessment-{user_id}"

    def create_agent_context(
        self, user_id: str, request: Request, llm_input_prompt: str, **kwargs
    ) -> AgentContext:
        """Create the agent context for LLM invocation."""
        app_olorin_userid, app_olorin_token, app_olorin_realmid = get_auth_token()

        # Generate appropriate transaction ID based on assessment type
        assessment_type = (
            self.__class__.__name__.lower()
            .replace("llmservice", "")
            .replace("service", "")
        )
        default_tid = f"olorin-{assessment_type}-risk-{user_id}"
<<<<<<< HEAD:back/app/service/base_llm_risk_service.py

        # Create metadata with required fields for LangGraph workflow
        additional_metadata = {
            "userId": user_id,
            "entity_id": user_id,  # Use user_id as entity_id for LLM services
            "entityId": user_id,  # Alternative field name
            "entity_type": "user_id",  # Default entity type for LLM services
            "entityType": "user_id",  # Alternative field name
        }

        # Extract investigation_id and entity_type from kwargs if provided
        investigation_id = kwargs.get("investigation_id")
        if investigation_id:
            additional_metadata["investigation_id"] = investigation_id
            additional_metadata["investigationId"] = investigation_id

        # Allow override of entity_type if provided in kwargs
        entity_type = kwargs.get("entity_type", "user_id")
        additional_metadata["entity_type"] = entity_type
        additional_metadata["entityType"] = entity_type

        # Handle case where request is None (e.g., when called from LangGraph agents)
        if request is not None and hasattr(request, "headers"):
            olorin_tid = request.headers.get("olorin-tid", default_tid)
            olorin_originating_assetalias = request.headers.get(
                "olorin_originating_assetalias",
                self.settings.olorin_originating_assetalias,
            )
            olorin_experience_id = request.headers.get(
                "olorin_experience_id",
                getattr(self.settings, "olorin_experience_id", None),
            )
        else:
            # Use defaults when request is None
            olorin_tid = default_tid
            olorin_originating_assetalias = self.settings.olorin_originating_assetalias
            olorin_experience_id = getattr(self.settings, "olorin_experience_id", None)
=======
>>>>>>> restructure-projects:olorin-server/app/service/base_llm_risk_service.py

        return AgentContext(
            input=llm_input_prompt,
            agent_name=self.get_agent_name(),
            metadata=Metadata(
                interactionGroupId=self.get_interaction_group_id(user_id),
                additionalMetadata=additional_metadata,
            ),
<<<<<<< HEAD:back/app/service/base_llm_risk_service.py
            olorin_header=OlorinHeader(
                olorin_tid=olorin_tid,
                olorin_originating_assetalias=olorin_originating_assetalias,
                olorin_experience_id=olorin_experience_id,
=======
            olorin_header=OlorinHeader(
                olorin_tid=request.headers.get("olorin-tid", default_tid),
                olorin_originating_assetalias=request.headers.get(
                    "olorin_originating_assetalias",
                    self.settings.olorin_originating_assetalias,
                ),
                olorin_experience_id=request.headers.get(
                    "olorin_experience_id",
                    getattr(self.settings, "olorin_experience_id", None),
                ),
>>>>>>> restructure-projects:olorin-server/app/service/base_llm_risk_service.py
                auth_context=AuthContext(
                    olorin_user_id=app_olorin_userid,
                    olorin_user_token=app_olorin_token,
                    olorin_realmid=app_olorin_realmid,
                ),
            ),
        )

    def categorize_error(self, error_str: str) -> tuple[List[str], str, str]:
        """Categorize LLM errors and return appropriate risk factors, summary, and thoughts."""
        if "External service dependency call failed" in error_str:
            return (
                ["LLM service temporarily unavailable"],
                "LLM service is experiencing issues. Assessment based on available data patterns.",
                "LLM service unavailable - using rule-based fallback assessment.",
            )
        elif "400" in error_str and "error_message" in error_str:
            return (
                ["LLM service error - invalid request format"],
                "LLM service rejected the request format. Assessment based on data patterns.",
                "LLM request format issue - using rule-based fallback assessment.",
            )
        elif "timeout" in error_str.lower() or "connection" in error_str.lower():
            return (
                ["LLM service timeout or connection error"],
                "LLM service connection timeout. Assessment based on available data.",
                "LLM service timeout - using rule-based fallback assessment.",
            )
        else:
            return (
                [f"LLM invocation/validation error: {error_str}"],
                f"Error during LLM risk assessment: {error_str}",
                "No LLM assessment due to LLM invocation/validation error.",
            )

    async def assess_risk(
        self,
        user_id: str,
        extracted_signals: List[Dict[str, Any]],
        request: Request,
        **kwargs,
    ) -> T:
        """Assess risk using LLM."""
        try:
            # Build agent context
            agent_context = self._build_agent_context(
                user_id=user_id,
                extracted_signals=extracted_signals,
                request=request,
                **kwargs,
            )

            # Get assessment type for logging
            assessment_type = (
                self.__class__.__name__.replace("LLMService", "")
                .replace("Service", "")
                .lower()
            )
            logger.info(
                f"Invoking LLM for {assessment_type} risk assessment for user {user_id}"
            )

            # Use agent infrastructure for LLM calls (like refactor branch)
            raw_llm_response_str, _ = await ainvoke_agent(request, agent_context)

            logger.debug(
                f"Raw LLM response for {assessment_type} risk for {user_id}: {raw_llm_response_str}"
            )

            # Parse the response and handle nested risk_assessment
            try:
                parsed_response = json.loads(raw_llm_response_str)
                assessment_data = parsed_response.get(
                    "risk_assessment", parsed_response
                )
            except json.JSONDecodeError as json_err:
                logger.error(
                    f"LLM JSON parsing error for {assessment_type} risk for {user_id}: {json_err}. "
                    f"Raw response was: {raw_llm_response_str[:500]}...",
                    exc_info=True,
                )
                return self.create_fallback_assessment(
                    user_id=user_id,
                    extracted_signals=extracted_signals,
                    error_type="json_parse_error",
                    error_message=f"LLM response not valid JSON: {str(json_err)}",
                    **kwargs,
                )

            # Validate and parse response
            try:
                assessment = self.get_assessment_model_class().model_validate(
                    assessment_data
                )
            except Exception as validation_err:
                logger.error(
                    f"LLM response validation error for {assessment_type} risk for {user_id}: {validation_err}",
                    exc_info=True,
                )
                return self.create_fallback_assessment(
                    user_id=user_id,
                    extracted_signals=extracted_signals,
                    error_type="validation_error",
                    error_message=f"LLM response validation error: {str(validation_err)}",
                    **kwargs,
                )

            logger.info(
                f"LLM {assessment_type} risk assessment successful for user {user_id}"
            )
            return assessment

        except Exception as llm_err:
            error_str = str(llm_err)
            assessment_type = (
                self.__class__.__name__.replace("LLMService", "")
                .replace("Service", "")
                .lower()
            )
            logger.error(
                f"LLM invocation or validation error for {assessment_type} risk for {user_id}: {llm_err}",
                exc_info=True,
            )

            return self.create_fallback_assessment(
                user_id=user_id,
                extracted_signals=extracted_signals,
                error_type="llm_error",
                error_message=f"LLM invocation/validation error: {error_str}",
                **kwargs,
            )

    def _build_agent_context(
        self,
        user_id: str,
        extracted_signals: List[Dict[str, Any]],
        request: Request,
        **kwargs,
    ) -> AgentContext:
        """Build the agent context for LLM invocation, including prompt preparation."""
        # Prepare the prompt data using the domain-specific implementation
        prompt_info = self.prepare_prompt_data(
            user_id=user_id,
            extracted_signals=extracted_signals,
            **kwargs,
        )

        # Extract the prepared prompt or create one from the data
        if isinstance(prompt_info, dict) and "llm_input_prompt" in prompt_info:
            llm_input_prompt = prompt_info["llm_input_prompt"]
        else:
            # If no specific prompt is provided, create one from the prompt data
            prompt_data = (
                prompt_info if isinstance(prompt_info, dict) else {"data": prompt_info}
            )

            # Get the system prompt template and replace placeholder with model schema
            system_prompt = self.get_system_prompt_template()

            # Get the model schema
            model_class = self.get_assessment_model_class()
            model_schema = model_class.model_json_schema()

            # Replace the placeholder with the actual schema
            system_prompt = system_prompt.replace(
                "{{MODEL_SCHEMA}}", json.dumps(model_schema, indent=2)
            )

            # Create the full prompt
            llm_input_prompt = f"{system_prompt}\n\nData to analyze:\n{json.dumps(prompt_data, indent=2)}"

        # Create and return the agent context
        return self.create_agent_context(
            user_id=user_id,
            request=request,
            llm_input_prompt=llm_input_prompt,
            **kwargs,
        )
