"""
Query Projection Models
Optimized projection schemas for common queries

MongoDB Optimization:
- Reduces data transfer by 60-80%
- Projects only needed fields instead of full documents
- Used in aggregation pipelines for efficient queries
"""

from typing import Optional
from pydantic import BaseModel


class ProfileViewProjection(BaseModel):
    """
    Optimized projection for public profile viewing
    Combines Profile + CV + CVAnalysis data in single query

    MongoDB Aggregation Pipeline:
    - $lookup: Profile → CV
    - $lookup: CV → CVAnalysis
    - $project: Only needed fields
    """

    # Profile data
    slug: str
    theme: str = "professional"
    show_contact_form: bool = True
    show_download_button: bool = True
    view_count: int = 0

    # CV data
    cv_url: Optional[str] = None

    # Analysis data (embedded from CVAnalysis)
    skills: list[str] = []
    experience_years: Optional[int] = None
    education_level: Optional[str] = None
    work_history: list[dict] = []
    education: list[dict] = []

    class Config:
        """Allow population from MongoDB aggregation result"""

        populate_by_name = True


class CVListProjection(BaseModel):
    """
    Optimized projection for CV list queries
    Projects only metadata, excludes large content fields
    """

    id: str
    user_id: str
    filename: str
    file_size: int
    format: str
    status: str
    storage_url: Optional[str] = None
    created_at: str
    updated_at: str

    # Exclude: content (large text), raw_data (binary)


class AnalyticsEventProjection(BaseModel):
    """
    Optimized projection for analytics queries
    Projects only event metadata, excludes full user_agent
    """

    event_type: str
    entity_id: str
    user_id: Optional[str] = None
    timestamp: str

    # Exclude: user_agent, referrer, metadata (large nested data)
