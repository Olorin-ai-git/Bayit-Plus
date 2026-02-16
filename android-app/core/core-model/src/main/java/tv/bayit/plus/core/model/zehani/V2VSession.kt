package tv.bayit.plus.core.model.zehani

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Voice-to-voice transformation session with improvement metrics.
 *
 * Maps to the backend V2VSession model returned from
 * `/api/v1/zeh-ani/v2v/` endpoints.
 */
@Serializable
data class V2VSession(
    val id: String,
    @SerialName("avatar_id") val avatarId: String,
    @SerialName("total_transforms") val totalTransforms: Int = 0,
    @SerialName("average_latency_ms") val averageLatencyMs: Int = 0,
    @SerialName("score_improvement") val scoreImprovement: Double = 0.0,
    @SerialName("credits_charged") val creditsCharged: Double = 0.0,
    val status: String,
    @SerialName("created_at") val createdAt: String,
)

@Serializable
data class V2VSessionListResponse(
    val sessions: List<V2VSession>,
    val total: Int,
)

@Serializable
data class V2VTransformRequest(
    @SerialName("avatar_id") val avatarId: String,
    @SerialName("profile_id") val profileId: String,
    @SerialName("audio_base64") val audioBase64: String,
    @SerialName("target_phrase_he") val targetPhraseHe: String,
)

@Serializable
data class V2VTransformResult(
    @SerialName("transformed_audio_url") val transformedAudioUrl: String? = null,
    @SerialName("similarity_score") val similarityScore: Double = 0.0,
    @SerialName("pronunciation_feedback") val pronunciationFeedback: String? = null,
    @SerialName("credits_charged") val creditsCharged: Double = 0.0,
)
