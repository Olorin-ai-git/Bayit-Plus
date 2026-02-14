package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.CategoryRepository
import tv.bayit.plus.core.model.ContentCategory
import tv.bayit.plus.core.model.ContentItem
import tv.bayit.plus.core.network.api.BayitApiClient

/**
 * Production implementation of [CategoryRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APICategoryRepository and web api.js.
 */
class ApiCategoryRepository(
    private val client: BayitApiClient,
) : CategoryRepository {

    private val service: CategoryService = client.createService()

    override suspend fun getCategories(): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall { service.getCategories() }
        response.categories
    }

    override suspend fun getCategory(categoryId: String): BayitResult<Any> =
        runCatchingResult {
            val response = client.safeApiCall { service.getCategories() }
            response.categories.firstOrNull { it.id == categoryId }
                ?: throw IllegalStateException("Category $categoryId not found")
        }

    override suspend fun getSubcategories(parentId: String): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getSubcategories(parentId) }
            response.subcategories
        }

    override suspend fun getContentForCategory(
        categoryId: String,
        page: Int,
    ): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall {
            service.getCategoryContent(categoryId, page)
        }
        response.items
    }
}

private interface CategoryService {

    @GET("api/v1/categories")
    suspend fun getCategories(): CategoriesListResponse

    @GET("api/v1/categories/{parentId}/subcategories")
    suspend fun getSubcategories(
        @Path("parentId") parentId: String,
    ): SubcategoriesResponse

    @GET("api/v1/categories/{categoryId}/content")
    suspend fun getCategoryContent(
        @Path("categoryId") categoryId: String,
        @Query("page") page: Int,
    ): CategoryContentResponse
}

/** Response wrapper for the categories list endpoint. */
@Serializable
private data class CategoriesListResponse(
    val categories: List<ContentCategory> = emptyList(),
)

/** Response wrapper for subcategories within a parent category. */
@Serializable
private data class SubcategoriesResponse(
    val subcategories: List<SubcategoryItem> = emptyList(),
)

/** A subcategory item. */
@Serializable
private data class SubcategoryItem(
    val id: String,
    val name: String,
    @SerialName("name_key") val nameKey: String? = null,
    @SerialName("parent_id") val parentId: String? = null,
)

/** Paginated response from the category content endpoint. */
@Serializable
private data class CategoryContentResponse(
    val items: List<ContentItem> = emptyList(),
    val total: Int? = null,
    val page: Int? = null,
)
