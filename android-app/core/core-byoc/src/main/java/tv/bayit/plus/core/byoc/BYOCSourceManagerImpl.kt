package tv.bayit.plus.core.byoc

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.byoc.adapters.IPTVChannelAdapter
import tv.bayit.plus.core.byoc.adapters.PlexContentAdapter
import tv.bayit.plus.core.byoc.adapters.XtreamContentAdapter
import tv.bayit.plus.core.byoc.adapters.YouTubeContentAdapter
import tv.bayit.plus.core.byoc.models.BYOCCapabilities
import tv.bayit.plus.core.byoc.models.BYOCContentItem
import tv.bayit.plus.core.byoc.models.BYOCSourceConfig
import tv.bayit.plus.core.byoc.models.BYOCSourceStatus
import tv.bayit.plus.core.byoc.models.BYOCSourceType
import tv.bayit.plus.core.byoc.persistence.BYOCKeychainStore
import tv.bayit.plus.core.byoc.persistence.BYOCSourceDao
import tv.bayit.plus.core.byoc.persistence.BYOCSourceEntity
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.byoc.di.BYOCScope
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BYOCSourceManagerImpl @Inject constructor(
    private val sourceDao: BYOCSourceDao,
    private val keychainStore: BYOCKeychainStore,
    private val refresher: BYOCSourceRefresher,
    private val plexAdapter: PlexContentAdapter,
    private val iptvAdapter: IPTVChannelAdapter,
    private val xtreamAdapter: XtreamContentAdapter,
    private val youtubeAdapter: YouTubeContentAdapter,
    private val logger: BayitLogger,
    @BYOCScope private val externalScope: CoroutineScope,
) : BYOCSourceManager {

    private val _sources = MutableStateFlow<List<BYOCSourceConfig>>(emptyList())
    override val sources: StateFlow<List<BYOCSourceConfig>> = _sources.asStateFlow()

    private val _contentItems = MutableStateFlow<List<BYOCContentItem>>(emptyList())
    override val contentItems: StateFlow<List<BYOCContentItem>> = _contentItems.asStateFlow()

    init {
        externalScope.launch { loadSources() }
    }

    override suspend fun addPlexSource(authToken: String, serverName: String): BYOCSourceConfig {
        val sourceId = UUID.randomUUID().toString()
        val now = System.currentTimeMillis()
        val entity = createEntity(sourceId, serverName, BYOCSourceType.PLEX, "")
        sourceDao.upsert(entity)
        keychainStore.storeToken(sourceId, authToken)
        loadSources()
        refreshSource(sourceId)
        return toConfig(sourceId, serverName, BYOCSourceType.PLEX, now)
    }

    override suspend fun addIPTVSource(name: String, m3uUrl: String): BYOCSourceConfig {
        val sourceId = UUID.randomUUID().toString()
        val now = System.currentTimeMillis()
        sourceDao.upsert(createEntity(sourceId, name, BYOCSourceType.IPTV, m3uUrl))
        loadSources()
        return toConfig(sourceId, name, BYOCSourceType.IPTV, now)
    }

    override suspend fun addXtreamSource(
        name: String,
        server: String,
        username: String,
        password: String,
    ): BYOCSourceConfig {
        val sourceId = UUID.randomUUID().toString()
        val now = System.currentTimeMillis()
        sourceDao.upsert(createEntity(sourceId, name, BYOCSourceType.XTREAM, server))
        keychainStore.storeCredentials(sourceId, username, password)
        loadSources()
        return toConfig(sourceId, name, BYOCSourceType.XTREAM, now)
    }

    override suspend fun addYouTubeSource(name: String, accessToken: String): BYOCSourceConfig {
        val sourceId = UUID.randomUUID().toString()
        val now = System.currentTimeMillis()
        sourceDao.upsert(createEntity(sourceId, name, BYOCSourceType.YOUTUBE, ""))
        keychainStore.storeToken(sourceId, accessToken)
        loadSources()
        refreshSource(sourceId)
        return toConfig(sourceId, name, BYOCSourceType.YOUTUBE, now)
    }

    override suspend fun removeSource(sourceId: String) {
        keychainStore.removeCredentials(sourceId)
        sourceDao.deleteById(sourceId)
        loadSources()
        _contentItems.value = _contentItems.value.filter { it.sourceId != sourceId }
    }

    override suspend fun refreshAll() {
        for (source in sourceDao.getAll()) {
            try {
                refreshAndUpdate(source)
            } catch (e: Exception) {
                logger.error(
                    "BYOC refresh failed for source",
                    error = e,
                    metadata = mapOf("sourceId" to source.id, "type" to source.type),
                )
                sourceDao.updateSyncStatus(source.id, System.currentTimeMillis(), BYOCSourceStatus.ERROR.name)
            }
        }
        loadSources()
    }

    override suspend fun refreshSource(sourceId: String) {
        val entity = sourceDao.getById(sourceId) ?: return
        try {
            sourceDao.updateSyncStatus(entity.id, System.currentTimeMillis(), BYOCSourceStatus.SYNCING.name)
            refreshAndUpdate(entity)
            sourceDao.updateSyncStatus(entity.id, System.currentTimeMillis(), BYOCSourceStatus.ACTIVE.name)
        } catch (e: Exception) {
            logger.error("BYOC source refresh failed", error = e, metadata = mapOf("sourceId" to sourceId))
            sourceDao.updateSyncStatus(entity.id, System.currentTimeMillis(), BYOCSourceStatus.ERROR.name)
        }
        loadSources()
    }

    override fun isBYOCStream(streamUrl: String): Boolean {
        return plexAdapter.isPlexStream(streamUrl) ||
            iptvAdapter.isIPTVStream(streamUrl) ||
            xtreamAdapter.isXtreamStream(streamUrl) ||
            youtubeAdapter.isYouTubeStream(streamUrl)
    }

    override fun getCapabilities(sourceId: String): BYOCCapabilities {
        val source = _sources.value.find { it.id == sourceId }
        return when (source?.type) {
            BYOCSourceType.PLEX -> plexAdapter.getCapabilities()
            BYOCSourceType.IPTV -> iptvAdapter.getCapabilities()
            BYOCSourceType.XTREAM -> xtreamAdapter.getCapabilities()
            BYOCSourceType.YOUTUBE -> youtubeAdapter.getCapabilities()
            else -> BYOCCapabilities(dubbing = true, liveSubtitles = false, trivia = false, audioOverlay = false)
        }
    }

    private suspend fun refreshAndUpdate(entity: BYOCSourceEntity) {
        val items = refresher.refresh(entity)
        val otherItems = _contentItems.value.filter { it.sourceId != entity.id }
        _contentItems.value = otherItems + items
    }

    private fun createEntity(id: String, name: String, type: BYOCSourceType, credentials: String): BYOCSourceEntity {
        return BYOCSourceEntity(
            id = id, name = name, type = type.name, credentials = credentials,
            createdAt = System.currentTimeMillis(), lastSyncAt = null, status = BYOCSourceStatus.ACTIVE.name,
        )
    }

    private fun toConfig(id: String, name: String, type: BYOCSourceType, createdAt: Long): BYOCSourceConfig {
        return BYOCSourceConfig(
            id = id, name = name, type = type,
            createdAt = createdAt, lastSyncAt = null, status = BYOCSourceStatus.ACTIVE,
        )
    }

    private suspend fun loadSources() {
        _sources.value = sourceDao.getAll().map { entity ->
            BYOCSourceConfig(
                id = entity.id, name = entity.name, type = BYOCSourceType.valueOf(entity.type),
                createdAt = entity.createdAt, lastSyncAt = entity.lastSyncAt, status = BYOCSourceStatus.valueOf(entity.status),
            )
        }
    }
}
