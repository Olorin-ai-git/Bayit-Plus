package tv.bayit.plus.feature.social.chess

import tv.bayit.plus.core.common.BayitResult

private const val DEEP_LINK_CHESS_BASE = "bayitplus://chess"

fun ChessViewModel.createGameForWhatsApp(color: String, timeControl: Int?) {
    launchInScope {
        _uiState.value = ChessUiState.Loading
        logger.info("Creating WhatsApp challenge game", mapOf("color" to color))
        when (val result = chessRepository.createGame(color, "pvp", null, timeControl)) {
            is BayitResult.Success -> {
                val game = result.data
                val link = "$DEEP_LINK_CHESS_BASE/${game.gameCode}"
                val message = stringProvider.string(
                    "chess.whatsAppMessage",
                    mapOf("code" to game.gameCode, "link" to link),
                )
                setPendingWhatsAppMessage(message)
                transitionToGame(game)
            }
            is BayitResult.Error -> {
                logger.error("WhatsApp challenge create failed", result.exception)
                _uiState.value = ChessUiState.Error(
                    result.message ?: result.exception.message.orEmpty()
                )
            }
            is BayitResult.Loading -> Unit
        }
    }
}

fun ChessViewModel.createGame(
    color: String,
    gameMode: String,
    botDifficulty: String?,
    timeControl: Int?,
) {
    launchInScope {
        _uiState.value = ChessUiState.Loading
        logger.info("Creating chess game", mapOf("color" to color, "mode" to gameMode))
        when (val result = chessRepository.createGame(color, gameMode, botDifficulty, timeControl)) {
            is BayitResult.Success -> transitionToGame(result.data)
            is BayitResult.Error -> {
                logger.error("Create game failed", result.exception)
                _uiState.value = ChessUiState.Error(
                    result.message ?: result.exception.message.orEmpty()
                )
            }
            is BayitResult.Loading -> Unit
        }
    }
}

fun ChessViewModel.joinGame(gameCode: String) {
    launchInScope {
        _uiState.value = ChessUiState.Loading
        logger.info("Joining chess game", mapOf("gameCode" to gameCode))
        when (val result = chessRepository.joinGame(gameCode)) {
            is BayitResult.Success -> transitionToGame(result.data)
            is BayitResult.Error -> {
                logger.error("Join game failed", result.exception)
                _uiState.value = ChessUiState.Error(
                    result.message ?: result.exception.message.orEmpty()
                )
            }
            is BayitResult.Loading -> Unit
        }
    }
}

fun ChessViewModel.loadGame(gameCode: String) {
    launchInScope {
        _uiState.value = ChessUiState.Loading
        logger.info("Loading chess game", mapOf("gameCode" to gameCode))
        when (val result = chessRepository.getGame(gameCode)) {
            is BayitResult.Success -> transitionToGame(result.data)
            is BayitResult.Error -> {
                logger.error("Load game failed", result.exception)
                _uiState.value = ChessUiState.Error(
                    result.message ?: result.exception.message.orEmpty()
                )
            }
            is BayitResult.Loading -> Unit
        }
    }
}

fun ChessViewModel.tapSquare(row: Int, col: Int) {
    val current = _uiState.value as? ChessUiState.GameActive ?: return
    val piece = current.board.getOrNull(row)?.getOrNull(col)

    if (current.selectedSquare != null) {
        if (current.selectedSquare.first == row && current.selectedSquare.second == col) {
            _uiState.value = current.copy(selectedSquare = null)
            return
        }
        if (piece != null && isOwnPiece(piece, current.currentTurn)) {
            _uiState.value = current.copy(selectedSquare = Pair(row, col))
            return
        }
        val from = squareNotation(current.selectedSquare.first, current.selectedSquare.second)
        val to = squareNotation(row, col)
        sendMove(current.game.gameCode, from, to)
        _uiState.value = current.copy(selectedSquare = null)
    } else if (piece != null && isOwnPiece(piece, current.currentTurn)) {
        _uiState.value = current.copy(selectedSquare = Pair(row, col))
    }
}

fun ChessViewModel.sendMove(gameCode: String, from: String, to: String) {
    val moveMsg = """{"type":"move","from":"$from","to":"$to"}"""
    val sent = chessWebSocketHandler.send(moveMsg)
    logger.info("Move sent", mapOf("from" to from, "to" to to, "ws" to sent.toString()))
    if (!sent) {
        launchInScope {
            when (val result = chessRepository.makeMove(gameCode, from, to)) {
                is BayitResult.Success -> {
                    applyGameUpdate(result.data)
                    pollBotReply(gameCode)
                }
                is BayitResult.Error -> logger.error("REST move fallback failed", result.exception)
                is BayitResult.Loading -> Unit
            }
        }
    }
}

fun ChessViewModel.resign(gameCode: String) {
    launchInScope {
        chessWebSocketHandler.send("""{"type":"resign"}""")
        logger.info("Resigned game", mapOf("gameCode" to gameCode))
        when (val result = chessRepository.resignGame(gameCode)) {
            is BayitResult.Success -> applyGameUpdate(result.data)
            is BayitResult.Error -> logger.error("Resign REST call failed", result.exception)
            is BayitResult.Loading -> Unit
        }
    }
}

fun ChessViewModel.offerDraw(gameCode: String) {
    chessWebSocketHandler.send("""{"type":"offer_draw"}""")
    logger.info("Draw offered", mapOf("gameCode" to gameCode))
}

fun ChessViewModel.respondToDraw(accept: Boolean, gameCode: String) {
    chessWebSocketHandler.send("""{"type":"draw_response","accept":$accept}""")
    logger.info("Draw response sent", mapOf("accept" to accept.toString()))
}

fun ChessViewModel.sendChatMessage(gameCode: String, message: String) {
    val wsMsg = """{"type":"chat","message":"${message.replace("\"", "\\\"")}"}"""
    val sent = chessWebSocketHandler.send(wsMsg)
    if (!sent) {
        launchInScope {
            when (val result = chessRepository.sendChatMessage(gameCode, message)) {
                is BayitResult.Success -> {
                    val current = _uiState.value as? ChessUiState.GameActive ?: return@launchInScope
                    _uiState.value = current.copy(
                        chatMessages = current.chatMessages + result.data
                    )
                }
                is BayitResult.Error -> logger.error("Send chat failed", result.exception)
                is BayitResult.Loading -> Unit
            }
        }
    }
}

fun ChessViewModel.toggleChatExpanded() {
    val current = _uiState.value as? ChessUiState.GameActive ?: return
    _uiState.value = current.copy(isChatExpanded = !current.isChatExpanded)
}

fun ChessViewModel.navigateToLobby() {
    wsJob?.cancel()
    timerJob?.cancel()
    chessWebSocketHandler.disconnect()
    _uiState.value = ChessUiState.Lobby()
}

fun ChessViewModel.squareNotation(row: Int, col: Int): String {
    val file = ('a' + col).toString()
    val rank = (8 - row).toString()
    return "$file$rank"
}

internal fun isOwnPiece(piece: Char, currentTurn: String): Boolean {
    return if (currentTurn == "white") piece.isUpperCase() else piece.isLowerCase()
}
