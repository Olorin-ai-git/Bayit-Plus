package tv.bayit.plus.feature.player.dialogue

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Represents an interactive character available for dialogue during VOD playback.
 *
 * Maps to the backend response from `/api/v1/vod-interactions/characters/{contentId}`.
 * Each character has a unique voice, a representative frame image, and contextual
 * information about their role in the content.
 */
@Serializable
data class ContentCharacter(
    val name: String,
    @SerialName("voice_id") val voiceId: String,
    @SerialName("frame_url") val frameUrl: String,
    val description: String,
    @SerialName("movie_context") val movieContext: String,
)

/**
 * Request body for starting a free dialogue session with a character.
 */
@Serializable
data class StartFreeSessionRequest(
    @SerialName("content_id") val contentId: String,
    @SerialName("profile_id") val profileId: String,
    @SerialName("avatar_id") val avatarId: String,
    @SerialName("character_name") val characterName: String,
    @SerialName("current_timestamp") val currentTimestamp: Double,
)

/**
 * Response from session start, containing the session identifier.
 */
@Serializable
data class SessionResponse(
    @SerialName("id") val sessionId: String,
    val status: String? = null,
)

/**
 * Request body for sending a message within an active dialogue session.
 */
@Serializable
data class MessageRequest(
    val message: String,
)

/**
 * Response from the character after receiving a user message.
 * Contains the character's text reply and an optional video URL
 * for the character's animated response.
 */
@Serializable
data class CharacterResponse(
    @SerialName("character_name") val characterName: String,
    @SerialName("response_text") val responseText: String,
    @SerialName("audio_url") val audioUrl: String? = null,
    @SerialName("animated_video_url") val animatedVideoUrl: String? = null,
)

/**
 * Response from completing/ending a dialogue session.
 */
@Serializable
data class SessionStatusResponse(
    @SerialName("session_id") val sessionId: String,
    @SerialName("character_name") val characterName: String,
    val status: String,
    @SerialName("exchanges_count") val exchangesCount: Int = 0,
)

/**
 * A single exchange in the dialogue conversation between user and character.
 */
data class DialogueExchange(
    val userMessage: String,
    val characterReply: String,
    val characterVideoUrl: String? = null,
    val emotion: String? = null,
)

/**
 * Unified exchange model for all dialogue types: single-character, multi-character,
 * and shared sessions. Used by [DialogueConversation] to render bubbles consistently.
 */
data class DialogueExchangeItem(
    val speaker: String,
    val messageText: String,
    val characterName: String? = null,
    val audioUrl: String? = null,
    val animatedVideoUrl: String? = null,
    val reactionTo: String? = null,
    val participantName: String? = null,
) {
    val isUser: Boolean get() = speaker == SPEAKER_USER
    val isReaction: Boolean get() = reactionTo != null
}

/**
 * Request body for the pause-ask endpoint. Sends a question to a character
 * while the user has paused playback, triggering avatar lip-sync generation.
 */
@Serializable
data class PauseAskRequest(
    val message: String,
    @SerialName("language_hint") val languageHint: String? = null,
)

/**
 * Response from the pause-ask endpoint containing polished text, video URLs
 * for both the user's avatar lip-sync and character's animated response,
 * plus audio URLs and durations.
 *
 * Field names match backend [PauseAskResponseModel] in
 * `backend/app/api/routes/vod_interaction_pause_ask.py`.
 */
@Serializable
data class PauseAskResponse(
    @SerialName("user_polished_text") val userPolishedText: String,
    @SerialName("user_audio_url") val userAudioUrl: String = "",
    @SerialName("user_animated_video_url") val userAnimatedVideoUrl: String = "",
    @SerialName("user_video_duration") val userVideoDuration: Double = 0.0,
    @SerialName("character_name") val characterName: String,
    @SerialName("character_response_text") val characterResponseText: String,
    @SerialName("character_audio_url") val characterAudioUrl: String = "",
    @SerialName("character_animated_video_url") val characterAnimatedVideoUrl: String = "",
    @SerialName("character_video_duration") val characterVideoDuration: Double = 0.0,
)

internal const val SPEAKER_USER = "user"
