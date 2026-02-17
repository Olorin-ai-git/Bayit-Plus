package tv.bayit.plus.feature.player.dialogue

import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.GlassTextField
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Scrollable conversation list showing the most recent dialogue exchanges.
 */
@Composable
internal fun ConversationList(
    exchanges: List<DialogueExchange>,
    modifier: Modifier = Modifier,
) {
    val visibleExchanges = exchanges.takeLast(MAX_VISIBLE_EXCHANGES)
    val listState = rememberLazyListState()

    LaunchedEffect(visibleExchanges.size) {
        if (visibleExchanges.isNotEmpty()) {
            listState.animateScrollToItem(visibleExchanges.lastIndex)
        }
    }

    LazyColumn(
        state = listState,
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        items(visibleExchanges) { exchange ->
            ExchangeBubble(exchange = exchange)
        }
    }
}

@Composable
private fun ExchangeBubble(exchange: DialogueExchange) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
    ) {
        Text(
            text = exchange.userMessage,
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.sm,
            modifier = Modifier
                .align(Alignment.End)
                .glassMorphism(
                    cornerRadius = DesignTokens.Radius.md,
                    backgroundColor = DesignTokens.Colors.Glass.purpleStrong,
                )
                .padding(
                    horizontal = DesignTokens.Spacing.md,
                    vertical = DesignTokens.Spacing.sm,
                ),
            textAlign = TextAlign.End,
        )

        Row(
            verticalAlignment = Alignment.Top,
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
        ) {
            if (exchange.characterVideoUrl != null) {
                CharacterVideoCircle(videoUrl = exchange.characterVideoUrl)
            }

            Text(
                text = exchange.characterReply,
                color = DesignTokens.Colors.Text.secondary,
                fontSize = DesignTokens.FontSize.sm,
                modifier = Modifier
                    .glassMorphism(
                        cornerRadius = DesignTokens.Radius.md,
                        backgroundColor = DesignTokens.Colors.Glass.bgMedium,
                    )
                    .padding(
                        horizontal = DesignTokens.Spacing.md,
                        vertical = DesignTokens.Spacing.sm,
                    ),
            )
        }
    }
}

/**
 * ExoPlayer-backed circular video view for character response animations.
 */
@Composable
private fun CharacterVideoCircle(videoUrl: String) {
    val context = LocalContext.current
    val exoPlayer = remember(videoUrl) {
        ExoPlayer.Builder(context).build().apply {
            setMediaItem(MediaItem.fromUri(Uri.parse(videoUrl)))
            prepare()
            playWhenReady = true
            repeatMode = Player.REPEAT_MODE_OFF
        }
    }

    DisposableEffect(videoUrl) {
        onDispose { exoPlayer.release() }
    }

    AndroidView(
        factory = { ctx ->
            PlayerView(ctx).apply {
                player = exoPlayer
                useController = false
            }
        },
        modifier = Modifier
            .size(AVATAR_CIRCLE_SIZE)
            .clip(CircleShape),
    )
}

/**
 * Text input row with send button for composing dialogue messages.
 */
@Composable
internal fun MessageInput(
    isSending: Boolean,
    onSendMessage: (String) -> Unit,
) {
    var messageText by remember { mutableStateOf("") }

    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        GlassTextField(
            value = messageText,
            onValueChange = { messageText = it },
            modifier = Modifier.weight(1f),
            placeholder = bayitString("player.dialogue.placeholder"),
            singleLine = true,
            enabled = !isSending,
        )

        if (isSending) {
            GlassSpinner(size = SpinnerSize.SMALL)
        } else {
            IconButton(
                onClick = {
                    if (messageText.isNotBlank()) {
                        onSendMessage(messageText)
                        messageText = ""
                    }
                },
            ) {
                Icon(
                    imageVector = Icons.Default.Send,
                    contentDescription = bayitString("player.dialogue.send"),
                    tint = DesignTokens.Colors.Primary.light,
                    modifier = Modifier.size(SEND_ICON_SIZE),
                )
            }
        }
    }
}

internal val AVATAR_CIRCLE_SIZE = DesignTokens.Spacing.xxxxl + DesignTokens.Spacing.xxxxl + DesignTokens.Spacing.xs
internal const val MAX_VISIBLE_EXCHANGES = 6
private val SEND_ICON_SIZE = DesignTokens.Spacing.xl
