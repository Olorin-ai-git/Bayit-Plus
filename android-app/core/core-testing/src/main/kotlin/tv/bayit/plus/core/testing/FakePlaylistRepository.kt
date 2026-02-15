package tv.bayit.plus.core.testing

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.PlaylistResponse
import tv.bayit.plus.core.model.PlaylistItem

/**
 * Fake implementation of PlaylistRepository for testing.
 */
class FakePlaylistRepository {

    data class Playlist(
        val id: String,
        val name: String,
        val description: String?,
        val items: MutableList<PlaylistItem> = mutableListOf()
    )

    private val playlists = mutableListOf<Playlist>()
    private val playlistItemsById = mutableMapOf<String, PlaylistItem>()

    var shouldReturnError = false
    var errorMessage = "Playlist repository error"

    suspend fun getPlaylists(): BayitResult<List<Playlist>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(playlists.toList())
        }
    }

    suspend fun getPlaylist(): BayitResult<PlaylistResponse> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val allItems = playlists.flatMap { it.items }
            BayitResult.Success(
                PlaylistResponse(
                    items = allItems,
                    itemCount = allItems.size
                )
            )
        }
    }

    suspend fun createPlaylist(name: String, description: String?): BayitResult<Playlist> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val playlist = Playlist(
                id = "playlist-${System.currentTimeMillis()}",
                name = name,
                description = description
            )
            playlists.add(playlist)
            BayitResult.Success(playlist)
        }
    }

    suspend fun addToPlaylist(contentId: String, contentType: String): BayitResult<Unit> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val item = PlaylistItem(
                contentId = contentId,
                contentType = contentType,
                addedAt = System.currentTimeMillis().toString()
            )
            playlistItemsById[contentId] = item
            BayitResult.Success(Unit)
        }
    }

    suspend fun removeFromPlaylist(contentId: String): BayitResult<Unit> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            playlistItemsById.remove(contentId)
            playlists.forEach { it.items.removeAll { item -> item.contentId == contentId } }
            BayitResult.Success(Unit)
        }
    }

    suspend fun deletePlaylist(playlistId: String): BayitResult<Unit> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            playlists.removeAll { it.id == playlistId }
            BayitResult.Success(Unit)
        }
    }

    fun setPlaylists(playlistsList: List<Playlist>) {
        playlists.clear()
        playlists.addAll(playlistsList)
    }

    fun setPlaylistItems(items: List<PlaylistItem>) {
        playlistItemsById.clear()
        items.forEach { playlistItemsById[it.contentId] = it }
    }

    fun clear() {
        playlists.clear()
        playlistItemsById.clear()
        shouldReturnError = false
    }
}
