package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface TrendingRepository {
    suspend fun getTrending(timeWindow: String): BayitResult<List<Any>>
    suspend fun getTrendingByCategory(categoryId: String): BayitResult<List<Any>>
    suspend fun getMostWatched(): BayitResult<List<Any>>
    suspend fun getNewReleases(): BayitResult<List<Any>>
}
