package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface FriendsRepository {
    suspend fun getFriends(): BayitResult<List<Any>>
    suspend fun sendRequest(userId: String): BayitResult<Unit>
    suspend fun acceptRequest(requestId: String): BayitResult<Unit>
    suspend fun declineRequest(requestId: String): BayitResult<Unit>
    suspend fun removeFriend(friendId: String): BayitResult<Unit>
    suspend fun getPendingRequests(): BayitResult<List<Any>>
    suspend fun searchUsers(query: String): BayitResult<List<Any>>
}
