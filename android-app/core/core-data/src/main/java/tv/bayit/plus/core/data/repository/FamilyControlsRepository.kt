package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface FamilyControlsRepository {
    suspend fun getProfiles(): BayitResult<List<Any>>
    suspend fun createProfile(name: String, ageGroup: String): BayitResult<Any>
    suspend fun updateProfile(profileId: String, updates: Map<String, Any>): BayitResult<Any>
    suspend fun deleteProfile(profileId: String): BayitResult<Unit>
    suspend fun getContentRestrictions(profileId: String): BayitResult<Any>
    suspend fun setContentRestrictions(profileId: String, restrictions: Map<String, Any>): BayitResult<Unit>
    suspend fun getScreenTimeRules(profileId: String): BayitResult<Any>
    suspend fun setScreenTimeRules(profileId: String, rules: Map<String, Any>): BayitResult<Unit>
}
