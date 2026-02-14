package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.ChatRepository
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Production implementation of [ChatRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APIChatRepository and web api.js.
 */
@Singleton
class ApiChatRepository @Inject constructor(
    private val client: BayitApiClient,
) : ChatRepository {

    private val service: ChatService = client.createService()

    override suspend fun getChannelMessages(
        channelId: String,
        before: String?,
    ): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall {
            service.getChannelMessages(channelId, before)
        }
        response.messages
    }

    override suspend fun sendMessage(
        channelId: String,
        text: String,
    ): BayitResult<Any> = runCatchingResult {
        val body = SendChatMessageBody(text = text)
        client.safeApiCall { service.sendMessage(channelId, body) }
    }

    override suspend fun deleteMessage(
        channelId: String,
        messageId: String,
    ): BayitResult<Unit> = runCatchingResult {
        client.safeApiCall { service.deleteMessage(messageId) }
        Unit
    }

    override suspend fun reportMessage(
        messageId: String,
        reason: String,
    ): BayitResult<Unit> = runCatchingResult {
        val body = ReportMessageBody(reason = reason)
        client.safeApiCall { service.reportMessage(messageId, body) }
        Unit
    }

    override suspend fun getActiveChannels(): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall { service.getActiveChannels() }
        response.channels
    }
}

private interface ChatService {

    @GET("api/v1/chat/channels/{channelId}/messages")
    suspend fun getChannelMessages(
        @Path("channelId") channelId: String,
        @Query("before") before: String?,
    ): ChannelMessagesResponse

    @POST("api/v1/chat/channels/{channelId}/messages")
    suspend fun sendMessage(
        @Path("channelId") channelId: String,
        @Body request: SendChatMessageBody,
    ): ChatMessageItem

    @DELETE("api/v1/chat/messages/{id}")
    suspend fun deleteMessage(@Path("id") messageId: String): ChatActionResponse

    @POST("api/v1/chat/messages/{id}/report")
    suspend fun reportMessage(
        @Path("id") messageId: String,
        @Body request: ReportMessageBody,
    ): ChatActionResponse

    @GET("api/v1/chat/channels")
    suspend fun getActiveChannels(): ActiveChannelsResponse
}

/** Response wrapper for paginated channel messages. */
@Serializable
private data class ChannelMessagesResponse(
    val messages: List<ChatMessageItem> = emptyList(),
)

/** A single chat message within a channel. */
@Serializable
private data class ChatMessageItem(
    val id: String,
    @SerialName("sender_id") val senderId: String,
    @SerialName("sender_name") val senderName: String? = null,
    val content: String,
    val timestamp: String,
)

/** Request body for sending a chat message to a channel. */
@Serializable
private data class SendChatMessageBody(
    val text: String,
)

/** Request body for reporting a chat message. */
@Serializable
private data class ReportMessageBody(
    val reason: String,
)

/** Generic response for chat mutation actions. */
@Serializable
private data class ChatActionResponse(
    val success: Boolean = true,
    val message: String? = null,
)

/** Response wrapper for active channels list. */
@Serializable
private data class ActiveChannelsResponse(
    val channels: List<ChatChannelItem> = emptyList(),
)

/** A chat channel summary. */
@Serializable
private data class ChatChannelItem(
    val id: String,
    val name: String,
    @SerialName("member_count") val memberCount: Int = 0,
    @SerialName("is_active") val isActive: Boolean = true,
)
