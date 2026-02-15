package tv.bayit.plus.core.testing

import tv.bayit.plus.core.common.BayitResult

/**
 * Fake implementation of PlaylistRepository for testing.
 */
class FakePlaylistRepository {

    private val playlists = mutableListOf<Any>()
    private val playlistItems = mutableMapOf<String, MutableList<Any>>()

    var shouldReturnError = false
    var errorMessage = "Playlist repository error"

    suspend fun getPlaylists(): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(playlists.toList())
        }
    }

    suspend fun createPlaylist(name: String, description: String?): BayitResult<Any> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val playlist = mapOf(
                "id" to "playlist-${System.currentTimeMillis()}",
                "name" to name,
                "description" to description,
                "itemCount" to 0
            )
            playlists.add(playlist)
            BayitResult.Success(playlist)
        }
    }

    suspend fun addToPlaylist(playlistId: String, contentId: String): BayitResult<Unit> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val item = mapOf("contentId" to contentId)
            playlistItems.getOrPut(playlistId) { mutableListOf() }.add(item)
            BayitResult.Success(Unit)
        }
    }

    suspend fun removeFromPlaylist(playlistId: String, contentId: String): BayitResult<Unit> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            playlistItems[playlistId]?.removeAll {
                (it as? Map<*, *>)?.get("contentId") == contentId
            }
            BayitResult.Success(Unit)
        }
    }

    suspend fun deletePlaylist(playlistId: String): BayitResult<Unit> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            playlists.removeAll {
                (it as? Map<*, *>)?.get("id") == playlistId
            }
            playlistItems.remove(playlistId)
            BayitResult.Success(Unit)
        }
    }

    fun setPlaylists(playlistsList: List<Any>) {
        playlists.clear()
        playlists.addAll(playlistsList)
    }

    fun setPlaylistItems(playlistId: String, items: List<Any>) {
        playlistItems[playlistId] = items.toMutableList()
    }

    fun clear() {
        playlists.clear()
        playlistItems.clear()
        shouldReturnError = false
    }
}
