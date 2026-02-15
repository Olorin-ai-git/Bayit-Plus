package tv.bayit.plus.core.model.zehani

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Highlight reel compilation from Zeh Ani moments.
 *
 * Maps to the backend HighlightReel model returned from
 * `/api/v1/zeh-ani/highlights/*` endpoints.
 */
@Serializable
data class HighlightReel(
    val id: String,
    @SerialName("user_id") val userId: String,
    @SerialName("profile_id") val profileId: String,
    @SerialName("avatar_id") val avatarId: String,
    @SerialName("moment_count") val momentCount: Int = 0,
    @SerialName("has_video") val hasVideo: Boolean = false,
    @SerialName("has_thumbnail") val hasThumbnail: Boolean = false,
    @SerialName("share_token") val shareToken: String? = null,
    val status: String,
    @SerialName("credits_charged") val creditsCharged: Double = 0.0,
    @SerialName("error_message") val errorMessage: String? = null,
    @SerialName("created_at") val createdAt: String,
    @SerialName("updated_at") val updatedAt: String,
)

@Serializable
data class HighlightGenerateResponse(
    val status: String,
    @SerialName("profile_id") val profileId: String,
)
