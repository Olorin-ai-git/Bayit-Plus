package tv.bayit.plus.core.byoc

import tv.bayit.plus.core.byoc.adapters.IPTVChannelAdapter
import tv.bayit.plus.core.byoc.adapters.PlexContentAdapter
import tv.bayit.plus.core.byoc.adapters.XtreamContentAdapter
import tv.bayit.plus.core.byoc.adapters.YouTubeContentAdapter
import tv.bayit.plus.core.byoc.clients.M3UPlaylistFetcher
import tv.bayit.plus.core.byoc.clients.PlexClient
import tv.bayit.plus.core.byoc.clients.XtreamClient
import tv.bayit.plus.core.byoc.clients.YouTubeClient
import tv.bayit.plus.core.byoc.models.BYOCContentItem
import tv.bayit.plus.core.byoc.models.BYOCContentType
import tv.bayit.plus.core.byoc.models.BYOCSourceType
import tv.bayit.plus.core.byoc.persistence.BYOCKeychainStore
import tv.bayit.plus.core.byoc.persistence.BYOCSourceEntity
import tv.bayit.plus.core.common.logging.BayitLogger
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BYOCSourceRefresher @Inject constructor(
    private val keychainStore: BYOCKeychainStore,
    private val plexClient: PlexClient,
    private val plexAdapter: PlexContentAdapter,
    private val m3uFetcher: M3UPlaylistFetcher,
    private val iptvAdapter: IPTVChannelAdapter,
    private val xtreamClient: XtreamClient,
    private val xtreamAdapter: XtreamContentAdapter,
    private val youtubeClient: YouTubeClient,
    private val youtubeAdapter: YouTubeContentAdapter,
    private val logger: BayitLogger,
) {

    suspend fun refresh(entity: BYOCSourceEntity): List<BYOCContentItem> {
        return when (entity.type) {
            BYOCSourceType.PLEX.name -> refreshPlex(entity)
            BYOCSourceType.IPTV.name -> refreshIPTV(entity)
            BYOCSourceType.XTREAM.name -> refreshXtream(entity)
            BYOCSourceType.YOUTUBE.name -> refreshYouTube(entity)
            else -> {
                logger.warning("Unsupported BYOC source type", metadata = mapOf("type" to entity.type))
                emptyList()
            }
        }
    }

    private suspend fun refreshPlex(entity: BYOCSourceEntity): List<BYOCContentItem> {
        val token = keychainStore.getToken(entity.id) ?: return emptyList()
        val servers = plexClient.discoverServers(token, entity.id)
        val server = servers.firstOrNull() ?: return emptyList()
        val libraries = plexClient.fetchLibraries(server, token)
        val allItems = mutableListOf<BYOCContentItem>()
        for (library in libraries) {
            val items = plexClient.fetchLibraryItems(server, library.id, token, entity.id)
            allItems.addAll(plexAdapter.filterPlayable(items))
        }
        return allItems
    }

    private suspend fun refreshIPTV(entity: BYOCSourceEntity): List<BYOCContentItem> {
        val m3uUrl = entity.credentials
        if (m3uUrl.isBlank()) return emptyList()
        val channels = m3uFetcher.fetch(m3uUrl, entity.id)
        return iptvAdapter.filterPlayable(channels).map { channel ->
            BYOCContentItem(
                id = channel.id, title = channel.name, description = null,
                thumbnailUrl = channel.logoUrl, backdropUrl = null, duration = null,
                year = null, genre = channel.group, sourceType = BYOCSourceType.IPTV,
                sourceId = entity.id, streamUrl = channel.streamUrl,
                contentType = BYOCContentType.LIVE_CHANNEL,
            )
        }
    }

    private suspend fun refreshXtream(entity: BYOCSourceEntity): List<BYOCContentItem> {
        val serverUrl = entity.credentials
        val username = keychainStore.getUsername(entity.id) ?: return emptyList()
        val password = keychainStore.getPassword(entity.id) ?: return emptyList()
        val liveItems = xtreamAdapter.filterPlayableChannels(
            xtreamClient.fetchLiveStreams(serverUrl, username, password, entity.id),
        ).map { channel ->
            BYOCContentItem(
                id = channel.id, title = channel.name, description = null,
                thumbnailUrl = channel.logoUrl, backdropUrl = null, duration = null,
                year = null, genre = channel.group, sourceType = BYOCSourceType.XTREAM,
                sourceId = entity.id, streamUrl = channel.streamUrl,
                contentType = BYOCContentType.LIVE_CHANNEL,
            )
        }
        val vodItems = xtreamAdapter.filterPlayableItems(
            xtreamClient.fetchVODStreams(serverUrl, username, password, entity.id),
        )
        val seriesItems = xtreamClient.fetchSeries(serverUrl, username, password, entity.id)
        return liveItems + vodItems + seriesItems
    }

    private suspend fun refreshYouTube(entity: BYOCSourceEntity): List<BYOCContentItem> {
        val accessToken = keychainStore.getToken(entity.id) ?: return emptyList()
        val subscriptions = youtubeClient.fetchSubscriptions(accessToken)
        val allItems = mutableListOf<BYOCContentItem>()
        allItems.addAll(youtubeAdapter.toContentItems(subscriptions, entity.id))
        for (sub in subscriptions) {
            val videos = youtubeClient.fetchChannelVideos(sub.id, accessToken)
            allItems.addAll(youtubeAdapter.toContentItems(videos, entity.id))
        }
        return allItems
    }
}
