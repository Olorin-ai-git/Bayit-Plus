"""DEPRECATED: Use app.services.podcast_translation instead."""
import warnings

from app.services.podcast_translation import *  # noqa: F401, F403

warnings.warn(
    "Importing from 'app.services.podcast_translation_service' is deprecated. "
    "Use 'from app.services.podcast_translation import ...' instead.",
    DeprecationWarning,
    stacklevel=2,
)
