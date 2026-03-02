package tv.bayit.plus.feature.social.chess

import tv.bayit.plus.core.common.BayitResult

internal const val BOT_POLL_DELAY_MS = 800L
internal const val BOT_POLL_MAX_ATTEMPTS = 10

internal fun ChessViewModel.pollBotReply(gameCode: String) {
    val current = _uiState.value as? ChessUiState.GameActive ?: return
    if (current.game.gameMode != "bot") return
    val turnAfterPlayerMove = current.currentTurn
    launchInScope {
        repeat(BOT_POLL_MAX_ATTEMPTS) {
            kotlinx.coroutines.delay(BOT_POLL_DELAY_MS)
            when (val result = chessRepository.getGame(gameCode)) {
                is BayitResult.Success -> {
                    if (result.data.currentTurn != turnAfterPlayerMove ||
                        result.data.status != "active"
                    ) {
                        applyGameUpdate(result.data)
                        return@launchInScope
                    }
                }
                is BayitResult.Error -> {
                    logger.error("Bot poll failed", result.exception)
                    return@launchInScope
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}
