package tv.bayit.plus.feature.settings.security.devices

import androidx.lifecycle.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.DevicePairingRepository
import javax.inject.Inject

@HiltViewModel
class DevicePairingViewModel @Inject constructor(private val devicePairingRepository: DevicePairingRepository, private val logger: BayitLogger) : ViewModel() {
    private val _uiState = MutableStateFlow<DevicePairingUiState>(DevicePairingUiState.Loading)
    val uiState = _uiState.asStateFlow()

    init { loadDevices() }

    fun generatePairingCode() {
        viewModelScope.launch {
            logger.debug("Generating pairing code")
            when (val result = devicePairingRepository.generatePairingCode()) {
                is BayitResult.Success -> { logger.info("Pairing code generated"); _uiState.value = DevicePairingUiState.PairingCodeReady(result.data) }
                is BayitResult.Error -> logger.error("Pairing code generation failed", result.exception)
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun removeDevice(deviceId: String) {
        viewModelScope.launch {
            logger.debug("Removing device", mapOf("deviceId" to deviceId))
            when (val result = devicePairingRepository.unpairDevice(deviceId)) {
                is BayitResult.Success -> { logger.info("Device removed"); loadDevices() }
                is BayitResult.Error -> logger.error("Device removal failed", result.exception)
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun retry() { _uiState.value = DevicePairingUiState.Loading; loadDevices() }

    private fun loadDevices() {
        viewModelScope.launch {
            logger.debug("Loading paired devices")
            when (val result = devicePairingRepository.getPairedDevices()) {
                is BayitResult.Success -> { logger.info("Devices loaded", mapOf("count" to result.data.size.toString())); _uiState.value = DevicePairingUiState.Success(result.data) }
                is BayitResult.Error -> { logger.error("Devices load failed", result.exception); _uiState.value = DevicePairingUiState.Error(result.message ?: result.exception.message.orEmpty()) }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface DevicePairingUiState {
    data object Loading : DevicePairingUiState
    data class Success(val devices: List<Any>) : DevicePairingUiState
    data class PairingCodeReady(val code: String) : DevicePairingUiState
    data class Error(val message: String) : DevicePairingUiState
}
