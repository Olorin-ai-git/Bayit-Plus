package tv.bayit.plus.core.auth

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.POST
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
 */
@Singleton
class OlorinAuthService @Inject constructor(
    private val apiClient: BayitApiClient,
    private val secureStorage: SecureStorageService,
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
        authApi.register(RegisterRequest(email = email, password = password, name = name))
    }

    suspend fun loginWithEmail(
        email: String,
        password: String,
    ): BayitResult<AuthResponse> = safeAuthCall("Login", mapOf("email" to email)) {
        authApi.login(LoginRequest(email = email, password = password))
    }

    suspend fun loginWithGoogle(
        idToken: String,
    ): BayitResult<AuthResponse> = safeAuthCall("Google login", mapOf("provider" to "google")) {
        authApi.loginGoogle(GoogleLoginRequest(idToken = idToken))
    }

    suspend fun requestPasswordReset(
        email: String,
    ): BayitResult<Unit> {
        return try {
            apiClient.safeApiCall {
                authApi.requestPasswordReset(PasswordResetRequest(email = email))
            }
            logger.info("Password reset email sent", mapOf("email" to email))
            BayitResult.success(Unit)
        } catch (e: Exception) {
            logger.error("Password reset failed", error = e, metadata = mapOf("email" to email))
            BayitResult.failure(BayitError.Network(e.message ?: "Password reset failed", cause = e))
        }
    }

    fun storeAuthTokens(response: AuthResponse) {
        secureStorage.saveAccessToken(response.accessToken)
        response.refreshToken?.let { secureStorage.saveRefreshToken(it) }
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

    private interface OlorinAuthApi {
        @POST("auth/v2/register")
        suspend fun register(@Body request: RegisterRequest): AuthResponse

        @POST("auth/v2/login")
        suspend fun login(@Body request: LoginRequest): AuthResponse

        @POST("auth/v2/google")
        suspend fun loginGoogle(@Body request: GoogleLoginRequest): AuthResponse

        @POST("auth/password-reset/request")
        suspend fun requestPasswordReset(@Body request: PasswordResetRequest)
    }

    @Serializable
    private data class RegisterRequest(val email: String, val password: String, val name: String)

    @Serializable
    private data class LoginRequest(val email: String, val password: String)

    @Serializable
    private data class GoogleLoginRequest(
        @SerialName("id_token") val idToken: String,
    )

    @Serializable
    private data class PasswordResetRequest(val email: String)

    @Serializable
    data class AuthResponse(
        @SerialName("access_token") val accessToken: String,
        @SerialName("refresh_token") val refreshToken: String?,
        val user: UserData,
        @SerialName("requires_payment") val requiresPayment: Boolean = false,
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
