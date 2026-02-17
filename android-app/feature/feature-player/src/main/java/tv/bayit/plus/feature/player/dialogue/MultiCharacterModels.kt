package tv.bayit.plus.feature.player.dialogue

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Request to send a message to a specific character in a multi-character scene.
 * Maps to backend `MultiCharacterMessageRequest`.
 */
@Serializable
data class MultiMessageRequest(
    val message: String,
    @SerialName("addressed_character") val addressedCharacter: String,
)

/**
 * Single exchange in a multi-character interaction response.
 * Maps to backend `MultiCharacterExchange`.
 */
@Serializable
data class MultiCharacterExchange(
    val speaker: String,
    @SerialName("message_text") val messageText: String,
    @SerialName("character_name") val characterName: String? = null,
    @SerialName("audio_url") val audioUrl: String? = null,
    @SerialName("animated_video_url") val animatedVideoUrl: String? = null,
    @SerialName("reaction_to") val reactionTo: String? = null,
)

/**
 * Response containing all exchanges from a multi-character message.
 * Maps to backend `MultiCharacterResponseModel`.
 */
@Serializable
data class MultiCharacterResponse(
    val exchanges: List<MultiCharacterExchange>,
)
