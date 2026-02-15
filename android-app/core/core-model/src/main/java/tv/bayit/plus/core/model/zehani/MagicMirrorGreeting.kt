package tv.bayit.plus.core.model.zehani

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Daily Magic Mirror greeting containing bilingual text,
 * audio path, lip-sync data, and vocabulary of the day.
 *
 * Maps to the backend MagicMirrorGreeting model returned from
 * `/api/v1/zeh-ani/magic-mirror/*` endpoints.
 */
@Serializable
data class MagicMirrorGreeting(
    val id: String,
    @SerialName("user_id") val userId: String,
    @SerialName("profile_id") val profileId: String,
    @SerialName("greeting_text_he") val greetingTextHe: String,
    @SerialName("greeting_text_en") val greetingTextEn: String,
    @SerialName("greeting_audio_gcs_path") val greetingAudioGcsPath: String? = null,
    @SerialName("lipsync_data_gcs_path") val lipsyncDataGcsPath: String? = null,
    @SerialName("vocabulary_of_the_day") val vocabularyOfTheDay: String? = null,
    @SerialName("generated_at") val generatedAt: String,
    @SerialName("expires_at") val expiresAt: String? = null,
)
