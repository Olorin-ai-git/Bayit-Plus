package tv.bayit.plus.core.byoc.clients

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import okhttp3.Request
import tv.bayit.plus.core.byoc.models.BYOCChannel
import tv.bayit.plus.core.byoc.models.BYOCContentItem
import tv.bayit.plus.core.byoc.models.BYOCContentType
import tv.bayit.plus.core.byoc.models.BYOCSourceType
import tv.bayit.plus.core.byoc.models.XtreamAccountInfo
import tv.bayit.plus.core.common.logging.BayitLogger
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class XtreamClient @Inject constructor(
    private val json: Json,
    private val logger: BayitLogger,
) {
    private val okHttpClient = OkHttpClient.Builder().build()

    suspend fun authenticate(
        serverUrl: String,
        username: String,
        password: String,
    ): XtreamAccountInfo = withContext(Dispatchers.IO) {
        val url = "$serverUrl/player_api.php?username=$username&password=$password"
        val body = fetchJson(url)
        val response = json.decodeFromString<XtreamAuthResponse>(body)
        XtreamAccountInfo(
            username = response.userInfo.username,
            status = response.userInfo.status,
            expirationDate = response.userInfo.expDate?.toLongOrNull() ?: 0L,
            maxConnections = response.userInfo.maxConnections.toIntOrNull() ?: 1,
            activeConnections = response.userInfo.activeCons.toIntOrNull() ?: 0,
        )
    }

    suspend fun fetchLiveStreams(
        serverUrl: String,
        username: String,
        password: String,
        sourceId: String,
    ): List<BYOCChannel> = withContext(Dispatchers.IO) {
        val url = "$serverUrl/player_api.php?username=$username&password=$password&action=get_live_streams"
        val body = fetchJson(url)
        val items = json.decodeFromString<List<XtreamStreamItem>>(body)
        items.map { item ->
            BYOCChannel(
                id = "${sourceId}_live_${item.streamId}",
                name = item.name,
                logoUrl = item.streamIcon,
                group = item.categoryName ?: DEFAULT_GROUP,
                streamUrl = "$serverUrl/live/$username/$password/${item.streamId}.m3u8",
                sourceId = sourceId,
            )
        }
    }

    suspend fun fetchVODStreams(
        serverUrl: String,
        username: String,
        password: String,
        sourceId: String,
    ): List<BYOCContentItem> = withContext(Dispatchers.IO) {
        val url = "$serverUrl/player_api.php?username=$username&password=$password&action=get_vod_streams"
        val body = fetchJson(url)
        val items = json.decodeFromString<List<XtreamStreamItem>>(body)
        items.map { item ->
            val ext = item.containerExtension ?: "m3u8"
            BYOCContentItem(
                id = "${sourceId}_vod_${item.streamId}",
                title = item.name,
                description = null,
                thumbnailUrl = item.streamIcon,
                backdropUrl = null,
                duration = null,
                year = null,
                genre = item.categoryName,
                sourceType = BYOCSourceType.XTREAM,
                sourceId = sourceId,
                streamUrl = "$serverUrl/movie/$username/$password/${item.streamId}.$ext",
                contentType = BYOCContentType.MOVIE,
            )
        }
    }

    suspend fun fetchSeries(
        serverUrl: String,
        username: String,
        password: String,
        sourceId: String,
    ): List<BYOCContentItem> = withContext(Dispatchers.IO) {
        val url = "$serverUrl/player_api.php?username=$username&password=$password&action=get_series"
        val body = fetchJson(url)
        val items = json.decodeFromString<List<XtreamSeriesItem>>(body)
        items.map { item ->
            BYOCContentItem(
                id = "${sourceId}_series_${item.seriesId}",
                title = item.name,
                description = null,
                thumbnailUrl = item.cover,
                backdropUrl = null,
                duration = null,
                year = null,
                genre = item.categoryName,
                sourceType = BYOCSourceType.XTREAM,
                sourceId = sourceId,
                streamUrl = null,
                contentType = BYOCContentType.SERIES,
            )
        }
    }

    private fun fetchJson(url: String): String {
        val request = Request.Builder().url(url).build()
        val response = okHttpClient.newCall(request).execute()
        return response.body?.string()
            ?: throw IllegalStateException("Empty response body from Xtream API")
    }

    companion object {
        private const val DEFAULT_GROUP = "Ungrouped"
    }
}
