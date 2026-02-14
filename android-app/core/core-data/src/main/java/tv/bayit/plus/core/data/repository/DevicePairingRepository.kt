package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface DevicePairingRepository {
    suspend fun generatePairingCode(): BayitResult<String>
    suspend fun submitPairingCode(code: String): BayitResult<Any>
    suspend fun getPairedDevices(): BayitResult<List<Any>>
    suspend fun unpairDevice(deviceId: String): BayitResult<Unit>
    suspend fun sendCommand(deviceId: String, command: String, payload: Map<String, Any>?): BayitResult<Unit>
}
