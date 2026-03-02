package tv.bayit.plus.feature.social.chess

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.core.model.ChessPlayer
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

private const val LOW_TIME_THRESHOLD_MS = 30_000L

@Composable
internal fun ChessPlayerInfoView(
    player: ChessPlayer?,
    label: String,
    isYou: Boolean,
    modifier: Modifier = Modifier,
    timeRemainingMs: Long? = null,
    isCurrentTurn: Boolean = false,
) {
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(DesignTokens.Spacing.sm),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = player?.userName ?: if (isYou) bayitString("chess.you") else label,
                    color = DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = DesignTokens.FontSize.base,
                )
                if (isCurrentTurn) {
                    TurnBadge()
                }
            }

            Row(
                horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                val displayMs = timeRemainingMs ?: player?.timeRemainingMs
                displayMs?.let { ms ->
                    val seconds = ms / 1000
                    val minutes = seconds / 60
                    val secs = seconds % 60
                    val isLowTime = ms <= LOW_TIME_THRESHOLD_MS
                    Text(
                        text = "%d:%02d".format(minutes, secs),
                        color = if (isLowTime) DesignTokens.Colors.Semantic.error
                        else DesignTokens.Colors.Text.secondary,
                        fontWeight = if (isLowTime) FontWeight.Bold else FontWeight.Normal,
                        fontSize = DesignTokens.FontSize.sm,
                    )
                }

                val isConnected = player?.isConnected ?: false
                val statusDesc = if (isConnected) bayitString("chess.online")
                else bayitString("chess.offline")
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .background(
                            color = if (isConnected) DesignTokens.Colors.Semantic.success
                            else DesignTokens.Colors.Text.disabled,
                            shape = CircleShape,
                        )
                        .semantics { contentDescription = statusDesc },
                )
            }
        }
    }
}

@Composable
private fun TurnBadge() {
    Box(
        modifier = Modifier
            .background(
                color = DesignTokens.Colors.Primary.p500,
                shape = RoundedCornerShape(DesignTokens.Spacing.xs),
            )
            .padding(horizontal = DesignTokens.Spacing.xs, vertical = 2.dp),
    ) {
        Text(
            text = bayitString("chess.yourTurn"),
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.xs,
            fontWeight = FontWeight.SemiBold,
        )
    }
}
