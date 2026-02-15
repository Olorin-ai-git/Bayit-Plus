package tv.bayit.plus.data.model.zehani

import com.google.gson.annotations.SerializedName

data class FeedbackItem(
    @SerializedName("id")
    val id: String,

    @SerializedName("profile_id")
    val profileId: String,

    @SerializedName("feature_type")
    val featureType: String,

    @SerializedName("feedback_text")
    val feedbackText: String,

    @SerializedName("rating")
    val rating: Int? = null,

    @SerializedName("metadata")
    val metadata: Map<String, Any>? = null,

    @SerializedName("created_at")
    val createdAt: String
)
