package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Query
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.SearchRepository
import tv.bayit.plus.core.model.MessageResponse
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Production implementation of [SearchRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APISearchRepository and web api.js.
 */
@Singleton
class ApiSearchRepository @Inject constructor(
    private val client: BayitApiClient,
) : SearchRepository {

    private val service: SearchService = client.createService()

    override suspend fun search(
        query: String,
        filters: Map<String, String>?,
    ): BayitResult<List<Any>> = runCatchingResult {
        val contentTypes = filters?.get("content_types")
        val genre = filters?.get("genre")
        val response = client.safeApiCall {
            service.unifiedSearch(
                query = query,
                contentTypes = contentTypes,
                genre = genre,
            )
        }
        response.results
    }

    override suspend fun getSuggestions(
        partialQuery: String,
    ): BayitResult<List<String>> = runCatchingResult {
        val response = client.safeApiCall {
            service.getSuggestions(partialQuery)
        }
        response.suggestions
    }

    override suspend fun getRecentSearches(): BayitResult<List<String>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getRecentSearches() }
            response.searches
        }

    override suspend fun clearRecentSearches(): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.clearRecentSearches() }
            Unit
        }

    override suspend fun getPopularSearches(): BayitResult<List<String>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getTrendingSearches() }
            response.trending
        }
}

private interface SearchService {

    @GET("api/v1/search/unified")
    suspend fun unifiedSearch(
        @Query("query") query: String,
        @Query("content_types") contentTypes: String?,
        @Query("genres") genre: String?,
    ): SearchResultsResponse

    @GET("api/v1/search/suggestions")
    suspend fun getSuggestions(
        @Query("query") query: String,
    ): SearchSuggestionsResponse

    @GET("api/v1/search/recent")
    suspend fun getRecentSearches(): RecentSearchesResponse

    @DELETE("api/v1/search/recent")
    suspend fun clearRecentSearches(): MessageResponse

    @GET("api/v1/search/trending")
    suspend fun getTrendingSearches(): TrendingSearchesResponse
}

/** Response from the unified search endpoint. */
@Serializable
private data class SearchResultsResponse(
    val results: List<SearchResultItem> = emptyList(),
    val total: Int? = null,
    val page: Int? = null,
    val limit: Int? = null,
    @SerialName("execution_time_ms") val executionTimeMs: Int? = null,
    @SerialName("cache_hit") val cacheHit: Boolean? = null,
)

/** A single search result item. */
@Serializable
private data class SearchResultItem(
    val id: String,
    val title: String? = null,
    val description: String? = null,
    val thumbnail: String? = null,
    val type: String? = null,
    val category: String? = null,
    val year: Int? = null,
    val duration: String? = null,
    val score: Float? = null,
)

/** Response from the search suggestions endpoint. */
@Serializable
private data class SearchSuggestionsResponse(
    val query: String? = null,
    val suggestions: List<String> = emptyList(),
)

/** Response from the recent searches endpoint. */
@Serializable
private data class RecentSearchesResponse(
    val searches: List<String> = emptyList(),
)

/** Response from the trending searches endpoint. */
@Serializable
private data class TrendingSearchesResponse(
    val trending: List<String> = emptyList(),
)
