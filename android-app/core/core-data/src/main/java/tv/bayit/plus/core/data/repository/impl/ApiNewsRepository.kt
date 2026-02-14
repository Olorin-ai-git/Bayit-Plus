package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.NewsRepository
import tv.bayit.plus.core.model.MessageResponse
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Production implementation of [NewsRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APINewsRepository and web api.js.
 */
@Singleton
class ApiNewsRepository @Inject constructor(
    private val client: BayitApiClient,
) : NewsRepository {

    private val service: NewsService = client.createService()

    override suspend fun getNewsHeadlines(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getHeadlines() }
            response.items
        }

    override suspend fun getNewsArticle(articleId: String): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.getArticle(articleId) }
        }

    override suspend fun getNewsByCategory(
        category: String,
    ): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall {
            service.getByCategory(category)
        }
        response.items
    }

    override suspend fun getBreakingNews(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getBreakingNews() }
            response.items
        }

    override suspend fun bookmarkArticle(articleId: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.bookmarkArticle(articleId) }
            Unit
        }
}

private interface NewsService {

    @GET("api/v1/news/headlines")
    suspend fun getHeadlines(): NewsListResponse

    @GET("api/v1/news/article/{id}")
    suspend fun getArticle(
        @Path("id") articleId: String,
    ): NewsArticleDetail

    @GET("api/v1/news/category/{category}")
    suspend fun getByCategory(
        @Path("category") category: String,
    ): NewsListResponse

    @GET("api/v1/news/mivzakim")
    suspend fun getBreakingNews(): NewsListResponse

    @POST("api/v1/news/bookmark/{id}")
    suspend fun bookmarkArticle(
        @Path("id") articleId: String,
    ): MessageResponse
}

/** Response wrapper for news list endpoints. */
@Serializable
private data class NewsListResponse(
    val items: List<NewsItem> = emptyList(),
    val total: Int? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
)

/** A news item in the list. */
@Serializable
private data class NewsItem(
    val title: String? = null,
    val link: String? = null,
    val published: String? = null,
    val summary: String? = null,
    val source: String? = null,
    val category: String? = null,
    val thumbnail: String? = null,
)

/** Detailed news article returned from the article endpoint. */
@Serializable
private data class NewsArticleDetail(
    val id: String,
    val title: String? = null,
    val content: String? = null,
    val summary: String? = null,
    val source: String? = null,
    val link: String? = null,
    val published: String? = null,
    val category: String? = null,
    val thumbnail: String? = null,
    val author: String? = null,
    @SerialName("is_breaking") val isBreaking: Boolean? = null,
    @SerialName("is_bookmarked") val isBookmarked: Boolean? = null,
)
