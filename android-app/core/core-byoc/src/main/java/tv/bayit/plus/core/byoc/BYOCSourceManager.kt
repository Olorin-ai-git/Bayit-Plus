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
    suspend fun addYouTubeSource(name: String, accessToken: String): BYOCSourceConfig
    suspend fun removeSource(sourceId: String)
    suspend fun refreshAll()
    suspend fun refreshSource(sourceId: String)
    fun isBYOCStream(streamUrl: String): Boolean
    fun getCapabilities(sourceId: String): BYOCCapabilities
}
