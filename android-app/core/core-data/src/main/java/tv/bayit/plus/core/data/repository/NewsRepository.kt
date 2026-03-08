package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.NewsHeadline

interface NewsRepository {
    suspend fun getNewsHeadlines(): BayitResult<List<NewsHeadline>>
    suspend fun getNewsArticle(articleId: String): BayitResult<Any>
    suspend fun getNewsByCategory(category: String): BayitResult<List<NewsHeadline>>
    suspend fun getBreakingNews(): BayitResult<List<NewsHeadline>>
    suspend fun bookmarkArticle(articleId: String): BayitResult<Unit>
}
