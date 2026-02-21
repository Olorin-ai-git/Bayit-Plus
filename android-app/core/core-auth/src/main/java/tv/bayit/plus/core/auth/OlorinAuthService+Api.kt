package tv.bayit.plus.core.auth

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.POST

internal interface OlorinAuthApi {
    @POST("api/v1/auth/v2/register")
    suspend fun register(@Body request: OlorinAuthRegisterRequest): OlorinAuthService.AuthResponse

    @POST("api/v1/auth/v2/login")
    suspend fun login(@Body request: OlorinAuthLoginRequest): OlorinAuthService.AuthResponse

    @POST("api/v1/auth/v2/google")
    suspend fun loginGoogle(@Body request: OlorinAuthGoogleRequest): OlorinAuthService.AuthResponse

    @POST("api/v1/auth/password-reset/request")
    suspend fun requestPasswordReset(@Body request: OlorinAuthPasswordResetRequest)

    @POST("api/v1/auth/v2/refresh")
    suspend fun refresh(@Body request: OlorinAuthTokenRefreshRequest): OlorinAuthTokenRefreshResponse
}

@Serializable
internal data class OlorinAuthRegisterRequest(val email: String, val password: String, val name: String)

@Serializable
internal data class OlorinAuthLoginRequest(val email: String, val password: String)

@Serializable
internal data class OlorinAuthGoogleRequest(
    @SerialName("id_token") val idToken: String,
)

@Serializable
internal data class OlorinAuthPasswordResetRequest(val email: String)

@Serializable
internal data class OlorinAuthTokenRefreshRequest(
    @SerialName("refresh_token") val refreshToken: String,
)

@Serializable
internal data class OlorinAuthTokenRefreshResponse(
    @SerialName("access_token") val accessToken: String,
    @SerialName("refresh_token") val refreshToken: String,
    @SerialName("token_type") val tokenType: String,
    @SerialName("expires_in") val expiresIn: Int,
)
