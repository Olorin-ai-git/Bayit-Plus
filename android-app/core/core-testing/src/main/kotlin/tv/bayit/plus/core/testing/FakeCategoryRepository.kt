package tv.bayit.plus.core.testing

import tv.bayit.plus.core.common.BayitResult

/**
 * Fake implementation of CategoryRepository for testing.
 */
class FakeCategoryRepository {

    private val categories = mutableListOf<Any>()
    private val subcategories = mutableMapOf<String, List<Any>>()
    private val categoryContent = mutableMapOf<Pair<String, Int>, List<Any>>()

    var shouldReturnError = false
    var errorMessage = "Category repository error"

    suspend fun getCategories(): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(categories.toList())
        }
    }

    suspend fun getCategory(categoryId: String): BayitResult<Any> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val category = categories.find {
                (it as? Map<*, *>)?.get("id") == categoryId
            }
            if (category != null) {
                BayitResult.Success(category)
            } else {
                BayitResult.Error(Exception("Category not found: $categoryId"))
            }
        }
    }

    suspend fun getSubcategories(parentId: String): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(subcategories[parentId] ?: emptyList())
        }
    }

    suspend fun getContentForCategory(categoryId: String, page: Int): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(categoryContent[categoryId to page] ?: emptyList())
        }
    }

    fun setCategories(categoriesList: List<Any>) {
        categories.clear()
        categories.addAll(categoriesList)
    }

    fun addCategory(category: Any) {
        categories.add(category)
    }

    fun setSubcategories(parentId: String, subList: List<Any>) {
        subcategories[parentId] = subList
    }

    fun setContentForCategory(categoryId: String, page: Int, content: List<Any>) {
        categoryContent[categoryId to page] = content
    }

    fun clear() {
        categories.clear()
        subcategories.clear()
        categoryContent.clear()
        shouldReturnError = false
    }
}
