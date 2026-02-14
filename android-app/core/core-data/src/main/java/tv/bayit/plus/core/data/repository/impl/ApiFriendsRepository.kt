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
import tv.bayit.plus.core.data.repository.FriendsRepository
import tv.bayit.plus.core.model.Friend
import tv.bayit.plus.core.model.FriendRequest
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Production implementation of [FriendsRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APIFriendsRepository and web api.js.
 */
@Singleton
class ApiFriendsRepository @Inject constructor(
    private val client: BayitApiClient,
) : FriendsRepository {

    private val service: FriendsService = client.createService()

    override suspend fun getFriends(): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall { service.getFriends() }
        response.friends
    }

    override suspend fun sendRequest(userId: String): BayitResult<Unit> = runCatchingResult {
        val body = FriendRequestBody(userId = userId)
        client.safeApiCall { service.sendFriendRequest(body) }
        Unit
    }

    override suspend fun acceptRequest(requestId: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.acceptFriendRequest(requestId) }
            Unit
        }

    override suspend fun declineRequest(requestId: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.declineFriendRequest(requestId) }
            Unit
        }

    override suspend fun removeFriend(friendId: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.removeFriend(friendId) }
            Unit
        }

    override suspend fun getPendingRequests(): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall { service.getPendingRequests() }
        response.requests
    }

    override suspend fun searchUsers(query: String): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.searchUsers(query) }
            response.users
        }
}

private interface FriendsService {

    @GET("api/v1/social/friends")
    suspend fun getFriends(): FriendsListResponse

    @POST("api/v1/social/friends/request")
    suspend fun sendFriendRequest(@Body request: FriendRequestBody): FriendRequestResponse

    @PUT("api/v1/social/friends/request/{id}/accept")
    suspend fun acceptFriendRequest(@Path("id") requestId: String): FriendRequestResponse

    @DELETE("api/v1/social/friends/request/{id}")
    suspend fun declineFriendRequest(@Path("id") requestId: String): FriendRequestResponse

    @DELETE("api/v1/social/friends/{id}")
    suspend fun removeFriend(@Path("id") friendId: String): FriendRequestResponse

    @GET("api/v1/social/friends/requests/pending")
    suspend fun getPendingRequests(): PendingRequestsResponse

    @GET("api/v1/social/users/search")
    suspend fun searchUsers(@Query("q") query: String): UserSearchResponse
}

/** Response wrapper for the friends list endpoint. */
@Serializable
private data class FriendsListResponse(
    val friends: List<Friend> = emptyList(),
)

/** Request body for sending a friend request. */
@Serializable
private data class FriendRequestBody(
    @SerialName("user_id") val userId: String,
)

/** Generic response for friend request mutations. */
@Serializable
private data class FriendRequestResponse(
    val success: Boolean = true,
    val message: String? = null,
)

/** Response wrapper for pending friend requests. */
@Serializable
private data class PendingRequestsResponse(
    val requests: List<FriendRequest> = emptyList(),
)

/** Response wrapper for user search results. */
@Serializable
private data class UserSearchResponse(
    val users: List<Friend> = emptyList(),
)
