package tv.bayit.plus.feature.player.dialogue

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Smart avatar placement computed by backend scene analysis.
 * Maps to backend `AvatarPlacement` in `app/models/vod_interaction.py`.
 */
@Serializable
data class AvatarPlacement(
    val position: String,
    @SerialName("offset_x") val offsetX: Double = 0.0,
    @SerialName("offset_y") val offsetY: Double = 0.0,
    val confidence: Double = 0.0,
    @SerialName("fallback_position") val fallbackPosition: String = FALLBACK_POSITION,
)

/**
 * Character profile for multi-character interactions.
 * Maps to backend `CharacterProfile` in `app/models/vod_interaction.py`.
 */
@Serializable
data class CharacterProfile(
    val name: String,
    @SerialName("voice_id") val voiceId: String,
    @SerialName("frame_url") val frameUrl: String,
    @SerialName("personality_traits") val personalityTraits: List<String> = emptyList(),
    @SerialName("relationship_to_others") val relationshipToOthers: String? = null,
)

private const val FALLBACK_POSITION = "bottom_left"
