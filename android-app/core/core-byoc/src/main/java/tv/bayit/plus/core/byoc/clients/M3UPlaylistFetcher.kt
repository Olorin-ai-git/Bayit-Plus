package tv.bayit.plus.core.byoc.clients

import okhttp3.OkHttpClient
import okhttp3.Request
import tv.bayit.plus.core.byoc.models.BYOCChannel
import tv.bayit.plus.core.common.logging.BayitLogger
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Singleton
class M3UPlaylistFetcher @Inject constructor(
    private val m3uParser: M3UParser,
    private val logger: BayitLogger,
) {
    private val okHttpClient = OkHttpClient.Builder().build()

    suspend fun fetch(url: String, sourceId: String): List<BYOCChannel> = withContext(Dispatchers.IO) {
        val request = Request.Builder().url(url).build()
        val response = okHttpClient.newCall(request).execute()
        val body = response.body?.string()
        if (!response.isSuccessful || body.isNullOrBlank()) {
            logger.error(
                "M3U playlist fetch failed",
                metadata = mapOf("url" to url, "status" to response.code.toString()),
            )
            return@withContext emptyList()
        }
        m3uParser.parse(body, sourceId)
    }
}
