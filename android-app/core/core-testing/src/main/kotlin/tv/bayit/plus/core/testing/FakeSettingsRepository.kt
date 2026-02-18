package tv.bayit.plus.core.testing

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.data.repository.SettingsRepository
import tv.bayit.plus.core.model.AccessibilitySettings
import tv.bayit.plus.core.model.AIFeaturesSettings
import tv.bayit.plus.core.model.AudioSettings
import tv.bayit.plus.core.model.NotificationSettings
import tv.bayit.plus.core.model.PlaybackSettings
import tv.bayit.plus.core.model.SubtitleSettings

/**
 * Fake implementation of SettingsRepository for testing.
 */
class FakeSettingsRepository : SettingsRepository {

    private val settings = mutableMapOf<String, Any>()
    private var language = "en"
    private var streamingQuality = "auto"
    private var subtitleSettings = SubtitleSettings()
    private var audioSettings = AudioSettings()
    private var playbackSettings = PlaybackSettings()
    private var accessibilitySettings = AccessibilitySettings()
    private var notificationSettings = NotificationSettings()
    private var aiFeaturesSettings = AIFeaturesSettings()
    private var creditsBalance = 500

    var shouldReturnError = false
    var errorMessage = "Settings repository error"

    override suspend fun getSettings(): BayitResult<Any> =
        if (shouldReturnError) BayitResult.Error(Exception(errorMessage)) else BayitResult.Success(settings.toMap())

    override suspend fun updateSetting(key: String, value: Any): BayitResult<Unit> =
        if (shouldReturnError) BayitResult.Error(Exception(errorMessage)) else { settings[key] = value; BayitResult.Success(Unit) }

    override suspend fun getLanguage(): BayitResult<String> =
        if (shouldReturnError) BayitResult.Error(Exception(errorMessage)) else BayitResult.Success(language)

    override suspend fun setLanguage(languageCode: String): BayitResult<Unit> =
        if (shouldReturnError) BayitResult.Error(Exception(errorMessage)) else { language = languageCode; BayitResult.Success(Unit) }

    override suspend fun getStreamingQuality(): BayitResult<String> =
        if (shouldReturnError) BayitResult.Error(Exception(errorMessage)) else BayitResult.Success(streamingQuality)

    override suspend fun setStreamingQuality(quality: String): BayitResult<Unit> =
        if (shouldReturnError) BayitResult.Error(Exception(errorMessage)) else { streamingQuality = quality; BayitResult.Success(Unit) }

    override suspend fun submitSupportRequest(subject: String, message: String): BayitResult<Unit> =
        if (shouldReturnError) BayitResult.Error(Exception(errorMessage)) else BayitResult.Success(Unit)

    override suspend fun getSubtitleSettings(): BayitResult<SubtitleSettings> =
        if (shouldReturnError) BayitResult.Error(Exception(errorMessage)) else BayitResult.Success(subtitleSettings)

    override suspend fun updateSubtitleSettings(settings: SubtitleSettings): BayitResult<Unit> =
        if (shouldReturnError) BayitResult.Error(Exception(errorMessage)) else { subtitleSettings = settings; BayitResult.Success(Unit) }

    override suspend fun getAudioSettings(): BayitResult<AudioSettings> =
        if (shouldReturnError) BayitResult.Error(Exception(errorMessage)) else BayitResult.Success(audioSettings)

    override suspend fun updateAudioSettings(settings: AudioSettings): BayitResult<Unit> =
        if (shouldReturnError) BayitResult.Error(Exception(errorMessage)) else { audioSettings = settings; BayitResult.Success(Unit) }

    override suspend fun getPlaybackSettings(): BayitResult<PlaybackSettings> =
        if (shouldReturnError) BayitResult.Error(Exception(errorMessage)) else BayitResult.Success(playbackSettings)

    override suspend fun updatePlaybackSettings(settings: PlaybackSettings): BayitResult<Unit> =
        if (shouldReturnError) BayitResult.Error(Exception(errorMessage)) else { playbackSettings = settings; BayitResult.Success(Unit) }

    override suspend fun getAccessibilitySettings(): BayitResult<AccessibilitySettings> =
        if (shouldReturnError) BayitResult.Error(Exception(errorMessage)) else BayitResult.Success(accessibilitySettings)

    override suspend fun updateAccessibilitySettings(settings: AccessibilitySettings): BayitResult<Unit> =
        if (shouldReturnError) BayitResult.Error(Exception(errorMessage)) else { accessibilitySettings = settings; BayitResult.Success(Unit) }

    override suspend fun getNotificationSettings(): BayitResult<NotificationSettings> =
        if (shouldReturnError) BayitResult.Error(Exception(errorMessage)) else BayitResult.Success(notificationSettings)

    override suspend fun updateNotificationSettings(settings: NotificationSettings): BayitResult<Unit> =
        if (shouldReturnError) BayitResult.Error(Exception(errorMessage)) else { notificationSettings = settings; BayitResult.Success(Unit) }

    override suspend fun getAIFeaturesSettings(): BayitResult<AIFeaturesSettings> =
        if (shouldReturnError) BayitResult.Error(Exception(errorMessage)) else BayitResult.Success(aiFeaturesSettings)

    override suspend fun updateAIFeaturesSettings(settings: AIFeaturesSettings): BayitResult<Unit> =
        if (shouldReturnError) BayitResult.Error(Exception(errorMessage)) else { aiFeaturesSettings = settings; BayitResult.Success(Unit) }

    override suspend fun getBetaCreditsBalance(): BayitResult<Int> =
        if (shouldReturnError) BayitResult.Error(Exception(errorMessage)) else BayitResult.Success(creditsBalance)

    fun clear() {
        settings.clear()
        language = "en"
        streamingQuality = "auto"
        shouldReturnError = false
    }
}
