package tv.bayit.plus.feature.byoc

import android.content.Context
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
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
    @ApplicationContext private val appContext: Context,
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

    fun startBrowserAuth(activityContext: Context) {
        viewModelScope.launch {
            try {
                val authUrl = buildBrowserAuthUrl()
                val customTabsIntent = CustomTabsIntent.Builder().build()
                customTabsIntent.intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                customTabsIntent.launchUrl(activityContext, Uri.parse(authUrl))
            } catch (e: Exception) {
                logger.error("Browser auth launch failed, falling back to device auth", error = e)
                startAuth()
            }
        }
    }

    fun handleBrowserAuthResult(authCode: String) {
        viewModelScope.launch {
            _uiState.value = YouTubeAuthUiState.Connecting
            try {
                val tokenResponse = youtubeClient.exchangeAuthCode(
                    authCode = authCode,
                    clientId = googleClientId,
                    clientSecret = googleClientSecret,
                    redirectUri = REDIRECT_URI,
                )
                sourceManager.addYouTubeSource(
                    name = "YouTube",
                    accessToken = tokenResponse.accessToken ?: "",
                    refreshToken = tokenResponse.refreshToken,
                )
                _uiState.value = YouTubeAuthUiState.Success
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                logger.error("Browser auth code exchange failed", error = e)
                _uiState.value = YouTubeAuthUiState.Error(
                    e.message ?: stringProvider.string("error.byoc.youtubeAuthStartFailed"),
                )
            }
        }
    }

    private fun buildBrowserAuthUrl(): String {
        return "$AUTH_BASE_URL?client_id=$googleClientId" +
            "&redirect_uri=$REDIRECT_URI" +
            "&response_type=code" +
            "&scope=$YOUTUBE_SCOPE" +
            "&access_type=offline" +
            "&prompt=consent"
    }

    private fun pollForAuth(deviceCode: GoogleDeviceCode) {
        pollJob?.cancel()
        pollJob = viewModelScope.launch {
            try {
                val tokenResponse = youtubeClient.pollForToken(
                    deviceCode = deviceCode,
                    clientId = googleClientId,
                    clientSecret = googleClientSecret,
                )
                _uiState.value = YouTubeAuthUiState.Connecting
                sourceManager.addYouTubeSource(
                    name = "YouTube",
                    accessToken = tokenResponse.accessToken ?: "",
                    refreshToken = tokenResponse.refreshToken,
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

    companion object {
        private const val AUTH_BASE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
        private const val REDIRECT_URI = "tv.bayit.plus:/oauth2callback"
        private const val YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube.readonly"
    }
}
