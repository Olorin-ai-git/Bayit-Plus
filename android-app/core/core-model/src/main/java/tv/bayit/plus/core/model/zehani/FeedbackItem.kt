package tv.bayit.plus.core.model.zehani

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Received feedback item from a WhatsApp contact about a shared highlight reel.
 *
 * Maps to the backend FeedbackItem model returned from
 * `GET /api/v1/zeh-ani/feedback` endpoints.
 */
@Serializable
data class FeedbackItem(
    val id: String,
    @SerialName("profile_id") val profileId: String,
    @SerialName("contact_name") val contactName: String,
    @SerialName("transcript_text") val transcriptText: String? = null,
    @SerialName("detected_language") val detectedLanguage: String? = null,
    @SerialName("audio_url") val audioUrl: String? = null,
    @SerialName("created_at") val createdAt: String,
)

@Serializable
data class FeedbackListResponse(
    val items: List<FeedbackItem> = emptyList(),
    val total: Int = 0,
)

@Serializable
data class SubmitFeedbackRequest(
    @SerialName("profile_id") val profileId: String,
    val feedback: String,
    val rating: Int,
)
