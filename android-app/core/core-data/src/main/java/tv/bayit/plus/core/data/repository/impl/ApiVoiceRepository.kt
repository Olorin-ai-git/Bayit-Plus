package tv.bayit.plus.core.data.repository.impl

import android.content.Context
import android.content.SharedPreferences
import dagger.hilt.android.qualifiers.ApplicationContext
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.VoiceRepository
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Production implementation of [VoiceRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APIVoiceRepository and web api.js.
 */
@Singleton
class ApiVoiceRepository @Inject constructor(
    internal val client: BayitApiClient,
    @ApplicationContext private val context: Context,
    internal val logger: BayitLogger,
) : VoiceRepository {

    internal val service: VoiceService = client.createService()

    internal val prefs: SharedPreferences by lazy {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    override suspend fun getAvailableVoices(
        languageCode: String,
    ): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall {
            service.getAvailableVoices(languageCode)
        }
        response.voices
    }

    override suspend fun getSelectedVoice(): BayitResult<Any> = runCatchingResult {
        val settings = client.safeApiCall { service.getVoiceSettings() }
        settings.selectedVoice ?: settings
    }

    override suspend fun setVoice(voiceId: String): BayitResult<Unit> =
        runCatchingResult {
            val body = VoiceSelectionBody(voiceId = voiceId)
            client.safeApiCall { service.updateVoiceSettings(body) }
            Unit
        }

    override suspend fun previewVoice(voiceId: String): BayitResult<String> =
        runCatchingResult {
            val body = VoicePreviewBody(voiceId = voiceId)
            val response = client.safeApiCall { service.previewVoice(body) }
            response.previewUrl
        }

    override suspend fun getVoiceSettings(): BayitResult<Any> = runCatchingResult {
        try {
            val response = client.safeApiCall { service.getVoiceSettings() }
            mapOf(
                "voice_id" to response.voiceId,
                "speed" to response.speed,
                "pitch" to response.pitch,
                "language" to response.language,
                "ai_onboarding_complete" to (response.aiOnboardingComplete ?: getLocalOnboardingStatus()),
                "voice_setup_complete" to (response.voiceSetupComplete ?: getLocalVoiceSetupStatus()),
            )
        } catch (e: Exception) {
            logger.warning("API unavailable, using local settings", mapOf("error" to e.message.orEmpty()))
            mapOf(
                "ai_onboarding_complete" to getLocalOnboardingStatus(),
                "voice_setup_complete" to getLocalVoiceSetupStatus(),
            )
        }
    }

    override suspend fun updateVoiceSettings(
        settings: Map<String, Any>,
    ): BayitResult<Unit> = runCatchingResult {
        val body = VoiceSettingsUpdateBody(
            voiceId = settings["voice_id"] as? String,
            speed = (settings["speed"] as? Number)?.toFloat(),
            pitch = (settings["pitch"] as? Number)?.toFloat(),
            language = settings["language"] as? String,
        )
        client.safeApiCall { service.updateVoiceSettings(body) }
        Unit
    }

    override suspend fun completeAIOnboarding(): BayitResult<Unit> =
        runCatchingResult {
            try {
                client.safeApiCall { service.completeAIOnboarding() }
                setLocalOnboardingStatus(true)
                logger.info("AI onboarding completed via API and persisted locally")
            } catch (e: Exception) {
                logger.warning("API unavailable, saving onboarding status locally", mapOf("error" to e.message.orEmpty()))
                setLocalOnboardingStatus(true)
            }
            Unit
        }

    override suspend fun completeVoiceSetup(): BayitResult<Unit> =
        runCatchingResult {
            try {
                client.safeApiCall { service.completeVoiceSetup() }
                setLocalVoiceSetupStatus(true)
                logger.info("Voice setup completed via API and persisted locally")
            } catch (e: Exception) {
                logger.warning("API unavailable, saving voice setup status locally", mapOf("error" to e.message.orEmpty()))
                setLocalVoiceSetupStatus(true)
            }
            Unit
        }

    override suspend fun trainVoiceModel(audioData: ByteArray): BayitResult<Unit> =
        trainVoiceModelImpl(audioData)

    companion object {
        private const val PREFS_NAME = "voice_repository_cache"
    }
}
