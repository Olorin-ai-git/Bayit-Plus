"""
User Audiobook Actions API Routes

Endpoints for user interactions with audiobooks: favorites, ratings, watchlist.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.security import get_current_user
from app.models.user_audiobook import (
    UserAudiobook,
    UserAudiobookReview,
    UserAudiobookActionType,
)

router = APIRouter(prefix="/user/audiobooks", tags=["user_audiobooks"])


class AddToFavoritesRequest(BaseModel):
    """Request to add audiobook to favorites"""
    audiobook_id: str


class RateAudiobookRequest(BaseModel):
    """Request to rate an audiobook"""
    audiobook_id: str
    rating: int = Field(..., ge=1, le=5, description="Rating 1-5 stars")


class AddReviewRequest(BaseModel):
    """Request to add/update audiobook review"""
    audiobook_id: str
    rating: int = Field(..., ge=1, le=5)
    review_text: Optional[str] = None


class UserAudiobookResponse(BaseModel):
    """Response with user's audiobook interaction"""
    audiobook_id: str
    is_favorite: bool
    rating: Optional[int] = None
    in_watchlist: bool


@router.post("/favorites", response_model=UserAudiobookResponse)
async def add_to_favorites(
    request: AddToFavoritesRequest,
    user_id: str = Depends(get_current_user),
):
    """Add audiobook to user's favorites"""
    user_audiobook = await UserAudiobook.find_one(
        {"user_id": user_id, "audiobook_id": request.audiobook_id}
    )

    if not user_audiobook:
        user_audiobook = UserAudiobook(
            user_id=user_id,
            audiobook_id=request.audiobook_id,
            is_favorite=True,
            last_action_type=UserAudiobookActionType.FAVORITE,
        )
    else:
        user_audiobook.is_favorite = True
        user_audiobook.last_action_type = UserAudiobookActionType.FAVORITE

    await user_audiobook.save()

    return UserAudiobookResponse(
        audiobook_id=user_audiobook.audiobook_id,
        is_favorite=user_audiobook.is_favorite,
        rating=user_audiobook.rating,
        in_watchlist=user_audiobook.in_watchlist,
    )


@router.delete("/favorites/{audiobook_id}", response_model=UserAudiobookResponse)
async def remove_from_favorites(
    audiobook_id: str,
    user_id: str = Depends(get_current_user),
):
    """Remove audiobook from user's favorites"""
    user_audiobook = await UserAudiobook.find_one(
        {"user_id": user_id, "audiobook_id": audiobook_id}
    )

    if not user_audiobook:
        raise HTTPException(status_code=404, detail="Audiobook not in favorites")

    user_audiobook.is_favorite = False
    user_audiobook.last_action_type = UserAudiobookActionType.UNFAVORITE
    await user_audiobook.save()

    return UserAudiobookResponse(
        audiobook_id=user_audiobook.audiobook_id,
        is_favorite=user_audiobook.is_favorite,
        rating=user_audiobook.rating,
        in_watchlist=user_audiobook.in_watchlist,
    )


@router.get("/favorites", response_model=List[UserAudiobookResponse])
async def get_favorites(
    user_id: str = Depends(get_current_user),
    skip: int = 0,
    limit: int = 20,
):
    """Get user's favorite audiobooks"""
    favorites = await UserAudiobook.find(
        {"user_id": user_id, "is_favorite": True}
    ).skip(skip).limit(limit).to_list()

    return [
        UserAudiobookResponse(
            audiobook_id=fav.audiobook_id,
            is_favorite=fav.is_favorite,
            rating=fav.rating,
            in_watchlist=fav.in_watchlist,
        )
        for fav in favorites
    ]


@router.post("/rate", response_model=UserAudiobookResponse)
async def rate_audiobook(
    request: RateAudiobookRequest,
    user_id: str = Depends(get_current_user),
):
    """Rate an audiobook (1-5 stars)"""
    user_audiobook = await UserAudiobook.find_one(
        {"user_id": user_id, "audiobook_id": request.audiobook_id}
    )

    if not user_audiobook:
        user_audiobook = UserAudiobook(
            user_id=user_id,
            audiobook_id=request.audiobook_id,
            rating=request.rating,
            last_action_type=UserAudiobookActionType.RATE,
        )
    else:
        user_audiobook.rating = request.rating
        user_audiobook.last_action_type = UserAudiobookActionType.RATE

    await user_audiobook.save()

    return UserAudiobookResponse(
        audiobook_id=user_audiobook.audiobook_id,
        is_favorite=user_audiobook.is_favorite,
        rating=user_audiobook.rating,
        in_watchlist=user_audiobook.in_watchlist,
    )


@router.post("/reviews", response_model=dict)
async def add_review(
    request: AddReviewRequest,
    user_id: str = Depends(get_current_user),
):
    """Add or update audiobook review"""
    existing_review = await UserAudiobookReview.find_one(
        {"user_id": user_id, "audiobook_id": request.audiobook_id}
    )

    if existing_review:
        existing_review.rating = request.rating
        existing_review.review_text = request.review_text
        await existing_review.save()
        review = existing_review
    else:
        review = UserAudiobookReview(
            user_id=user_id,
            audiobook_id=request.audiobook_id,
            rating=request.rating,
            review_text=request.review_text,
        )
        await review.save()

    return {
        "audiobook_id": review.audiobook_id,
        "rating": review.rating,
        "created_at": review.created_at,
    }


@router.get("/reviews/{audiobook_id}", response_model=List[dict])
async def get_reviews(
    audiobook_id: str,
    skip: int = 0,
    limit: int = 20,
):
    """Get all reviews for an audiobook"""
    reviews = await UserAudiobookReview.find(
        {"audiobook_id": audiobook_id}
    ).skip(skip).limit(limit).to_list()

    return [
        {
            "user_id": review.user_id,
            "rating": review.rating,
            "review_text": review.review_text,
            "helpful_count": review.helpful_count,
            "created_at": review.created_at,
        }
        for review in reviews
    ]
