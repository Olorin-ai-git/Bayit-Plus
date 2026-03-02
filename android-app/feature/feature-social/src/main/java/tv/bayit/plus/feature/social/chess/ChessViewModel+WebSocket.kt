package tv.bayit.plus.feature.social.chess

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.ChessGame
import tv.bayit.plus.core.model.ChessMoveEntry

internal fun ChessViewModel.transitionToGame(game: ChessGame) {
    val board = parseFen(game.boardFen)
    _uiState.value = ChessUiState.GameActive(
        game = game,
        board = board,
        currentTurn = game.currentTurn,
        whiteTimeRemainingMs = game.whitePlayer?.timeRemainingMs,
        blackTimeRemainingMs = game.blackPlayer?.timeRemainingMs,
        moveHistory = game.moveHistory,
        capturedByWhite = emptyList(),
        capturedByBlack = emptyList(),
    )
    startWebSocket(game.gameCode)
    loadChatHistory(game.gameCode)
    if (game.timeControl != null) startTimer()
}

internal fun ChessViewModel.startWebSocket(gameCode: String) {
    wsJob?.cancel()
    launchInScope {
        chessWebSocketHandler.connect(gameCode).collect { event ->
            handleWsEvent(event)
        }
    }
}

internal fun ChessViewModel.handleWsEvent(event: ChessWsEvent) {
    when (event) {
        is ChessWsEvent.GameState -> applyGameUpdate(event.game)
        is ChessWsEvent.Move -> handleMoveEvent(event)
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
        is ChessWsEvent.Chat -> handleChatEvent(event.message)
        is ChessWsEvent.ParseError -> Unit
    }
}

private fun ChessViewModel.handleMoveEvent(event: ChessWsEvent.Move) {
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
    val fromSquare = event.san.take(2).takeIf { it.length == 2 && it[0] in 'a'..'h' }
    val toSquare = event.san.drop(2).take(2).takeIf { it.length == 2 && it[0] in 'a'..'h' }
    _uiState.value = current.copy(
        board = newBoard,
        currentTurn = event.currentTurn ?: current.currentTurn,
        whiteTimeRemainingMs = event.whiteTimeRemainingMs ?: current.whiteTimeRemainingMs,
        blackTimeRemainingMs = event.blackTimeRemainingMs ?: current.blackTimeRemainingMs,
        lastMove = if (fromSquare != null && toSquare != null) {
            Pair(fromSquare, toSquare)
        } else current.lastMove,
        moveHistory = current.moveHistory + newEntry,
        capturedByWhite = capturedByWhite,
        capturedByBlack = capturedByBlack,
        selectedSquare = null,
        game = event.status?.let { current.game.copy(status = it) } ?: current.game,
    )
}

private fun ChessViewModel.handleChatEvent(
    message: tv.bayit.plus.core.model.ChessChatMessage,
) {
    val current = _uiState.value as? ChessUiState.GameActive ?: return
    val existing = current.chatMessages.any { it.id == message.id }
    if (!existing) {
        _uiState.value = current.copy(chatMessages = current.chatMessages + message)
    }
}

internal fun ChessViewModel.loadChatHistory(gameCode: String) {
    launchInScope {
        when (val result = chessRepository.loadChatHistory(gameCode)) {
            is BayitResult.Success -> {
                val current = _uiState.value as? ChessUiState.GameActive ?: return@launchInScope
                _uiState.value = current.copy(chatMessages = result.data.reversed())
            }
            is BayitResult.Error -> logger.error("Load chat history failed", result.exception)
            is BayitResult.Loading -> Unit
        }
    }
}

internal fun ChessViewModel.applyGameUpdate(game: ChessGame) {
    val current = _uiState.value as? ChessUiState.GameActive
    _uiState.value = ChessUiState.GameActive(
        game = game,
        board = parseFen(game.boardFen),
        currentTurn = game.currentTurn,
        whiteTimeRemainingMs = game.whitePlayer?.timeRemainingMs
            ?: current?.whiteTimeRemainingMs,
        blackTimeRemainingMs = game.blackPlayer?.timeRemainingMs
            ?: current?.blackTimeRemainingMs,
        moveHistory = game.moveHistory,
        capturedByWhite = current?.capturedByWhite ?: emptyList(),
        capturedByBlack = current?.capturedByBlack ?: emptyList(),
        chatMessages = current?.chatMessages ?: emptyList(),
        isChatExpanded = current?.isChatExpanded ?: false,
        lastMove = current?.lastMove,
    )
    if (game.timeControl != null) startTimer()
}

internal fun updateCaptured(
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
