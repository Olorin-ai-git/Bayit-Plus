package tv.bayit.plus.feature.player.dialogue

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * A curated moment in a VOD content item where the viewer can interact
 * with a character.
 *
 * Maps to the backend response from
 * `GET /api/v1/avatar-mesh/content/{contentId}/interactive-moments`.
 */
@Serializable
data class InteractiveMoment(
    val timestamp: Double,
    val duration: Double,
    @SerialName("character_name") val characterName: String,
    @SerialName("interaction_prompt") val interactionPrompt: String,
    @SerialName("scene_context") val sceneContext: String,
)
