package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface HouseholdRepository {
    suspend fun getHousehold(): BayitResult<Any>
    suspend fun getMembers(): BayitResult<List<Any>>
    suspend fun inviteMember(email: String): BayitResult<Unit>
    suspend fun removeMember(memberId: String): BayitResult<Unit>
    suspend fun updateMemberRole(memberId: String, role: String): BayitResult<Unit>
    suspend fun getDevices(): BayitResult<List<Any>>
    suspend fun addProfile(name: String, avatarUrl: String?, ageGroup: String): BayitResult<Any>
}
