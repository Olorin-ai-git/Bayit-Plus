package tv.bayit.plus.feature.social.chess

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.ChessRepository
import tv.bayit.plus.core.model.ChessGame
import tv.bayit.plus.core.network.NetworkConfig
import tv.bayit.plus.core.network.websocket.ChannelType
import tv.bayit.plus.core.network.websocket.WebSocketConnection
import tv.bayit.plus.core.network.websocket.WebSocketManager
import javax.inject.Inject

@HiltViewModel
class ChessViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val chessRepository: ChessRepository,
    private val webSocketManager: WebSocketManager,
    private val networkConfig: NetworkConfig,
    private val logger: BayitLogger,
) : ViewModel() {

    private val gameId: String? = savedStateHandle["gameId"]

    private val _uiState = MutableStateFlow<ChessUiState>(ChessUiState.Loading)
    val uiState: StateFlow<ChessUiState> = _uiState.asStateFlow()

    private val _moveInput = MutableStateFlow("")
    val moveInput: StateFlow<String> = _moveInput.asStateFlow()

    private var wsConnection: WebSocketConnection? = null

    init {
        if (gameId != null) {
            loadGame(gameId)
            connectWebSocket(gameId)
        } else {
            loadActiveGames()
        }
    }

    fun updateMoveInput(move: String) { _moveInput.value = move }

    fun submitMove() {
        val currentState = _uiState.value as? ChessUiState.GameActive ?: return
        val move = _moveInput.value.trim()
        if (move.isBlank()) return
        _moveInput.value = ""
        viewModelScope.launch {
            logger.info("Submitting chess move", mapOf("gameId" to currentState.game.id, "move" to move))
            when (val result = chessRepository.makeMove(currentState.game.id, move)) {
                is BayitResult.Success -> {
                    val game = result.data as? ChessGame
                    if (game != null) _uiState.value = ChessUiState.GameActive(game)
                }
                is BayitResult.Error -> {
                    logger.error("Move failed", result.exception)
                    _uiState.value = currentState.copy(
                        errorMessage = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun createGame(timeControl: String) {
        viewModelScope.launch {
            _uiState.value = ChessUiState.Loading
            logger.info("Creating chess game", mapOf("timeControl" to timeControl))
            when (val result = chessRepository.createGame(null, timeControl)) {
                is BayitResult.Success -> {
                    val game = result.data as? ChessGame
                    if (game != null) { connectWebSocket(game.id); _uiState.value = ChessUiState.GameActive(game) }
                }
                is BayitResult.Error -> {
                    logger.error("Create game failed", result.exception)
                    _uiState.value = ChessUiState.Error(result.message ?: result.exception.message.orEmpty())
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun resign() {
        val currentState = _uiState.value as? ChessUiState.GameActive ?: return
        viewModelScope.launch {
            logger.info("Resigning game", mapOf("gameId" to currentState.game.id))
            when (val result = chessRepository.resignGame(currentState.game.id)) {
                is BayitResult.Success -> loadGame(currentState.game.id)
                is BayitResult.Error -> logger.error("Resign failed", result.exception)
                is BayitResult.Loading -> Unit
            }
        }
    }

    private fun loadGame(id: String) {
        viewModelScope.launch {
            when (val result = chessRepository.getGame(id)) {
                is BayitResult.Success -> {
                    val game = result.data as? ChessGame
                    if (game != null) _uiState.value = ChessUiState.GameActive(game)
                }
                is BayitResult.Error -> {
                    logger.error("Game load failed", result.exception)
                    _uiState.value = ChessUiState.Error(result.message ?: result.exception.message.orEmpty())
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    private fun loadActiveGames() {
        viewModelScope.launch {
            when (val result = chessRepository.getActiveGames()) {
                is BayitResult.Success -> _uiState.value = ChessUiState.GameList(result.data.filterIsInstance<ChessGame>())
                is BayitResult.Error -> {
                    logger.error("Active games load failed", result.exception)
                    _uiState.value = ChessUiState.Error(result.message ?: result.exception.message.orEmpty())
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    private fun connectWebSocket(id: String) {
        viewModelScope.launch {
            val wsUrl = "${networkConfig.webSocketBaseUrl}/ws/chess/$id"
            try {
                val connection = webSocketManager.connect(wsUrl, ChannelType.CHESS)
                wsConnection = connection
                connection.messages.onEach { raw -> handleIncomingMove(raw) }.launchIn(viewModelScope)
            } catch (e: Exception) { logger.error("Chess WebSocket connection failed", e) }
        }
    }

    private fun handleIncomingMove(raw: String) {
        try {
            val json = Json.parseToJsonElement(raw).jsonObject
            val type = json["type"]?.jsonPrimitive?.content
            if (type == "move" || type == "game_update") {
                val currentState = _uiState.value as? ChessUiState.GameActive
                if (currentState != null) loadGame(currentState.game.id)
            }
        } catch (e: Exception) { logger.error("Failed to parse chess WebSocket message", e) }
    }

    override fun onCleared() {
        super.onCleared()
        wsConnection?.let { webSocketManager.disconnect(it.id) }
    }
}

sealed interface ChessUiState {
    data object Loading : ChessUiState
    data class GameList(val games: List<ChessGame>) : ChessUiState
    data class GameActive(val game: ChessGame, val errorMessage: String? = null) : ChessUiState
    data class Error(val message: String) : ChessUiState
}
