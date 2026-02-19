package tv.bayit.plus.core.model.zehani

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Summary of a child avatar returned from GET /api/v1/star-story/avatars.
 *
 * Used by MagicMirrorViewModel to resolve the avatarId for a given profileId
 * before fetching the full avatar status.
 */
@Serializable
data class ChildAvatarSummary(
    @SerialName("avatar_id") val avatarId: String,
    @SerialName("child_first_name") val childFirstName: String? = null,
    val style: String? = null,
    val status: String? = null,
    @SerialName("primary_avatar_url") val primaryAvatarUrl: String? = null,
    @SerialName("poses_count") val posesCount: Int = 0,
    @SerialName("created_at") val createdAt: String? = null,
)
