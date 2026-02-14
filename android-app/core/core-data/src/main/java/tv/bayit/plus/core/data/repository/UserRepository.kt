package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface UserRepository {
    suspend fun getCurrentUser(): BayitResult<Any>
    suspend fun updateProfile(displayName: String?, avatarUrl: String?): BayitResult<Any>
    suspend fun getPreferences(): BayitResult<Any>
    suspend fun updatePreferences(preferences: Map<String, Any>): BayitResult<Unit>
    suspend fun deleteAccount(): BayitResult<Unit>
}
