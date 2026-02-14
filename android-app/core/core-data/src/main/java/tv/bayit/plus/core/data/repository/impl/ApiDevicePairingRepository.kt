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
import tv.bayit.plus.core.data.repository.DevicePairingRepository
import tv.bayit.plus.core.model.MessageResponse
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Production implementation of [DevicePairingRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APIDevicePairingRepository and web api.js.
 */
@Singleton
class ApiDevicePairingRepository @Inject constructor(
    private val client: BayitApiClient,
) : DevicePairingRepository {

    private val service: DevicePairingService = client.createService()

    override suspend fun generatePairingCode(): BayitResult<String> =
        runCatchingResult {
            val response = client.safeApiCall { service.generatePairingCode() }
            response.code
        }

    override suspend fun submitPairingCode(code: String): BayitResult<Any> =
        runCatchingResult {
            val request = PairingCodeSubmission(code = code)
            client.safeApiCall { service.submitPairingCode(request) }
        }

    override suspend fun getPairedDevices(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getPairedDevices() }
            response.devices
        }

    override suspend fun unpairDevice(deviceId: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.unpairDevice(deviceId) }
            Unit
        }

    override suspend fun sendCommand(
        deviceId: String,
        command: String,
        payload: Map<String, Any>?,
    ): BayitResult<Unit> = runCatchingResult {
        val request = DeviceCommandBody(
            command = command,
            payload = payload?.mapValues { it.value.toString() },
        )
        client.safeApiCall { service.sendCommand(deviceId, request) }
        Unit
    }
}

private interface DevicePairingService {

    @POST("api/v1/devices/pairing/code")
    suspend fun generatePairingCode(): PairingCodeResponse

    @POST("api/v1/devices/pairing/submit")
    suspend fun submitPairingCode(
        @Body request: PairingCodeSubmission,
    ): PairedDeviceResponse

    @GET("api/v1/devices/paired")
    suspend fun getPairedDevices(): PairedDevicesListResponse

    @DELETE("api/v1/devices/{deviceId}")
    suspend fun unpairDevice(@Path("deviceId") deviceId: String): MessageResponse

    @POST("api/v1/devices/{deviceId}/command")
    suspend fun sendCommand(
        @Path("deviceId") deviceId: String,
        @Body request: DeviceCommandBody,
    ): MessageResponse
}

/** Response containing the generated pairing code. */
@Serializable
private data class PairingCodeResponse(
    val code: String,
    @SerialName("expires_at") val expiresAt: String,
)

/** Request body for submitting a pairing code. */
@Serializable
private data class PairingCodeSubmission(
    val code: String,
)

/** Response for a single paired device. */
@Serializable
private data class PairedDeviceResponse(
    val id: String,
    val name: String,
    val type: String,
    @SerialName("paired_at") val pairedAt: String,
)

/** Response wrapper for the paired devices list. */
@Serializable
private data class PairedDevicesListResponse(
    val devices: List<PairedDeviceResponse> = emptyList(),
    val total: Int? = null,
)

/** Request body for sending a command to a paired device. */
@Serializable
private data class DeviceCommandBody(
    val command: String,
    val payload: Map<String, String>? = null,
)
