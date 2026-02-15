package tv.bayit.plus.core.testing

import tv.bayit.plus.core.common.BayitResult

/**
 * Fake implementation of UserRepository for testing.
 */
class FakeUserRepository {

    private var currentUser: Any? = null
    private var userPreferences: Map<String, Any> = emptyMap()

    var shouldReturnError = false
    var errorMessage = "User repository error"

    suspend fun getCurrentUser(): BayitResult<Any> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else if (currentUser != null) {
            BayitResult.Success(currentUser!!)
        } else {
            BayitResult.Error(Exception("No user logged in"))
        }
    }

    suspend fun updateProfile(displayName: String?, avatarUrl: String?): BayitResult<Any> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val updatedUser = mapOf(
                "id" to ((currentUser as? Map<*, *>)?.get("id") ?: "user-id"),
                "displayName" to (displayName ?: "Test User"),
                "avatarUrl" to (avatarUrl ?: "https://example.com/avatar.jpg")
            )
            currentUser = updatedUser
            BayitResult.Success(updatedUser)
        }
    }

    suspend fun getPreferences(): BayitResult<Any> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(userPreferences)
        }
    }

    suspend fun updatePreferences(preferences: Map<String, Any>): BayitResult<Unit> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            userPreferences = preferences
            BayitResult.Success(Unit)
        }
    }

    suspend fun deleteAccount(): BayitResult<Unit> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            currentUser = null
            userPreferences = emptyMap()
            BayitResult.Success(Unit)
        }
    }

    fun setCurrentUser(user: Any?) {
        currentUser = user
    }

    fun setPreferences(preferences: Map<String, Any>) {
        userPreferences = preferences
    }

    fun clear() {
        currentUser = null
        userPreferences = emptyMap()
        shouldReturnError = false
    }
}
