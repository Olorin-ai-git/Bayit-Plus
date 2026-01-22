"""
AI Agent Service
Core service for CV analysis using Anthropic Claude API
"""

import logging
from typing import Dict

from anthropic import AsyncAnthropic

from app.core.config import get_settings
from app.services.ai_agent.parser import parse_analysis_response
from app.services.ai_agent.prompts import build_analysis_prompt, build_generation_prompt

logger = logging.getLogger(__name__)
settings = get_settings()


class AIAgentService:
    """
    AI Agent service for CV analysis
    Follows Olorin AI Agent patterns with LangChain orchestration
    """

    def __init__(self):
        self.client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.model = settings.anthropic_model
        self.max_tokens = settings.anthropic_max_tokens

    async def analyze_cv(self, cv_text: str, language: str = "en") -> Dict:
        """
        Analyze CV text using Claude AI
        Returns structured analysis results

        Args:
            cv_text: Extracted text from CV
            language: Language code (default: en)

        Returns:
            Dict with analysis results
        """
        logger.info("Starting CV analysis", extra={"language": language, "text_length": len(cv_text)})

        try:
            # Create analysis prompt
            prompt = build_analysis_prompt(cv_text, language)

            # Call Claude API
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                temperature=0.3,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )

            # Extract response text
            analysis_text = response.content[0].text

            # Parse structured output
            analysis = parse_analysis_response(analysis_text)

            logger.info("CV analysis completed successfully", extra={
                "skills_count": len(analysis.get("skills", [])),
                "completeness_score": analysis.get("completeness_score"),
            })

            return analysis

        except Exception as e:
            logger.error(f"CV analysis failed: {e}", exc_info=True)
            raise

    async def generate_cv_content(
        self,
        user_data: Dict,
        template: str = "professional",
        language: str = "en"
    ) -> str:
        """
        Generate CV content from user data
        Uses Claude to create professional CV text

        Args:
            user_data: User profile data
            template: CV template style
            language: Target language

        Returns:
            Generated CV content as formatted text
        """
        logger.info("Generating CV content", extra={"template": template, "language": language})

        try:
            prompt = build_generation_prompt(user_data, template, language)

            response = await self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                temperature=0.7,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )

            cv_content = response.content[0].text

            logger.info("CV content generated successfully")

            return cv_content

        except Exception as e:
            logger.error(f"CV generation failed: {e}", exc_info=True)
            raise
