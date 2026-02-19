"""
Movie Interactions API Routes

Endpoints for the Movie Interactions Hub in Zeh Ani.
Users can tag movies for character extraction, browse tagged movies,
view characters, and get question suggestions for dialogue.
"""

from typing import List

from bson import ObjectId
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    status,
)

from app.core.logging_config import get_logger
from app.core.rate_limiter import RATE_LIMITS, limiter
from app.core.security import get_current_user
from app.models.content import Content
from app.models.movie_interaction import (
    CharacterQuestionsResponse,
    InteractableMovie,
    MovieTagRequest,
    MovieTagStatus,
)
from app.models.user import User
from app.services.vod_interaction.character_extractor import (
    character_extractor_service,
)
from app.services.vod_interaction.question_templates import (
    get_questions_for_character,
)

logger = get_logger(__name__)

router = APIRouter(
    prefix="/movie-interactions",
    tags=["Movie Interactions"],
)

_TAG_JOBS: dict[str, str] = {}


async def _run_extraction(content_id: str) -> None:
    """Background task: extract characters and update Content."""
    _TAG_JOBS[content_id] = "processing"
    try:
        content = await Content.get(ObjectId(content_id))
        if not content:
            _TAG_JOBS[content_id] = "failed"
            return

        characters = await character_extractor_service.extract_characters(
            content
        )
        if not characters:
            _TAG_JOBS[content_id] = "failed"
            return

        content.interactive_characters = characters
        content.supports_avatar_interaction = True
        await content.save()

        _TAG_JOBS[content_id] = "ready"
        logger.info(
            "Character extraction complete",
            extra={
                "content_id": content_id,
                "character_count": len(characters),
            },
        )
    except Exception:
        _TAG_JOBS[content_id] = "failed"
        logger.exception(
            "Character extraction failed",
            extra={"content_id": content_id},
        )


@router.post(
    "/tag",
    response_model=MovieTagStatus,
    status_code=status.HTTP_202_ACCEPTED,
)
async def tag_movie(
    request: MovieTagRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
) -> MovieTagStatus:
    """Tag a movie to trigger background character extraction."""
    content = await Content.get(ObjectId(request.content_id))
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found",
        )

    if content.interactive_characters:
        return MovieTagStatus(
            content_id=request.content_id,
            status="ready",
            characters=content.interactive_characters,
        )

    current = _TAG_JOBS.get(request.content_id)
    if current == "processing":
        return MovieTagStatus(
            content_id=request.content_id,
            status="processing",
        )

    _TAG_JOBS[request.content_id] = "processing"
    background_tasks.add_task(_run_extraction, request.content_id)

    logger.info(
        "Movie tagged for extraction",
        extra={
            "content_id": request.content_id,
            "user_id": user.id,
        },
    )
    return MovieTagStatus(
        content_id=request.content_id,
        status="processing",
    )


@router.get(
    "/tag/{content_id}",
    response_model=MovieTagStatus,
)
async def get_tag_status(
    content_id: str,
    user: User = Depends(get_current_user),
) -> MovieTagStatus:
    """Poll the tag/extraction status for a movie."""
    content = await Content.get(ObjectId(content_id))
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found",
        )

    if content.interactive_characters:
        return MovieTagStatus(
            content_id=content_id,
            status="ready",
            characters=content.interactive_characters,
        )

    job_status = _TAG_JOBS.get(content_id, "pending")
    return MovieTagStatus(
        content_id=content_id,
        status=job_status,
    )


@router.get(
    "/movies",
    response_model=List[InteractableMovie],
)
async def list_interactable_movies(
    user: User = Depends(get_current_user),
) -> List[InteractableMovie]:
    """List all movies that have been tagged for interactions."""
    contents = await Content.find(
        Content.supports_avatar_interaction == True,  # noqa: E712
        Content.interactive_characters != [],
    ).to_list()

    movies: List[InteractableMovie] = []
    for c in contents:
        movies.append(InteractableMovie(
            content_id=str(c.id),
            title=c.title or "",
            poster_url=c.poster_url if hasattr(c, "poster_url") else None,
            character_count=len(c.interactive_characters),
            status="ready",
        ))
    return movies


@router.get(
    "/characters/{content_id}/questions",
    response_model=CharacterQuestionsResponse,
)
async def get_character_questions(
    content_id: str,
    character_name: str,
    user: User = Depends(get_current_user),
) -> CharacterQuestionsResponse:
    """Get predefined + generic questions for a character."""
    content = await Content.get(ObjectId(content_id))
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found",
        )

    character = next(
        (c for c in content.interactive_characters
         if c.name == character_name),
        None,
    )
    if not character:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Character not found",
        )

    specific, generic = get_questions_for_character(
        character,
        content.interactive_characters,
        content.title or "",
    )

    return CharacterQuestionsResponse(
        character_name=character_name,
        specific_questions=specific,
        generic_questions=generic,
    )
