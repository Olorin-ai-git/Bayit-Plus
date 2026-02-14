package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface NewsRepository {
    suspend fun getNewsHeadlines(): BayitResult<List<Any>>
    suspend fun getNewsArticle(articleId: String): BayitResult<Any>
    suspend fun getNewsByCategory(category: String): BayitResult<List<Any>>
    suspend fun getBreakingNews(): BayitResult<List<Any>>
    suspend fun bookmarkArticle(articleId: String): BayitResult<Unit>
}
