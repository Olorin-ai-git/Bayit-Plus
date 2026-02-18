package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.CityContentResponse
import tv.bayit.plus.core.model.CollectionDetail
import tv.bayit.plus.core.model.CultureTrendingItem
import tv.bayit.plus.core.model.IsraeliBusinessesResponse
import tv.bayit.plus.core.model.IsraelisInCityResponse
import tv.bayit.plus.core.model.SectionContentItem
import tv.bayit.plus.core.model.WatchHistoryItem

interface ContentRepository {
    suspend fun getHomeFeed(): BayitResult<List<Any>>
    suspend fun getAllContent(page: Int, limit: Int): BayitResult<List<Any>>
    suspend fun getContentById(id: String): BayitResult<Any>
    suspend fun getCollectionById(collectionId: String): BayitResult<Any>
    suspend fun getCollectionRecommendations(): BayitResult<List<CollectionDetail>>
    suspend fun getFeatured(): BayitResult<Any>
    suspend fun getByCategory(categoryId: String): BayitResult<List<Any>>
    suspend fun getRecommendations(): BayitResult<List<Any>>
    suspend fun getFavorites(): BayitResult<List<Any>>
    suspend fun removeFavorite(contentId: String): BayitResult<Unit>

    suspend fun getContinueWatching(): BayitResult<List<WatchHistoryItem>>
    suspend fun getTrending(): BayitResult<List<CultureTrendingItem>>
    suspend fun getYoungstersTrending(): BayitResult<List<SectionContentItem>>
    suspend fun getJerusalemContent(): BayitResult<CityContentResponse>
    suspend fun getTelAvivContent(): BayitResult<CityContentResponse>
    suspend fun getIsraelisInCity(city: String, state: String, county: String? = null): BayitResult<IsraelisInCityResponse>
    suspend fun getIsraeliBusinesses(city: String, state: String, county: String? = null): BayitResult<IsraeliBusinessesResponse>
}
