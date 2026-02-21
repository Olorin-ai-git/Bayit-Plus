package tv.bayit.plus.core.auth

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.common.result.BayitError
import tv.bayit.plus.core.common.result.BayitResult
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Olorin Auth Service client for Android.
 *
 * Single source of truth for authentication. Delegates to auth.olorin.ai
 * via Bayit+ backend proxy endpoints. Manages auth state and token storage.
 *
 * Service interface and request/response models are in OlorinAuthService+Api.kt
 */
@Singleton
class OlorinAuthService @Inject constructor(
    private val apiClient: BayitApiClient,
    private val secureStorage: AuthTokenStorage,
    private val logger: BayitLogger,
) {
    private val _authState = MutableStateFlow<AuthState>(AuthState.Unauthenticated)
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    private val authApi: OlorinAuthApi by lazy {
        apiClient.createService<OlorinAuthApi>()
    }

    init {
        // Restore auth state from secure storage on startup
        if (secureStorage.getAccessToken() != null) {
            _authState.value = AuthState.Authenticated
        }
    }

    suspend fun registerWithEmail(
        email: String,
        password: String,
        name: String,
    ): BayitResult<AuthResponse> = safeAuthCall("Registration", mapOf("email" to email)) {
        authApi.register(OlorinAuthRegisterRequest(email = email, password = password, name = name))
    }

    suspend fun loginWithEmail(
        email: String,
        password: String,
    ): BayitResult<AuthResponse> = safeAuthCall("Login", mapOf("email" to email)) {
        authApi.login(OlorinAuthLoginRequest(email = email, password = password))
    }

    suspend fun loginWithGoogle(
        idToken: String,
    ): BayitResult<AuthResponse> = safeAuthCall("Google login", mapOf("provider" to "google")) {
        authApi.loginGoogle(OlorinAuthGoogleRequest(idToken = idToken))
    }

    suspend fun requestPasswordReset(
        email: String,
    ): BayitResult<Unit> {
        return try {
            apiClient.safeApiCall {
                authApi.requestPasswordReset(OlorinAuthPasswordResetRequest(email = email))
            }
            logger.info("Password reset email sent", mapOf("email" to email))
            BayitResult.success(Unit)
        } catch (e: Exception) {
            logger.error("Password reset failed", error = e, metadata = mapOf("email" to email))
            BayitResult.failure(BayitError.Network(e.message ?: "Password reset failed", cause = e))
        }
    }

    fun storeAuthTokens(response: AuthResponse) {
        val now = System.currentTimeMillis()
        val accessExpiresAt = now + ((response.expiresIn?.toLong() ?: DEFAULT_ACCESS_TOKEN_EXPIRY_SECONDS) * MS_PER_SECOND)
        secureStorage.saveAccessToken(response.accessToken, accessExpiresAt)
        response.refreshToken?.let { token ->
            val refreshExpiresAt = now + ((response.refreshExpiresIn?.toLong() ?: DEFAULT_REFRESH_TOKEN_EXPIRY_SECONDS) * MS_PER_SECOND)
            secureStorage.saveRefreshToken(token, refreshExpiresAt)
        }
        _authState.value = AuthState.Authenticated
    }

    fun signOut() {
        logger.info("User signed out")
        secureStorage.clearAuthTokens()
        _authState.value = AuthState.Unauthenticated
    }

    private suspend fun safeAuthCall(
        operation: String,
        metadata: Map<String, String>,
        apiCall: suspend () -> AuthResponse,
    ): BayitResult<AuthResponse> {
        return try {
            val response = apiClient.safeApiCall { apiCall() }
            logger.info(
                "$operation succeeded via Olorin Auth",
                mapOf("user_id" to response.user.id, "email" to response.user.email),
            )
            BayitResult.success(response)
        } catch (e: Exception) {
            logger.error("$operation failed", error = e, metadata = metadata)
            BayitResult.failure(BayitError.Authentication(e.message ?: "$operation failed", e))
        }
    }

    suspend fun refreshAccessToken(refreshToken: String): BayitResult<String> {
        return try {
            val response = apiClient.safeApiCall {
                authApi.refresh(OlorinAuthTokenRefreshRequest(refreshToken = refreshToken))
            }
            val now = System.currentTimeMillis()
            val accessExpiresAt = now + (response.expiresIn * MS_PER_SECOND)
            val refreshExpiresAt = now + (DEFAULT_REFRESH_TOKEN_EXPIRY_SECONDS * MS_PER_SECOND)
            secureStorage.saveAccessToken(response.accessToken, accessExpiresAt)
            secureStorage.saveRefreshToken(response.refreshToken, refreshExpiresAt)
            _authState.value = AuthState.Authenticated
            logger.info("Access token refreshed successfully")
            BayitResult.success(response.accessToken)
        } catch (e: Exception) {
            logger.error("Token refresh failed", error = e)
            BayitResult.failure(BayitError.Authentication("Token refresh failed", e))
        }
    }

    companion object {
        private const val MS_PER_SECOND = 1_000L
        private const val DEFAULT_ACCESS_TOKEN_EXPIRY_SECONDS = 3_600L  // 1 hour fallback
        private const val DEFAULT_REFRESH_TOKEN_EXPIRY_SECONDS = 604_800L // 7 days
    }

    @Serializable
    data class AuthResponse(
        @SerialName("access_token") val accessToken: String,
        @SerialName("refresh_token") val refreshToken: String?,
        val user: UserData,
        @SerialName("requires_payment") val requiresPayment: Boolean = false,
        @SerialName("expires_in") val expiresIn: Int? = null,
        @SerialName("refresh_expires_in") val refreshExpiresIn: Int? = null,
    )

    @Serializable
    data class UserData(
        val id: String,
        val email: String,
        val name: String,
        val role: String,
        @SerialName("is_active") val isActive: Boolean,
        @SerialName("is_beta_user") val isBetaUser: Boolean? = false,
        @SerialName("is_verified") val isVerified: Boolean? = false,
        val avatar: String? = null,
        @SerialName("payment_pending") val paymentPending: Boolean? = false,
        @SerialName("pending_plan_id") val pendingPlanId: String? = null,
    )
}

sealed interface AuthState {
    data object Unauthenticated : AuthState
    data object Authenticated : AuthState
}
