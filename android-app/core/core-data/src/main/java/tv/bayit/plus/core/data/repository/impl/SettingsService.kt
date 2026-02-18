package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.PUT
import retrofit2.http.POST
import tv.bayit.plus.core.model.AccessibilitySettings
import tv.bayit.plus.core.model.AIFeaturesSettings
import tv.bayit.plus.core.model.AppSettings
import tv.bayit.plus.core.model.AudioSettings
import tv.bayit.plus.core.model.MessageResponse
import tv.bayit.plus.core.model.NotificationSettings
import tv.bayit.plus.core.model.PlaybackSettings
import tv.bayit.plus.core.model.SubtitleSettings

internal interface SettingsService {

    @GET("api/v1/profiles/preferences")
    suspend fun getPreferences(): AppSettings

    @PATCH("api/v1/profiles/preferences")
    suspend fun updateSetting(@Body request: SettingUpdateBody): MessageResponse

    @PUT("api/v1/profiles/preferences/language")
    suspend fun updateLanguage(@Body request: LanguageUpdateBody): MessageResponse

    @PUT("api/v1/profiles/preferences/quality")
    suspend fun updateQuality(@Body request: QualityUpdateBody): MessageResponse

    @POST("api/v1/support/tickets")
    suspend fun submitSupport(@Body request: SupportRequestBody): MessageResponse

    @GET("api/v1/profiles/preferences/subtitles")
    suspend fun getSubtitlePreferences(): SubtitleSettings

    @PUT("api/v1/profiles/preferences/subtitles")
    suspend fun updateSubtitlePreferences(@Body settings: SubtitleSettings): MessageResponse

    @GET("api/v1/profiles/preferences/audio")
    suspend fun getAudioPreferences(): AudioSettings

    @PUT("api/v1/profiles/preferences/audio")
    suspend fun updateAudioPreferences(@Body settings: AudioSettings): MessageResponse

    @GET("api/v1/profiles/preferences/playback")
    suspend fun getPlaybackPreferences(): PlaybackSettings

    @PUT("api/v1/profiles/preferences/playback")
    suspend fun updatePlaybackPreferences(@Body settings: PlaybackSettings): MessageResponse

    @GET("api/v1/profiles/preferences/accessibility")
    suspend fun getAccessibilityPreferences(): AccessibilitySettings

    @PUT("api/v1/profiles/preferences/accessibility")
    suspend fun updateAccessibilityPreferences(@Body settings: AccessibilitySettings): MessageResponse

    @GET("api/v1/profiles/preferences/notifications")
    suspend fun getNotificationPreferences(): NotificationSettings

    @PUT("api/v1/profiles/preferences/notifications")
    suspend fun updateNotificationPreferences(@Body settings: NotificationSettings): MessageResponse

    @GET("api/v1/profiles/preferences/ai-features")
    suspend fun getAIFeaturesPreferences(): AIFeaturesSettings

    @PUT("api/v1/profiles/preferences/ai-features")
    suspend fun updateAIFeaturesPreferences(@Body settings: AIFeaturesSettings): MessageResponse

    @GET("api/v1/beta/credits/balance")
    suspend fun getBetaCreditsBalance(): CreditsBalanceResponse
}

@Serializable
internal data class SettingUpdateBody(val key: String, val value: String)

@Serializable
internal data class LanguageUpdateBody(val language: String)

@Serializable
internal data class QualityUpdateBody(val quality: String)

@Serializable
internal data class SupportRequestBody(val subject: String, val message: String)

@Serializable
internal data class CreditsBalanceResponse(val balance: Int)
