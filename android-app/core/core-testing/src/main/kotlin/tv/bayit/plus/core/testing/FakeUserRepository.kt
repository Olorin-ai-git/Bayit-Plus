package tv.bayit.plus.core.testing

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.UserResponse
import tv.bayit.plus.core.model.ProfileResponse
import tv.bayit.plus.core.model.ProfilePreferences

/**
 * Fake implementation of UserRepository for testing.
 */
class FakeUserRepository {

    private var currentUser: UserResponse? = null
    private var currentProfile: ProfileResponse? = null
    private var userPreferences: ProfilePreferences? = null

    var shouldReturnError = false
    var errorMessage = "User repository error"

    suspend fun getCurrentUser(): BayitResult<UserResponse> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else if (currentUser != null) {
            BayitResult.Success(currentUser!!)
        } else {
            BayitResult.Error(Exception("No user logged in"))
        }
    }

    suspend fun getProfile(): BayitResult<ProfileResponse> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else if (currentProfile != null) {
            BayitResult.Success(currentProfile!!)
        } else {
            BayitResult.Error(Exception("No profile available"))
        }
    }

    suspend fun updateProfile(displayName: String?, avatarUrl: String?): BayitResult<ProfileResponse> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val updatedProfile = currentProfile?.copy(
                displayName = displayName,
                avatar = avatarUrl
            ) ?: ProfileResponse(
                id = "test-user-id",
                displayName = displayName,
                avatar = avatarUrl
            )
            currentProfile = updatedProfile
            BayitResult.Success(updatedProfile)
        }
    }

    suspend fun getPreferences(): BayitResult<ProfilePreferences> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else if (userPreferences != null) {
            BayitResult.Success(userPreferences!!)
        } else {
            BayitResult.Error(Exception("No preferences available"))
        }
    }

    suspend fun updatePreferences(preferences: ProfilePreferences): BayitResult<Unit> {
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
            currentProfile = null
            userPreferences = null
            BayitResult.Success(Unit)
        }
    }

    fun setCurrentUser(user: UserResponse?) {
        currentUser = user
    }

    fun setProfile(profile: ProfileResponse?) {
        currentProfile = profile
    }

    fun setPreferences(preferences: ProfilePreferences?) {
        userPreferences = preferences
    }

    fun clear() {
        currentUser = null
        currentProfile = null
        userPreferences = null
        shouldReturnError = false
    }
}
