package tv.bayit.plus.data.model.zehani

import com.google.gson.annotations.SerializedName

data class HighlightReel(
    @SerializedName("id")
    val id: String,

    @SerializedName("user_id")
    val userId: String,

    @SerializedName("profile_id")
    val profileId: String,

    @SerializedName("avatar_id")
    val avatarId: String,

    @SerializedName("moment_count")
    val momentCount: Int,

    @SerializedName("has_video")
    val hasVideo: Boolean,

    @SerializedName("has_thumbnail")
    val hasThumbnail: Boolean,

    @SerializedName("share_token")
    val shareToken: String? = null,

    @SerializedName("status")
    val status: ReelStatus,

    @SerializedName("credits_charged")
    val creditsCharged: Int,

    @SerializedName("error_message")
    val errorMessage: String? = null,

    @SerializedName("created_at")
    val createdAt: String,

    @SerializedName("updated_at")
    val updatedAt: String
)

enum class ReelStatus {
    @SerializedName("pending") PENDING,
    @SerializedName("generating") GENERATING,
    @SerializedName("ready") READY,
    @SerializedName("failed") FAILED
}

data class HighlightReelGenerateRequest(
    @SerializedName("avatar_id")
    val avatarId: String,

    @SerializedName("profile_id")
    val profileId: String
)
