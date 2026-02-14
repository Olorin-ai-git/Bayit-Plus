package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface AudiobookRepository {
    suspend fun getAudiobooks(): BayitResult<List<Any>>
    suspend fun getAudiobook(audiobookId: String): BayitResult<Any>
    suspend fun getChapters(audiobookId: String): BayitResult<List<Any>>
    suspend fun getPlaybackPosition(audiobookId: String): BayitResult<Long>
    suspend fun updatePlaybackPosition(audiobookId: String, positionMs: Long): BayitResult<Unit>
    suspend fun getBookmarks(audiobookId: String): BayitResult<List<Any>>
    suspend fun addBookmark(audiobookId: String, positionMs: Long, note: String?): BayitResult<Any>
}
