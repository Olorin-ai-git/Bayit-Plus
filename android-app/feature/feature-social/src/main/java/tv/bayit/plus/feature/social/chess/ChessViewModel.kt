package tv.bayit.plus.feature.social.chess

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.ChessRepository
import tv.bayit.plus.core.model.ChessGame
import tv.bayit.plus.core.model.ChessMoveEntry
import javax.inject.Inject

@HiltViewModel
class ChessViewModel @Inject constructor(
    private val chessRepository: ChessRepository,
    private val chessWebSocketHandler: ChessWebSocketHandler,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<ChessUiState>(ChessUiState.Lobby)
    val uiState: StateFlow<ChessUiState> = _uiState.asStateFlow()

    private var wsJob: Job? = null

    fun createGame(color: String, gameMode: String, botDifficulty: String?) {
        viewModelScope.launch {
            _uiState.value = ChessUiState.Loading
            logger.info("Creating chess game", mapOf("color" to color, "mode" to gameMode))
            when (val result = chessRepository.createGame(color, gameMode, botDifficulty)) {
                is BayitResult.Success -> transitionToGame(result.data)
                is BayitResult.Error -> {
                    logger.error("Create game failed", result.exception)
                    _uiState.value = ChessUiState.Error(result.message ?: result.exception.message.orEmpty())
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun joinGame(gameCode: String) {
        viewModelScope.launch {
            _uiState.value = ChessUiState.Loading
            logger.info("Joining chess game", mapOf("gameCode" to gameCode))
            when (val result = chessRepository.joinGame(gameCode)) {
                is BayitResult.Success -> transitionToGame(result.data)
                is BayitResult.Error -> {
                    logger.error("Join game failed", result.exception)
                    _uiState.value = ChessUiState.Error(result.message ?: result.exception.message.orEmpty())
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun tapSquare(row: Int, col: Int) {
        val current = _uiState.value as? ChessUiState.GameActive ?: return
        if (current.selectedSquare != null) {
            val from = squareNotation(current.selectedSquare.first, current.selectedSquare.second)
            val to = squareNotation(row, col)
            val moveMsg = """{"type":"move","from":"$from","to":"$to"}"""
            chessWebSocketHandler.send(moveMsg)
            _uiState.value = current.copy(selectedSquare = null)
            logger.info("Move sent", mapOf("from" to from, "to" to to))
        } else if (current.board.getOrNull(row)?.getOrNull(col) != null) {
            _uiState.value = current.copy(selectedSquare = Pair(row, col))
        }
    }

    fun offerDraw(gameCode: String) {
        chessWebSocketHandler.send("""{"type":"offer_draw"}""")
        logger.info("Draw offered", mapOf("gameCode" to gameCode))
    }

    fun respondToDraw(accept: Boolean, gameCode: String) {
        chessWebSocketHandler.send("""{"type":"draw_response","accept":$accept}""")
        logger.info("Draw response sent", mapOf("accept" to accept.toString()))
    }

    fun resign(gameCode: String) {
        viewModelScope.launch {
            chessWebSocketHandler.send("""{"type":"resign"}""")
            logger.info("Resigned game", mapOf("gameCode" to gameCode))
            when (val result = chessRepository.resignGame(gameCode)) {
                is BayitResult.Success -> applyGameUpdate(result.data)
                is BayitResult.Error -> logger.error("Resign REST call failed", result.exception)
                is BayitResult.Loading -> Unit
            }
        }
    }

    private fun transitionToGame(game: ChessGame) {
        val board = parseFen(game.boardFen)
        _uiState.value = ChessUiState.GameActive(
            game = game,
            board = board,
            moveHistory = game.moveHistory,
            capturedByWhite = emptyList(),
            capturedByBlack = emptyList(),
        )
        startWebSocket(game.gameCode)
    }

    private fun startWebSocket(gameCode: String) {
        wsJob?.cancel()
        wsJob = viewModelScope.launch {
            chessWebSocketHandler.connect(gameCode).collect { event ->
                handleWsEvent(event)
            }
        }
    }

    private fun handleWsEvent(event: ChessWsEvent) {
        when (event) {
            is ChessWsEvent.GameState -> applyGameUpdate(event.game)
            is ChessWsEvent.Move -> {
                val current = _uiState.value as? ChessUiState.GameActive ?: return
                val newBoard = parseFen(event.fen)
                val newEntry = ChessMoveEntry(
                    moveNumber = current.moveHistory.size + 1,
                    san = event.san,
                    piece = "",
                    captured = event.captured,
                )
                val (capturedByWhite, capturedByBlack) = updateCaptured(
                    current.capturedByWhite, current.capturedByBlack, event.captured
                )
                _uiState.value = current.copy(
                    board = newBoard,
                    moveHistory = current.moveHistory + newEntry,
                    capturedByWhite = capturedByWhite,
                    capturedByBlack = capturedByBlack,
                    selectedSquare = null,
                )
            }
            is ChessWsEvent.DrawOffer -> {
                val current = _uiState.value as? ChessUiState.GameActive ?: return
                _uiState.value = current.copy(drawOffered = true)
            }
            is ChessWsEvent.DrawResponse -> {
                val current = _uiState.value as? ChessUiState.GameActive ?: return
                _uiState.value = if (event.accepted) {
                    current.copy(drawOffered = false, game = current.game.copy(status = "draw"))
                } else {
                    current.copy(drawOffered = false)
                }
            }
            is ChessWsEvent.GameEnd -> {
                val current = _uiState.value as? ChessUiState.GameActive ?: return
                _uiState.value = current.copy(game = current.game.copy(status = event.status))
            }
            is ChessWsEvent.Resign -> {
                val current = _uiState.value as? ChessUiState.GameActive ?: return
                _uiState.value = current.copy(game = current.game.copy(status = event.status))
            }
            is ChessWsEvent.ParseError -> Unit
        }
    }

    private fun applyGameUpdate(game: ChessGame) {
        val current = _uiState.value as? ChessUiState.GameActive
        _uiState.value = ChessUiState.GameActive(
            game = game,
            board = parseFen(game.boardFen),
            moveHistory = game.moveHistory,
            capturedByWhite = current?.capturedByWhite ?: emptyList(),
            capturedByBlack = current?.capturedByBlack ?: emptyList(),
        )
    }

    private fun updateCaptured(
        byWhite: List<Char>,
        byBlack: List<Char>,
        captured: String?,
    ): Pair<List<Char>, List<Char>> {
        if (captured.isNullOrBlank()) return Pair(byWhite, byBlack)
        val ch = captured.firstOrNull() ?: return Pair(byWhite, byBlack)
        return if (ch.isUpperCase()) {
            Pair(byWhite, byBlack + ch)
        } else {
            Pair(byWhite + ch, byBlack)
        }
    }

    fun squareNotation(row: Int, col: Int): String {
        val file = ('a' + col).toString()
        val rank = (8 - row).toString()
        return "$file$rank"
    }

    override fun onCleared() {
        super.onCleared()
        chessWebSocketHandler.disconnect()
    }
}

