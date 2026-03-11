package tv.bayit.plus.core.data.repository.impl

import retrofit2.http.Body
import retrofit2.http.POST
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.ProactiveVoiceRepository
import tv.bayit.plus.core.model.ProactiveVoiceContext
import tv.bayit.plus.core.model.ProactiveVoiceRequest
import tv.bayit.plus.core.model.ProactiveVoiceResponse
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Production implementation of [ProactiveVoiceRepository] backed by Retrofit.
 *
 * Calls POST /api/v1/voice/proactive/suggest to obtain ranked content
 * suggestions that are surfaced proactively while the user browses.
 *
 * Auth headers, correlation IDs, retry, and rate-limiting are handled by
 * [BayitApiClient] OkHttp interceptors; this class only maps the response.
 */
@Singleton
class ApiProactiveVoiceRepository @Inject constructor(
    private val client: BayitApiClient,
) : ProactiveVoiceRepository {

    private val service: ProactiveVoiceService = client.createService()

    override suspend fun getSuggestions(
        platform: String,
        profileId: String?,
        maxSuggestions: Int,
        context: ProactiveVoiceContext?,
    ): BayitResult<ProactiveVoiceResponse> = runCatchingResult {
        val request = ProactiveVoiceRequest(
            platform = platform,
            profileId = profileId,
            maxSuggestions = maxSuggestions,
            context = context,
        )
        client.safeApiCall { service.getSuggestions(request) }
    }
}

private interface ProactiveVoiceService {

    @POST("api/v1/voice/proactive/suggest")
    suspend fun getSuggestions(
        @Body request: ProactiveVoiceRequest,
    ): ProactiveVoiceResponse
}
