package tv.bayit.plus.feature.player.dialogue

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Full overlay for shared interactive sessions (WS4).
 *
 * Displays a GlassCard overlay with session header, participant row,
 * turn countdown, unified conversation list, and turn-gated message input.
 */
@Composable
fun SharedInteractionOverlayView(
    isActive: Boolean,
    characterName: String?,
    participants: List<SharedParticipant>,
    currentTurnUserId: String?,
    currentUserId: String,
    turnCountdown: Int,
    exchanges: List<DialogueExchangeItem>,
    isSending: Boolean,
    onSendMessage: (String) -> Unit,
    onClose: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val isMyTurn = currentTurnUserId == currentUserId

    AnimatedVisibility(
        visible = isActive,
        enter = fadeIn(),
        exit = fadeOut(),
        modifier = modifier,
    ) {
        Box(
            modifier = Modifier
                .widthIn(max = SHARED_OVERLAY_MAX_WIDTH)
                .glassMorphism(
                    cornerRadius = DesignTokens.Radius.lg,
                    backgroundColor = DesignTokens.Colors.Glass.bgStrong,
                )
                .padding(DesignTokens.Spacing.base),
        ) {
            Column {
                SharedOverlayHeader(
                    characterName = characterName,
                    turnCountdown = turnCountdown,
                    isMyTurn = isMyTurn,
                    onClose = onClose,
                )

                SharedParticipantRow(
                    participants = participants,
                    currentTurnUserId = currentTurnUserId,
                )

                Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))

                UnifiedConversationList(
                    exchanges = exchanges,
                    modifier = Modifier.weight(1f, fill = false),
                )

                Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))

                if (isMyTurn) {
                    MessageInput(
                        isSending = isSending,
                        onSendMessage = onSendMessage,
                    )
                } else {
                    WaitingForTurnIndicator()
                }
            }
        }
    }
}

@Composable
private fun SharedOverlayHeader(
    characterName: String?,
    turnCountdown: Int,
    isMyTurn: Boolean,
    onClose: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Column {
            Text(
                text = bayitString("player.dialogue.sharedSession"),
                color = DesignTokens.Colors.Primary.light,
                fontSize = DesignTokens.FontSize.md,
                fontWeight = FontWeight.Bold,
            )
            characterName?.let {
                Text(
                    text = it,
                    color = DesignTokens.Colors.Text.muted,
                    fontSize = DesignTokens.FontSize.sm,
                )
            }
        }

        Row(
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (turnCountdown > 0) {
                CountdownBadge(
                    seconds = turnCountdown,
                    isMyTurn = isMyTurn,
                )
            }

            IconButton(onClick = onClose) {
                Icon(
                    imageVector = Icons.Default.Close,
                    contentDescription = bayitString("player.dialogue.close"),
                    tint = DesignTokens.Colors.Text.secondary,
                    modifier = Modifier.size(CLOSE_ICON_SIZE),
                )
            }
        }
    }
}

@Composable
private fun CountdownBadge(seconds: Int, isMyTurn: Boolean) {
    val bgColor = if (isMyTurn) {
        DesignTokens.Colors.Glass.purpleStrong
    } else {
        DesignTokens.Colors.Glass.bgMedium
    }

    Text(
        text = "${seconds}s",
        color = DesignTokens.Colors.Text.primary,
        fontSize = DesignTokens.FontSize.sm,
        fontWeight = FontWeight.Bold,
        modifier = Modifier
            .glassMorphism(
                cornerRadius = DesignTokens.Radius.sm,
                backgroundColor = bgColor,
            )
            .padding(
                horizontal = DesignTokens.Spacing.sm,
                vertical = DesignTokens.Spacing.xs,
            ),
    )
}

@Composable
private fun WaitingForTurnIndicator() {
    Text(
        text = bayitString("player.dialogue.waitingForTurn"),
        color = DesignTokens.Colors.Text.muted,
        fontSize = DesignTokens.FontSize.sm,
        modifier = Modifier
            .fillMaxWidth()
            .glassMorphism(
                cornerRadius = DesignTokens.Radius.md,
                backgroundColor = DesignTokens.Colors.Glass.bgLight,
            )
            .padding(DesignTokens.Spacing.md),
    )
}

private val SHARED_OVERLAY_MAX_WIDTH = 400.dp
private val CLOSE_ICON_SIZE = DesignTokens.Spacing.xl
