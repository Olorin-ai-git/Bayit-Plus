"""
AI Agent Tool Definitions

Claude tool use definitions organized by domain.
"""

from .audit import AUDIT_TOOLS
from .content import CONTENT_TOOLS
from .diagnostics import DIAGNOSTICS_TOOLS
from .integrity import INTEGRITY_TOOLS
from .metadata import METADATA_TOOLS
from .notifications import NOTIFICATION_TOOLS
from .podcasts import PODCAST_TOOLS
from .series import SERIES_TOOLS
from .storage import STORAGE_TOOLS
from .stream import STREAM_TOOLS
from .subtitles import SUBTITLE_TOOLS
from .taxonomy import TAXONOMY_TOOLS

# Combined list of all tools
TOOLS = (
    CONTENT_TOOLS
    + METADATA_TOOLS
    + STREAM_TOOLS
    + STORAGE_TOOLS
    + SUBTITLE_TOOLS
    + NOTIFICATION_TOOLS
    + PODCAST_TOOLS
    + SERIES_TOOLS
    + INTEGRITY_TOOLS
    + AUDIT_TOOLS
    + TAXONOMY_TOOLS
    + DIAGNOSTICS_TOOLS
)

__all__ = ["TOOLS"]
