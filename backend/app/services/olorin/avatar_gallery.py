"""Preset avatar gallery for training instructor characters.

Loads the manifest from ``shared/assets/avatars/training/manifest.json``
and exposes helpers to resolve avatar metadata, static URLs, and
gender-matched ElevenLabs voice IDs.

The manifest is read once at import time and cached — it is a curated
static asset committed alongside the PNG files, not a runtime-editable
resource.
"""
import json
import logging
from functools import lru_cache
from pathlib import Path
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

# Relative to the backend directory; the repo layout is:
#   olorin-media/bayit-plus/backend/   ← cwd at runtime
#   olorin-media/bayit-plus/shared/assets/avatars/training/manifest.json
_MANIFEST_PATH = (
    Path(__file__).resolve().parents[3]
    / "shared" / "assets" / "avatars" / "training" / "manifest.json"
)


@lru_cache(maxsize=1)
def load_manifest() -> dict:
    """Load and cache the avatar gallery manifest."""
    if not _MANIFEST_PATH.exists():
        logger.warning(
            "avatar manifest not found at %s — gallery will be empty",
            _MANIFEST_PATH,
        )
        return {"version": 0, "avatars": [], "default_fallback": None}
    with open(_MANIFEST_PATH) as f:
        return json.load(f)


def list_avatars() -> list[dict]:
    """Return the list of avatar entries from the manifest."""
    return load_manifest().get("avatars", [])


def get_avatar(preset_id: str) -> Optional[dict]:
    """Look up a single avatar by its manifest ``id``."""
    for a in list_avatars():
        if a["id"] == preset_id:
            return a
    return None


def get_default_fallback() -> dict:
    """Return the manifest's designated default fallback avatar.

    Falls back to the first avatar in the list if the ``default_fallback``
    key is missing or stale. Raises ``RuntimeError`` only if the gallery is
    completely empty (manifest missing or zero entries), which should never
    happen in a correctly deployed build.
    """
    manifest = load_manifest()
    fallback_id = manifest.get("default_fallback")
    if fallback_id:
        avatar = get_avatar(fallback_id)
        if avatar:
            return avatar
    avatars = manifest.get("avatars", [])
    if not avatars:
        raise RuntimeError(
            "avatar gallery is empty — cannot determine default fallback. "
            "Ensure shared/assets/avatars/training/manifest.json is deployed."
        )
    return avatars[0]


def resolve_voice_id(avatar: dict) -> str:
    """Resolve the ElevenLabs voice ID from the avatar's ``voice_id_env`` key.

    Reads the named setting from ``app.core.config.settings``. Returns an
    empty string if the setting is not configured — callers should treat
    this as "no preset voice available" and fall back to cloning.
    """
    env_key = avatar.get("voice_id_env", "")
    if not env_key:
        return ""
    return getattr(settings, env_key, "") or ""


def avatar_static_url(avatar: dict) -> str:
    """Return the URL-path for a preset avatar PNG.

    The training FastAPI app mounts the avatars directory under
    ``/static/avatars/training/``. This function returns the path
    relative to that mount point so both the API response and the
    frontend can reference it without knowing the absolute filesystem
    path.
    """
    return f"/static/avatars/training/{avatar['file']}"
