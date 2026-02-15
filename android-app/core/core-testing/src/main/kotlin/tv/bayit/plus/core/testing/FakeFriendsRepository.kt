package tv.bayit.plus.core.testing

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.Friend
import tv.bayit.plus.core.model.FriendRequest
import tv.bayit.plus.core.model.UserResponse

/**
 * Fake implementation of FriendsRepository for testing.
 */
class FakeFriendsRepository {

    private val friends = mutableListOf<Friend>()
    private val pendingRequests = mutableListOf<FriendRequest>()
    private val searchResults = mutableMapOf<String, List<UserResponse>>()

    var shouldReturnError = false
    var errorMessage = "Friends repository error"

    suspend fun getFriends(): BayitResult<List<Friend>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(friends.toList())
        }
    }

    suspend fun sendRequest(userId: String): BayitResult<Unit> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val request = FriendRequest(
                id = "req-${System.currentTimeMillis()}",
                fromUser = Friend(
                    id = userId,
                    displayName = "Test User"
                ),
                status = "pending",
                createdAt = System.currentTimeMillis().toString()
            )
            pendingRequests.add(request)
            BayitResult.Success(Unit)
        }
    }

    suspend fun acceptRequest(requestId: String): BayitResult<Unit> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val request = pendingRequests.find { it.id == requestId }
            if (request != null) {
                pendingRequests.remove(request)
                friends.add(request.fromUser)
            }
            BayitResult.Success(Unit)
        }
    }

    suspend fun declineRequest(requestId: String): BayitResult<Unit> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            pendingRequests.removeAll { it.id == requestId }
            BayitResult.Success(Unit)
        }
    }

    suspend fun removeFriend(friendId: String): BayitResult<Unit> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            friends.removeAll { it.id == friendId }
            BayitResult.Success(Unit)
        }
    }

    suspend fun getPendingRequests(): BayitResult<List<FriendRequest>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(pendingRequests.toList())
        }
    }

    suspend fun searchUsers(query: String): BayitResult<List<UserResponse>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(searchResults[query] ?: emptyList())
        }
    }

    fun setFriends(friendsList: List<Friend>) {
        friends.clear()
        friends.addAll(friendsList)
    }

    fun setPendingRequests(requests: List<FriendRequest>) {
        pendingRequests.clear()
        pendingRequests.addAll(requests)
    }

    fun setSearchResults(query: String, results: List<UserResponse>) {
        searchResults[query] = results
    }

    fun clear() {
        friends.clear()
        pendingRequests.clear()
        searchResults.clear()
        shouldReturnError = false
    }
}
