package tv.bayit.plus.core.testing

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.data.repository.ContentRepository
import tv.bayit.plus.core.model.CollectionDetail
import tv.bayit.plus.core.model.FeaturedResponse
import tv.bayit.plus.core.model.ContentDetail
import tv.bayit.plus.core.model.ContentItem

/**
 * Fake implementation of ContentRepository for testing.
 *
 * Provides controllable content data for movies, series, featured content, etc.
 */
class FakeContentRepository : ContentRepository {

    private var featured: FeaturedResponse? = null
    private val contentDetails = mutableMapOf<String, ContentDetail>()
    private val contentItems = mutableMapOf<String, ContentItem>()
    private val favorites = mutableListOf<ContentItem>()

    var shouldReturnError = false
    var errorMessage = "Content repository error"

    var allContentItems = mutableListOf<ContentItem>()

    override suspend fun getAllContent(page: Int, limit: Int): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(allContentItems.toList())
        }
    }

    override suspend fun getHomeFeed(): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(emptyList())
        }
    }

    override suspend fun getContentById(id: String): BayitResult<Any> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val detail = contentDetails[id]
            if (detail != null) {
                BayitResult.Success(detail)
            } else {
                BayitResult.Error(Exception("Content not found: $id"))
            }
        }
    }

    override suspend fun getCollectionById(collectionId: String): BayitResult<Any> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Error(Exception("Collection not found: $collectionId"))
        }
    }

    override suspend fun getFeatured(): BayitResult<Any> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else if (featured != null) {
            BayitResult.Success(featured!!)
        } else {
            BayitResult.Error(Exception("No featured content available"))
        }
    }

    override suspend fun getByCategory(categoryId: String): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(emptyList())
        }
    }

    override suspend fun getCollectionRecommendations(): BayitResult<List<CollectionDetail>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(emptyList())
        }
    }

    override suspend fun getRecommendations(): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(emptyList())
        }
    }

    override suspend fun getFavorites(): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(favorites.toList())
        }
    }

    override suspend fun removeFavorite(contentId: String): BayitResult<Unit> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            favorites.removeAll { it.id == contentId }
            BayitResult.Success(Unit)
        }
    }

    suspend fun getContent(contentId: String): BayitResult<ContentDetail> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val detail = contentDetails[contentId]
            if (detail != null) {
                BayitResult.Success(detail)
            } else {
                BayitResult.Error(Exception("Content not found: $contentId"))
            }
        }
    }

    suspend fun getContentItem(contentId: String): BayitResult<ContentItem> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val item = contentItems[contentId]
            if (item != null) {
                BayitResult.Success(item)
            } else {
                BayitResult.Error(Exception("Content item not found: $contentId"))
            }
        }
    }

    fun setFeatured(featuredContent: FeaturedResponse) {
        featured = featuredContent
    }

    fun setContent(contentId: String, contentDetail: ContentDetail) {
        contentDetails[contentId] = contentDetail
    }

    fun setContentItem(contentId: String, contentItem: ContentItem) {
        contentItems[contentId] = contentItem
    }

    fun clear() {
        featured = null
        contentDetails.clear()
        contentItems.clear()
        shouldReturnError = false
    }
}
