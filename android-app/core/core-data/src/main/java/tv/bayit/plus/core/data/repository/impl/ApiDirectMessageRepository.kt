package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.DirectMessageRepository
import tv.bayit.plus.core.model.ConversationSummary
import tv.bayit.plus.core.model.DirectMessage
import tv.bayit.plus.core.network.api.BayitApiClient
import tv.bayit.plus.core.network.websocket.WebSocketManager
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Production implementation of [DirectMessageRepository] backed by Retrofit and WebSocket.
 *
 * Uses [BayitApiClient] for REST endpoints (conversations, message history, send/delete)
 * and [WebSocketManager] for real-time message delivery. Every public method wraps the
 * network call in [runCatchingResult] so callers receive a [BayitResult] instead of raw
 * exceptions.
 *
 * Endpoint paths mirror the iOS APIDirectMessageRepository and web api.js.
 */
@Singleton
class ApiDirectMessageRepository @Inject constructor(
    private val client: BayitApiClient,
    private val webSocketManager: WebSocketManager,
) : DirectMessageRepository {

    private val service: DirectMessageService = client.createService()

    override suspend fun getConversations(): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall { service.getConversations() }
        response.conversations
    }

    override suspend fun getMessages(
        conversationId: String,
        before: String?,
    ): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall {
            service.getMessages(conversationId, before)
        }
        response.messages
    }

    override suspend fun sendMessage(
        conversationId: String,
        text: String,
    ): BayitResult<Any> = runCatchingResult {
        val body = SendDirectMessageBody(
            conversationId = conversationId,
            text = text,
        )
        client.safeApiCall { service.sendMessage(body) }
    }

    override suspend fun startConversation(userId: String): BayitResult<Any> =
        runCatchingResult {
            val body = StartConversationBody(userId = userId)
            client.safeApiCall { service.startConversation(body) }
        }

    override suspend fun deleteMessage(messageId: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.deleteMessage(messageId) }
            Unit
        }

    override suspend fun markAsRead(conversationId: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.markAsRead(conversationId) }
            Unit
        }
}

private interface DirectMessageService {

    @GET("api/v1/messages/conversations")
    suspend fun getConversations(): ConversationsResponse

    @GET("api/v1/messages/{conversationId}")
    suspend fun getMessages(
        @Path("conversationId") conversationId: String,
        @Query("before") before: String?,
    ): MessagesResponse

    @POST("api/v1/messages")
    suspend fun sendMessage(@Body request: SendDirectMessageBody): DirectMessage

    @POST("api/v1/messages/conversation/start")
    suspend fun startConversation(@Body request: StartConversationBody): ConversationSummary

    @DELETE("api/v1/messages/{id}")
    suspend fun deleteMessage(@Path("id") messageId: String): MessageActionResponse

    @PUT("api/v1/messages/{conversationId}/read")
    suspend fun markAsRead(
        @Path("conversationId") conversationId: String,
    ): MessageActionResponse
}

/** Response wrapper for the conversations list endpoint. */
@Serializable
private data class ConversationsResponse(
    val conversations: List<ConversationSummary> = emptyList(),
)

/** Response wrapper for paginated messages within a conversation. */
@Serializable
private data class MessagesResponse(
    val messages: List<DirectMessage> = emptyList(),
)

/** Request body for sending a direct message. */
@Serializable
private data class SendDirectMessageBody(
    @SerialName("conversation_id") val conversationId: String,
    val text: String,
)

/** Request body for starting a new conversation with a user. */
@Serializable
private data class StartConversationBody(
    @SerialName("user_id") val userId: String,
)

/** Generic response for message mutation actions. */
@Serializable
private data class MessageActionResponse(
    val success: Boolean = true,
    val message: String? = null,
)
