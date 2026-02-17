package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.CollectionDetail

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
}
