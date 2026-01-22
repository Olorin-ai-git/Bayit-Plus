"""
AI Agent Prompts
Prompt templates for CV analysis and generation
"""

import json
from typing import Dict


def build_analysis_prompt(cv_text: str, language: str) -> str:
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


def build_generation_prompt(user_data: Dict, template: str, language: str) -> str:
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
