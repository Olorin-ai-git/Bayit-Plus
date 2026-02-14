package tv.bayit.plus.core.data.repository.impl

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.ProfileRepository
import tv.bayit.plus.core.model.AccountProfile
import tv.bayit.plus.core.model.ProfileSelectRequest
import tv.bayit.plus.core.network.api.BayitApiClient

/**
 * Production implementation of [ProfileRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the backend profiles.py routes registered at
 * /api/v1/profiles.
 */
class ApiProfileRepository(
    private val client: BayitApiClient,
) : ProfileRepository {

    private val service: ProfileService = client.createService()

    override suspend fun getProfiles(): BayitResult<List<AccountProfile>> =
        runCatchingResult {
            client.safeApiCall { service.getProfiles() }
        }

    override suspend fun selectProfile(
        profileId: String,
        pin: String?,
    ): BayitResult<AccountProfile> = runCatchingResult {
        val request = ProfileSelectRequest(pin = pin)
        client.safeApiCall { service.selectProfile(profileId, request) }
    }
}

private interface ProfileService {

    @GET("api/v1/profiles")
    suspend fun getProfiles(): List<AccountProfile>

    @POST("api/v1/profiles/{profileId}/select")
    suspend fun selectProfile(
        @Path("profileId") profileId: String,
        @Body request: ProfileSelectRequest,
    ): AccountProfile
}
