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
import tv.bayit.plus.core.data.repository.PasskeyRepository
import tv.bayit.plus.core.model.MessageResponse
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Production implementation of [PasskeyRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APIPasskeyRepository and web api.js.
 * Implements the WebAuthn registration and authentication ceremony flow.
 */
@Singleton
class ApiPasskeyRepository @Inject constructor(
    private val client: BayitApiClient,
) : PasskeyRepository {

    private val service: PasskeyService = client.createService()

    override suspend fun getRegisteredPasskeys(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getPasskeys() }
            response.credentials
        }

    override suspend fun beginRegistration(): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.beginRegistration() }
        }

    override suspend fun completeRegistration(credential: Any): BayitResult<Any> =
        runCatchingResult {
            val request = RegistrationCompleteBody(
                credential = credential.toString(),
            )
            client.safeApiCall { service.completeRegistration(request) }
        }

    override suspend fun beginAuthentication(): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.beginAuthentication() }
        }

    override suspend fun completeAuthentication(assertion: Any): BayitResult<Any> =
        runCatchingResult {
            val request = AuthenticationCompleteBody(
                assertion = assertion.toString(),
            )
            client.safeApiCall { service.completeAuthentication(request) }
        }

    override suspend fun removePasskey(passkeyId: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.removePasskey(passkeyId) }
            Unit
        }
}

private interface PasskeyService {

    @GET("api/v1/passkeys")
    suspend fun getPasskeys(): PasskeysListResponse

    @POST("api/v1/passkey/register/begin")
    suspend fun beginRegistration(): RegistrationOptionsResponse

    @POST("api/v1/passkey/register/complete")
    suspend fun completeRegistration(
        @Body request: RegistrationCompleteBody,
    ): PasskeyCredentialResponse

    @POST("api/v1/passkey/auth/begin")
    suspend fun beginAuthentication(): AuthenticationOptionsResponse

    @POST("api/v1/passkey/auth/complete")
    suspend fun completeAuthentication(
        @Body request: AuthenticationCompleteBody,
    ): AuthenticationVerifyResponse

    @DELETE("api/v1/passkey/{passkeyId}")
    suspend fun removePasskey(@Path("passkeyId") passkeyId: String): MessageResponse
}

/** Response wrapper for the passkeys list. */
@Serializable
private data class PasskeysListResponse(
    val credentials: List<PasskeyCredentialResponse> = emptyList(),
    val total: Int? = null,
)

/** A registered passkey credential. */
@Serializable
private data class PasskeyCredentialResponse(
    val id: String,
    @SerialName("device_name") val deviceName: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("last_used_at") val lastUsedAt: String? = null,
)

/** WebAuthn registration options returned by the server. */
@Serializable
private data class RegistrationOptionsResponse(
    val challenge: String,
    @SerialName("rp") val relyingParty: RelyingPartyInfo,
    val user: WebAuthnUserInfo,
    @SerialName("pub_key_cred_params") val pubKeyCredParams: List<PubKeyCredParam> = emptyList(),
    val timeout: Long? = null,
)

/** Request body to complete passkey registration. */
@Serializable
private data class RegistrationCompleteBody(
    val credential: String,
)

/** WebAuthn authentication options returned by the server. */
@Serializable
private data class AuthenticationOptionsResponse(
    val challenge: String,
    @SerialName("rp_id") val rpId: String,
    @SerialName("allow_credentials") val allowCredentials: List<AllowedCredential> = emptyList(),
    val timeout: Long? = null,
)

/** Request body to complete passkey authentication. */
@Serializable
private data class AuthenticationCompleteBody(
    val assertion: String,
)

/** Response after successful authentication verification. */
@Serializable
private data class AuthenticationVerifyResponse(
    val verified: Boolean,
    val token: String? = null,
)

/** Relying party info for WebAuthn ceremonies. */
@Serializable
private data class RelyingPartyInfo(
    val id: String,
    val name: String,
)

/** User info for WebAuthn registration. */
@Serializable
private data class WebAuthnUserInfo(
    val id: String,
    val name: String,
    @SerialName("display_name") val displayName: String,
)

/** Public key credential parameter. */
@Serializable
private data class PubKeyCredParam(
    val type: String,
    val alg: Int,
)

/** An allowed credential descriptor for authentication. */
@Serializable
private data class AllowedCredential(
    val id: String,
    val type: String,
)
