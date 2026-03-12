package tv.bayit.plus.core.byoc.clients

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import okhttp3.FormBody
import okhttp3.OkHttpClient
import okhttp3.Request
import tv.bayit.plus.core.byoc.models.GoogleDeviceCode
import tv.bayit.plus.core.byoc.models.YouTubeVideo
import tv.bayit.plus.core.common.logging.BayitLogger
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class YouTubeClient @Inject constructor(
    private val json: Json,
    private val logger: BayitLogger,
) {
    private val okHttpClient = OkHttpClient.Builder().build()

    suspend fun requestDeviceCode(clientId: String): GoogleDeviceCode = withContext(Dispatchers.IO) {
        val body = FormBody.Builder()
            .add("client_id", clientId)
            .add("scope", YOUTUBE_SCOPE)
            .build()
        val request = Request.Builder()
            .url(DEVICE_CODE_URL)
            .post(body)
            .build()
        val response = okHttpClient.newCall(request).execute()
        val responseBody = response.body?.string() ?: throw IllegalStateException("Empty response from Google")
        if (!response.isSuccessful) {
            throw IllegalStateException("Google device code request failed (${response.code}): $responseBody")
        }
        val parsed = json.decodeFromString<GoogleDeviceCodeResponse>(responseBody)
        GoogleDeviceCode(
            deviceCode = parsed.deviceCode,
            userCode = parsed.userCode,
            verificationUrl = parsed.verificationUrl,
            expiresIn = parsed.expiresIn,
            interval = parsed.interval,
        )
    }

    suspend fun pollForToken(
        deviceCode: GoogleDeviceCode,
        clientId: String,
        clientSecret: String,
    ): String {
        val intervalMs = (deviceCode.interval * MILLIS_PER_SECOND).toLong()
        val maxAttempts = deviceCode.expiresIn * MILLIS_PER_SECOND / intervalMs
        repeat(maxAttempts.toInt()) {
            delay(intervalMs)
            val token = tryExchangeCode(deviceCode.deviceCode, clientId, clientSecret)
            if (token != null) return token
        }
        throw IllegalStateException("Authorization code expired")
    }

    suspend fun fetchSubscriptions(accessToken: String): List<YouTubeVideo> = withContext(Dispatchers.IO) {
        val url = "$DATA_API_BASE/subscriptions?part=snippet&mine=true&maxResults=$MAX_RESULTS"
        val request = Request.Builder()
            .url(url)
            .header("Authorization", "Bearer $accessToken")
            .build()
        val response = okHttpClient.newCall(request).execute()
        val body = response.body?.string() ?: return@withContext emptyList()
        if (!response.isSuccessful) {
            throw IllegalStateException("YouTube subscriptions fetch failed (${response.code}): $body")
        }
        val parsed = json.decodeFromString<YouTubeSubscriptionListResponse>(body)
        parsed.items.mapNotNull { item ->
            val snippet = item.snippet ?: return@mapNotNull null
            YouTubeVideo(
                id = snippet.resourceId?.channelId ?: return@mapNotNull null,
                title = snippet.title ?: "Unknown",
                description = null,
                thumbnailUrl = snippet.thumbnails?.high?.url ?: snippet.thumbnails?.medium?.url,
                channelTitle = snippet.title,
                publishedAt = null,
                duration = null,
                liveBroadcastContent = null,
            )
        }
    }

    suspend fun fetchChannelVideos(
        channelId: String,
        accessToken: String,
        maxResults: Int = MAX_RESULTS,
    ): List<YouTubeVideo> = withContext(Dispatchers.IO) {
        val url = "$DATA_API_BASE/search?part=snippet&channelId=$channelId&type=video" +
            "&order=date&maxResults=$maxResults"
        val request = Request.Builder()
            .url(url)
            .header("Authorization", "Bearer $accessToken")
            .build()
        val response = okHttpClient.newCall(request).execute()
        val body = response.body?.string() ?: return@withContext emptyList()
        if (!response.isSuccessful) {
            throw IllegalStateException("YouTube channel videos fetch failed (${response.code}): $body")
        }
        val parsed = json.decodeFromString<YouTubeVideoListResponse>(body)
        parsed.items.mapNotNull { item ->
            val snippet = item.snippet ?: return@mapNotNull null
            val videoId = item.id?.videoId ?: return@mapNotNull null
            YouTubeVideo(
                id = videoId,
                title = snippet.title ?: "Unknown",
                description = snippet.description,
                thumbnailUrl = snippet.thumbnails?.high?.url ?: snippet.thumbnails?.medium?.url,
                channelTitle = snippet.channelTitle,
                publishedAt = snippet.publishedAt,
                duration = item.contentDetails?.duration,
                liveBroadcastContent = snippet.liveBroadcastContent,
            )
        }
    }

    private suspend fun tryExchangeCode(
        deviceCode: String,
        clientId: String,
        clientSecret: String,
    ): String? = withContext(Dispatchers.IO) {
        val body = FormBody.Builder()
            .add("client_id", clientId)
            .add("client_secret", clientSecret)
            .add("device_code", deviceCode)
            .add("grant_type", GRANT_TYPE)
            .build()
        val request = Request.Builder()
            .url(TOKEN_URL)
            .post(body)
            .build()
        val response = okHttpClient.newCall(request).execute()
        val responseBody = response.body?.string() ?: return@withContext null
        val parsed = json.decodeFromString<GoogleTokenResponse>(responseBody)
        if (parsed.error != null && parsed.error != "authorization_pending" && parsed.error != "slow_down") {
            throw IllegalStateException("Token exchange failed: ${parsed.error}")
        }
        parsed.accessToken
    }

    companion object {
        private const val DEVICE_CODE_URL = "https://oauth2.googleapis.com/device/code"
        private const val TOKEN_URL = "https://oauth2.googleapis.com/token"
        private const val DATA_API_BASE = "https://www.googleapis.com/youtube/v3"
        private const val YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube.readonly"
        private const val GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code"
        private const val MAX_RESULTS = 25
        private const val MILLIS_PER_SECOND = 1000
    }
}
