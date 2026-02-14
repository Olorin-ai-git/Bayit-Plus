package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface CategoryRepository {
    suspend fun getCategories(): BayitResult<List<Any>>
    suspend fun getCategory(categoryId: String): BayitResult<Any>
    suspend fun getSubcategories(parentId: String): BayitResult<List<Any>>
    suspend fun getContentForCategory(categoryId: String, page: Int): BayitResult<List<Any>>
}
