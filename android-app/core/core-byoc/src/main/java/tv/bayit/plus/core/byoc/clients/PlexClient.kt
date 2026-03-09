package tv.bayit.plus.core.byoc.clients

import kotlinx.coroutines.delay
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import tv.bayit.plus.core.byoc.models.BYOCContentItem
import tv.bayit.plus.core.byoc.models.BYOCContentType
import tv.bayit.plus.core.byoc.models.BYOCSourceType
import tv.bayit.plus.core.byoc.models.PlexDeviceCode
import tv.bayit.plus.core.byoc.models.PlexLibrary
import tv.bayit.plus.core.byoc.models.PlexServer
import tv.bayit.plus.core.common.logging.BayitLogger
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PlexClient @Inject constructor(
    private val json: Json,
    private val logger: BayitLogger,
) {
    private val okHttpClient = OkHttpClient.Builder().build()

    private val plexTvApi: PlexApi by lazy {
        Retrofit.Builder()
            .baseUrl(PLEX_TV_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory(JSON_MEDIA_TYPE.toMediaType()))
            .build()
            .create(PlexApi::class.java)
    }

    suspend fun requestDeviceCode(clientId: String): PlexDeviceCode {
        val response = plexTvApi.requestPin(
            product = PRODUCT_NAME,
            clientId = clientId,
        )
        return PlexDeviceCode(
            id = response.id,
            code = response.code,
            productName = PRODUCT_NAME,
            clientIdentifier = clientId,
        )
    }

    suspend fun pollForToken(code: PlexDeviceCode): String {
        repeat(MAX_POLL_ATTEMPTS) {
            delay(POLL_INTERVAL_MS)
            val response = plexTvApi.checkPin(
                pinId = code.id,
                clientId = code.clientIdentifier,
            )
            val token = response.authToken
            if (!token.isNullOrBlank()) {
                return token
            }
        }
        throw PlexAuthException("PIN expired after $MAX_POLL_ATTEMPTS poll attempts")
    }

    suspend fun discoverServers(authToken: String, clientId: String): List<PlexServer> {
        val resources = plexTvApi.discoverServers(
            token = authToken,
            clientId = clientId,
        )
        return resources
            .filter { it.provides.contains("server") }
            .mapNotNull { resource ->
                val connection = resource.connections.firstOrNull() ?: return@mapNotNull null
                val uri = java.net.URI(connection.uri)
                PlexServer(
                    id = resource.clientId,
                    name = resource.name,
                    host = uri.host ?: return@mapNotNull null,
                    port = if (uri.port > 0) uri.port else DEFAULT_PLEX_PORT,
                    isLocal = connection.local,
                    isOwned = resource.owned,
                )
            }
    }

    suspend fun fetchLibraries(server: PlexServer, authToken: String): List<PlexLibrary> {
        val api = createServerApi(server)
        val container = api.fetchLibraries(token = authToken)
        return container.container.directories.map { dir ->
            PlexLibrary(
                id = dir.key,
                title = dir.title,
                type = dir.type,
            )
        }
    }

    suspend fun fetchLibraryItems(
        server: PlexServer,
        libraryId: String,
        authToken: String,
        sourceId: String,
    ): List<BYOCContentItem> {
        val api = createServerApi(server)
        val container = api.fetchLibraryItems(
            libraryId = libraryId,
            token = authToken,
        )
        val baseUrl = buildServerUrl(server)
        return container.container.metadata.map { item ->
            val partKey = item.media.firstOrNull()?.parts?.firstOrNull()?.key
            val streamUrl = if (partKey != null) {
                buildTranscodeUrl(baseUrl, partKey, authToken)
            } else {
                null
            }
            BYOCContentItem(
                id = "${sourceId}_${item.ratingKey}",
                title = item.title,
                description = item.summary,
                thumbnailUrl = item.thumb?.let { "$baseUrl$it?X-Plex-Token=$authToken" },
                backdropUrl = item.art?.let { "$baseUrl$it?X-Plex-Token=$authToken" },
                duration = item.duration?.let { (it / MILLIS_PER_SECOND).toInt() },
                year = item.year,
                genre = null,
                sourceType = BYOCSourceType.PLEX,
                sourceId = sourceId,
                streamUrl = streamUrl,
                contentType = mapPlexType(item.type),
            )
        }
    }

    private fun createServerApi(server: PlexServer): PlexServerApi {
        val baseUrl = buildServerUrl(server)
        return Retrofit.Builder()
            .baseUrl("$baseUrl/")
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory(JSON_MEDIA_TYPE.toMediaType()))
            .build()
            .create(PlexServerApi::class.java)
    }

    private fun buildServerUrl(server: PlexServer): String {
        val scheme = if (server.isLocal) "http" else "https"
        return "$scheme://${server.host}:${server.port}"
    }

    private fun buildTranscodeUrl(baseUrl: String, partKey: String, token: String): String {
        return "$baseUrl/video/:/transcode/universal/start.m3u8" +
            "?path=$partKey" +
            "&mediaIndex=0" +
            "&partIndex=0" +
            "&protocol=hls" +
            "&X-Plex-Token=$token"
    }

    private fun mapPlexType(type: String): BYOCContentType {
        return when (type) {
            "movie" -> BYOCContentType.MOVIE
            "show" -> BYOCContentType.SERIES
            "episode" -> BYOCContentType.EPISODE
            else -> BYOCContentType.VIDEO
        }
    }

    companion object {
        private const val PLEX_TV_BASE_URL = "https://plex.tv/"
        private const val JSON_MEDIA_TYPE = "application/json"
        private const val PRODUCT_NAME = "Bayit+"
        private const val POLL_INTERVAL_MS = 3000L
        private const val MAX_POLL_ATTEMPTS = 100
        private const val DEFAULT_PLEX_PORT = 32400
        private const val MILLIS_PER_SECOND = 1000
    }
}

class PlexAuthException(message: String) : Exception(message)
