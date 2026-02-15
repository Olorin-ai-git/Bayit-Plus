package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.PUT
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.SettingsRepository
import tv.bayit.plus.core.model.AppSettings
import tv.bayit.plus.core.model.MessageResponse
import tv.bayit.plus.core.network.api.BayitApiClient

/**
 * Production implementation of [SettingsRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APISettingsRepository and web api.js.
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
            val update = SettingUpdateBody(key = key, value = value.toString())
            client.safeApiCall { service.updateSetting(update) }
            Unit
        }

    override suspend fun getLanguage(): BayitResult<String> = runCatchingResult {
        val prefs = client.safeApiCall { service.getPreferences() }
        prefs.language
    }

    override suspend fun setLanguage(languageCode: String): BayitResult<Unit> =
        runCatchingResult {
            val update = LanguageUpdateBody(language = languageCode)
            client.safeApiCall { service.updateLanguage(update) }
            Unit
        }

    override suspend fun getStreamingQuality(): BayitResult<String> = runCatchingResult {
        val prefs = client.safeApiCall { service.getPreferences() }
        prefs.videoQuality
    }

    override suspend fun setStreamingQuality(quality: String): BayitResult<Unit> =
        runCatchingResult {
            val update = QualityUpdateBody(quality = quality)
            client.safeApiCall { service.updateQuality(update) }
            Unit
        }

    override suspend fun submitSupportRequest(
        subject: String,
        message: String,
    ): BayitResult<Unit> = runCatchingResult {
        val request = SupportRequestBody(subject = subject, message = message)
        client.safeApiCall { service.submitSupport(request) }
        Unit
    }
}

private interface SettingsService {

    @GET("api/v1/users/me/preferences")
    suspend fun getPreferences(): AppSettings

    @PATCH("api/v1/users/me/preferences")
    suspend fun updateSetting(@Body request: SettingUpdateBody): MessageResponse

    @PUT("api/v1/users/me/preferences/language")
    suspend fun updateLanguage(@Body request: LanguageUpdateBody): MessageResponse

    @PUT("api/v1/users/me/preferences/quality")
    suspend fun updateQuality(@Body request: QualityUpdateBody): MessageResponse

    @POST("api/v1/support/tickets")
    suspend fun submitSupport(@Body request: SupportRequestBody): MessageResponse
}

/** Request body for updating a single setting by key-value pair. */
@Serializable
private data class SettingUpdateBody(
    val key: String,
    val value: String,
)

/** Request body for updating the user's preferred language. */
@Serializable
private data class LanguageUpdateBody(
    val language: String,
)

/** Request body for updating the user's preferred streaming quality. */
@Serializable
private data class QualityUpdateBody(
    val quality: String,
)

/** Request body for submitting a support request. */
@Serializable
private data class SupportRequestBody(
    val subject: String,
    val message: String,
)
