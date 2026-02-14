package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface ChatRepository {
    suspend fun getChannelMessages(channelId: String, before: String?): BayitResult<List<Any>>
    suspend fun sendMessage(channelId: String, text: String): BayitResult<Any>
    suspend fun deleteMessage(channelId: String, messageId: String): BayitResult<Unit>
    suspend fun reportMessage(messageId: String, reason: String): BayitResult<Unit>
    suspend fun getActiveChannels(): BayitResult<List<Any>>
}
