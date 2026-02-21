package tv.bayit.plus.core.data.repository.impl

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.ContentRepository
import tv.bayit.plus.core.model.CityContentResponse
import tv.bayit.plus.core.model.CollectionDetail
import tv.bayit.plus.core.model.CultureTrendingItem
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
 * The [ContentService] interface and response wrappers live in ApiContentRepository+Location.kt.
 */
class ApiContentRepository(
    internal val client: BayitApiClient,
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
            val response = client.safeApiCall { service.getContentByCategory(categoryId) }
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
        county: String?,
    ): BayitResult<IsraelisInCityResponse> = runCatchingResult {
        client.safeApiCall { service.getIsraelisInCity(city, state, county) }
    }

    override suspend fun getIsraeliBusinesses(
        city: String,
        state: String,
        county: String?,
    ): BayitResult<IsraeliBusinessesResponse> = runCatchingResult {
        client.safeApiCall { service.getIsraeliBusinesses(city, state, county) }
    }
}
