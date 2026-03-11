package tv.bayit.plus.feature.tv.auth

import android.content.Context
import android.provider.Settings
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.launch
import tv.bayit.plus.core.auth.DeviceCodeAuthService
import tv.bayit.plus.core.auth.OlorinAuthService
import tv.bayit.plus.core.common.i18n.BayitStringProvider
import tv.bayit.plus.core.common.logging.BayitLogger
import javax.inject.Inject

/**
 * UI state for the RFC 8628 device-code authentication screen.
 */
sealed interface TVAuthUiState {
    data object Loading : TVAuthUiState

    data class ShowCode(
        val userCode: String,
        val verificationUri: String,
        val expiresAt: Long,
    ) : TVAuthUiState

    data object Authorized : TVAuthUiState
    data object Expired : TVAuthUiState
    data class Error(val message: String) : TVAuthUiState
}

/**
 * Drives the Google TV device-code authentication flow.
 *
 * On creation, reads the stable [Settings.Secure.ANDROID_ID] as the device
 * identifier, requests a device code from [DeviceCodeAuthService], then polls
 * at the server-specified interval until authorized or the code expires.
 */
@HiltViewModel
class TVAuthViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val deviceCodeAuthService: DeviceCodeAuthService,
    private val authService: OlorinAuthService,
    private val stringProvider: BayitStringProvider,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<TVAuthUiState>(TVAuthUiState.Loading)
    val uiState: StateFlow<TVAuthUiState> = _uiState.asStateFlow()

    private var pollJob: Job? = null

    private val deviceId: String by lazy {
        Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
    }

    private val deviceName: String by lazy {
        android.os.Build.MODEL
    }

    init {
        startAuthFlow()
    }

    /** Cancels any in-flight poll and restarts the entire auth flow. */
    fun retryAuth() {
        pollJob?.cancel()
        _uiState.value = TVAuthUiState.Loading
        startAuthFlow()
    }

    private fun startAuthFlow() {
        viewModelScope.launch {
            logger.info("Starting device code auth flow", mapOf("device_id" to deviceId))
            val result = deviceCodeAuthService.requestDeviceCode(deviceId, deviceName)
            result.onSuccess { codeResponse ->
                val expiresAt = System.currentTimeMillis() + (codeResponse.expiresIn * MS_PER_SECOND)
                _uiState.value = TVAuthUiState.ShowCode(
                    userCode = codeResponse.userCode,
                    verificationUri = codeResponse.verificationUri,
                    expiresAt = expiresAt,
                )
                startPolling(codeResponse.deviceCode, codeResponse.interval, expiresAt)
            }.onFailure { error ->
                logger.error("Device code request failed", metadata = mapOf("reason" to error.message))
                _uiState.value = TVAuthUiState.Error(error.message)
            }
        }
    }

    private fun startPolling(deviceCode: String, intervalSeconds: Int, expiresAt: Long) {
        pollJob = viewModelScope.launch {
            deviceCodeAuthService
                .pollForAuthorization(deviceCode, intervalSeconds)
                .catch { e ->
                    logger.error("Polling failed", error = e)
                    _uiState.value = TVAuthUiState.Error(e.message ?: stringProvider.string("error.tv.pollingFailed"))
                }
                .collect { pollResponse ->
                    when (pollResponse.status) {
                        STATUS_AUTHORIZED -> _uiState.value = TVAuthUiState.Authorized
                        STATUS_EXPIRED -> _uiState.value = TVAuthUiState.Expired
                        STATUS_DENIED -> _uiState.value = TVAuthUiState.Error(stringProvider.string("error.tv.accessDenied"))
                        STATUS_PENDING -> {
                            if (System.currentTimeMillis() >= expiresAt) {
                                _uiState.value = TVAuthUiState.Expired
                            }
                        }
                        else -> {
                            logger.warning("Unrecognised poll status", mapOf("status" to pollResponse.status))
                            _uiState.value = TVAuthUiState.Error(
                                stringProvider.string("error.tv.unexpectedStatus", mapOf("status" to pollResponse.status)),
                            )
                        }
                    }
                }
        }
    }

    companion object {
        private const val MS_PER_SECOND = 1_000L
        private const val STATUS_AUTHORIZED = "authorized"
        private const val STATUS_EXPIRED = "expired"
        private const val STATUS_DENIED = "access_denied"
        private const val STATUS_PENDING = "authorization_pending"
    }
}
