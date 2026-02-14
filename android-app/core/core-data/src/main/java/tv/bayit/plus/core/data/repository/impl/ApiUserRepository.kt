package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PUT
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.UserRepository
import tv.bayit.plus.core.model.MessageResponse
import tv.bayit.plus.core.model.ProfilePreferences
import tv.bayit.plus.core.model.ProfileResponse
import tv.bayit.plus.core.model.ProfileUpdateRequest
import tv.bayit.plus.core.network.api.BayitApiClient

/**
 * Production implementation of [UserRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APIUserRepository and web api.js.
 */
class ApiUserRepository(
    private val client: BayitApiClient,
) : UserRepository {

    private val service: UserService = client.createService()

    override suspend fun getCurrentUser(): BayitResult<Any> = runCatchingResult {
        client.safeApiCall { service.getProfile() }
    }

    override suspend fun updateProfile(
        displayName: String?,
        avatarUrl: String?,
    ): BayitResult<Any> = runCatchingResult {
        val request = ProfileUpdateRequest(
            displayName = displayName,
            avatar = avatarUrl,
        )
        client.safeApiCall { service.updateProfile(request) }
    }

    override suspend fun getPreferences(): BayitResult<Any> = runCatchingResult {
        val profile = client.safeApiCall { service.getProfile() }
        profile.preferences ?: ProfilePreferences()
    }

    override suspend fun updatePreferences(
        preferences: Map<String, Any>,
    ): BayitResult<Unit> = runCatchingResult {
        val update = PreferencesUpdateBody(
            language = preferences["language"] as? String,
            subtitleLanguage = preferences["subtitle_language"] as? String,
            autoplay = preferences["autoplay"] as? Boolean,
            notifications = preferences["notifications"] as? Boolean,
            quality = preferences["quality"] as? String,
        )
        client.safeApiCall { service.updatePreferences(update) }
        Unit
    }

    override suspend fun deleteAccount(): BayitResult<Unit> = runCatchingResult {
        client.safeApiCall { service.deleteAccount() }
        Unit
    }
}

private interface UserService {

    @GET("api/v1/profiles/me")
    suspend fun getProfile(): ProfileResponse

    @PUT("api/v1/profiles/me")
    suspend fun updateProfile(@Body request: ProfileUpdateRequest): ProfileResponse

    @PUT("api/v1/users/me/preferences")
    suspend fun updatePreferences(@Body request: PreferencesUpdateBody): ProfilePreferences

    @DELETE("api/v1/user/account")
    suspend fun deleteAccount(): MessageResponse
}

/**
 * Request body for updating user preferences via the preferences endpoint.
 * Maps dynamic [Map] keys from the interface contract to typed fields.
 */
@Serializable
private data class PreferencesUpdateBody(
    val language: String? = null,
    @SerialName("subtitle_language") val subtitleLanguage: String? = null,
    val autoplay: Boolean? = null,
    val notifications: Boolean? = null,
    val quality: String? = null,
)
