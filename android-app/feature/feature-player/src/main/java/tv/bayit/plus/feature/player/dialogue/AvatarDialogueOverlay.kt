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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.media3.common.Player
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Glassmorphic overlay for live character-avatar dialogue during VOD playback.
 *
 * Supports smart positioning via [avatarPlacement] and an optional slot for
 * multi-character circles above the conversation area. The main player volume
 * is ducked to [DUCKED_VOLUME] while the overlay is visible.
 */
@Composable
fun AvatarDialogueOverlay(
    isActive: Boolean,
    selectedCharacter: ContentCharacter?,
    avatarUrl: String?,
    exchanges: List<DialogueExchange>,
    isSending: Boolean,
    mainPlayer: Player?,
    avatarPlacement: AvatarPlacement?,
    onSendMessage: (String) -> Unit,
    onClose: () -> Unit,
    modifier: Modifier = Modifier,
    multiCharacterSlot: @Composable () -> Unit = {},
) {
    AnimatedVisibility(
        visible = isActive && selectedCharacter != null,
        enter = fadeIn(),
        exit = fadeOut(),
        modifier = modifier,
    ) {
        DuckMainPlayerVolume(mainPlayer = mainPlayer, isActive = isActive)

        SmartPositionedOverlay(placement = avatarPlacement) {
            Box(
                modifier = Modifier
                    .widthIn(max = OVERLAY_MAX_WIDTH)
                    .glassMorphism(
                        cornerRadius = DesignTokens.Radius.lg,
                        backgroundColor = DesignTokens.Colors.Glass.bgStrong,
                    )
                    .padding(DesignTokens.Spacing.base),
            ) {
                Column {
                    OverlayHeader(
                        character = selectedCharacter,
                        avatarUrl = avatarUrl,
                        onClose = onClose,
                    )

                    multiCharacterSlot()

                    Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))

                    ConversationList(
                        exchanges = exchanges,
                        modifier = Modifier.weight(1f, fill = false),
                    )

                    Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))

                    MessageInput(
                        isSending = isSending,
                        onSendMessage = onSendMessage,
                    )
                }
            }
        }
    }
}

@Composable
private fun DuckMainPlayerVolume(mainPlayer: Player?, isActive: Boolean) {
    DisposableEffect(mainPlayer, isActive) {
        val previousVolume = mainPlayer?.volume ?: 1f
        if (isActive) {
            mainPlayer?.volume = DUCKED_VOLUME
        }
        onDispose {
            mainPlayer?.volume = previousVolume
        }
    }
}

@Composable
private fun OverlayHeader(
    character: ContentCharacter?,
    avatarUrl: String?,
    onClose: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            AvatarCircle(
                imageUrl = avatarUrl,
                contentDescription = bayitString("player.dialogue.yourAvatar"),
            )
            AvatarCircle(
                imageUrl = character?.frameUrl,
                contentDescription = character?.name,
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

    character?.let {
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
        Text(
            text = it.name,
            color = DesignTokens.Colors.Primary.light,
            fontSize = DesignTokens.FontSize.md,
            fontWeight = FontWeight.Bold,
        )
        Text(
            text = it.description,
            color = DesignTokens.Colors.Text.muted,
            fontSize = DesignTokens.FontSize.sm,
            maxLines = DESCRIPTION_MAX_LINES,
        )
    }
}

@Composable
private fun AvatarCircle(imageUrl: String?, contentDescription: String?) {
    CachedAsyncImage(
        url = imageUrl,
        contentDescription = contentDescription,
        modifier = Modifier
            .size(AVATAR_CIRCLE_SIZE)
            .clip(CircleShape),
    )
}

private val OVERLAY_MAX_WIDTH = 380.dp
private val CLOSE_ICON_SIZE = DesignTokens.Spacing.xl
private const val DUCKED_VOLUME = 0.15f
private const val DESCRIPTION_MAX_LINES = 2
