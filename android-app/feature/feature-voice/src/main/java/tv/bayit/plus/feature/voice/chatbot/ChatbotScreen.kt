package tv.bayit.plus.feature.voice.chatbot

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTextField
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun ChatbotRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ChatbotViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val messageInput by viewModel.messageInput.collectAsStateWithLifecycle()
    val isSending by viewModel.isSending.collectAsStateWithLifecycle()

    ChatbotScreen(
        uiState = uiState,
        messageInput = messageInput,
        isSending = isSending,
        onMessageInputChanged = viewModel::updateMessageInput,
        onSendMessage = viewModel::sendMessage,
        onRetry = viewModel::retry,
        onNavigateBack = onNavigateBack,
        modifier = modifier,
    )
}

@Composable
internal fun ChatbotScreen(
    uiState: ChatbotUiState,
    messageInput: String,
    isSending: Boolean,
    onMessageInputChanged: (String) -> Unit,
    onSendMessage: () -> Unit,
    onRetry: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = "AI Chat")

        when (uiState) {
            is ChatbotUiState.Loading -> GlassLoadingIndicator(modifier = Modifier.weight(1f))
            is ChatbotUiState.Error -> ChatbotErrorContent(
                message = uiState.message,
                onRetry = onRetry,
                modifier = Modifier.weight(1f),
            )
            is ChatbotUiState.Ready -> ChatMessageList(
                messages = uiState.messages,
                modifier = Modifier.weight(1f),
            )
        }

        ChatInputBar(
            text = messageInput,
            isSending = isSending,
            onTextChanged = onMessageInputChanged,
            onSend = onSendMessage,
        )
    }
}

@Composable
private fun ChatMessageList(messages: List<ChatMessage>, modifier: Modifier = Modifier) {
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
private fun ChatBubble(message: ChatMessage) {
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
private fun ChatInputBar(
    text: String,
    isSending: Boolean,
    onTextChanged: (String) -> Unit,
    onSend: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(DesignTokens.Colors.Glass.bgStrong)
            .padding(DesignTokens.Spacing.sm),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        GlassTextField(
            value = text,
            onValueChange = onTextChanged,
            modifier = Modifier.weight(1f),
            placeholder = "Ask the AI anything...",
            singleLine = true,
            enabled = !isSending,
        )
        GlassButton(
            text = "Send",
            onClick = onSend,
            enabled = text.isNotBlank() && !isSending,
        )
    }
}

@Composable
private fun ChatbotErrorContent(
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
                text = "Retry",
                onClick = onRetry,
                modifier = Modifier.padding(top = DesignTokens.Spacing.base),
            )
        }
    }
}
