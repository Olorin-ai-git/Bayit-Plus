package tv.bayit.plus.feature.social.chess

import tv.bayit.plus.core.common.BayitResult

fun ChessViewModel.inviteFriend(friendUserId: String, color: String, timeControl: Int?) {
    launchInScope {
        logger.info(
            "Sending chess invite",
            mapOf("friendUserId" to friendUserId, "color" to color),
        )
        val result = chessRepository.invitePlayer(friendUserId, color, timeControl)
        when (result) {
            is BayitResult.Success -> transitionToGame(result.data)
            is BayitResult.Error -> logger.error("Invite failed", result.exception)
            is BayitResult.Loading -> Unit
        }
    }
}
