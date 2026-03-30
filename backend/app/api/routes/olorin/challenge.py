"""
Olorin.ai Video Challenge API

"Try It on This Video" — users nominate videos, community votes,
top-voted gets processed through the Olorin AI pipeline weekly.
Viral mechanic #2.
"""

from typing import List

from beanie import PydanticObjectId
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field

from app.core.logging_config import get_logger
from app.models.challenge_nomination import ChallengeNomination
from app.utils.video_url_utils import validate_video_url

logger = get_logger(__name__)

router = APIRouter()


class NominateRequest(BaseModel):
    """Nominate a video for the challenge."""

    video_url: str = Field(..., description="Video URL to nominate")
    title: str = Field(default="", description="Video title")
    reason: str = Field(
        default="", max_length=500,
        description="Why this video should be processed",
    )
    email: EmailStr = Field(..., description="Your email (for dedup)")


class NominationResponse(BaseModel):
    """A single nomination."""

    id: str
    video_url: str
    title: str
    reason: str
    vote_count: int
    status: str
    created_at: str


class ChallengeListResponse(BaseModel):
    """Current challenge nominations ranked by votes."""

    nominations: List[NominationResponse]
    total: int


class VoteRequest(BaseModel):
    """Vote for a nomination."""

    email: EmailStr = Field(..., description="Your email (one vote per)")


class VoteResponse(BaseModel):
    """Vote result."""

    nomination_id: str
    new_vote_count: int
    message: str


def _nomination_to_response(n: ChallengeNomination) -> NominationResponse:
    return NominationResponse(
        id=str(n.id),
        video_url=n.video_url,
        title=n.title,
        reason=n.reason,
        vote_count=n.vote_count,
        status=n.status,
        created_at=n.created_at.isoformat(),
    )


@router.post(
    "/nominate",
    response_model=NominationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Nominate a video",
)
async def nominate_video(
    request: NominateRequest,
) -> NominationResponse:
    """Nominate a video for the weekly challenge. No auth required."""
    ok, err = validate_video_url(request.video_url)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err,
        )

    existing = await ChallengeNomination.find_one(
        ChallengeNomination.video_url == request.video_url,
        ChallengeNomination.status == "active",
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This video has already been nominated",
        )

    nomination = ChallengeNomination(
        video_url=request.video_url,
        title=request.title,
        reason=request.reason,
        nominator_email=request.email,
        vote_count=1,
        voter_emails=[request.email],
    )
    await nomination.insert()

    logger.info(
        "Video nominated",
        extra={"url": request.video_url[:80]},
    )
    return _nomination_to_response(nomination)


@router.get(
    "/current",
    response_model=ChallengeListResponse,
    summary="Get current nominations",
)
async def get_current_challenge() -> ChallengeListResponse:
    """Get active nominations ranked by vote count. No auth required."""
    nominations = await ChallengeNomination.find(
        ChallengeNomination.status == "active",
    ).sort("-vote_count").limit(50).to_list()

    return ChallengeListResponse(
        nominations=[_nomination_to_response(n) for n in nominations],
        total=len(nominations),
    )


@router.post(
    "/vote/{nomination_id}",
    response_model=VoteResponse,
    summary="Vote for a nomination",
)
async def vote_for_nomination(
    nomination_id: str,
    request: VoteRequest,
) -> VoteResponse:
    """Vote for a nominated video. One vote per email per nomination."""
    nomination = await ChallengeNomination.get(
        PydanticObjectId(nomination_id),
    )
    if not nomination or nomination.status != "active":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nomination not found or no longer active",
        )

    if request.email in nomination.voter_emails:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already voted for this nomination",
        )

    nomination.voter_emails.append(request.email)
    nomination.vote_count += 1
    await nomination.save()

    return VoteResponse(
        nomination_id=nomination_id,
        new_vote_count=nomination.vote_count,
        message="Vote recorded",
    )
