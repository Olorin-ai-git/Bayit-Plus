package tv.bayit.plus.core.byoc

import kotlinx.coroutines.flow.StateFlow
import tv.bayit.plus.core.byoc.models.BYOCCapabilities
import tv.bayit.plus.core.byoc.models.BYOCContentItem
import tv.bayit.plus.core.byoc.models.BYOCSourceConfig

interface BYOCSourceManager {
    val sources: StateFlow<List<BYOCSourceConfig>>
    val contentItems: StateFlow<List<BYOCContentItem>>

    suspend fun addPlexSource(authToken: String, serverName: String): BYOCSourceConfig
    suspend fun addIPTVSource(name: String, m3uUrl: String): BYOCSourceConfig
    suspend fun addXtreamSource(name: String, server: String, username: String, password: String): BYOCSourceConfig
    suspend fun addYouTubeSource(name: String, accessToken: String, refreshToken: String? = null): BYOCSourceConfig
    suspend fun removeSource(sourceId: String)
    suspend fun refreshAll()
    suspend fun refreshSource(sourceId: String)
    suspend fun reauthenticatePlexSource(sourceId: String, authToken: String)
    suspend fun reauthenticateYouTubeSource(sourceId: String, accessToken: String, refreshToken: String?)
    fun isBYOCStream(streamUrl: String): Boolean
    fun getCapabilities(sourceId: String): BYOCCapabilities
}
