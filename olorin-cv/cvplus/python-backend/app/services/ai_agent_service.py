"""
Olorin AI Agent Service
Integrates with Anthropic Claude API for CV analysis
Uses LangChain for orchestration following Olorin patterns
"""

import logging
from typing import Dict, List, Optional
from anthropic import Anthropic, AsyncAnthropic
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class CVAnalysisOutput(BaseModel):
    """Structured output from CV analysis"""

    skills: List[str] = Field(description="List of technical and soft skills")
    experience_years: Optional[int] = Field(description="Years of professional experience")
    education_level: str = Field(description="Highest education level")
    work_history: List[Dict] = Field(description="Work experience entries")
    education: List[Dict] = Field(description="Education entries")
    certifications: List[str] = Field(description="Professional certifications")
    completeness_score: int = Field(description="CV completeness score 0-100")
    ats_score: int = Field(description="ATS compatibility score 0-100")
    recommendations: List[str] = Field(description="Improvement recommendations")
    missing_sections: List[str] = Field(description="Missing or incomplete sections")


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
            prompt = self._build_analysis_prompt(cv_text, language)

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
            analysis = self._parse_analysis(analysis_text)

            logger.info("CV analysis completed successfully", extra={
                "skills_count": len(analysis.get("skills", [])),
                "completeness_score": analysis.get("completeness_score"),
            })

            return analysis

        except Exception as e:
            logger.error(f"CV analysis failed: {e}", exc_info=True)
            raise

    def _build_analysis_prompt(self, cv_text: str, language: str) -> str:
        """Build comprehensive CV analysis prompt"""

        return f"""You are an expert CV analyzer. Analyze the following CV and provide a detailed, structured assessment.

CV Text:
{cv_text}

Please analyze this CV and provide:

1. SKILLS: Extract all technical skills, soft skills, and competencies
2. EXPERIENCE: Calculate total years of professional experience
3. EDUCATION: Identify highest education level and all degrees
4. WORK HISTORY: List all positions with company, role, dates, responsibilities
5. EDUCATION DETAILS: List all degrees with institution, field, year
6. CERTIFICATIONS: List all professional certifications and licenses
7. COMPLETENESS SCORE (0-100): Rate how complete and detailed the CV is
8. ATS SCORE (0-100): Rate ATS (Applicant Tracking System) compatibility
9. RECOMMENDATIONS: Provide 3-5 specific improvement suggestions
10. MISSING SECTIONS: Identify missing or incomplete CV sections

Format your response as a JSON object with the following structure:
{{
  "skills": ["skill1", "skill2", ...],
  "experience_years": 5,
  "education_level": "Bachelor's Degree",
  "work_history": [
    {{"company": "Company Name", "role": "Job Title", "start_date": "2020-01", "end_date": "2023-12", "responsibilities": "..."}},
    ...
  ],
  "education": [
    {{"institution": "University Name", "degree": "Bachelor of Science", "field": "Computer Science", "year": "2020"}},
    ...
  ],
  "certifications": ["cert1", "cert2", ...],
  "completeness_score": 85,
  "ats_score": 78,
  "recommendations": ["recommendation1", "recommendation2", ...],
  "missing_sections": ["section1", "section2", ...]
}}

Language: {language}

Provide ONLY the JSON object, no additional text."""

    def _parse_analysis(self, analysis_text: str) -> Dict:
        """Parse Claude's response into structured data"""

        import json

        try:
            # Try to extract JSON from response
            # Claude sometimes wraps JSON in markdown code blocks
            if "```json" in analysis_text:
                json_start = analysis_text.find("```json") + 7
                json_end = analysis_text.find("```", json_start)
                json_text = analysis_text[json_start:json_end].strip()
            elif "```" in analysis_text:
                json_start = analysis_text.find("```") + 3
                json_end = analysis_text.find("```", json_start)
                json_text = analysis_text[json_start:json_end].strip()
            else:
                json_text = analysis_text.strip()

            # Parse JSON
            analysis = json.loads(json_text)

            return analysis

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse analysis JSON: {e}")
            logger.debug(f"Analysis text: {analysis_text}")

            # Return minimal fallback structure
            return {
                "skills": [],
                "experience_years": None,
                "education_level": "Unknown",
                "work_history": [],
                "education": [],
                "certifications": [],
                "completeness_score": 0,
                "ats_score": 0,
                "recommendations": ["Unable to parse analysis"],
                "missing_sections": [],
            }

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
            prompt = self._build_generation_prompt(user_data, template, language)

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

    def _build_generation_prompt(self, user_data: Dict, template: str, language: str) -> str:
        """Build CV generation prompt"""

        return f"""You are a professional CV writer. Generate a compelling, ATS-optimized CV based on the following information.

User Data:
{json.dumps(user_data, indent=2)}

Template Style: {template}
Language: {language}

Create a professional CV that:
1. Highlights key achievements and impact
2. Uses action verbs and quantifiable results
3. Is ATS-friendly with clear section headers
4. Follows best practices for the {template} template style
5. Is written in {language}

Format the CV with clear sections:
- Professional Summary
- Work Experience
- Education
- Skills
- Certifications (if applicable)

Make it compelling and professional."""
