package tv.bayit.plus.feature.byoc

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.byoc.BYOCSourceManager
import tv.bayit.plus.core.byoc.clients.YouTubeClient
import tv.bayit.plus.core.byoc.models.GoogleDeviceCode
import tv.bayit.plus.core.common.GoogleClientId
import tv.bayit.plus.core.common.GoogleClientSecret
import tv.bayit.plus.core.common.i18n.BayitStringProvider
import tv.bayit.plus.core.common.logging.BayitLogger
import javax.inject.Inject

sealed class YouTubeAuthUiState {
    data object Idle : YouTubeAuthUiState()
    data class WaitingForCode(
        val userCode: String,
        val verificationUrl: String,
    ) : YouTubeAuthUiState()
    data object Connecting : YouTubeAuthUiState()
    data object Success : YouTubeAuthUiState()
    data class Error(val message: String) : YouTubeAuthUiState()
}

@HiltViewModel
class YouTubeAuthViewModel @Inject constructor(
    private val youtubeClient: YouTubeClient,
    private val sourceManager: BYOCSourceManager,
    @GoogleClientId private val googleClientId: String,
    @GoogleClientSecret private val googleClientSecret: String,
    private val stringProvider: BayitStringProvider,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<YouTubeAuthUiState>(YouTubeAuthUiState.Idle)
    val uiState: StateFlow<YouTubeAuthUiState> = _uiState.asStateFlow()

    private var pollJob: Job? = null

    fun startAuth() {
        if (_uiState.value !is YouTubeAuthUiState.Idle) return
        if (googleClientSecret.isBlank()) {
            _uiState.value = YouTubeAuthUiState.Error(stringProvider.string("error.byoc.youtubeNotConfigured"))
            logger.error("Google client secret not configured for YouTube auth")
            return
        }
        viewModelScope.launch {
            try {
                val deviceCode = youtubeClient.requestDeviceCode(googleClientId)
                _uiState.value = YouTubeAuthUiState.WaitingForCode(
                    userCode = deviceCode.userCode,
                    verificationUrl = deviceCode.verificationUrl,
                )
                pollForAuth(deviceCode)
            } catch (e: Exception) {
                logger.error("YouTube auth start failed", error = e)
                _uiState.value = YouTubeAuthUiState.Error(
                    e.message ?: stringProvider.string("error.byoc.youtubeAuthStartFailed"),
                )
            }
        }
    }

    fun retry() {
        _uiState.value = YouTubeAuthUiState.Idle
        startAuth()
    }

    private fun pollForAuth(deviceCode: GoogleDeviceCode) {
        pollJob?.cancel()
        pollJob = viewModelScope.launch {
            try {
                val accessToken = youtubeClient.pollForToken(
                    deviceCode = deviceCode,
                    clientId = googleClientId,
                    clientSecret = googleClientSecret,
                )
                _uiState.value = YouTubeAuthUiState.Connecting
                sourceManager.addYouTubeSource(
                    name = "YouTube",
                    accessToken = accessToken,
                )
                _uiState.value = YouTubeAuthUiState.Success
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                logger.error("YouTube auth poll failed", error = e)
                _uiState.value = YouTubeAuthUiState.Error(
                    e.message ?: stringProvider.string("error.byoc.youtubeAuthTimedOut"),
                )
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        pollJob?.cancel()
    }
}
