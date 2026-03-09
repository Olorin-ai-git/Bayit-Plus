package tv.bayit.plus.feature.byoc

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.byoc.BYOCSourceManager
import tv.bayit.plus.core.byoc.clients.PlexClient
import tv.bayit.plus.core.byoc.models.PlexDeviceCode
import tv.bayit.plus.core.byoc.models.PlexServer
import tv.bayit.plus.core.common.logging.BayitLogger
import java.util.UUID
import javax.inject.Inject

sealed class PlexAuthUiState {
    data object Idle : PlexAuthUiState()
    data class WaitingForCode(val code: String, val verificationUrl: String) : PlexAuthUiState()
    data class SelectServer(val servers: List<PlexServer>) : PlexAuthUiState()
    data class Connecting(val serverName: String) : PlexAuthUiState()
    data object Success : PlexAuthUiState()
    data class Error(val message: String) : PlexAuthUiState()
}

@HiltViewModel
class PlexAuthViewModel @Inject constructor(
    private val plexClient: PlexClient,
    private val sourceManager: BYOCSourceManager,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<PlexAuthUiState>(PlexAuthUiState.Idle)
    val uiState: StateFlow<PlexAuthUiState> = _uiState.asStateFlow()

    private val clientId = UUID.randomUUID().toString()
    private var pollJob: Job? = null
    private var authToken: String? = null

    fun startAuth() {
        viewModelScope.launch {
            try {
                val deviceCode = plexClient.requestDeviceCode(clientId)
                _uiState.value = PlexAuthUiState.WaitingForCode(
                    code = deviceCode.code,
                    verificationUrl = PLEX_LINK_URL,
                )
                pollForAuth(deviceCode)
            } catch (e: Exception) {
                logger.error("Plex auth start failed", error = e)
                _uiState.value = PlexAuthUiState.Error(e.message ?: "Failed to start authentication")
            }
        }
    }

    fun selectServer(server: PlexServer) {
        viewModelScope.launch {
            _uiState.value = PlexAuthUiState.Connecting(server.name)
            try {
                val token = authToken ?: return@launch
                sourceManager.addPlexSource(token, server.name)
                _uiState.value = PlexAuthUiState.Success
            } catch (e: Exception) {
                logger.error("Plex server connection failed", error = e)
                _uiState.value = PlexAuthUiState.Error(e.message ?: "Failed to connect to server")
            }
        }
    }

    fun retry() {
        _uiState.value = PlexAuthUiState.Idle
        startAuth()
    }

    private fun pollForAuth(deviceCode: PlexDeviceCode) {
        pollJob?.cancel()
        pollJob = viewModelScope.launch {
            try {
                val token = plexClient.pollForToken(deviceCode)
                authToken = token
                val servers = plexClient.discoverServers(token, clientId)
                if (servers.size == 1) {
                    selectServer(servers.first())
                } else {
                    _uiState.value = PlexAuthUiState.SelectServer(servers)
                }
            } catch (e: Exception) {
                logger.error("Plex auth poll failed", error = e)
                _uiState.value = PlexAuthUiState.Error(e.message ?: "Authentication timed out")
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        pollJob?.cancel()
    }

    companion object {
        private const val PLEX_LINK_URL = "https://plex.tv/link"
    }
}
