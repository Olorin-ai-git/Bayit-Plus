package tv.bayit.plus.core.testing

import tv.bayit.plus.core.common.BayitResult

/**
 * Fake implementation of AudiobookRepository for testing.
 *
 * Provides controllable audiobook data, chapters, and playback tracking.
 */
class FakeAudiobookRepository {

    private val audiobooks = mutableListOf<Any>()
    private val chapters = mutableMapOf<String, List<Any>>()
    private val playbackPositions = mutableMapOf<String, Long>()
    private val bookmarks = mutableMapOf<String, MutableList<Any>>()

    var shouldReturnError = false
    var errorMessage = "Audiobook repository error"

    /**
     * Get all audiobooks.
     */
    suspend fun getAudiobooks(): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(audiobooks.toList())
        }
    }

    /**
     * Get audiobook by ID.
     */
    suspend fun getAudiobook(audiobookId: String): BayitResult<Any> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val audiobook = audiobooks.find {
                (it as? Map<*, *>)?.get("id") == audiobookId
            }
            if (audiobook != null) {
                BayitResult.Success(audiobook)
            } else {
                BayitResult.Error(Exception("Audiobook not found: $audiobookId"))
            }
        }
    }

    /**
     * Get chapters for an audiobook.
     */
    suspend fun getChapters(audiobookId: String): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(chapters[audiobookId] ?: emptyList())
        }
    }

    /**
     * Get playback position for an audiobook.
     */
    suspend fun getPlaybackPosition(audiobookId: String): BayitResult<Long> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(playbackPositions[audiobookId] ?: 0L)
        }
    }

    /**
     * Update playback position for an audiobook.
     */
    suspend fun updatePlaybackPosition(audiobookId: String, positionMs: Long): BayitResult<Unit> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            playbackPositions[audiobookId] = positionMs
            BayitResult.Success(Unit)
        }
    }

    /**
     * Get bookmarks for an audiobook.
     */
    suspend fun getBookmarks(audiobookId: String): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(bookmarks[audiobookId]?.toList() ?: emptyList())
        }
    }

    /**
     * Add a bookmark to an audiobook.
     */
    suspend fun addBookmark(audiobookId: String, positionMs: Long, note: String?): BayitResult<Any> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val bookmark = mapOf(
                "id" to "bookmark-${System.currentTimeMillis()}",
                "audiobookId" to audiobookId,
                "positionMs" to positionMs,
                "note" to note,
                "createdAt" to System.currentTimeMillis()
            )
            bookmarks.getOrPut(audiobookId) { mutableListOf() }.add(bookmark)
            BayitResult.Success(bookmark)
        }
    }

    // Test utility methods

    fun setAudiobooks(audiobooksList: List<Any>) {
        audiobooks.clear()
        audiobooks.addAll(audiobooksList)
    }

    fun addAudiobook(audiobook: Any) {
        audiobooks.add(audiobook)
    }

    fun setChapters(audiobookId: String, chaptersList: List<Any>) {
        chapters[audiobookId] = chaptersList
    }

    fun setPlaybackPosition(audiobookId: String, positionMs: Long) {
        playbackPositions[audiobookId] = positionMs
    }

    fun clear() {
        audiobooks.clear()
        chapters.clear()
        playbackPositions.clear()
        bookmarks.clear()
        shouldReturnError = false
    }
}
