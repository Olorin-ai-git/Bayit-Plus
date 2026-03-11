package tv.bayit.plus.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * A single proactive voice suggestion returned by POST /api/v1/voice/proactive/suggest.
 *
 * [contentId] is the deep-link target for player navigation.
 * [confidence] is a 0.0-1.0 score from the backend ranking model.
 */
@Serializable
data class ProactiveVoiceSuggestion(
    val id: String,
    val title: String,
    val subtitle: String? = null,
    @SerialName("content_id") val contentId: String,
    @SerialName("content_type") val contentType: String,
    @SerialName("thumbnail_url") val thumbnailUrl: String? = null,
    @SerialName("reason_key") val reasonKey: String? = null,
    val confidence: Double,
)

/**
 * Contextual metadata included with each proactive suggest request.
 *
 * All fields are optional; the backend uses whichever are present.
 */
@Serializable
data class ProactiveVoiceContext(
    @SerialName("current_content_id") val currentContentId: String? = null,
    @SerialName("playback_position_seconds") val playbackPositionSeconds: Double? = null,
    @SerialName("last_search_query") val lastSearchQuery: String? = null,
    @SerialName("time_of_day") val timeOfDay: String? = null,
)

/** Request body for POST /api/v1/voice/proactive/suggest. */
@Serializable
data class ProactiveVoiceRequest(
    val platform: String,
    @SerialName("profile_id") val profileId: String? = null,
    @SerialName("max_suggestions") val maxSuggestions: Int,
    val context: ProactiveVoiceContext? = null,
)

/** Response wrapper from POST /api/v1/voice/proactive/suggest. */
@Serializable
data class ProactiveVoiceResponse(
    val suggestions: List<ProactiveVoiceSuggestion>,
    @SerialName("next_poll_seconds") val nextPollSeconds: Int,
    @SerialName("session_id") val sessionId: String? = null,
)
