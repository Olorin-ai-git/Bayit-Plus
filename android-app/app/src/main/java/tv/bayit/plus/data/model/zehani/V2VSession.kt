package tv.bayit.plus.data.model.zehani

import com.google.gson.annotations.SerializedName

data class V2VSession(
    @SerializedName("id")
    val id: String,

    @SerializedName("avatar_id")
    val avatarId: String,

    @SerializedName("total_transforms")
    val totalTransforms: Int,

    @SerializedName("average_latency_ms")
    val averageLatencyMs: Int,

    @SerializedName("score_improvement")
    val scoreImprovement: Double,

    @SerializedName("credits_charged")
    val creditsCharged: Int,

    @SerializedName("status")
    val status: V2VStatus,

    @SerializedName("created_at")
    val createdAt: String
)

enum class V2VStatus {
    @SerializedName("active") ACTIVE,
    @SerializedName("completed") COMPLETED,
    @SerializedName("failed") FAILED
}

data class V2VTransformRequest(
    @SerializedName("avatar_id")
    val avatarId: String,

    @SerializedName("profile_id")
    val profileId: String,

    @SerializedName("audio_base64")
    val audioBase64: String,

    @SerializedName("target_phrase_he")
    val targetPhraseHe: String
)

data class V2VTransformResult(
    @SerializedName("session_id")
    val sessionId: String,

    @SerializedName("transformed_audio_url")
    val transformedAudioUrl: String,

    @SerializedName("similarity_score")
    val similarityScore: Double,

    @SerializedName("latency_ms")
    val latencyMs: Int
)
