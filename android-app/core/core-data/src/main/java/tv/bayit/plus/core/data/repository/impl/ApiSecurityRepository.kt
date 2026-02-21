package tv.bayit.plus.core.data.repository.impl

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.SecurityRepository
import tv.bayit.plus.core.network.api.BayitApiClient

/**
 * Production implementation of [SecurityRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APISecurityRepository and web api.js.
 */
class ApiSecurityRepository(
    private val client: BayitApiClient,
) : SecurityRepository {

    private val service: SecurityService = client.createService()

    override suspend fun getActiveSessions(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getSessions() }
            response.sessions
        }

    override suspend fun revokeSession(sessionId: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.revokeSession(sessionId) }
            Unit
        }

    override suspend fun revokeAllOtherSessions(): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.revokeAllOtherSessions() }
            Unit
        }

    override suspend fun getLoginHistory(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getLoginHistory() }
            response.entries
        }

    override suspend fun enableTwoFactor(): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.enableTwoFactor() }
        }

    override suspend fun disableTwoFactor(verificationCode: String): BayitResult<Unit> =
        runCatchingResult {
            val request = TwoFactorVerifyRequest(code = verificationCode)
            client.safeApiCall { service.verifyTwoFactor(request) }
            Unit
        }

    override suspend fun initializeMFA(): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.initializeMFA() }
        }

    override suspend fun enableMFA(verificationCode: String): BayitResult<Unit> =
        runCatchingResult {
            val request = MFAEnableRequest(code = verificationCode)
            client.safeApiCall { service.enableMFA(request) }
            Unit
        }

    override suspend fun getPasskeys(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getPasskeys() }
            response.passkeys
        }

    override suspend fun registerPasskey(name: String): BayitResult<Unit> =
        runCatchingResult {
            val request = PasskeyRegisterRequest(name = name)
            client.safeApiCall { service.registerPasskey(request) }
            Unit
        }

    override suspend fun deletePasskey(passkeyId: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.deletePasskey(passkeyId) }
            Unit
        }

    override suspend fun sendPhoneVerificationCode(phoneNumber: String): BayitResult<Unit> =
        runCatchingResult {
            val request = PhoneVerificationSendRequest(phoneNumber = phoneNumber)
            client.safeApiCall { service.sendPhoneVerificationCode(request) }
            Unit
        }

    override suspend fun verifyPhoneCode(phoneNumber: String, code: String): BayitResult<Unit> =
        runCatchingResult {
            val request = PhoneVerificationVerifyRequest(phoneNumber = phoneNumber, code = code)
            client.safeApiCall { service.verifyPhoneCode(request) }
            Unit
        }
}
