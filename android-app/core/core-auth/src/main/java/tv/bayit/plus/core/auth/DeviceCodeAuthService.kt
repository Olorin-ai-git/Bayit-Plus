package tv.bayit.plus.core.auth

import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.Retrofit
import retrofit2.http.Body
import retrofit2.http.POST
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.common.result.BayitError
import tv.bayit.plus.core.common.result.BayitResult
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Handles the RFC 8628 Device Authorization Grant flow for Google TV and
 * other lean-back devices.
 *
 * Requests a short-lived device code pair from the backend, then polls at
 * the server-specified interval until the user approves or the code expires.
 * On approval, stores tokens via [OlorinAuthService].
 */
@Singleton
class DeviceCodeAuthService @Inject constructor(
    private val apiClient: BayitApiClient,
    private val authService: OlorinAuthService,
    private val logger: BayitLogger,
) {
    private interface DeviceCodeApi {
        @POST("api/v1/auth/device-code")
        suspend fun requestCode(@Body request: DeviceCodeRequest): DeviceCodeResponse

        @POST("api/v1/auth/device-code/poll")
        suspend fun pollStatus(@Body request: PollRequest): PollResponse
    }

    @Serializable
    data class DeviceCodeRequest(
        @SerialName("device_id") val deviceId: String,
        @SerialName("device_name") val deviceName: String,
    )

    @Serializable
    data class DeviceCodeResponse(
        @SerialName("device_code") val deviceCode: String,
        @SerialName("user_code") val userCode: String,
        @SerialName("verification_uri") val verificationUri: String,
        @SerialName("expires_in") val expiresIn: Int,
        val interval: Int,
    )

    @Serializable
    data class PollRequest(
        @SerialName("device_code") val deviceCode: String,
    )

    @Serializable
    data class PollResponse(
        val status: String,
        @SerialName("access_token") val accessToken: String? = null,
        @SerialName("refresh_token") val refreshToken: String? = null,
    )

    private val deviceCodeApi: DeviceCodeApi by lazy {
        apiClient.createService<DeviceCodeApi>()
    }

    /**
     * Requests a device code pair from the backend.
     *
     * @param deviceId Stable unique identifier for this device.
     * @param deviceName Human-readable label shown to the user in the companion flow.
     * @return [BayitResult] wrapping [DeviceCodeResponse] on success.
     */
    suspend fun requestDeviceCode(
        deviceId: String,
        deviceName: String,
    ): BayitResult<DeviceCodeResponse> {
        return try {
            val response = apiClient.safeApiCall {
                deviceCodeApi.requestCode(DeviceCodeRequest(deviceId, deviceName))
            }
            logger.info(
                "Device code requested",
                mapOf("device_id" to deviceId, "expires_in" to response.expiresIn.toString()),
            )
            BayitResult.success(response)
        } catch (e: Exception) {
            logger.error("Device code request failed", error = e, metadata = mapOf("device_id" to deviceId))
            BayitResult.failure(BayitError.Network(e.message ?: "Device code request failed", cause = e))
        }
    }

    /**
     * Polls the backend for authorization status at the given interval.
     *
     * Emits each [PollResponse] and stops automatically when [PollResponse.status]
     * is not `"authorization_pending"`. On a successful authorization the received
     * tokens are persisted via [OlorinAuthService.storeAuthTokens].
     *
     * @param deviceCode The opaque device code returned by [requestDeviceCode].
     * @param intervalSeconds Server-mandated polling interval in seconds.
     */
    fun pollForAuthorization(deviceCode: String, intervalSeconds: Int): Flow<PollResponse> = flow {
        while (true) {
            delay(intervalSeconds * MS_PER_SECOND)
            val response = apiClient.safeApiCall {
                deviceCodeApi.pollStatus(PollRequest(deviceCode))
            }
            logger.debug(
                "Device code poll result",
                mapOf("status" to response.status, "device_code_prefix" to deviceCode.take(DEVICE_CODE_LOG_PREFIX_LEN)),
            )
            if (response.status == STATUS_AUTHORIZED) {
                val accessToken = checkNotNull(response.accessToken) { "access_token missing in authorized response" }
                val refreshToken = checkNotNull(response.refreshToken) { "refresh_token missing in authorized response" }
                authService.storeAuthTokens(
                    OlorinAuthService.AuthResponse(
                        accessToken = accessToken,
                        refreshToken = refreshToken,
                        user = OlorinAuthService.UserData(
                            id = "",
                            email = "",
                            name = "",
                            role = "",
                            isActive = true,
                        ),
                    ),
                )
                logger.info("Device code authorization succeeded")
            }
            emit(response)
            if (response.status != STATUS_PENDING) break
        }
    }

    companion object {
        private const val MS_PER_SECOND = 1_000L
        private const val STATUS_PENDING = "authorization_pending"
        private const val STATUS_AUTHORIZED = "authorized"
        private const val DEVICE_CODE_LOG_PREFIX_LEN = 8
    }
}
