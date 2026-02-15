package tv.bayit.plus.core.testing

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.data.repository.CategoryRepository
import tv.bayit.plus.core.model.ContentCategory
import tv.bayit.plus.core.model.ContentItem

/**
 * Fake implementation of CategoryRepository for testing.
 */
class FakeCategoryRepository : CategoryRepository {

    private val categories = mutableListOf<ContentCategory>()
    private val subcategories = mutableMapOf<String, List<ContentCategory>>()
    private val categoryContent = mutableMapOf<Pair<String, Int>, List<ContentItem>>()

    var shouldReturnError = false
    var errorMessage = "Category repository error"

    override suspend fun getCategories(): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(categories.toList())
        }
    }

    override suspend fun getCategory(categoryId: String): BayitResult<Any> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val category = categories.find { it.id == categoryId }
            if (category != null) {
                BayitResult.Success(category)
            } else {
                BayitResult.Error(Exception("Category not found: $categoryId"))
            }
        }
    }

    override suspend fun getSubcategories(parentId: String): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(subcategories[parentId] ?: emptyList())
        }
    }

    override suspend fun getContentForCategory(categoryId: String, page: Int): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(categoryContent[categoryId to page] ?: emptyList())
        }
    }

    fun setCategories(categoriesList: List<ContentCategory>) {
        categories.clear()
        categories.addAll(categoriesList)
    }

    fun addCategory(category: ContentCategory) {
        categories.add(category)
    }

    fun setSubcategories(parentId: String, subList: List<ContentCategory>) {
        subcategories[parentId] = subList
    }

    fun setContentForCategory(categoryId: String, page: Int, content: List<ContentItem>) {
        categoryContent[categoryId to page] = content
    }

    fun clear() {
        categories.clear()
        subcategories.clear()
        categoryContent.clear()
        shouldReturnError = false
    }
}
