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
        client.safeApiCall { service.sendFriendRequest(FriendRequestBody(userId = userId)) }
        Unit
    }

    override suspend fun acceptRequest(requestId: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.acceptFriendRequest(AcceptRejectBody(requestId)) }
            Unit
        }

    override suspend fun declineRequest(requestId: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.declineFriendRequest(AcceptRejectBody(requestId)) }
            Unit
        }

    override suspend fun removeFriend(friendId: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.removeFriend(friendId) }
            Unit
        }

    override suspend fun getPendingRequests(): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall { service.getPendingRequests() }
        response.incoming
    }

    override suspend fun searchUsers(query: String): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.searchUsers(SearchUsersBody(query)) }
            response.users
        }
}

private interface FriendsService {

    @GET("api/v1/friends/list")
    suspend fun getFriends(): FriendsListResponse

    @POST("api/v1/friends/request")
    suspend fun sendFriendRequest(@Body request: FriendRequestBody): FriendRequestResponse

    @POST("api/v1/friends/request/accept")
    suspend fun acceptFriendRequest(@Body request: AcceptRejectBody): FriendRequestResponse

    @POST("api/v1/friends/request/reject")
    suspend fun declineFriendRequest(@Body request: AcceptRejectBody): FriendRequestResponse

    @DELETE("api/v1/friends/{id}")
    suspend fun removeFriend(@Path("id") friendId: String): FriendRequestResponse

    @GET("api/v1/friends/requests")
    suspend fun getPendingRequests(): PendingRequestsResponse

    @POST("api/v1/friends/search")
    suspend fun searchUsers(@Body request: SearchUsersBody): UserSearchResponse
}

/** Response wrapper for the friends list endpoint. */
@Serializable
private data class FriendsListResponse(
    val friends: List<Friend> = emptyList(),
)

@Serializable
private data class FriendRequestBody(@SerialName("receiver_id") val userId: String)

@Serializable
private data class AcceptRejectBody(@SerialName("request_id") val requestId: String)

@Serializable
private data class SearchUsersBody(val query: String, val limit: Int = 20)

@Serializable
private data class FriendRequestResponse(val success: Boolean = true, val message: String? = null)

@Serializable
private data class PendingRequestsResponse(
    val incoming: List<FriendRequest> = emptyList(),
    val outgoing: List<FriendRequest> = emptyList(),
)

@Serializable
private data class UserSearchResponse(val users: List<Friend> = emptyList())
