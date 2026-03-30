"""
Transcript-Based Speaker Extraction Service

Analyzes diarized transcripts via Claude to identify speakers,
infer roles/expertise, and generate ContentCharacter profiles
for non-TMDB content.
"""

import json
import logging
from typing import List, Optional

from app.core.ai_clients import get_anthropic_client
from app.core.config import settings
from app.models.vod_interaction import ContentCharacter
from app.services.olorin.video_transcriber import TranscriptSegment

logger = logging.getLogger(__name__)

SPEAKER_EXTRACTION_PROMPT = """Analyze this transcript with {n_speakers} speakers.

Title: {title}

Transcript (speaker-labeled):
{transcript}

For each speaker, return a JSON array of objects with:
- "name": real name if mentioned ("I'm Dr. Chen"), otherwise descriptive label ("Host", "Guest Expert", "Narrator")
- "gender": "male" or "female" (infer from voice cues, names, or pronouns)
- "description": 2-3 sentence personality/speaking style description
- "movie_context": 1-2 sentence summary of what this speaker discusses or their role
- "suggested_questions": array of 3 questions a viewer might ask this speaker based on their content
- "speaker_id": the original speaker label from the transcript (e.g. "speaker_1")

Return ONLY valid JSON array, no markdown fences."""


def _build_transcript_text(
    segments: List[TranscriptSegment],
    max_chars: int = 12000,
) -> str:
    """Format diarized segments into labeled transcript text."""
    lines: list[str] = []
    total = 0
    for seg in segments:
        line = f"[{seg.speaker}] {seg.text}"
        if total + len(line) > max_chars:
            lines.append("... (transcript truncated)")
            break
        lines.append(line)
        total += len(line)
    return "\n".join(lines)


async def extract_speakers_from_transcript(
    segments: List[TranscriptSegment],
    speakers_count: int,
    video_title: Optional[str] = None,
) -> List[ContentCharacter]:
    """
    Extract speaker profiles from a diarized transcript using Claude.

    Args:
        segments: Diarized transcript segments with speaker labels
        speakers_count: Number of distinct speakers detected
        video_title: Optional title for context

    Returns:
        List of ContentCharacter ready to store on Content document
    """
    if not segments:
        return []

    transcript_text = _build_transcript_text(segments)
    title = video_title or "Untitled Video"

    prompt = SPEAKER_EXTRACTION_PROMPT.format(
        n_speakers=speakers_count,
        title=title,
        transcript=transcript_text,
    )

    try:
        client = get_anthropic_client()
        response = await client.messages.create(
            model=settings.MOVIE_INTERACTION_AI_MODEL,
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text.strip()
        speakers = json.loads(text)
    except json.JSONDecodeError:
        logger.error(
            "Claude returned invalid JSON for speaker extraction",
            extra={"title": title},
        )
        return []
    except Exception:
        logger.exception(
            "Speaker extraction failed",
            extra={"title": title},
        )
        return []

    characters: List[ContentCharacter] = []
    for speaker in speakers:
        gender = speaker.get("gender")
        voice_id = (
            settings.MOVIE_INTERACTION_DEFAULT_VOICE_FEMALE
            if gender == "female"
            else settings.MOVIE_INTERACTION_DEFAULT_VOICE_MALE
        )
        characters.append(ContentCharacter(
            name=speaker.get("name", "Speaker"),
            voice_id=voice_id,
            frame_url="",
            description=speaker.get("description", ""),
            movie_context=speaker.get("movie_context", ""),
            actor_name=None,
            gender=gender,
            suggested_questions=speaker.get("suggested_questions", []),
        ))

    logger.info(
        "Speaker extraction complete",
        extra={"title": title, "speakers": len(characters)},
    )
    return characters
