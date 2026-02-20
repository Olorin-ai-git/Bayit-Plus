"""
Dialogue Mapper Service

Uses Claude AI to map subtitle cues to characters from a movie's cast.
Batches cues to stay within token limits and filters low-confidence
assignments.
"""

import json
from typing import Dict, List

from app.core.ai_clients import get_anthropic_client
from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.subtitles import SubtitleCueModel

logger = get_logger(__name__)

_BATCH_SIZE = 200
_SYSTEM_PROMPT = (
    "You are a film dialogue analyst. Given a list of subtitle cues and "
    "a cast of characters from a specific movie, assign each subtitle line "
    "to the character who speaks it. Only assign lines you are confident "
    "about. If unsure, use \"unknown\"."
)


def _build_user_prompt(
    cues: List[SubtitleCueModel],
    character_names: List[str],
    movie_title: str,
) -> str:
    """Build the mapping prompt for a batch of cues."""
    cue_lines = []
    for cue in cues:
        cue_lines.append(
            f'{{"index": {cue.index}, "start": {cue.start_time:.1f}, '
            f'"text": {json.dumps(cue.text)}}}'
        )
    cues_json = "[\n" + ",\n".join(cue_lines) + "\n]"

    return (
        f'Movie: "{movie_title}"\n'
        f"Characters: {json.dumps(character_names)}\n\n"
        f"Subtitle cues:\n{cues_json}\n\n"
        "Return a JSON array of objects with keys \"index\" (int) and "
        "\"character\" (str, must be one of the character names or "
        "\"unknown\"). Only include lines spoken by a single character."
    )


def _parse_mapping_response(
    raw: str,
    valid_names: set,
) -> Dict[int, str]:
    """Parse Claude response into {cue_index: character_name}."""
    try:
        start = raw.find("[")
        end = raw.rfind("]") + 1
        if start == -1 or end == 0:
            return {}
        data = json.loads(raw[start:end])
    except (json.JSONDecodeError, ValueError):
        logger.warning("Failed to parse dialogue mapping response")
        return {}

    result: Dict[int, str] = {}
    for entry in data:
        idx = entry.get("index")
        char = entry.get("character", "")
        if idx is not None and char in valid_names:
            result[idx] = char
    return result


class DialogueMapperService:
    """Maps subtitle cues to characters using Claude AI."""

    async def map_dialogue_to_characters(
        self,
        cues: List[SubtitleCueModel],
        character_names: List[str],
        movie_title: str,
    ) -> Dict[str, List[SubtitleCueModel]]:
        """
        Assign subtitle cues to characters.

        Returns dict of character_name -> list of assigned cues,
        capped at VOICE_CLONE_TARGET_CUE_COUNT per character.
        """
        if not cues or not character_names:
            return {}

        client = get_anthropic_client()
        valid_names = set(character_names)
        cue_by_index: Dict[int, SubtitleCueModel] = {c.index: c for c in cues}
        all_mappings: Dict[int, str] = {}

        batches = [
            cues[i : i + _BATCH_SIZE]
            for i in range(0, len(cues), _BATCH_SIZE)
        ]

        for batch_num, batch in enumerate(batches):
            user_prompt = _build_user_prompt(batch, character_names, movie_title)
            try:
                response = await client.messages.create(
                    model=settings.MOVIE_INTERACTION_AI_MODEL,
                    max_tokens=4096,
                    system=_SYSTEM_PROMPT,
                    messages=[{"role": "user", "content": user_prompt}],
                )
                raw_text = response.content[0].text
                batch_map = _parse_mapping_response(raw_text, valid_names)
                all_mappings.update(batch_map)
                logger.info(
                    "Dialogue batch mapped",
                    extra={
                        "batch": batch_num + 1,
                        "total_batches": len(batches),
                        "mapped_count": len(batch_map),
                    },
                )
            except Exception:
                logger.exception(
                    "Dialogue mapping batch failed",
                    extra={"batch": batch_num + 1},
                )

        cap = settings.VOICE_CLONE_TARGET_CUE_COUNT
        result: Dict[str, List[SubtitleCueModel]] = {
            name: [] for name in character_names
        }
        for idx, char_name in all_mappings.items():
            cue = cue_by_index.get(idx)
            if cue and len(result[char_name]) < cap:
                result[char_name].append(cue)

        assigned_counts = {
            name: len(assigned) for name, assigned in result.items() if assigned
        }
        logger.info(
            "Dialogue mapping complete",
            extra={
                "movie": movie_title,
                "total_cues": len(cues),
                "assigned": assigned_counts,
            },
        )
        return {name: assigned for name, assigned in result.items() if assigned}


dialogue_mapper_service = DialogueMapperService()
