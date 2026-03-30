"""
Challenge Nomination Model

"Try It on This Video" viral mechanic — users nominate videos,
community votes, winner gets processed through the Olorin pipeline.
"""

from datetime import datetime, timezone
from typing import List, Optional

from beanie import Document
from pydantic import Field


class ChallengeNomination(Document):
    """A user-nominated video for the weekly challenge."""

    video_url: str = Field(..., description="Nominated video URL")
    title: str = Field(default="", description="Video title")
    reason: str = Field(default="", description="Why this video")
    nominator_email: str = Field(..., description="Email of nominator")
    vote_count: int = Field(default=0)
    voter_emails: List[str] = Field(
        default_factory=list,
        description="Emails that have voted (dedup)",
    )
    status: str = Field(
        default="active",
        description="active | winner | processed | expired",
    )
    content_id: Optional[str] = Field(
        default=None,
        description="Content ID after processing (winner only)",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )

    class Settings:
        name = "challenge_nominations"
        indexes = [
            "status",
            "vote_count",
            "nominator_email",
        ]
