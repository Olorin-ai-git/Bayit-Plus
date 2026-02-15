package tv.bayit.plus.core.testing

import tv.bayit.plus.core.common.BayitResult

/**
 * Fake implementation of ContentRepository for testing.
 *
 * Provides controllable content data for movies, series, featured content, etc.
 */
class FakeContentRepository {

    private var featured: Any? = null
    private val content = mutableMapOf<String, Any>()

    var shouldReturnError = false
    var errorMessage = "Content repository error"

    suspend fun getFeatured(): BayitResult<Any> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else if (featured != null) {
            BayitResult.Success(featured!!)
        } else {
            BayitResult.Error(Exception("No featured content available"))
        }
    }

    suspend fun getContent(contentId: String): BayitResult<Any> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val item = content[contentId]
            if (item != null) {
                BayitResult.Success(item)
            } else {
                BayitResult.Error(Exception("Content not found: $contentId"))
            }
        }
    }

    fun setFeatured(featuredContent: Any?) {
        featured = featuredContent
    }

    fun setContent(contentId: String, contentItem: Any) {
        content[contentId] = contentItem
    }

    fun clear() {
        featured = null
        content.clear()
        shouldReturnError = false
    }
}
