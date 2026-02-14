package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface DirectMessageRepository {
    suspend fun getConversations(): BayitResult<List<Any>>
    suspend fun getMessages(conversationId: String, before: String?): BayitResult<List<Any>>
    suspend fun sendMessage(conversationId: String, text: String): BayitResult<Any>
    suspend fun startConversation(userId: String): BayitResult<Any>
    suspend fun deleteMessage(messageId: String): BayitResult<Unit>
    suspend fun markAsRead(conversationId: String): BayitResult<Unit>
}
