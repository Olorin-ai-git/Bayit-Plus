package tv.bayit.plus.feature.social.chess

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun ChessInviteBanner(
    state: ChessInviteState,
    onAccept: (String) -> Unit,
    onDecline: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val isVisible = state is ChessInviteState.Showing

    AnimatedVisibility(
        visible = isVisible,
        enter = slideInVertically { -it },
        exit = slideOutVertically { -it },
        modifier = modifier,
    ) {
        val invite = (state as? ChessInviteState.Showing)?.invite ?: return@AnimatedVisibility

        GlassCard(modifier = Modifier.fillMaxWidth().padding(DesignTokens.Spacing.base)) {
            Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
                Text(
                    text = bayitString(
                        "chess.inviteReceived",
                        mapOf("name" to invite.inviterName),
                    ),
                    style = MaterialTheme.typography.titleSmall,
                    color = DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.SemiBold,
                )
                Row(
                    horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    GlassButton(
                        text = bayitString("chess.acceptInvite"),
                        onClick = { onAccept(invite.gameCode) },
                        isPrimary = true,
                        modifier = Modifier.weight(1f),
                    )
                    GlassButton(
                        text = bayitString("chess.declineInvite"),
                        onClick = { onDecline(invite.gameCode) },
                        isPrimary = false,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
}
