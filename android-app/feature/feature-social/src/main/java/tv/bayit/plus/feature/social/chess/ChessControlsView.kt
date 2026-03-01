package tv.bayit.plus.feature.social.chess

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

private val activeStatuses = setOf("active", "waiting")

@Composable
internal fun ChessControlsView(
    gameStatus: String,
    drawOffered: Boolean,
    onResign: () -> Unit,
    onOfferDraw: () -> Unit,
    onAcceptDraw: () -> Unit,
    onDeclineDraw: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val isGameActive = gameStatus in activeStatuses

    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        when {
            !isGameActive -> {
                GlassButton(
                    text = bayitString("chess.newGame"),
                    onClick = { },
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            drawOffered -> {
                GlassButton(
                    text = bayitString("chess.acceptDraw"),
                    onClick = onAcceptDraw,
                    modifier = Modifier.weight(1f),
                )
                GlassButton(
                    text = bayitString("chess.declineDraw"),
                    onClick = onDeclineDraw,
                    isPrimary = false,
                    modifier = Modifier.weight(1f),
                )
            }
            else -> {
                GlassButton(
                    text = bayitString("chess.resign"),
                    onClick = onResign,
                    isPrimary = false,
                    modifier = Modifier.weight(1f),
                )
                GlassButton(
                    text = bayitString("chess.offerDraw"),
                    onClick = onOfferDraw,
                    isPrimary = false,
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}
