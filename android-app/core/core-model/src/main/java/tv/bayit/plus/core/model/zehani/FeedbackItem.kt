package tv.bayit.plus.core.model.zehani

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * User feedback/interaction history item for Zeh Ani features.
 *
 * Maps to the backend feedback endpoint response from
 * `/api/v1/zeh-ani/feedback` endpoints.
 */
@Serializable
data class FeedbackItem(
    val id: String,
    @SerialName("profile_id") val profileId: String? = null,
    val feedback: String,
    val rating: Int,
    val status: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
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
