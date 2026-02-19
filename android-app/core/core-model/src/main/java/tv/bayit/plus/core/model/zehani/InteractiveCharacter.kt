package tv.bayit.plus.core.model.zehani

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class InteractiveCharacter(
    val name: String,
    @SerialName("voice_id") val voiceId: String,
    @SerialName("frame_url") val frameUrl: String,
    val description: String,
    @SerialName("movie_context") val movieContext: String,
    @SerialName("actor_name") val actorName: String? = null,
    val gender: String? = null,
    @SerialName("suggested_questions") val suggestedQuestions: List<String> = emptyList(),
)
