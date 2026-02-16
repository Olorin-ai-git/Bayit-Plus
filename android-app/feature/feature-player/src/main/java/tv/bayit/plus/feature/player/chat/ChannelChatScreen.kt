package tv.bayit.plus.feature.player.chat

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassTextField
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Live channel chat sidebar for viewer interaction during live streams.
 */
@Composable
fun ChannelChatScreen(
    messages: List<ChatMessage>,
    onSendMessage: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var messageText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(DesignTokens.Spacing.sm),
    ) {
        Text(
            text = bayitString("player.chat.title"),
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.lg,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = DesignTokens.Spacing.sm),
        )

        LazyColumn(
            state = listState,
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
            reverseLayout = true,
        ) {
            items(messages, key = { it.id }) { message ->
                ChatMessageRow(message = message)
            }
        }

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            GlassTextField(
                value = messageText,
                onValueChange = { newValue ->
                    if (newValue.length <= MAX_CHAT_MESSAGE_LENGTH) {
                        messageText = newValue
                    }
                },
                placeholder = bayitString("player.chat.messagePlaceholder"),
                modifier = Modifier.weight(1f),
            )
            IconButton(
                onClick = {
                    if (messageText.isNotBlank()) {
                        onSendMessage(messageText)
                        messageText = ""
                    }
                },
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.Send,
                    contentDescription = bayitString("player.controls.send"),
                    tint = DesignTokens.Colors.Primary.light,
                    modifier = Modifier.height(24.dp),
                )
            }
        }
    }
}

@Composable
private fun ChatMessageRow(message: ChatMessage) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column {
            Text(
                text = message.senderName,
                color = DesignTokens.Colors.Primary.light,
                fontSize = DesignTokens.FontSize.xs,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = message.text,
                color = DesignTokens.Colors.Text.primary,
                fontSize = DesignTokens.FontSize.sm,
            )
        }
    }
}

data class ChatMessage(
    val id: String,
    val senderName: String,
    val text: String,
    val timestamp: Long,
)

private const val MAX_CHAT_MESSAGE_LENGTH = 500
