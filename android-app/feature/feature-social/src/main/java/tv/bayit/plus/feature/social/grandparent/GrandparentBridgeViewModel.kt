package tv.bayit.plus.feature.social.grandparent

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.GrandparentBridgeRepository
import javax.inject.Inject

/**
 * ViewModel for Grandparent Bridge - intergenerational connection feature.
 *
 * Manages state for:
 * - Bridge connections list
 * - Invite creation
 * - Shared content viewing
 * - Connection status
 */
@HiltViewModel
class GrandparentBridgeViewModel @Inject constructor(
    private val repository: GrandparentBridgeRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<GrandparentBridgeUiState>(GrandparentBridgeUiState.Loading)
    val uiState: StateFlow<GrandparentBridgeUiState> = _uiState.asStateFlow()

    private val _inviteCode = MutableStateFlow<String?>(null)
    val inviteCode: StateFlow<String?> = _inviteCode.asStateFlow()

    init {
        loadConnections()
    }

    /**
     * Load all grandparent bridge connections.
     */
    fun loadConnections() {
        viewModelScope.launch {
            _uiState.value = GrandparentBridgeUiState.Loading
            logger.debug("Loading grandparent bridge connections")

            when (val result = repository.getBridgeConnections()) {
                is BayitResult.Success -> {
                    val connections = result.data
                    logger.info("Loaded connections", mapOf("count" to connections.size.toString()))
                    _uiState.value = GrandparentBridgeUiState.Success(connections)
                }
                is BayitResult.Error -> {
                    logger.error("Failed to load connections", result.exception)
                    _uiState.value = GrandparentBridgeUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    /**
     * Create a new bridge invite for a grandparent.
     */
    fun createInvite(grandparentName: String) {
        viewModelScope.launch {
            logger.info("Creating bridge invite", mapOf("name" to grandparentName))

            when (val result = repository.createBridgeInvite(grandparentName)) {
                is BayitResult.Success -> {
                    val code = result.data
                    logger.info("Bridge invite created", mapOf("code" to code))
                    _inviteCode.value = code
                }
                is BayitResult.Error -> {
                    logger.error("Failed to create invite", result.exception)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    /**
     * Accept a bridge invite using an invite code.
     */
    fun acceptInvite(inviteCode: String) {
        viewModelScope.launch {
            logger.info("Accepting bridge invite")

            when (val result = repository.acceptBridgeInvite(inviteCode)) {
                is BayitResult.Success -> {
                    logger.info("Bridge invite accepted")
                    loadConnections()
                }
                is BayitResult.Error -> {
                    logger.error("Failed to accept invite", result.exception)
                    _uiState.value = GrandparentBridgeUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    /**
     * Clear the current invite code.
     */
    fun clearInviteCode() {
        _inviteCode.value = null
    }
}

/**
 * UI state for Grandparent Bridge screen.
 */
sealed interface GrandparentBridgeUiState {
    data object Loading : GrandparentBridgeUiState
    data class Success(val connections: List<Any>) : GrandparentBridgeUiState
    data class Error(val message: String) : GrandparentBridgeUiState
}
