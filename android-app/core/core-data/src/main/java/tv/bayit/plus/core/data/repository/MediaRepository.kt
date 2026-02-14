package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface MediaRepository {
    suspend fun getPlaybackUrl(mediaId: String): BayitResult<String>
    suspend fun reportProgress(mediaId: String, positionMs: Long): BayitResult<Unit>
    suspend fun getWatchHistory(): BayitResult<List<Any>>
    suspend fun getContinueWatching(): BayitResult<List<Any>>
    suspend fun getMediaMetadata(mediaId: String): BayitResult<Any>
}
