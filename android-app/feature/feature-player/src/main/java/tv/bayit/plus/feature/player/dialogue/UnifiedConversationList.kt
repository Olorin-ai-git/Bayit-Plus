package tv.bayit.plus.feature.player.dialogue

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Scrollable conversation list for unified exchange items.
 * Used by multi-character (WS3) and shared interaction (WS4) overlays.
 */
@Composable
internal fun UnifiedConversationList(
    exchanges: List<DialogueExchangeItem>,
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
        items(visibleExchanges) { item ->
            UnifiedExchangeBubble(item = item)
        }
    }
}

@Composable
private fun UnifiedExchangeBubble(item: DialogueExchangeItem) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
    ) {
        if (item.isUser) {
            UserMessageBubble(text = item.messageText)
        } else {
            val bgColor = if (item.isReaction) {
                DesignTokens.Colors.Glass.bgLight
            } else {
                DesignTokens.Colors.Glass.bgMedium
            }

            val label = item.participantName
                ?: item.characterName
                ?: item.speaker

            Text(
                text = label,
                color = DesignTokens.Colors.Primary.light,
                fontSize = DesignTokens.FontSize.xs,
                fontWeight = FontWeight.Medium,
            )
            CharacterReplyBubble(
                text = item.messageText,
                videoUrl = item.animatedVideoUrl,
                backgroundColor = bgColor,
            )
        }
    }
}
