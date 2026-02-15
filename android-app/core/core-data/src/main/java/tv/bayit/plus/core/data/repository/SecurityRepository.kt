package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface SecurityRepository {
    suspend fun getActiveSessions(): BayitResult<List<Any>>
    suspend fun revokeSession(sessionId: String): BayitResult<Unit>
    suspend fun revokeAllOtherSessions(): BayitResult<Unit>
    suspend fun getLoginHistory(): BayitResult<List<Any>>
    suspend fun enableTwoFactor(): BayitResult<Any>
    suspend fun disableTwoFactor(verificationCode: String): BayitResult<Unit>

    // MFA methods
    suspend fun initializeMFA(): BayitResult<Any>
    suspend fun enableMFA(verificationCode: String): BayitResult<Unit>

    // Passkey methods
    suspend fun getPasskeys(): BayitResult<List<Any>>
    suspend fun registerPasskey(name: String): BayitResult<Unit>
    suspend fun deletePasskey(passkeyId: String): BayitResult<Unit>

    // Phone verification methods
    suspend fun sendPhoneVerificationCode(phoneNumber: String): BayitResult<Unit>
    suspend fun verifyPhoneCode(phoneNumber: String, code: String): BayitResult<Unit>
}
