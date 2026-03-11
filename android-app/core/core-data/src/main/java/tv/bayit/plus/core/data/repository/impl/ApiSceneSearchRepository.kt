package tv.bayit.plus.core.data.repository.impl

import retrofit2.http.Body
import retrofit2.http.POST
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.SceneSearchRepository
import tv.bayit.plus.core.model.SceneSearchRequest
import tv.bayit.plus.core.model.SceneSearchResponse
import tv.bayit.plus.core.model.SceneSearchResult
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Production implementation of [SceneSearchRepository] backed by Retrofit.
 *
 * Calls POST /api/v1/search/scene for semantic scene search within
 * video content, returning timestamped results for player deep-linking.
 */
@Singleton
class ApiSceneSearchRepository @Inject constructor(
    private val client: BayitApiClient,
) : SceneSearchRepository {

    private val service: SceneSearchService = client.createService()

    override suspend fun searchScenes(
        channelId: String,
        query: String,
    ): BayitResult<List<SceneSearchResult>> = runCatchingResult {
        val request = SceneSearchRequest(
            query = query,
            contentId = channelId,
            language = DEFAULT_LANGUAGE,
            limit = DEFAULT_RESULT_LIMIT,
            minScore = DEFAULT_MIN_SCORE,
        )
        val response = client.safeApiCall {
            service.searchScenes(request)
        }
        response.results
    }
}

private const val DEFAULT_LANGUAGE = "he"
private const val DEFAULT_RESULT_LIMIT = 20
private const val DEFAULT_MIN_SCORE = 0.5

private interface SceneSearchService {

    @POST("api/v1/search/scene")
    suspend fun searchScenes(
        @Body request: SceneSearchRequest,
    ): SceneSearchResponse
}
