"""
AI Agent Schemas
Pydantic models for CV analysis structured output
"""

from typing import Dict, List, Optional

from pydantic import BaseModel, Field


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
