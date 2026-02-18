package tv.bayit.plus.core.data.repository.impl

import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.ContentRepository
import tv.bayit.plus.core.model.CityContentResponse
import tv.bayit.plus.core.model.CollectionDetail
import tv.bayit.plus.core.model.ContentDetail
import tv.bayit.plus.core.model.ContentItem
import tv.bayit.plus.core.model.CultureTrendingItem
import tv.bayit.plus.core.model.FeaturedResponse
import tv.bayit.plus.core.model.IsraeliBusinessesResponse
import tv.bayit.plus.core.model.IsraelisInCityResponse
import tv.bayit.plus.core.model.SectionContentItem
import tv.bayit.plus.core.model.WatchHistoryItem
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

    override suspend fun getAllContent(page: Int, limit: Int): BayitResult<List<Any>> =
        runCatchingResult {
            client.safeApiCall { service.getAllContent(page, limit) }.items
        }

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

    override suspend fun getCollectionRecommendations(): BayitResult<List<CollectionDetail>> =
        runCatchingResult {
            client.safeApiCall { service.getCollectionRecommendations() }
        }

    override suspend fun getFeatured(): BayitResult<Any> = runCatchingResult {
        client.safeApiCall { service.getFeatured() }
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

    override suspend fun getFavorites(): BayitResult<List<Any>> = runCatchingResult {
        client.safeApiCall { service.getFavorites() }
    }

    override suspend fun removeFavorite(contentId: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.removeFavorite(contentId) }
            Unit
        }

    override suspend fun getContinueWatching(): BayitResult<List<WatchHistoryItem>> =
        runCatchingResult {
            client.safeApiCall { service.getContinueWatching() }.items
        }

    override suspend fun getTrending(): BayitResult<List<CultureTrendingItem>> =
        runCatchingResult {
            client.safeApiCall { service.getTrending() }.topics
        }

    override suspend fun getYoungstersTrending(): BayitResult<List<SectionContentItem>> =
        runCatchingResult {
            client.safeApiCall { service.getYoungstersFeatured() }.items
        }

    override suspend fun getJerusalemContent(): BayitResult<CityContentResponse> =
        runCatchingResult {
            client.safeApiCall { service.getJerusalemFeatured() }
        }

    override suspend fun getTelAvivContent(): BayitResult<CityContentResponse> =
        runCatchingResult {
            client.safeApiCall { service.getTelAvivFeatured() }
        }

    override suspend fun getIsraelisInCity(
        city: String,
        state: String,
        county: String?
    ): BayitResult<IsraelisInCityResponse> = runCatchingResult {
        client.safeApiCall { service.getIsraelisInCity(city, state, county) }
    }

    override suspend fun getIsraeliBusinesses(
        city: String,
        state: String,
        county: String?
    ): BayitResult<IsraeliBusinessesResponse> = runCatchingResult {
        client.safeApiCall { service.getIsraeliBusinesses(city, state, county) }
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

    @GET("api/v1/content/collections/recommendations")
    suspend fun getCollectionRecommendations(): List<CollectionDetail>

    @GET("api/v1/content/all")
    suspend fun getAllContent(
        @Query("page") page: Int,
        @Query("limit") limit: Int,
    ): ContentAllResponse

    @GET("api/v1/content/category/{categoryId}")
    suspend fun getContentByCategory(
        @Path("categoryId") categoryId: String,
    ): ContentCategoryResponse

    @GET("api/v1/content/recommendations")
    suspend fun getRecommendations(): List<ContentItem>

    @GET("api/v1/user/favorites")
    suspend fun getFavorites(): List<ContentItem>

    @retrofit2.http.DELETE("api/v1/user/favorites/{contentId}")
    suspend fun removeFavorite(@Path("contentId") contentId: String): ContentRemoveResponse

    @GET("api/v1/history")
    suspend fun getContinueWatching(): ContinueWatchingResponse

    @GET("api/v1/trending/topics")
    suspend fun getTrending(): TrendingTopicsResponse

    @GET("api/v1/youngsters/featured")
    suspend fun getYoungstersFeatured(): YoungstersFeaturedResponse

    @GET("api/v1/jerusalem/featured")
    suspend fun getJerusalemFeatured(): CityContentResponse

    @GET("api/v1/tel-aviv/featured")
    suspend fun getTelAvivFeatured(): CityContentResponse

    @GET("api/v1/content/israelis-in-city")
    suspend fun getIsraelisInCity(
        @Query("city") city: String,
        @Query("state") state: String,
        @Query("county") county: String?,
    ): IsraelisInCityResponse

    @GET("api/v1/content/israeli-businesses-in-city")
    suspend fun getIsraeliBusinesses(
        @Query("city") city: String,
        @Query("state") state: String,
        @Query("county") county: String?,
    ): IsraeliBusinessesResponse
}

@kotlinx.serialization.Serializable
private data class ContentRemoveResponse(
    val status: String? = null,
)

/** Wrapper for GET api/v1/content/all — backend returns {"items":[...]}. */
@kotlinx.serialization.Serializable
private data class ContentAllResponse(
    val items: List<ContentItem> = emptyList(),
)

/**
 * Wrapper for the category content endpoint response.
 * The backend returns items nested inside a wrapper with pagination metadata.
 */
@kotlinx.serialization.Serializable
private data class ContentCategoryResponse(
    val items: List<ContentItem> = emptyList(),
)

/** Wrapper for GET api/v1/history — backend returns {"items":[...], "total":N, ...}. */
@kotlinx.serialization.Serializable
private data class ContinueWatchingResponse(
    val items: List<WatchHistoryItem> = emptyList(),
)

/** Wrapper for GET api/v1/trending/topics — backend returns {"topics":[...], ...}. */
@kotlinx.serialization.Serializable
private data class TrendingTopicsResponse(
    val topics: List<CultureTrendingItem> = emptyList(),
)

/** Wrapper for GET api/v1/youngsters/featured — backend returns {"items":[...], ...}. */
@kotlinx.serialization.Serializable
private data class YoungstersFeaturedResponse(
    val items: List<SectionContentItem> = emptyList(),
)
