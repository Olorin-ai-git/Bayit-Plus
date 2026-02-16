package tv.bayit.plus.core.auth

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
 * Delegates authentication to auth.olorin.ai via Bayit+ backend proxy endpoints.
 * The backend maintains Bayit+ specific features (payment flow, beta users, etc.)
 * while using Olorin Auth for identity management.
 */
@Singleton
class OlorinAuthService @Inject constructor(
    private val apiClient: BayitApiClient,
    private val logger: BayitLogger,
) {

    private val authApi: OlorinAuthApi by lazy {
        apiClient.createService<OlorinAuthApi>()
    }

    /**
     * Register a new user via Olorin Auth proxy.
     *
     * Calls `POST /api/v1/auth/v2/register` which delegates to auth.olorin.ai
     * and syncs the user to Bayit+ MongoDB with app-specific fields.
     */
    suspend fun registerWithEmail(
        email: String,
        password: String,
        name: String,
    ): BayitResult<AuthResponse> {
        return try {
            val request = RegisterRequest(
                email = email,
                password = password,
                name = name,
            )

            val response = apiClient.safeApiCall {
                authApi.register(request)
            }

            logger.info(
                "Registration succeeded via Olorin Auth",
                mapOf(
                    "user_id" to response.user.id,
                    "email" to response.user.email,
                ),
            )

            BayitResult.success(response)
        } catch (e: Exception) {
            logger.error(
                "Registration failed",
                error = e,
                metadata = mapOf("email" to email),
            )
            BayitResult.failure(
                BayitError.Authentication(
                    e.message ?: "Registration failed",
                    e,
                ),
            )
        }
    }

    /**
     * Login user via Olorin Auth proxy.
     *
     * Calls `POST /api/v1/auth/v2/login` which delegates to auth.olorin.ai
     * and syncs with Bayit+ database for app-specific features.
     */
    suspend fun loginWithEmail(
        email: String,
        password: String,
    ): BayitResult<AuthResponse> {
        return try {
            val request = LoginRequest(
                email = email,
                password = password,
            )

            val response = apiClient.safeApiCall {
                authApi.login(request)
            }

            logger.info(
                "Login succeeded via Olorin Auth",
                mapOf(
                    "user_id" to response.user.id,
                    "email" to response.user.email,
                ),
            )

            BayitResult.success(response)
        } catch (e: Exception) {
            logger.error(
                "Login failed",
                error = e,
                metadata = mapOf("email" to email),
            )
            BayitResult.failure(
                BayitError.Authentication(
                    e.message ?: "Login failed",
                    e,
                ),
            )
        }
    }

    // MARK: - API Interface

    private interface OlorinAuthApi {
        @POST("auth/v2/register")
        suspend fun register(@Body request: RegisterRequest): AuthResponse

        @POST("auth/v2/login")
        suspend fun login(@Body request: LoginRequest): AuthResponse
    }

    // MARK: - Request Models

    @Serializable
    private data class RegisterRequest(
        val email: String,
        val password: String,
        val name: String,
    )

    @Serializable
    private data class LoginRequest(
        val email: String,
        val password: String,
    )

    // MARK: - Response Models

    @Serializable
    data class AuthResponse(
        @SerialName("access_token")
        val accessToken: String,
        @SerialName("refresh_token")
        val refreshToken: String?,
        val user: UserData,
        @SerialName("requires_payment")
        val requiresPayment: Boolean = false,
    )

    @Serializable
    data class UserData(
        val id: String,
        val email: String,
        val name: String,
        val role: String,
        @SerialName("is_active")
        val isActive: Boolean,
        @SerialName("is_beta_user")
        val isBetaUser: Boolean? = false,
        @SerialName("is_verified")
        val isVerified: Boolean? = false,
        @SerialName("avatar")
        val avatar: String? = null,
        @SerialName("payment_pending")
        val paymentPending: Boolean? = false,
        @SerialName("pending_plan_id")
        val pendingPlanId: String? = null,
    )
}
