"""
CV Document Models
MongoDB models for CV data and analysis
"""

from datetime import datetime
from typing import Optional, List, Dict
from beanie import Document, Indexed
from pydantic import Field
from pymongo import IndexModel, ASCENDING, DESCENDING


class CVAnalysis(Document):
    """CV analysis results from Olorin AI Agent"""

    cv_id: Indexed(str, unique=True)
    user_id: Indexed(str)

    # Analysis results
    skills: List[str] = Field(default_factory=list)
    experience_years: Optional[int] = None
    education_level: Optional[str] = None

    # Structured data extracted
    work_history: List[Dict] = Field(default_factory=list)
    education: List[Dict] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)

    # Quality metrics
    completeness_score: Optional[int] = None
    ats_score: Optional[int] = None

    # Recommendations
    recommendations: List[str] = Field(default_factory=list)
    missing_sections: List[str] = Field(default_factory=list)

    # AI Agent metadata
    ai_model: str = "claude-3-sonnet-20240229"
    analysis_version: str = "1.0"
    processing_time_ms: Optional[int] = None

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "cv_analyses"
        indexes = [
            IndexModel([("cv_id", ASCENDING)], unique=True),
            IndexModel([("user_id", ASCENDING)]),
            IndexModel(
                [("user_id", ASCENDING), ("created_at", DESCENDING)],
                name="idx_user_created"
            ),
            IndexModel(
                [("status", ASCENDING), ("created_at", DESCENDING)],
                name="idx_status_created"
            ),
        ]


class CV(Document):
    """CV document with file metadata and content"""

    user_id: Indexed(str)

    # File metadata
    filename: str
    original_filename: str
    file_format: str  # pdf, docx, txt
    file_size_bytes: int
    storage_url: str

    # Content
    extracted_text: Optional[str] = None
    structured_data: Optional[Dict] = None

    # Status
    status: str = "pending"  # pending, processing, completed, failed
    processing_error: Optional[str] = None

    # Analysis reference
    analysis_id: Optional[str] = None

    # Metadata
    language: str = "en"
    template: Optional[str] = None

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    processed_at: Optional[datetime] = None

    class Settings:
        name = "cvs"
        indexes = [
            IndexModel([("user_id", ASCENDING)]),
            IndexModel([("status", ASCENDING)]),
            IndexModel(
                [("user_id", ASCENDING), ("created_at", DESCENDING)],
                name="idx_user_created"
            ),
            IndexModel(
                [("status", ASCENDING), ("created_at", DESCENDING)],
                name="idx_status_created"
            ),
        ]
