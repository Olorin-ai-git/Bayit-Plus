package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface PlaylistRepository {
    suspend fun getPlaylists(): BayitResult<List<Any>>
    suspend fun getPlaylist(playlistId: String): BayitResult<Any>
    suspend fun createPlaylist(name: String): BayitResult<Any>
    suspend fun addToPlaylist(playlistId: String, mediaId: String): BayitResult<Unit>
    suspend fun removeFromPlaylist(playlistId: String, mediaId: String): BayitResult<Unit>
    suspend fun deletePlaylist(playlistId: String): BayitResult<Unit>
}
