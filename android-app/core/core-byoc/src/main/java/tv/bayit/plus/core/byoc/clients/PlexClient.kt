package tv.bayit.plus.core.byoc.clients

import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import tv.bayit.plus.core.byoc.models.BYOCContentItem
import tv.bayit.plus.core.byoc.models.BYOCContentType
import tv.bayit.plus.core.byoc.models.BYOCSourceType
import tv.bayit.plus.core.byoc.models.PlexConnection
import tv.bayit.plus.core.byoc.models.PlexDeviceCode
import tv.bayit.plus.core.byoc.models.PlexLibrary
import tv.bayit.plus.core.byoc.models.PlexServer
import tv.bayit.plus.core.common.logging.BayitLogger
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PlexClient @Inject constructor(
    private val json: Json,
    private val logger: BayitLogger,
) {
    private val okHttpClient = OkHttpClient.Builder().build()

    private val localProbeClient = OkHttpClient.Builder()
        .connectTimeout(LOCAL_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .readTimeout(LOCAL_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .build()

    private val remoteProbeClient = OkHttpClient.Builder()
        .connectTimeout(REMOTE_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .readTimeout(REMOTE_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .build()

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
                val connections = resource.connections.map { conn ->
                    PlexConnection(
                        uri = conn.uri,
                        isLocal = conn.local,
                        isRelay = conn.relay,
                    )
                }
                if (connections.isEmpty()) return@mapNotNull null
                PlexServer(
                    id = resource.clientId,
                    name = resource.name,
                    connections = connections,
                    isOwned = resource.owned,
                )
            }
    }

    suspend fun resolveBaseURL(
        server: PlexServer,
        authToken: String,
    ): String = coroutineScope {
        val results = server.connections.map { conn ->
            async {
                try {
                    val client = if (conn.isLocal) localProbeClient else remoteProbeClient
                    val request = Request.Builder()
                        .url("${conn.uri}/identity")
                        .header("X-Plex-Token", authToken)
                        .header("Accept", "application/json")
                        .build()
                    val response = client.newCall(request).execute()
                    if (response.isSuccessful) conn.uri else null
                } catch (_: Exception) {
                    null
                }
            }
        }
        val resolved = results.awaitAll().firstNotNullOfOrNull { it }
        resolved ?: throw PlexAuthException(
            "No reachable connection for ${server.name}",
        )
    }

    suspend fun fetchLibraries(baseUrl: String, authToken: String): List<PlexLibrary> {
        val api = createServerApi(baseUrl)
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
        baseUrl: String,
        libraryId: String,
        authToken: String,
        sourceId: String,
    ): List<BYOCContentItem> {
        val api = createServerApi(baseUrl)
        val container = api.fetchLibraryItems(
            libraryId = libraryId,
            token = authToken,
        )
        return container.container.metadata.map { item ->
            val partKey = item.media.firstOrNull()?.parts?.firstOrNull()?.key
            val streamUrl = if (partKey != null) {
                buildDirectStreamUrl(baseUrl, partKey, authToken)
            } else {
                null
            }
            val imdbId = item.guids.firstOrNull { it.id.startsWith("imdb://") }
                ?.id?.removePrefix("imdb://")
            val tmdbId = item.guids.firstOrNull { it.id.startsWith("tmdb://") }
                ?.id?.removePrefix("tmdb://")?.toIntOrNull()
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
                imdbId = imdbId,
                tmdbId = tmdbId,
            )
        }
    }

    private fun createServerApi(baseUrl: String): PlexServerApi {
        return Retrofit.Builder()
            .baseUrl("$baseUrl/")
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory(JSON_MEDIA_TYPE.toMediaType()))
            .build()
            .create(PlexServerApi::class.java)
    }

    private fun buildDirectStreamUrl(baseUrl: String, partKey: String, token: String): String {
        return "$baseUrl$partKey?X-Plex-Token=$token"
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
        private const val MILLIS_PER_SECOND = 1000
        private const val LOCAL_TIMEOUT_SECONDS = 3L
        private const val REMOTE_TIMEOUT_SECONDS = 8L
    }
}

class PlexAuthException(message: String) : Exception(message)
