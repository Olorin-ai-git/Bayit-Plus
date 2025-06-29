import json
import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, Generic, List, Optional, Type, TypeVar

from fastapi import Request
from pydantic import BaseModel

from app.models.agent_context import AgentContext
from app.models.agent_headers import AuthContext, IntuitHeader
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
        self, user_id: str, request: Request, llm_input_prompt: str
    ) -> AgentContext:
        """Create the agent context for LLM invocation."""
        app_intuit_userid, app_intuit_token, app_intuit_realmid = get_auth_token()

        # Generate appropriate transaction ID based on assessment type
        assessment_type = (
            self.__class__.__name__.lower()
            .replace("llmservice", "")
            .replace("service", "")
        )
        default_tid = f"gaia-{assessment_type}-risk-{user_id}"

        return AgentContext(
            input=llm_input_prompt,
            agent_name=self.get_agent_name(),
            metadata=Metadata(
                interactionGroupId=self.get_interaction_group_id(user_id),
                additionalMetadata={"userId": user_id},
            ),
            intuit_header=IntuitHeader(
                intuit_tid=request.headers.get("intuit-tid", default_tid),
                intuit_originating_assetalias=request.headers.get(
                    "intuit_originating_assetalias",
                    self.settings.intuit_originating_assetalias,
                ),
                intuit_experience_id=request.headers.get(
                    "intuit_experience_id",
                    getattr(self.settings, "intuit_experience_id", None),
                ),
                auth_context=AuthContext(
                    intuit_user_id=app_intuit_userid,
                    intuit_user_token=app_intuit_token,
                    intuit_realmid=app_intuit_realmid,
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
        """
        Main method to assess risk using LLM.

        Args:
            user_id: The user ID being assessed
            extracted_signals: The extracted signals/data for assessment
            request: The FastAPI request object
            **kwargs: Additional domain-specific parameters

        Returns:
            Assessment result of type T
        """
        # Prepare prompt data
        prompt_data = self.prepare_prompt_data(user_id, extracted_signals, **kwargs)

        # Prepare system prompt
        system_prompt = self.get_system_prompt_template().replace(
            "{{MODEL_SCHEMA}}",
            json.dumps(self.get_assessment_model_class().model_json_schema()),
        )

        # Trim prompt to token limit
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
            assessment_type = (
                self.__class__.__name__.replace("LLMService", "")
                .replace("Service", "")
                .lower()
            )
            logger.info(
                f"Invoking LLM for {assessment_type} risk assessment for user {user_id}"
            )

            # Invoke LLM
            raw_llm_response_str, _ = await ainvoke_agent(request, agent_context)

            logger.debug(
                f"Raw LLM response for {assessment_type} risk for {user_id}: {raw_llm_response_str}"
            )

            # Validate and parse response
            assessment = self.get_assessment_model_class().model_validate_json(
                raw_llm_response_str
            )

            logger.info(
                f"LLM {assessment_type} risk assessment successful for user {user_id}"
            )
            return assessment

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
                error_message=str(json_err),
                **kwargs,
            )

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
                error_message=error_str,
                **kwargs,
            )
