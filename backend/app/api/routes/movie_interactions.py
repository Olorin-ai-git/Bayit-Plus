"""
Movie Interactions API Routes

Endpoints for the Movie Interactions Hub in Zeh Ani.
Users can tag movies for character extraction, browse tagged movies,
view characters, get question suggestions, and select questions for
interactive moment video generation.
"""

from typing import List, Optional

from bson import ObjectId
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    status,
)

from app.api.routes.content.utils import convert_to_proxy_url
from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.rate_limiter import RATE_LIMITS, limiter
from app.core.security import get_current_user
from app.models.content import Content
from app.models.movie_interaction import (
    CharacterQuestionsResponse,
    InteractableMovie,
    InteractionMomentStatus,
    InteractionSelectionRequest,
    InteractionSelectionResponse,
    InteractionStatusResponse,
    MovieTagRequest,
    MovieTagStatus,
)
from app.models.user import User
from app.models.vod_interaction import ContentCharacter, InteractiveMoment
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


def _proxy_character_urls(
    characters: List[ContentCharacter],
) -> List[ContentCharacter]:
    """Proxy GCS URLs in character frame_url fields so clients can access them."""
    proxied: List[ContentCharacter] = []
    for char in characters:
        proxied.append(char.model_copy(update={
            "frame_url": convert_to_proxy_url(char.frame_url),
        }))
    return proxied


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

        if settings.VOICE_CLONE_AUTO_AFTER_EXTRACTION:
            from app.services.vod_interaction.voice_cloner import (
                character_voice_cloner_service,
            )
            try:
                await character_voice_cloner_service.clone_character_voices(
                    content,
                )
            except Exception:
                logger.exception(
                    "Auto voice cloning failed",
                    extra={"content_id": content_id},
                )

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
            characters=_proxy_character_urls(
                content.interactive_characters,
            ),
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
            characters=_proxy_character_urls(
                content.interactive_characters,
            ),
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
    source: Optional[str] = None,
    user: User = Depends(get_current_user),
) -> List[InteractableMovie]:
    """List movies tagged for interactions, optionally filtered by source."""
    query_filters = [
        Content.supports_avatar_interaction == True,  # noqa: E712
        Content.interactive_characters != [],
    ]
    if source:
        query_filters.append(Content.source_provider == source)

    contents = await Content.find(*query_filters).to_list()

    max_per_content = settings.MOVIE_INTERACTION_MAX_PER_CONTENT
    movies: List[InteractableMovie] = []
    for c in contents:
        raw_poster = c.poster_url if hasattr(c, "poster_url") else None
        movies.append(InteractableMovie(
            content_id=str(c.id),
            title=c.title or "",
            poster_url=convert_to_proxy_url(raw_poster) if raw_poster else None,
            character_count=len(c.interactive_characters),
            interaction_count=len(c.interactive_moments),
            max_interactions=max_per_content,
            status="ready",
            source_provider=c.source_provider,
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


def _derive_moment_status(moment: InteractiveMoment) -> str:
    """Derive generation status from moment field presence."""
    if moment.character_response_video_url:
        return "complete"
    if moment.character_response_audio_url:
        return "generating_video"
    if moment.character_response_text:
        return "generating_audio"
    return "queued"


@router.post(
    "/select-interactions",
    response_model=InteractionSelectionResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def select_interactions(
    request: InteractionSelectionRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
) -> InteractionSelectionResponse:
    """Select questions and trigger interactive moment video generation."""
    content = await Content.get(ObjectId(request.content_id))
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found",
        )

    if not content.interactive_characters:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content has no interactive characters",
        )

    character = next(
        (c for c in content.interactive_characters
         if c.name == request.character_name),
        None,
    )
    if not character:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Character not found on this content",
        )

    max_allowed = settings.MOVIE_INTERACTION_MAX_PER_CONTENT
    existing_count = len(content.interactive_moments)
    requested_count = len(request.questions)

    if existing_count + requested_count > max_allowed:
        remaining = max_allowed - existing_count
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Quota exceeded: {existing_count}/{max_allowed} used, "
                f"requested {requested_count}, {remaining} remaining"
            ),
        )

    new_moments: List[InteractiveMoment] = []
    for question in request.questions:
        moment = InteractiveMoment(
            timestamp=0.0,
            character_name=character.name,
            voice_id=character.voice_id,
            character_frame_url=character.frame_url,
            interaction_prompt=question,
            scene_context="",
        )
        new_moments.append(moment)

    content.interactive_moments.extend(new_moments)
    await content.save()

    background_tasks.add_task(
        _run_moment_generation,
        str(content.id),
        character.name,
        len(new_moments),
    )

    logger.info(
        "Interactions selected for generation",
        extra={
            "content_id": request.content_id,
            "character_name": request.character_name,
            "question_count": requested_count,
            "total_interactions": existing_count + requested_count,
            "user_id": str(user.id),
        },
    )

    return InteractionSelectionResponse(
        content_id=request.content_id,
        created_count=requested_count,
        total_interaction_count=existing_count + requested_count,
        max_interactions=max_allowed,
        generation_status="queued",
    )


