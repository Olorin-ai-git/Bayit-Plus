package tv.bayit.plus.feature.social.messages

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.model.ConversationSummary
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassBadge
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun DirectMessagesRoute(
    onNavigateToConversation: (String) -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: DirectMessagesViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    DirectMessagesScreen(
        uiState = uiState,
        onConversationClick = onNavigateToConversation,
        onRefresh = viewModel::refresh,
        modifier = modifier,
    )
}

@Composable
internal fun DirectMessagesScreen(
    uiState: DirectMessagesUiState,
    onConversationClick: (String) -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = bayitString("messages.title"))
        when (uiState) {
            is DirectMessagesUiState.Loading -> GlassLoadingIndicator()
            is DirectMessagesUiState.Success -> ConversationList(
                conversations = uiState.conversations,
                onConversationClick = onConversationClick,
            )
            is DirectMessagesUiState.Error -> ErrorContent(
                message = uiState.message,
                onRetry = onRefresh,
            )
        }
    }
}

@Composable
private fun ConversationList(
    conversations: List<ConversationSummary>,
    onConversationClick: (String) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        items(conversations, key = { it.friendId }) { conversation ->
            ConversationCard(
                conversation = conversation,
                onClick = { onConversationClick(conversation.friendId) },
            )
        }
    }
}

@Composable
private fun ConversationCard(conversation: ConversationSummary, onClick: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            CachedAsyncImage(
                url = conversation.friendAvatarUrl,
                contentDescription = conversation.friendName,
                modifier = Modifier.size(48.dp).clip(CircleShape),
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = conversation.friendName,
                    color = DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = DesignTokens.FontSize.md,
                )
                Text(
                    text = conversation.lastMessage.orEmpty(),
                    color = DesignTokens.Colors.Text.muted,
                    fontSize = DesignTokens.FontSize.sm,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = conversation.lastMessageTime.orEmpty(),
                    color = DesignTokens.Colors.Text.muted,
                    fontSize = DesignTokens.FontSize.xs,
                )
                GlassBadge(count = conversation.unreadCount)
            }
        }
    }
}

@Composable
private fun ErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            Text(
                text = message,
                color = DesignTokens.Colors.Semantic.error,
                style = MaterialTheme.typography.bodyLarge,
            )
            GlassButton(text = bayitString("common.retry"), onClick = onRetry)
        }
    }
}
