package tv.bayit.plus.feature.social.chess

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.core.model.ChessChatMessage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassTextField
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun ChessChatPanel(
    messages: List<ChessChatMessage>,
    currentUserId: String,
    isExpanded: Boolean,
    onToggle: () -> Unit,
    onSend: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Column {
            ChatHeader(
                messageCount = messages.size,
                isExpanded = isExpanded,
                onClick = onToggle,
            )
            AnimatedVisibility(visible = isExpanded) {
                Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
                    ChatMessageList(messages, currentUserId)
                    ChatInput(onSend)
                }
            }
        }
    }
}

@Composable
private fun ChatHeader(messageCount: Int, isExpanded: Boolean, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(DesignTokens.Spacing.sm),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = bayitString("chess.chat.title"),
                style = MaterialTheme.typography.titleSmall,
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.SemiBold,
            )
            if (messageCount > 0) {
                Box(
                    modifier = Modifier
                        .size(20.dp)
                        .background(DesignTokens.Colors.Primary.p500, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = messageCount.toString(),
                        color = DesignTokens.Colors.Text.primary,
                        fontSize = DesignTokens.FontSize.xs,
                    )
                }
            }
        }
        Text(
            text = if (isExpanded) "\u25B2" else "\u25BC",
            color = DesignTokens.Colors.Text.secondary,
        )
    }
}

@Composable
private fun ChatMessageList(messages: List<ChessChatMessage>, currentUserId: String) {
    val listState = rememberLazyListState()
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) listState.animateScrollToItem(messages.lastIndex)
    }
    LazyColumn(
        state = listState,
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(max = 200.dp)
            .padding(horizontal = DesignTokens.Spacing.sm),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
    ) {
        items(messages, key = { it.id.ifEmpty { it.hashCode().toString() } }) { msg ->
            ChatBubble(msg, isOwn = msg.userId == currentUserId)
        }
    }
}

@Composable
private fun ChatBubble(message: ChessChatMessage, isOwn: Boolean) {
    val alignment = if (isOwn) Alignment.End else Alignment.Start
    val bgColor = if (isOwn) DesignTokens.Colors.Primary.p500.copy(alpha = 0.2f)
    else DesignTokens.Colors.Glass.bgLight
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = alignment,
    ) {
        if (!isOwn) {
            Text(
                text = message.userName,
                fontSize = DesignTokens.FontSize.xs,
                color = DesignTokens.Colors.Text.secondary,
                fontWeight = FontWeight.SemiBold,
            )
        }
        Box(
            modifier = Modifier
                .background(bgColor, RoundedCornerShape(DesignTokens.Spacing.sm))
                .padding(horizontal = DesignTokens.Spacing.sm, vertical = DesignTokens.Spacing.xs),
        ) {
            Text(
                text = message.displayMessage.ifEmpty { message.message },
                color = DesignTokens.Colors.Text.primary,
                fontSize = DesignTokens.FontSize.sm,
            )
        }
    }
}

@Composable
private fun ChatInput(onSend: (String) -> Unit) {
    var text by remember { mutableStateOf("") }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(DesignTokens.Spacing.sm),
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        GlassTextField(
            value = text,
            onValueChange = { text = it },
            placeholder = bayitString("chess.chat.inputPlaceholder"),
            modifier = Modifier.weight(1f),
        )
        GlassButton(
            text = "\u27A4",
            onClick = {
                if (text.isNotBlank()) {
                    onSend(text.trim())
                    text = ""
                }
            },
            enabled = text.isNotBlank(),
        )
    }
}
