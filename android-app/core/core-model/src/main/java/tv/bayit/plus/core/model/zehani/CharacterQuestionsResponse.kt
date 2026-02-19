package tv.bayit.plus.core.model.zehani

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class CharacterQuestionsResponse(
    @SerialName("character_name") val characterName: String,
    @SerialName("specific_questions") val specificQuestions: List<String> = emptyList(),
    @SerialName("generic_questions") val genericQuestions: List<String> = emptyList(),
)
