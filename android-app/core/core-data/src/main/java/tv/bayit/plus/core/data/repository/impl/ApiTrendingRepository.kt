package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.TrendingRepository
import tv.bayit.plus.core.network.api.BayitApiClient

/**
 * Production implementation of [TrendingRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APITrendingRepository and web api.js.
 */
class ApiTrendingRepository(
    private val client: BayitApiClient,
) : TrendingRepository {

    private val service: TrendingService = client.createService()

    override suspend fun getTrending(timeWindow: String): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall {
                service.getTrendingTopics()
            }
            response.topics
        }

    override suspend fun getTrendingByCategory(
        categoryId: String,
    ): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall {
            service.getTrendingByCategory(categoryId)
        }
        response.topics
    }

    override suspend fun getMostWatched(): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall { service.getRecommendations() }
        response.recommendations
    }

    override suspend fun getNewReleases(): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall { service.getDailySummary() }
        response.topics
    }
}

private interface TrendingService {

    @GET("api/v1/trending/topics")
    suspend fun getTrendingTopics(): TrendingTopicsFullResponse

    @GET("api/v1/trending/category/{categoryId}")
    suspend fun getTrendingByCategory(
        @Path("categoryId") categoryId: String,
    ): TrendingCategoryResponse

    @GET("api/v1/trending/recommendations")
    suspend fun getRecommendations(
        @Query("limit") limit: Int = 20,
    ): TrendingRecommendationsResponse

    @GET("api/v1/trending/summary")
    suspend fun getDailySummary(): TrendingSummaryResponse
}

/** Response from GET /api/v1/trending/topics. */
@Serializable
private data class TrendingTopicsFullResponse(
    val topics: List<TrendingTopicItem> = emptyList(),
    @SerialName("overall_mood") val overallMood: String? = null,
    @SerialName("top_story") val topStory: String? = null,
    @SerialName("analyzed_at") val analyzedAt: String? = null,
    @SerialName("headline_count") val headlineCount: Int? = null,
    val sources: List<String>? = null,
)

/** A single trending topic. */
@Serializable
private data class TrendingTopicItem(
    val title: String? = null,
    @SerialName("title_en") val titleEn: String? = null,
    val category: String? = null,
    @SerialName("category_label") val categoryLabel: String? = null,
    val sentiment: String? = null,
    val importance: Int? = null,
    val summary: String? = null,
    val keywords: List<String> = emptyList(),
)

/** Response from GET /api/v1/trending/category/{category}. */
@Serializable
private data class TrendingCategoryResponse(
    val category: String? = null,
    @SerialName("category_label") val categoryLabel: String? = null,
    val topics: List<TrendingTopicItem> = emptyList(),
    val count: Int? = null,
)

/** Response from GET /api/v1/trending/recommendations. */
@Serializable
private data class TrendingRecommendationsResponse(
    val recommendations: List<TrendingRecommendationItem> = emptyList(),
    @SerialName("trending_topics") val trendingTopics: List<TrendingTopicSummary> = emptyList(),
    @SerialName("analyzed_at") val analyzedAt: String? = null,
)

/** A content recommendation matched to a trending topic. */
@Serializable
private data class TrendingRecommendationItem(
    val id: String,
    val title: String? = null,
    val description: String? = null,
    val thumbnail: String? = null,
    val type: String? = null,
    @SerialName("trending_topic") val trendingTopic: String? = null,
    @SerialName("relevance_score") val relevanceScore: Int? = null,
)

/** Brief topic summary returned alongside recommendations. */
@Serializable
private data class TrendingTopicSummary(
    val title: String? = null,
    val category: String? = null,
)

/** Response from GET /api/v1/trending/summary. */
@Serializable
private data class TrendingSummaryResponse(
    val summary: String? = null,
    @SerialName("top_story") val topStory: String? = null,
    @SerialName("overall_mood") val overallMood: String? = null,
    val topics: List<TrendingSummaryTopicItem> = emptyList(),
    val sources: List<String>? = null,
    @SerialName("analyzed_at") val analyzedAt: String? = null,
)

/** A topic entry within the daily summary. */
@Serializable
private data class TrendingSummaryTopicItem(
    val title: String? = null,
    val category: String? = null,
    @SerialName("category_label") val categoryLabel: String? = null,
    val importance: Int? = null,
)
