package tv.bayit.plus.data.model.zehani

import com.google.gson.annotations.SerializedName

data class MagicMirrorGreeting(
    @SerializedName("id")
    val id: String,

    @SerializedName("user_id")
    val userId: String,

    @SerializedName("profile_id")
    val profileId: String,

    @SerializedName("greeting_text_he")
    val greetingTextHe: String,

    @SerializedName("greeting_text_en")
    val greetingTextEn: String,

    @SerializedName("greeting_audio_gcs_path")
    val greetingAudioGcsPath: String? = null,

    @SerializedName("lipsync_data_gcs_path")
    val lipsyncDataGcsPath: String? = null,

    @SerializedName("vocabulary_of_the_day")
    val vocabularyOfTheDay: String? = null,

    @SerializedName("generated_at")
    val generatedAt: String,

    @SerializedName("expires_at")
    val expiresAt: String? = null
)
