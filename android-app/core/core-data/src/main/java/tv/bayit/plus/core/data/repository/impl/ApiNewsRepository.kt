package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.NewsRepository
import tv.bayit.plus.core.model.MessageResponse
import tv.bayit.plus.core.model.NewsHeadline
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ApiNewsRepository @Inject constructor(
    private val client: BayitApiClient,
) : NewsRepository {

    private val service: NewsService = client.createService()

    override suspend fun getNewsHeadlines(): BayitResult<List<NewsHeadline>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getHeadlines() }
            response.items.map { it.toHeadline() }
        }

    override suspend fun getNewsArticle(articleId: String): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.getArticle(articleId) }
        }

    override suspend fun getNewsByCategory(
        category: String,
    ): BayitResult<List<NewsHeadline>> = runCatchingResult {
        val response = client.safeApiCall { service.getByCategory(category) }
        response.items.map { it.toHeadline() }
    }

    override suspend fun getBreakingNews(): BayitResult<List<NewsHeadline>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getBreakingNews() }
            response.items.map { it.toHeadline() }
        }

    override suspend fun bookmarkArticle(articleId: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.bookmarkArticle(articleId) }
            Unit
        }
}

private fun NewsItem.toHeadline() = NewsHeadline(
    title = title.orEmpty(),
    link = link,
    published = published,
    summary = summary,
    source = source,
    category = category,
    thumbnail = thumbnail,
)

private interface NewsService {
    @GET("api/v1/news/headlines")
    suspend fun getHeadlines(): NewsListResponse

    @GET("api/v1/news/article/{id}")
    suspend fun getArticle(@Path("id") articleId: String): NewsArticleDetail

    @GET("api/v1/news/category/{category}")
    suspend fun getByCategory(@Path("category") category: String): NewsListResponse

    @GET("api/v1/news/mivzakim")
    suspend fun getBreakingNews(): NewsListResponse

    @POST("api/v1/news/bookmark/{id}")
    suspend fun bookmarkArticle(@Path("id") articleId: String): MessageResponse
}

@Serializable
private data class NewsListResponse(
    val items: List<NewsItem> = emptyList(),
    val total: Int? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
)

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
