package tv.bayit.plus.core.data.repository.impl

import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query
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

/**
 * Retrofit service interface for [ApiContentRepository].
 *
 * Extracted to keep the main repository file within the 200-line limit.
 * Endpoint paths mirror the iOS APIContentRepository and web api.js.
 */
internal interface ContentService {

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

    @GET("api/v1/history/continue")
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
internal data class ContentRemoveResponse(
    val status: String? = null,
)

/** Wrapper for GET api/v1/content/all — backend returns {"items":[...]}. */
@kotlinx.serialization.Serializable
internal data class ContentAllResponse(
    val items: List<ContentItem> = emptyList(),
)

/**
 * Wrapper for the category content endpoint response.
 * The backend returns items nested inside a wrapper with pagination metadata.
 */
@kotlinx.serialization.Serializable
internal data class ContentCategoryResponse(
    val items: List<ContentItem> = emptyList(),
)

/** Wrapper for GET api/v1/history/continue — backend returns {"items":[...]}. */
@kotlinx.serialization.Serializable
internal data class ContinueWatchingResponse(
    val items: List<WatchHistoryItem> = emptyList(),
)

/** Wrapper for GET api/v1/trending/topics — backend returns {"topics":[...], ...}. */
@kotlinx.serialization.Serializable
internal data class TrendingTopicsResponse(
    val topics: List<CultureTrendingItem> = emptyList(),
)

/** Wrapper for GET api/v1/youngsters/featured — backend returns {"items":[...], ...}. */
@kotlinx.serialization.Serializable
internal data class YoungstersFeaturedResponse(
    val items: List<SectionContentItem> = emptyList(),
)
