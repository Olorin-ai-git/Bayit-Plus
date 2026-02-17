package tv.bayit.plus.feature.player.dialogue

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Request to start a shared interaction in a watch party.
 * Maps to backend `StartSharedInteractionRequest`.
 */
@Serializable
data class SharedStartRequest(
    @SerialName("content_id") val contentId: String,
    @SerialName("moment_timestamp") val momentTimestamp: Double,
    @SerialName("character_name") val characterName: String,
    @SerialName("profile_id") val profileId: String,
    @SerialName("avatar_id") val avatarId: String,
    @SerialName("display_name") val displayName: String,
)

/**
 * Request to send a message in a shared interaction session.
 * Maps to backend `SharedMessageRequest`.
 */
@Serializable
data class SharedMessageRequest(
    val message: String,
    @SerialName("addressed_character") val addressedCharacter: String? = null,
)

/**
 * Single exchange in a shared interaction response.
 * Maps to backend `SharedExchange`.
 */
@Serializable
data class SharedExchangeItem(
    val speaker: String,
    @SerialName("message_text") val messageText: String,
    @SerialName("character_name") val characterName: String? = null,
    @SerialName("audio_url") val audioUrl: String? = null,
    @SerialName("animated_video_url") val animatedVideoUrl: String? = null,
    @SerialName("participant_user_id") val participantUserId: String? = null,
    @SerialName("participant_name") val participantName: String? = null,
)

/**
 * Response from shared interaction message endpoint.
 */
@Serializable
data class SharedExchangeResponse(
    val exchanges: List<SharedExchangeItem>,
)

/**
 * Participant in a shared interactive session.
 */
data class SharedParticipant(
    val userId: String,
    val displayName: String,
    val avatarUrl: String? = null,
    val isHost: Boolean = false,
)

/**
 * State response for a shared interaction session.
 */
@Serializable
data class SharedSessionState(
    @SerialName("session_id") val sessionId: String,
    val status: String,
    @SerialName("character_name") val characterName: String,
    @SerialName("participant_count") val participantCount: Int = 0,
    @SerialName("current_turn_user_id") val currentTurnUserId: String? = null,
    @SerialName("turns_completed") val turnsCompleted: Int = 0,
    @SerialName("exchanges_count") val exchangesCount: Int = 0,
)
