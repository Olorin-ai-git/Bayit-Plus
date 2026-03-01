package tv.bayit.plus.feature.social.chess

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
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
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun ChessPlayerInfoView(
    player: ChessPlayer?,
    label: String,
    isYou: Boolean,
    modifier: Modifier = Modifier,
) {
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(DesignTokens.Spacing.sm),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = player?.userName ?: if (isYou) "You" else label,
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.SemiBold,
                fontSize = DesignTokens.FontSize.base,
            )

            Row(
                horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                player?.timeRemainingMs?.let { ms ->
                    val seconds = ms / 1000
                    val minutes = seconds / 60
                    val secs = seconds % 60
                    Text(
                        text = "%d:%02d".format(minutes, secs),
                        color = DesignTokens.Colors.Text.secondary,
                        fontSize = DesignTokens.FontSize.sm,
                    )
                }

                val isConnected = player?.isConnected ?: false
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .background(
                            color = if (isConnected) DesignTokens.Colors.Semantic.success
                            else DesignTokens.Colors.Text.disabled,
                            shape = CircleShape,
                        )
                        .semantics {
                            contentDescription = if (isConnected) "Online" else "Offline"
                        },
                )
            }
        }
    }
}
