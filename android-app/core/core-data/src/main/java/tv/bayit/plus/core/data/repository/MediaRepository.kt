package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.RestartResponse

interface MediaRepository {
    suspend fun getPlaybackUrl(mediaId: String): BayitResult<String>
    suspend fun getDownloadUrl(mediaId: String): BayitResult<String>
    suspend fun reportProgress(
        mediaId: String,
        contentType: String,
        positionMs: Long,
        durationMs: Long,
    ): BayitResult<Unit>
    suspend fun getWatchHistory(): BayitResult<List<Any>>
    suspend fun getContinueWatching(): BayitResult<List<Any>>
    suspend fun getMediaMetadata(mediaId: String): BayitResult<Any>
    suspend fun restartContent(contentId: String): BayitResult<RestartResponse>
    suspend fun removeFromHistory(contentId: String): BayitResult<Unit>
    suspend fun clearHistory(): BayitResult<Unit>
}
