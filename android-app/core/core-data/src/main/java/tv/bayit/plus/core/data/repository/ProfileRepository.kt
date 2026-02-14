package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.AccountProfile

/**
 * Repository for managing user profiles within a Bayit+ account.
 *
 * Each account can have multiple profiles (adults, kids) with individual
 * preferences and content restrictions. Mirrors the backend profiles API
 * at /api/v1/profiles.
 */
interface ProfileRepository {
    suspend fun getProfiles(): BayitResult<List<AccountProfile>>
    suspend fun selectProfile(profileId: String, pin: String? = null): BayitResult<AccountProfile>
}
