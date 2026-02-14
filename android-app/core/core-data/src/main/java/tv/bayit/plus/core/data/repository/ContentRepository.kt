package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface ContentRepository {
    suspend fun getHomeFeed(): BayitResult<List<Any>>
    suspend fun getContentById(id: String): BayitResult<Any>
    suspend fun getCollectionById(collectionId: String): BayitResult<Any>
    suspend fun getFeatured(): BayitResult<List<Any>>
    suspend fun getByCategory(categoryId: String): BayitResult<List<Any>>
    suspend fun getRecommendations(): BayitResult<List<Any>>
}
