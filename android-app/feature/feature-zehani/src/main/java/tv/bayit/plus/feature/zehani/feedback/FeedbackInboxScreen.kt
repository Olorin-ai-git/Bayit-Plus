package tv.bayit.plus.feature.zehani.feedback

import android.media.AudioAttributes
import android.media.MediaPlayer
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.model.zehani.FeedbackItem
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val WAVEFORM_DOT_SIZE = 4.dp

@Composable
fun FeedbackInboxRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: FeedbackInboxViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val playingId by viewModel.playingId.collectAsStateWithLifecycle()

    val mediaPlayer = remember { MediaPlayer() }
    DisposableEffect(Unit) { onDispose { mediaPlayer.release() } }

    FeedbackInboxScreen(
        uiState = uiState,
        playingId = playingId,
        onRefresh = viewModel::refresh,
        onToggleAudio = { item -> viewModel.toggleAudio(item); playAudio(mediaPlayer, item, viewModel::stopAudio) },
        onNavigateBack = onNavigateBack,
        modifier = modifier,
    )
}

@Composable
internal fun FeedbackInboxScreen(
    uiState: FeedbackInboxUiState,
    playingId: String?,
    onRefresh: () -> Unit,
    onToggleAudio: (FeedbackItem) -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = "Feedback Inbox",
            actions = {
                IconButton(onClick = onRefresh) {
                    Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = DesignTokens.Colors.Text.primary)
                }
            },
        )
        when (uiState) {
            is FeedbackInboxUiState.Loading -> GlassLoadingIndicator()
            is FeedbackInboxUiState.Error -> InboxErrorContent(message = uiState.message, onRetry = onRefresh)
            is FeedbackInboxUiState.Success -> {
                if (uiState.items.isEmpty()) EmptyInboxContent()
                else FeedbackList(items = uiState.items, playingId = playingId, onToggleAudio = onToggleAudio)
            }
        }
    }
}

@Composable
private fun FeedbackList(items: List<FeedbackItem>, playingId: String?, onToggleAudio: (FeedbackItem) -> Unit) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        item { Spacer(Modifier.size(DesignTokens.Spacing.sm)) }
        items(items, key = { it.id }) { item ->
            FeedbackCard(item = item, isPlaying = playingId == item.id, onToggleAudio = { onToggleAudio(item) })
        }
        item { Spacer(Modifier.size(DesignTokens.Spacing.xxl)) }
    }
}

@Composable
private fun FeedbackCard(item: FeedbackItem, isPlaying: Boolean, onToggleAudio: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(text = item.contactName, style = MaterialTheme.typography.bodyMedium, color = DesignTokens.Colors.Text.primary, fontWeight = FontWeight.SemiBold)
                Text(text = formatDate(item.createdAt), style = MaterialTheme.typography.bodySmall, color = DesignTokens.Colors.Text.muted)
            }
            if (item.audioUrl != null) {
                GlassButton(
                    text = if (isPlaying) "Pause" else "Play Voice Message",
                    onClick = onToggleAudio,
                    modifier = Modifier.fillMaxWidth(),
                    isPrimary = false,
                )
            }
            item.transcriptText?.takeIf { it.isNotBlank() }?.let { transcript ->
                Text(text = transcript, style = MaterialTheme.typography.bodyMedium, color = DesignTokens.Colors.Text.secondary)
            }
            item.detectedLanguage?.let { lang ->
                Text(text = lang.uppercase(), style = MaterialTheme.typography.labelSmall, color = DesignTokens.Colors.Text.muted)
            }
        }
    }
}

@Composable
private fun EmptyInboxContent() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(text = "No feedback yet", style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Text.muted)
            Text(text = "Feedback from your contacts will appear here", style = MaterialTheme.typography.bodyMedium, color = DesignTokens.Colors.Text.secondary)
        }
    }
}

@Composable
private fun InboxErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(text = message, color = DesignTokens.Colors.Semantic.error, style = MaterialTheme.typography.bodyLarge)
            GlassButton(text = "Retry", onClick = onRetry)
        }
    }
}

private fun playAudio(player: MediaPlayer, item: FeedbackItem, onComplete: () -> Unit) {
    val url = item.audioUrl ?: return
    try {
        player.reset()
        player.setAudioAttributes(
            AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .build()
        )
        player.setDataSource(url)
        player.setOnCompletionListener { onComplete() }
        player.prepareAsync()
        player.setOnPreparedListener { it.start() }
    } catch (_: Exception) {
        onComplete()
    }
}

private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yy HH:mm")
private fun formatDate(isoDate: String): String = try {
    DATE_FORMATTER.format(Instant.parse(isoDate).atZone(ZoneId.systemDefault()))
} catch (_: Exception) { isoDate }
