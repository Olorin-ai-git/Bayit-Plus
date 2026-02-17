"""
VOD Avatar Interaction Services

Services for enabling Zeh Ani avatars to interact with movie characters
during VOD playback with AI-generated animated responses.
"""

from app.services.vod_interaction.interaction_service import (
    vod_interaction_service,
    VODInteractionService
)
from app.services.vod_interaction.character_ai import (
    character_ai_service,
    CharacterAIService
)
from app.services.vod_interaction.character_animator import (
    character_animator_service,
    CharacterAnimatorService
)
from app.services.vod_interaction.reel_compositor import (
    reel_compositor_service,
    ReelCompositorService
)
from app.services.vod_interaction.multi_character_ai import (
    multi_character_ai_service,
    MultiCharacterAIService,
)
from app.services.vod_interaction.multi_character_handler import (
    multi_character_handler,
    MultiCharacterHandler,
)
from app.services.vod_interaction.shared_interaction_service import (
    shared_interaction_service,
    SharedInteractionService,
)

__all__ = [
    "vod_interaction_service",
    "VODInteractionService",
    "character_ai_service",
    "CharacterAIService",
    "character_animator_service",
    "CharacterAnimatorService",
    "reel_compositor_service",
    "ReelCompositorService",
    "multi_character_ai_service",
    "MultiCharacterAIService",
    "multi_character_handler",
    "MultiCharacterHandler",
    "shared_interaction_service",
    "SharedInteractionService",
]
