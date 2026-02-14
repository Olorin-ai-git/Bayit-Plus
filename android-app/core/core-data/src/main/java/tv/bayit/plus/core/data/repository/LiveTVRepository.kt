package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface LiveTVRepository {
    suspend fun getChannels(): BayitResult<List<Any>>
    suspend fun getChannel(channelId: String): BayitResult<Any>
    suspend fun getStreamUrl(channelId: String): BayitResult<String>
    suspend fun getCurrentProgram(channelId: String): BayitResult<Any>
    suspend fun getChannelsByCategory(category: String): BayitResult<List<Any>>
}
