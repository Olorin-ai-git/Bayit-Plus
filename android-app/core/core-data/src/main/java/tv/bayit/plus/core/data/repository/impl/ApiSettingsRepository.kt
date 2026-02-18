package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.PUT
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.SettingsRepository
import tv.bayit.plus.core.model.AccessibilitySettings
import tv.bayit.plus.core.model.AIFeaturesSettings
import tv.bayit.plus.core.model.AppSettings
import tv.bayit.plus.core.model.AudioSettings
import tv.bayit.plus.core.model.MessageResponse
import tv.bayit.plus.core.model.NotificationSettings
import tv.bayit.plus.core.model.PlaybackSettings
import tv.bayit.plus.core.model.SubtitleSettings
import tv.bayit.plus.core.network.api.BayitApiClient

/**
 * Production implementation of [SettingsRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 */
class ApiSettingsRepository(
    private val client: BayitApiClient,
) : SettingsRepository {

    private val service: SettingsService = client.createService()

    override suspend fun getSettings(): BayitResult<Any> = runCatchingResult {
        client.safeApiCall { service.getPreferences() }
    }

    override suspend fun updateSetting(key: String, value: Any): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.updateSetting(SettingUpdateBody(key, value.toString())) }
            Unit
        }

    override suspend fun getLanguage(): BayitResult<String> = runCatchingResult {
        client.safeApiCall { service.getPreferences() }.language
    }

    override suspend fun setLanguage(languageCode: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.updateLanguage(LanguageUpdateBody(languageCode)) }
            Unit
        }

    override suspend fun getStreamingQuality(): BayitResult<String> = runCatchingResult {
        client.safeApiCall { service.getPreferences() }.videoQuality
    }

    override suspend fun setStreamingQuality(quality: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.updateQuality(QualityUpdateBody(quality)) }
            Unit
        }

    override suspend fun submitSupportRequest(subject: String, message: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.submitSupport(SupportRequestBody(subject, message)) }
            Unit
        }

    override suspend fun getSubtitleSettings(): BayitResult<SubtitleSettings> = runCatchingResult {
        client.safeApiCall { service.getSubtitlePreferences() }
    }

    override suspend fun updateSubtitleSettings(settings: SubtitleSettings): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.updateSubtitlePreferences(settings) }
            Unit
        }

    override suspend fun getAudioSettings(): BayitResult<AudioSettings> = runCatchingResult {
        client.safeApiCall { service.getAudioPreferences() }
    }

    override suspend fun updateAudioSettings(settings: AudioSettings): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.updateAudioPreferences(settings) }
            Unit
        }

    override suspend fun getPlaybackSettings(): BayitResult<PlaybackSettings> = runCatchingResult {
        client.safeApiCall { service.getPlaybackPreferences() }
    }

    override suspend fun updatePlaybackSettings(settings: PlaybackSettings): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.updatePlaybackPreferences(settings) }
            Unit
        }

    override suspend fun getAccessibilitySettings(): BayitResult<AccessibilitySettings> =
        runCatchingResult {
            client.safeApiCall { service.getAccessibilityPreferences() }
        }

    override suspend fun updateAccessibilitySettings(settings: AccessibilitySettings): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.updateAccessibilityPreferences(settings) }
            Unit
        }

    override suspend fun getNotificationSettings(): BayitResult<NotificationSettings> =
        runCatchingResult {
            client.safeApiCall { service.getNotificationPreferences() }
        }

    override suspend fun updateNotificationSettings(settings: NotificationSettings): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.updateNotificationPreferences(settings) }
            Unit
        }

    override suspend fun getAIFeaturesSettings(): BayitResult<AIFeaturesSettings> =
        runCatchingResult {
            client.safeApiCall { service.getAIFeaturesPreferences() }
        }

    override suspend fun updateAIFeaturesSettings(settings: AIFeaturesSettings): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.updateAIFeaturesPreferences(settings) }
            Unit
        }

    override suspend fun getBetaCreditsBalance(): BayitResult<Int> = runCatchingResult {
        client.safeApiCall { service.getBetaCreditsBalance() }.balance
    }
}
