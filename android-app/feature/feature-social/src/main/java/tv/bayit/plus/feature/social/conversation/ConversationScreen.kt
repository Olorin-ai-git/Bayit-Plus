package tv.bayit.plus.feature.social.conversation

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
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.model.DirectMessage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTextField
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun ConversationRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ConversationViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val messageInput by viewModel.messageInput.collectAsStateWithLifecycle()

    ConversationScreen(
        uiState = uiState,
        messageInput = messageInput,
        onMessageInputChanged = viewModel::updateMessageInput,
        onSendMessage = viewModel::sendMessage,
        onNavigateBack = onNavigateBack,
        modifier = modifier,
    )
}

@Composable
internal fun ConversationScreen(
    uiState: ConversationUiState,
    messageInput: String,
    onMessageInputChanged: (String) -> Unit,
    onSendMessage: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = bayitString("social.conversation.title"))

        when (uiState) {
            is ConversationUiState.Loading -> GlassLoadingIndicator(modifier = Modifier.weight(1f))
            is ConversationUiState.Success -> MessageList(
                messages = uiState.messages,
                modifier = Modifier.weight(1f),
            )
            is ConversationUiState.Error -> ErrorContent(
                message = uiState.message,
                modifier = Modifier.weight(1f),
            )
        }

        MessageInputBar(
            text = messageInput,
            onTextChanged = onMessageInputChanged,
            onSend = onSendMessage,
        )
    }
}

@Composable
private fun MessageList(messages: List<DirectMessage>, modifier: Modifier = Modifier) {
    val listState = rememberLazyListState()

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.lastIndex)
        }
    }

    LazyColumn(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = DesignTokens.Spacing.base),
        state = listState,
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        items(messages, key = { it.id }) { message ->
            MessageBubble(message = message)
        }
    }
}

@Composable
private fun MessageBubble(message: DirectMessage) {
    val isSent = message.senderId == "self"
    val alignment = if (isSent) Alignment.CenterEnd else Alignment.CenterStart
    val bubbleColor = if (isSent) DesignTokens.Colors.Primary.base
    else DesignTokens.Colors.Glass.bgMedium
    val shape = RoundedCornerShape(
        topStart = DesignTokens.Radius.lg,
        topEnd = DesignTokens.Radius.lg,
        bottomStart = if (isSent) DesignTokens.Radius.lg else DesignTokens.Radius.sm,
        bottomEnd = if (isSent) DesignTokens.Radius.sm else DesignTokens.Radius.lg,
    )

    Box(modifier = Modifier.fillMaxWidth(), contentAlignment = alignment) {
        Column(
            modifier = Modifier
                .widthIn(max = 280.dp)
                .clip(shape)
                .background(bubbleColor)
                .padding(DesignTokens.Spacing.md),
        ) {
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
private fun MessageInputBar(
    text: String,
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
            placeholder = bayitString("messages.input.placeholder"),
            singleLine = true,
        )
        GlassButton(
            text = bayitString("messages.input.send"),
            onClick = onSend,
            enabled = text.isNotBlank(),
        )
    }
}

@Composable
private fun ErrorContent(message: String, modifier: Modifier = Modifier) {
    Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(
            text = message,
            color = DesignTokens.Colors.Semantic.error,
            style = MaterialTheme.typography.bodyLarge,
        )
    }
}
