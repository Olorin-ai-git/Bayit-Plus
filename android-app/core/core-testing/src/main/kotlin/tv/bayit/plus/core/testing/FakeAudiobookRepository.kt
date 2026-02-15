package tv.bayit.plus.core.testing

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.Audiobook
import tv.bayit.plus.core.model.AudiobookChapter

/**
 * Fake implementation of AudiobookRepository for testing.
 *
 * Provides controllable audiobook data, chapters, and playback tracking.
 */
class FakeAudiobookRepository {

    private val audiobooks = mutableListOf<Audiobook>()
    private val playbackPositions = mutableMapOf<String, Long>()

    data class Bookmark(
        val id: String,
        val audiobookId: String,
        val positionMs: Long,
        val note: String?,
        val createdAt: Long
    )

    private val bookmarks = mutableMapOf<String, MutableList<Bookmark>>()

    var shouldReturnError = false
    var errorMessage = "Audiobook repository error"

    /**
     * Get all audiobooks.
     */
    suspend fun getAudiobooks(): BayitResult<List<Audiobook>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(audiobooks.toList())
        }
    }

    /**
     * Get audiobook by ID.
     */
    suspend fun getAudiobook(audiobookId: String): BayitResult<Audiobook> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val audiobook = audiobooks.find { it.id == audiobookId }
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
    suspend fun getChapters(audiobookId: String): BayitResult<List<AudiobookChapter>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val audiobook = audiobooks.find { it.id == audiobookId }
            BayitResult.Success(audiobook?.chapters ?: emptyList())
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
    suspend fun getBookmarks(audiobookId: String): BayitResult<List<Bookmark>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(bookmarks[audiobookId]?.toList() ?: emptyList())
        }
    }

    /**
     * Add a bookmark to an audiobook.
     */
    suspend fun addBookmark(audiobookId: String, positionMs: Long, note: String?): BayitResult<Bookmark> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val bookmark = Bookmark(
                id = "bookmark-${System.currentTimeMillis()}",
                audiobookId = audiobookId,
                positionMs = positionMs,
                note = note,
                createdAt = System.currentTimeMillis()
            )
            bookmarks.getOrPut(audiobookId) { mutableListOf() }.add(bookmark)
            BayitResult.Success(bookmark)
        }
    }

    // Test utility methods

    fun setAudiobooks(audiobooksList: List<Audiobook>) {
        audiobooks.clear()
        audiobooks.addAll(audiobooksList)
    }

    fun addAudiobook(audiobook: Audiobook) {
        audiobooks.add(audiobook)
    }

    fun setPlaybackPosition(audiobookId: String, positionMs: Long) {
        playbackPositions[audiobookId] = positionMs
    }

    fun clear() {
        audiobooks.clear()
        playbackPositions.clear()
        bookmarks.clear()
        shouldReturnError = false
    }
}
