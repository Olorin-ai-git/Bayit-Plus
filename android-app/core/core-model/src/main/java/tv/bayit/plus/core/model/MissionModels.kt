package tv.bayit.plus.core.model

import kotlinx.serialization.Serializable

@Serializable
data class Mission(
    val id: String,
    val title: String,
    val description: String? = null,
    val type: String,
    val status: String,
    val progress: Float = 0f,
    val reward: Int? = null,
)

@Serializable
data class StarStory(
    val id: String,
    val title: String,
    val description: String? = null,
    val thumbnailUrl: String? = null,
    val duration: Long? = null,
)

@Serializable
data class InteractiveMissionDetail(
    val id: String,
    val title: String,
    val steps: List<MissionStep> = emptyList(),
    val totalSteps: Int = 0,
    val currentStep: Int = 0,
)

@Serializable
data class MissionStep(
    val id: String,
    val instruction: String,
    val type: String,
    val isCompleted: Boolean = false,
)
