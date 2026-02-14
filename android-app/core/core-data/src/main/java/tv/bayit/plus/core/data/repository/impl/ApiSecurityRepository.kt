package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.SecurityRepository
import tv.bayit.plus.core.model.MessageResponse
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
}

private interface SecurityService {

    @GET("api/v1/security/sessions")
    suspend fun getSessions(): SecuritySessionsResponse

    @DELETE("api/v1/security/session/{id}")
    suspend fun revokeSession(
        @Path("id") sessionId: String,
    ): MessageResponse

    @DELETE("api/v1/security/sessions/others")
    suspend fun revokeAllOtherSessions(): MessageResponse

    @GET("api/v1/security/login-history")
    suspend fun getLoginHistory(): LoginHistoryResponse

    @POST("api/v1/security/2fa/enable")
    suspend fun enableTwoFactor(): TwoFactorEnableResponse

    @POST("api/v1/security/2fa/verify")
    suspend fun verifyTwoFactor(
        @Body request: TwoFactorVerifyRequest,
    ): MessageResponse

    @GET("api/v1/security/settings")
    suspend fun getSettings(): SecuritySettingsResponse
}

/** List wrapper for active sessions. */
@Serializable
private data class SecuritySessionsResponse(
    val sessions: List<SecuritySession> = emptyList(),
)

/** A single active session. */
@Serializable
private data class SecuritySession(
    val id: String,
    @SerialName("device_name") val deviceName: String? = null,
    @SerialName("device_type") val deviceType: String? = null,
    @SerialName("ip_address") val ipAddress: String? = null,
    val location: String? = null,
    @SerialName("last_active") val lastActive: String? = null,
    @SerialName("is_current") val isCurrent: Boolean = false,
    @SerialName("created_at") val createdAt: String? = null,
)

/** List wrapper for login history entries. */
@Serializable
private data class LoginHistoryResponse(
    val entries: List<LoginHistoryEntry> = emptyList(),
)

/** A single login history entry. */
@Serializable
private data class LoginHistoryEntry(
    val id: String,
    @SerialName("ip_address") val ipAddress: String? = null,
    val location: String? = null,
    @SerialName("device_name") val deviceName: String? = null,
    @SerialName("login_at") val loginAt: String? = null,
    val status: String? = null,
    @SerialName("auth_method") val authMethod: String? = null,
)

/** Response from enabling two-factor authentication. */
@Serializable
private data class TwoFactorEnableResponse(
    val secret: String? = null,
    @SerialName("qr_code_url") val qrCodeUrl: String? = null,
    @SerialName("backup_codes") val backupCodes: List<String> = emptyList(),
)

/** Request body for verifying a two-factor code (used for disable flow). */
@Serializable
private data class TwoFactorVerifyRequest(
    val code: String,
)

/** Security settings response from the settings endpoint. */
@Serializable
private data class SecuritySettingsResponse(
    @SerialName("two_factor_enabled") val twoFactorEnabled: Boolean = false,
    @SerialName("login_notifications") val loginNotifications: Boolean = true,
    @SerialName("session_timeout_minutes") val sessionTimeoutMinutes: Int? = null,
    @SerialName("allowed_devices") val allowedDevices: Int? = null,
)
