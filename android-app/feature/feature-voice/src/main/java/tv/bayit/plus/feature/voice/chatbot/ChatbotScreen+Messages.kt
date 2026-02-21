package tv.bayit.plus.feature.voice.chatbot

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassTextField
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun ChatMessageList(messages: List<ChatMessage>, modifier: Modifier = Modifier) {
    val listState = rememberLazyListState()

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) listState.animateScrollToItem(messages.lastIndex)
    }

    LazyColumn(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = DesignTokens.Spacing.base),
        state = listState,
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        items(messages, key = { it.id }) { message ->
            ChatBubble(message = message)
        }
    }
}

@Composable
internal fun ChatBubble(message: ChatMessage) {
    val alignment = if (message.isAi) Alignment.CenterStart else Alignment.CenterEnd
    val bubbleColor = if (message.isAi) DesignTokens.Colors.Glass.bgMedium
    else DesignTokens.Colors.Primary.base
    val shape = RoundedCornerShape(
        topStart = DesignTokens.Radius.lg,
        topEnd = DesignTokens.Radius.lg,
        bottomStart = if (message.isAi) DesignTokens.Radius.sm else DesignTokens.Radius.lg,
        bottomEnd = if (message.isAi) DesignTokens.Radius.lg else DesignTokens.Radius.sm,
    )

    Box(modifier = Modifier.fillMaxWidth(), contentAlignment = alignment) {
        Column(
            modifier = Modifier
                .widthIn(max = 280.dp)
                .clip(shape)
                .background(bubbleColor)
                .padding(DesignTokens.Spacing.md),
        ) {
            if (message.isAi) {
                Text(
                    text = message.senderName,
                    color = DesignTokens.Colors.Primary.light,
                    fontSize = DesignTokens.FontSize.xs,
                    fontWeight = FontWeight.SemiBold,
                )
            }
            Text(
                text = message.content,
                color = DesignTokens.Colors.Text.primary,
                fontSize = DesignTokens.FontSize.base,
            )
            Text(
                text = message.timestamp,
                color = DesignTokens.Colors.Text.muted,
                fontSize = DesignTokens.FontSize.xs,
                modifier = Modifier.align(Alignment.End),
            )
        }
    }
}

@Composable
internal fun ChatInputBar(
    text: String,
    isSending: Boolean,
    isListening: Boolean,
    isSpeaking: Boolean,
    onTextChanged: (String) -> Unit,
    onSend: () -> Unit,
    onToggleVoice: () -> Unit,
    onStopTts: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(DesignTokens.Colors.Glass.bgStrong)
            .padding(DesignTokens.Spacing.sm),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape)
                .glassMorphism(
                    cornerRadius = DesignTokens.Radius.full,
                    backgroundColor = when {
                        isListening -> DesignTokens.Colors.Semantic.error
                        isSpeaking -> DesignTokens.Colors.Primary.light
                        else -> DesignTokens.Colors.Primary.base
                    },
                )
                .clickable {
                    if (isSpeaking) onStopTts() else onToggleVoice()
                },
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = when {
                    isSpeaking -> Icons.Default.VolumeUp
                    isListening -> Icons.Default.Stop
                    else -> Icons.Default.Mic
                },
                contentDescription = bayitString("aiChat.voiceButton"),
                tint = DesignTokens.Colors.Text.primary,
                modifier = Modifier.size(20.dp),
            )
        }
        GlassTextField(
            value = text,
            onValueChange = onTextChanged,
            modifier = Modifier.weight(1f),
            placeholder = bayitString(
                if (isListening) "aiChat.listening" else "aiChat.inputPlaceholder",
            ),
            singleLine = true,
            enabled = !isSending && !isListening,
        )
        GlassButton(
            text = bayitString("aiChat.sendButton"),
            onClick = onSend,
            enabled = text.isNotBlank() && !isSending && !isListening,
        )
    }
}

@Composable
internal fun ChatbotErrorContent(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = message,
                color = DesignTokens.Colors.Semantic.error,
                style = MaterialTheme.typography.bodyLarge,
            )
            GlassButton(
                text = bayitString("aiChat.retryButton"),
                onClick = onRetry,
                modifier = Modifier.padding(top = DesignTokens.Spacing.base),
            )
        }
    }
}
