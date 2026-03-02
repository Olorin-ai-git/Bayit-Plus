package tv.bayit.plus.feature.social.chess

import tv.bayit.plus.core.model.ChessGame

data class PendingInvite(
    val gameCode: String,
    val inviterName: String,
    val inviterId: String,
    val timeControl: Int?,
)

sealed interface ChessInviteState {
    data object Hidden : ChessInviteState
    data class Showing(val invite: PendingInvite) : ChessInviteState
}

fun ChessGame.toPendingInvite(): PendingInvite? {
    val host = whitePlayer ?: blackPlayer ?: return null
    return PendingInvite(
        gameCode = gameCode,
        inviterName = host.userName,
        inviterId = host.userId,
        timeControl = timeControl,
    )
}
