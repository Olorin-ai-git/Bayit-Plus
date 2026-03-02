package tv.bayit.plus.feature.social.chess

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.ChessRepository
import tv.bayit.plus.core.model.ChessGame
import javax.inject.Inject

private const val INVITE_POLL_INTERVAL_MS = 15_000L

@HiltViewModel
class ChessInviteViewModel @Inject constructor(
    private val chessRepository: ChessRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _inviteState = MutableStateFlow<ChessInviteState>(ChessInviteState.Hidden)
    val inviteState: StateFlow<ChessInviteState> = _inviteState.asStateFlow()

    private val _acceptedGame = MutableSharedFlow<ChessGame>(extraBufferCapacity = 1)
    val acceptedGame: SharedFlow<ChessGame> = _acceptedGame.asSharedFlow()

    private var pollJob: Job? = null

    init {
        startPolling()
    }

    private fun startPolling() {
        pollJob?.cancel()
        pollJob = viewModelScope.launch {
            while (isActive) {
                fetchPendingInvites()
                delay(INVITE_POLL_INTERVAL_MS)
            }
        }
    }

    private suspend fun fetchPendingInvites() {
        when (val result = chessRepository.getPendingInvites()) {
            is BayitResult.Success -> {
                val invite = result.data.firstOrNull()?.toPendingInvite()
                _inviteState.value = if (invite != null) {
                    ChessInviteState.Showing(invite)
                } else {
                    ChessInviteState.Hidden
                }
            }
            is BayitResult.Error -> {
                logger.error("Failed to fetch pending invites", result.exception)
            }
            is BayitResult.Loading -> Unit
        }
    }

    fun acceptInvite(gameCode: String) {
        viewModelScope.launch {
            logger.info("Accepting chess invite", mapOf("gameCode" to gameCode))
            _inviteState.value = ChessInviteState.Hidden
            when (val result = chessRepository.joinGame(gameCode)) {
                is BayitResult.Success -> {
                    _acceptedGame.tryEmit(result.data)
                }
                is BayitResult.Error -> {
                    logger.error("Accept invite failed", result.exception)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun declineInvite(gameCode: String) {
        viewModelScope.launch {
            logger.info("Declining chess invite", mapOf("gameCode" to gameCode))
            _inviteState.value = ChessInviteState.Hidden
            when (val result = chessRepository.declineInvite(gameCode)) {
                is BayitResult.Success -> {
                    startPolling()
                }
                is BayitResult.Error -> {
                    logger.error("Decline invite failed", result.exception)
                    startPolling()
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        pollJob?.cancel()
    }
}
