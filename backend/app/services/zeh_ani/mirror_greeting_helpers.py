"""
Mirror Greeting Helpers.

Vocabulary selection, greeting text construction, TTS audio generation,
and lip-sync data production for the Magic Mirror daily greeting pipeline.
"""

from typing import Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.child_avatar import ChildAvatar
from app.models.child_proficiency import ChildProficiency

logger = get_logger(__name__)


def select_vocabulary_of_the_day(
    proficiency: Optional[ChildProficiency],
) -> str:
    """Pick a vocabulary word based on the child's learning progress."""
    if not proficiency or not proficiency.vocabulary_learning:
        return ""

    learning_words = proficiency.vocabulary_learning
    candidates = [
        w for w in learning_words if w.mastery < 0.8
    ]
    if not candidates:
        candidates = learning_words

    candidates.sort(key=lambda w: w.mastery)
    selected = candidates[0]

    transliteration = (
        f" ({selected.transliteration})"
        if selected.transliteration else ""
    )
    return f"{selected.word}{transliteration}"


def build_greeting_text(
    child_name: str,
    vocab_word: str,
) -> tuple:
    """Build bilingual greeting text incorporating vocabulary."""
    vocab_segment_he = ""
    vocab_segment_en = ""
    if vocab_word:
        clean_word = vocab_word.split(" (")[0]
        vocab_segment_he = f" {clean_word}"
        vocab_segment_en = f" Your word of the day is: {vocab_word}."

    greeting_he = f"{child_name},{vocab_segment_he}"
    greeting_en = (
        f"Good morning, {child_name}!{vocab_segment_en}"
    )
    return greeting_he, greeting_en


async def generate_greeting_audio(
    avatar: ChildAvatar,
    greeting_text_he: str,
) -> Optional[str]:
    """Generate TTS audio using child's cloned voice if available."""
    from app.services.interactive_mission.child_voice_service import (
        child_voice_service,
    )

    return await child_voice_service.generate_corrected_hebrew(
        avatar=avatar,
        hebrew_text=greeting_text_he,
    )


async def generate_greeting_lipsync(
    avatar: ChildAvatar,
    audio_path: Optional[str],
) -> Optional[str]:
    """Generate lip-sync blend shape data for the greeting audio."""
    if not audio_path or not avatar.has_3d_mesh:
        return None

    from app.services.zeh_ani.synclabs_lipsync_service import (
        synclabs_lipsync_service,
    )
    from app.services.olorin.storage_service import storage_service

    mesh_signed_url = await storage_service.generate_signed_url(
        f"zeh-ani/meshes/{avatar.id}/avatar.glb",
        expiry_seconds=settings.MESH_SIGNED_URL_EXPIRY_SECONDS,
    )

    lipsync_data = (
        await synclabs_lipsync_service.generate_realtime_lipsync(
            mesh_glb_url=mesh_signed_url,
            audio_gcs_path=audio_path,
        )
    )

    import json as json_lib

    output_path = (
        f"zeh-ani/mirror/{avatar.user_id}/{avatar.profile_id}/"
        f"greeting_lipsync.json"
    )
    lipsync_bytes = json_lib.dumps(lipsync_data).encode("utf-8")
    await storage_service.upload_bytes(
        lipsync_bytes, output_path,
        content_type="application/json",
    )

    return output_path
