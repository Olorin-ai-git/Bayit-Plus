package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

internal interface SecurityService {

    @GET("api/v1/security/sessions")
    suspend fun getSessions(): SecuritySessionsResponse

    @DELETE("api/v1/security/session/{id}")
    suspend fun revokeSession(
        @Path("id") sessionId: String,
    ): tv.bayit.plus.core.model.MessageResponse

    @DELETE("api/v1/security/sessions/others")
    suspend fun revokeAllOtherSessions(): tv.bayit.plus.core.model.MessageResponse

    @GET("api/v1/security/login-history")
    suspend fun getLoginHistory(): LoginHistoryResponse

    @POST("api/v1/security/2fa/enable")
    suspend fun enableTwoFactor(): TwoFactorEnableResponse

    @POST("api/v1/security/2fa/verify")
    suspend fun verifyTwoFactor(
        @Body request: TwoFactorVerifyRequest,
    ): tv.bayit.plus.core.model.MessageResponse

    @GET("api/v1/security/settings")
    suspend fun getSettings(): SecuritySettingsResponse

    @POST("api/v1/security/mfa/initialize")
    suspend fun initializeMFA(): MFAInitializeResponse

    @POST("api/v1/security/mfa/enable")
    suspend fun enableMFA(
        @Body request: MFAEnableRequest,
    ): tv.bayit.plus.core.model.MessageResponse

    @GET("api/v1/security/passkeys")
    suspend fun getPasskeys(): PasskeysResponse

    @POST("api/v1/security/passkey/register")
    suspend fun registerPasskey(
        @Body request: PasskeyRegisterRequest,
    ): tv.bayit.plus.core.model.MessageResponse

    @DELETE("api/v1/security/passkey/{id}")
    suspend fun deletePasskey(
        @Path("id") passkeyId: String,
    ): tv.bayit.plus.core.model.MessageResponse

    @POST("api/v1/security/phone/send-code")
    suspend fun sendPhoneVerificationCode(
        @Body request: PhoneVerificationSendRequest,
    ): tv.bayit.plus.core.model.MessageResponse

    @POST("api/v1/security/phone/verify")
    suspend fun verifyPhoneCode(
        @Body request: PhoneVerificationVerifyRequest,
    ): tv.bayit.plus.core.model.MessageResponse
}

@Serializable
internal data class SecuritySessionsResponse(
    val sessions: List<SecuritySession> = emptyList(),
)

@Serializable
internal data class SecuritySession(
    val id: String,
    @SerialName("device_name") val deviceName: String? = null,
    @SerialName("device_type") val deviceType: String? = null,
    @SerialName("ip_address") val ipAddress: String? = null,
    val location: String? = null,
    @SerialName("last_active") val lastActive: String? = null,
    @SerialName("is_current") val isCurrent: Boolean = false,
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
internal data class LoginHistoryResponse(
    val entries: List<LoginHistoryEntry> = emptyList(),
)

@Serializable
internal data class LoginHistoryEntry(
    val id: String,
    @SerialName("ip_address") val ipAddress: String? = null,
    val location: String? = null,
    @SerialName("device_name") val deviceName: String? = null,
    @SerialName("login_at") val loginAt: String? = null,
    val status: String? = null,
    @SerialName("auth_method") val authMethod: String? = null,
)

@Serializable
internal data class TwoFactorEnableResponse(
    val secret: String? = null,
    @SerialName("qr_code_url") val qrCodeUrl: String? = null,
    @SerialName("backup_codes") val backupCodes: List<String> = emptyList(),
)

@Serializable
internal data class TwoFactorVerifyRequest(
    val code: String,
)

@Serializable
internal data class SecuritySettingsResponse(
    @SerialName("two_factor_enabled") val twoFactorEnabled: Boolean = false,
    @SerialName("login_notifications") val loginNotifications: Boolean = true,
    @SerialName("session_timeout_minutes") val sessionTimeoutMinutes: Int? = null,
    @SerialName("allowed_devices") val allowedDevices: Int? = null,
)

@Serializable
internal data class MFAInitializeResponse(
    val secret: String? = null,
    @SerialName("qr_code_url") val qrCodeUrl: String? = null,
)

@Serializable
internal data class MFAEnableRequest(
    val code: String,
)

@Serializable
internal data class PasskeysResponse(
    val passkeys: List<Passkey> = emptyList(),
)

@Serializable
internal data class Passkey(
    val id: String,
    val name: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
internal data class PasskeyRegisterRequest(
    val name: String,
)

@Serializable
internal data class PhoneVerificationSendRequest(
    @SerialName("phone_number") val phoneNumber: String,
)

@Serializable
internal data class PhoneVerificationVerifyRequest(
    @SerialName("phone_number") val phoneNumber: String,
    val code: String,
)
