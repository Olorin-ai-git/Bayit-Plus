package tv.bayit.plus.core.data.repository.impl

import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.ContentRepository
import tv.bayit.plus.core.model.CollectionDetail
import tv.bayit.plus.core.model.ContentDetail
import tv.bayit.plus.core.model.ContentItem
import tv.bayit.plus.core.model.FeaturedResponse
import tv.bayit.plus.core.network.api.BayitApiClient

/**
 * Production implementation of [ContentRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APIContentRepository and web api.js.
 */
class ApiContentRepository(
    private val client: BayitApiClient,
) : ContentRepository {

    private val service: ContentService = client.createService()

    override suspend fun getHomeFeed(): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall { service.getFeatured() }
        response.categories.flatMap { category -> category.items }
    }

    override suspend fun getContentById(id: String): BayitResult<Any> = runCatchingResult {
        client.safeApiCall { service.getContentDetail(id) }
    }

    override suspend fun getCollectionById(collectionId: String): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.getCollectionDetail(collectionId) }
        }

    override suspend fun getFeatured(): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall { service.getFeatured() }
        buildList {
            response.hero?.let { add(it) }
            addAll(response.spotlight)
        }
    }

    override suspend fun getByCategory(categoryId: String): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall {
                service.getContentByCategory(categoryId)
            }
            response.items
        }

    override suspend fun getRecommendations(): BayitResult<List<Any>> = runCatchingResult {
        client.safeApiCall { service.getRecommendations() }
    }
}

private interface ContentService {

    @GET("api/v1/content/featured")
    suspend fun getFeatured(): FeaturedResponse

    @GET("api/v1/content/{id}")
    suspend fun getContentDetail(@Path("id") id: String): ContentDetail

    @GET("api/v1/content/collections/{collectionId}")
    suspend fun getCollectionDetail(
        @Path("collectionId") collectionId: String,
    ): CollectionDetail

    @GET("api/v1/content/all")
    suspend fun getAllContent(
        @Query("page") page: Int,
        @Query("limit") limit: Int,
    ): List<ContentItem>

    @GET("api/v1/content/category/{categoryId}")
    suspend fun getContentByCategory(
        @Path("categoryId") categoryId: String,
    ): ContentCategoryResponse

    @GET("api/v1/content/recommendations")
    suspend fun getRecommendations(): List<ContentItem>
}

/**
 * Wrapper for the category content endpoint response.
 * The backend returns items nested inside a wrapper with pagination metadata.
 */
@kotlinx.serialization.Serializable
private data class ContentCategoryResponse(
    val items: List<ContentItem> = emptyList(),
)
