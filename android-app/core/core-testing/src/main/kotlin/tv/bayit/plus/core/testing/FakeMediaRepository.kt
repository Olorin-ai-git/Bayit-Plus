package tv.bayit.plus.core.testing

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.ContentDetail
import tv.bayit.plus.core.model.RestartResponse
import tv.bayit.plus.core.model.StreamInfo
import tv.bayit.plus.core.model.WatchHistoryItem

/**
 * Fake implementation of MediaRepository for testing.
 */
class FakeMediaRepository {

    private val streamInfo = mutableMapOf<String, StreamInfo>()
    private val watchHistory = mutableListOf<WatchHistoryItem>()
    private val continueWatching = mutableListOf<WatchHistoryItem>()
    private val mediaMetadata = mutableMapOf<String, ContentDetail>()
    private val progressData = mutableMapOf<String, Long>()

    var shouldReturnError = false
    var errorMessage = "Media repository error"

    suspend fun getStreamInfo(mediaId: String): BayitResult<StreamInfo> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val info = streamInfo[mediaId] ?: StreamInfo(
                url = "https://stream.example.com/media/$mediaId"
            )
            BayitResult.Success(info)
        }
    }

    suspend fun getPlaybackUrl(mediaId: String): BayitResult<String> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val info = streamInfo[mediaId]
            val url = info?.resolvedUrl ?: "https://stream.example.com/media/$mediaId"
            BayitResult.Success(url)
        }
    }

    suspend fun reportProgress(
        mediaId: String,
        contentType: String,
        positionMs: Long,
        durationMs: Long,
    ): BayitResult<Unit> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            progressData[mediaId] = positionMs
            BayitResult.Success(Unit)
        }
    }

    suspend fun getWatchHistory(): BayitResult<List<WatchHistoryItem>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(watchHistory.toList())
        }
    }

    suspend fun getContinueWatching(): BayitResult<List<WatchHistoryItem>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(continueWatching.toList())
        }
    }

    suspend fun getMediaMetadata(mediaId: String): BayitResult<ContentDetail> {
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

    fun setStreamInfo(mediaId: String, info: StreamInfo) {
        streamInfo[mediaId] = info
    }

    fun setPlaybackUrl(mediaId: String, url: String) {
        streamInfo[mediaId] = StreamInfo(url = url)
    }

    fun setWatchHistory(history: List<WatchHistoryItem>) {
        watchHistory.clear()
        watchHistory.addAll(history)
    }

    fun setContinueWatching(items: List<WatchHistoryItem>) {
        continueWatching.clear()
        continueWatching.addAll(items)
    }

    fun setMediaMetadata(mediaId: String, metadata: ContentDetail) {
        mediaMetadata[mediaId] = metadata
    }

    suspend fun restartContent(contentId: String): BayitResult<RestartResponse> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            progressData.remove(contentId)
            BayitResult.Success(RestartResponse(message = "Video restarted", position = 0.0, progress = 0.0))
        }
    }

    suspend fun removeFromHistory(contentId: String): BayitResult<Unit> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            watchHistory.removeAll { it.id == contentId }
            continueWatching.removeAll { it.id == contentId }
            BayitResult.Success(Unit)
        }
    }

    suspend fun clearHistory(): BayitResult<Unit> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            watchHistory.clear()
            continueWatching.clear()
            BayitResult.Success(Unit)
        }
    }

    fun getProgress(mediaId: String): Long? = progressData[mediaId]

    fun clear() {
        streamInfo.clear()
        watchHistory.clear()
        continueWatching.clear()
        mediaMetadata.clear()
        progressData.clear()
        shouldReturnError = false
    }
}
