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
    @SerialName("lipsync_video_url") val lipsyncVideoUrl: String? = null,
    @SerialName("character_response_video_url") val characterResponseVideoUrl: String? = null,
    @SerialName("character_frame_url") val characterFrameUrl: String? = null,
    @SerialName("avatar_placement") val avatarPlacement: AvatarPlacement? = null,
    @SerialName("voice_id") val voiceId: String? = null,
    @SerialName("dialogue_options") val dialogueOptions: List<String> = emptyList(),
    @SerialName("character_response_text") val characterResponseText: String? = null,
)
