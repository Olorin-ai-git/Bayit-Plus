package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface PasskeyRepository {
    suspend fun getRegisteredPasskeys(): BayitResult<List<Any>>
    suspend fun beginRegistration(): BayitResult<Any>
    suspend fun completeRegistration(credential: Any): BayitResult<Any>
    suspend fun beginAuthentication(): BayitResult<Any>
    suspend fun completeAuthentication(assertion: Any): BayitResult<Any>
    suspend fun removePasskey(passkeyId: String): BayitResult<Unit>
}
