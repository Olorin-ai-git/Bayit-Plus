package tv.bayit.plus.core.testing

import tv.bayit.plus.core.common.BayitResult

/**
 * Fake implementation of FriendsRepository for testing.
 */
class FakeFriendsRepository {

    private val friends = mutableListOf<Any>()
    private val pendingRequests = mutableListOf<Any>()
    private val searchResults = mutableMapOf<String, List<Any>>()

    var shouldReturnError = false
    var errorMessage = "Friends repository error"

    suspend fun getFriends(): BayitResult<List<Any>> {
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
            val request = mapOf(
                "id" to "req-${System.currentTimeMillis()}",
                "userId" to userId,
                "status" to "pending"
            )
            pendingRequests.add(request)
            BayitResult.Success(Unit)
        }
    }

    suspend fun acceptRequest(requestId: String): BayitResult<Unit> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val request = pendingRequests.find {
                (it as? Map<*, *>)?.get("id") == requestId
            }
            if (request != null) {
                pendingRequests.remove(request)
                friends.add(request)
            }
            BayitResult.Success(Unit)
        }
    }

    suspend fun declineRequest(requestId: String): BayitResult<Unit> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            pendingRequests.removeAll {
                (it as? Map<*, *>)?.get("id") == requestId
            }
            BayitResult.Success(Unit)
        }
    }

    suspend fun removeFriend(friendId: String): BayitResult<Unit> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            friends.removeAll {
                (it as? Map<*, *>)?.get("userId") == friendId
            }
            BayitResult.Success(Unit)
        }
    }

    suspend fun getPendingRequests(): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(pendingRequests.toList())
        }
    }

    suspend fun searchUsers(query: String): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(searchResults[query] ?: emptyList())
        }
    }

    fun setFriends(friendsList: List<Any>) {
        friends.clear()
        friends.addAll(friendsList)
    }

    fun setPendingRequests(requests: List<Any>) {
        pendingRequests.clear()
        pendingRequests.addAll(requests)
    }

    fun setSearchResults(query: String, results: List<Any>) {
        searchResults[query] = results
    }

    fun clear() {
        friends.clear()
        pendingRequests.clear()
        searchResults.clear()
        shouldReturnError = false
    }
}
