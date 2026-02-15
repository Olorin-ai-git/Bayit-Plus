package tv.bayit.plus.core.testing

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.AccountProfile

/**
 * Fake implementation of ProfileRepository for testing.
 */
class FakeProfileRepository {

    private val profiles = mutableListOf<AccountProfile>()
    private var selectedProfile: AccountProfile? = null

    var shouldReturnError = false
    var errorMessage = "Profile repository error"
    var requirePin = false

    suspend fun getProfiles(): BayitResult<List<AccountProfile>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(profiles.toList())
        }
    }

    suspend fun selectProfile(profileId: String, pin: String?): BayitResult<AccountProfile> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val profile = profiles.find { it.id == profileId }
            if (profile == null) {
                BayitResult.Error(Exception("Profile not found: $profileId"))
            } else if (requirePin && pin.isNullOrEmpty()) {
                BayitResult.Error(Exception("PIN required"))
            } else {
                selectedProfile = profile
                BayitResult.Success(profile)
            }
        }
    }

    fun setProfiles(profilesList: List<AccountProfile>) {
        profiles.clear()
        profiles.addAll(profilesList)
    }

    fun addProfile(profile: AccountProfile) {
        profiles.add(profile)
    }

    fun getSelectedProfile(): AccountProfile? = selectedProfile

    fun clear() {
        profiles.clear()
        selectedProfile = null
        shouldReturnError = false
        requirePin = false
    }
}
