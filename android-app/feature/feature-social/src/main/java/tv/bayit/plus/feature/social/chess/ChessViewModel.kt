package tv.bayit.plus.feature.social.chess

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.ChessRepository
import javax.inject.Inject

private const val TIMER_INTERVAL_MS = 100L
private const val ARG_GAME_ID = "gameId"

@HiltViewModel
class ChessViewModel @Inject constructor(
    internal val chessRepository: ChessRepository,
    internal val chessWebSocketHandler: ChessWebSocketHandler,
    internal val logger: BayitLogger,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {

    internal val _uiState = MutableStateFlow<ChessUiState>(ChessUiState.Lobby)
    val uiState: StateFlow<ChessUiState> = _uiState.asStateFlow()

    internal var wsJob: Job? = null
    internal var timerJob: Job? = null

    init {
        savedStateHandle.get<String>(ARG_GAME_ID)?.let { gameId ->
            loadGame(gameId)
        }
    }

    internal fun startTimer() {
        timerJob?.cancel()
        timerJob = viewModelScope.launch {
            while (isActive) {
                delay(TIMER_INTERVAL_MS)
                val current = _uiState.value as? ChessUiState.GameActive ?: continue
                val activeStatuses = setOf("active")
                if (current.game.status !in activeStatuses) continue
                val isWhiteTurn = current.currentTurn == "white"
                val whiteMs = current.whiteTimeRemainingMs
                val blackMs = current.blackTimeRemainingMs
                if (whiteMs == null && blackMs == null) continue
                val newWhite = if (isWhiteTurn && whiteMs != null) {
                    (whiteMs - TIMER_INTERVAL_MS).coerceAtLeast(0)
                } else whiteMs
                val newBlack = if (!isWhiteTurn && blackMs != null) {
                    (blackMs - TIMER_INTERVAL_MS).coerceAtLeast(0)
                } else blackMs
                _uiState.value = current.copy(
                    whiteTimeRemainingMs = newWhite,
                    blackTimeRemainingMs = newBlack,
                )
            }
        }
    }

    internal fun launchInScope(block: suspend () -> Unit) {
        viewModelScope.launch { block() }
    }

    override fun onCleared() {
        super.onCleared()
        timerJob?.cancel()
        chessWebSocketHandler.disconnect()
    }
}