@router.get(
    "/{content_id}/interaction-status",
    response_model=InteractionStatusResponse,
)
async def get_interaction_status(
    content_id: str,
    user: User = Depends(get_current_user),
) -> InteractionStatusResponse:
    """Get interaction generation status for a content item."""
    content = await Content.get(ObjectId(content_id))
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found",
        )

    moments_status = [
        InteractionMomentStatus(
            character_name=m.character_name,
            interaction_prompt=m.interaction_prompt,
            status=_derive_moment_status(m),
            video_url=m.character_response_video_url,
        )
        for m in content.interactive_moments
    ]

    return InteractionStatusResponse(
        content_id=content_id,
        interaction_count=len(content.interactive_moments),
        max_interactions=settings.MOVIE_INTERACTION_MAX_PER_CONTENT,
        moments=moments_status,
    )


async def _pick_timestamp_for_question(
    content_id: str,
    question: str,
    character_name: str,
) -> tuple[float, str]:
    """Use Claude + subtitle data to pick a contextually appropriate timestamp."""
    from app.services.vod_interaction.voice_cloner import find_subtitle_track
    from app.core.ai_clients import get_anthropic_client

    track = await find_subtitle_track(content_id)
    if not track or not track.cues:
        return (60.0, "No subtitle data available")

    cue_lines = []
    for cue in track.cues[:200]:
        minutes = int(cue.start_time // 60)
        seconds = int(cue.start_time % 60)
        cue_lines.append(f"[{minutes:02d}:{seconds:02d}] {cue.text}")
    subtitle_text = "\n".join(cue_lines)

    client = get_anthropic_client()
    response = await client.messages.create(
        model=settings.MOVIE_INTERACTION_AI_MODEL,
        system=(
            "You pick timestamps for interactive moments in movies. "
            "Given subtitle segments and a question about a character, "
            "pick the most contextually appropriate timestamp where "
            "this question would feel natural. Respond with ONLY two "
            "lines: line 1 is the timestamp in seconds (number only), "
            "line 2 is a brief scene context description (one sentence)."
        ),
        messages=[{
            "role": "user",
            "content": (
                f"Character: {character_name}\n"
                f"Question: {question}\n\n"
                f"Subtitle segments:\n{subtitle_text}"
            ),
        }],
        max_tokens=150,
    )

    lines = response.content[0].text.strip().split("\n", 1)
    try:
        timestamp = float(lines[0].strip())
    except (ValueError, IndexError):
        timestamp = 60.0
    scene_ctx = lines[1].strip() if len(lines) > 1 else ""
    return (timestamp, scene_ctx)


async def _run_moment_generation(
    content_id: str,
    character_name: str,
    new_count: int,
) -> None:
    """Background task: generate AI responses and animations for new moments."""
    from app.services.vod_interaction.character_ai import (
        character_ai_service,
    )
    from app.services.vod_interaction.character_animator import (
        character_animator_service,
    )

    try:
        content = await Content.get(ObjectId(content_id))
        if not content:
            logger.error(
                "Content not found for moment generation",
                extra={"content_id": content_id},
            )
            return

        pending = [
            (i, m)
            for i, m in enumerate(content.interactive_moments)
            if m.character_name == character_name
            and not m.character_response_video_url
        ][-new_count:]

        for idx, moment in pending:
            try:
                timestamp, scene_ctx = await _pick_timestamp_for_question(
                    content_id, moment.interaction_prompt, character_name,
                )
                moment.timestamp = timestamp
                moment.scene_context = scene_ctx

                ai_response = await character_ai_service.generate_response(
                    character_name=moment.character_name,
                    scene_context=scene_ctx,
                    user_message=moment.interaction_prompt,
                    conversation_history=[],
                )
                moment.character_response_text = ai_response.text
                await content.save()

                animated = (
                    await character_animator_service.animate_character_response(
                        character_name=moment.character_name,
                        dialogue_text=ai_response.text,
                        character_frame_url=moment.character_frame_url or "",
                        voice_id=moment.voice_id,
                    )
                )
                moment.character_response_audio_url = animated.audio_url
                moment.character_response_video_url = animated.video_url

                # Generate kid avatar question video using dialogue_options[0] as the
                # real question text. interaction_prompt is only a generic placeholder.
                kid_image = settings.MOVIE_INTERACTION_DEFAULT_KID_IMAGE_URL
                kid_voice = settings.MOVIE_INTERACTION_KID_VOICE_ID
                question_text = (moment.dialogue_options[0] if moment.dialogue_options else "")
                if kid_image and kid_voice and question_text:
                    kid_animated = await character_animator_service.animate_character_response(
                        character_name="kid",
                        dialogue_text=question_text,
                        character_frame_url=kid_image,
                        voice_id=kid_voice,
                    )
                    moment.lipsync_video_url = kid_animated.video_url

                await content.save()

                logger.info(
                    "Moment generation complete",
                    extra={
                        "content_id": content_id,
                        "character_name": character_name,
                        "timestamp": timestamp,
                        "prompt": moment.interaction_prompt[:50],
                    },
                )

            except Exception:
                logger.exception(
                    "Failed to generate moment",
                    extra={
                        "content_id": content_id,
                        "character_name": character_name,
                        "prompt": moment.interaction_prompt[:50],
                    },
                )

    except Exception:
        logger.exception(
            "Moment generation task failed",
            extra={"content_id": content_id},
        )
