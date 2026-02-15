package tv.bayit.plus.core.testing

import tv.bayit.plus.core.common.BayitResult

/**
 * Fake implementation of MediaRepository for testing.
 */
class FakeMediaRepository {

    private val playbackUrls = mutableMapOf<String, String>()
    private val watchHistory = mutableListOf<Any>()
    private val continueWatching = mutableListOf<Any>()
    private val mediaMetadata = mutableMapOf<String, Any>()
    private val progressData = mutableMapOf<String, Long>()

    var shouldReturnError = false
    var errorMessage = "Media repository error"

    suspend fun getPlaybackUrl(mediaId: String): BayitResult<String> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val url = playbackUrls[mediaId] ?: "https://stream.example.com/media/$mediaId"
            BayitResult.Success(url)
        }
    }

    suspend fun reportProgress(mediaId: String, positionMs: Long): BayitResult<Unit> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            progressData[mediaId] = positionMs
            BayitResult.Success(Unit)
        }
    }

    suspend fun getWatchHistory(): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(watchHistory.toList())
        }
    }

    suspend fun getContinueWatching(): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(continueWatching.toList())
        }
    }

    suspend fun getMediaMetadata(mediaId: String): BayitResult<Any> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val metadata = mediaMetadata[mediaId]
            if (metadata != null) {
                BayitResult.Success(metadata)
            } else {
                BayitResult.Error(Exception("Metadata not found: $mediaId"))
            }
        }
    }

    fun setPlaybackUrl(mediaId: String, url: String) {
        playbackUrls[mediaId] = url
    }

    fun setWatchHistory(history: List<Any>) {
        watchHistory.clear()
        watchHistory.addAll(history)
    }

    fun setContinueWatching(items: List<Any>) {
        continueWatching.clear()
        continueWatching.addAll(items)
    }

    fun setMediaMetadata(mediaId: String, metadata: Any) {
        mediaMetadata[mediaId] = metadata
    }

    fun getProgress(mediaId: String): Long? = progressData[mediaId]

    fun clear() {
        playbackUrls.clear()
        watchHistory.clear()
        continueWatching.clear()
        mediaMetadata.clear()
        progressData.clear()
        shouldReturnError = false
    }
}
