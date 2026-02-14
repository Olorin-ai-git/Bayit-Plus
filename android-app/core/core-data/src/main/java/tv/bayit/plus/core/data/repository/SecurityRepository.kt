package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface SecurityRepository {
    suspend fun getActiveSessions(): BayitResult<List<Any>>
    suspend fun revokeSession(sessionId: String): BayitResult<Unit>
    suspend fun revokeAllOtherSessions(): BayitResult<Unit>
    suspend fun getLoginHistory(): BayitResult<List<Any>>
    suspend fun enableTwoFactor(): BayitResult<Any>
    suspend fun disableTwoFactor(verificationCode: String): BayitResult<Unit>
}
