"""Training content assignment model."""

from datetime import datetime, timezone
from typing import List, Optional, Union

from beanie import Document
from pydantic import Field
from pymongo import ASCENDING, IndexModel


class TrainingAssignment(Document):
    """Links content to employees with required/optional and due dates."""

    partner_id: str = Field(..., description="Organization partner_id")
    content_id: str = Field(..., description="Content document ID")
    assigned_to: Union[List[str], str] = Field(
        ...,
        description="List of TrainingUser IDs, or 'all' for everyone",
    )
    required: bool = Field(
        default=False,
        description="Whether completion is mandatory",
    )
    due_date: Optional[datetime] = Field(
        default=None,
        description="Completion deadline (None = no deadline)",
    )
    tags: List[str] = Field(default_factory=list)

    created_by: str = Field(
        ..., description="Admin TrainingUser ID who created this"
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    class Settings:
        name = "training_assignments"
        indexes = [
            "partner_id",
            IndexModel(
                [("partner_id", ASCENDING), ("content_id", ASCENDING)],
                unique=True,
                name="partner_content_unique",
            ),
        ]
