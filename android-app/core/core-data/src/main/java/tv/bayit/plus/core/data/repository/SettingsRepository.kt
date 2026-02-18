package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.AccessibilitySettings
import tv.bayit.plus.core.model.AIFeaturesSettings
import tv.bayit.plus.core.model.AudioSettings
import tv.bayit.plus.core.model.NotificationSettings
import tv.bayit.plus.core.model.PlaybackSettings
import tv.bayit.plus.core.model.SubtitleSettings

interface SettingsRepository {
    suspend fun getSettings(): BayitResult<Any>
    suspend fun updateSetting(key: String, value: Any): BayitResult<Unit>
    suspend fun getLanguage(): BayitResult<String>
    suspend fun setLanguage(languageCode: String): BayitResult<Unit>
    suspend fun getStreamingQuality(): BayitResult<String>
    suspend fun setStreamingQuality(quality: String): BayitResult<Unit>
    suspend fun submitSupportRequest(subject: String, message: String): BayitResult<Unit>

    suspend fun getSubtitleSettings(): BayitResult<SubtitleSettings>
    suspend fun updateSubtitleSettings(settings: SubtitleSettings): BayitResult<Unit>

    suspend fun getAudioSettings(): BayitResult<AudioSettings>
    suspend fun updateAudioSettings(settings: AudioSettings): BayitResult<Unit>

    suspend fun getPlaybackSettings(): BayitResult<PlaybackSettings>
    suspend fun updatePlaybackSettings(settings: PlaybackSettings): BayitResult<Unit>

    suspend fun getAccessibilitySettings(): BayitResult<AccessibilitySettings>
    suspend fun updateAccessibilitySettings(settings: AccessibilitySettings): BayitResult<Unit>

    suspend fun getNotificationSettings(): BayitResult<NotificationSettings>
    suspend fun updateNotificationSettings(settings: NotificationSettings): BayitResult<Unit>

    suspend fun getAIFeaturesSettings(): BayitResult<AIFeaturesSettings>
    suspend fun updateAIFeaturesSettings(settings: AIFeaturesSettings): BayitResult<Unit>

    suspend fun getBetaCreditsBalance(): BayitResult<Int>
}
