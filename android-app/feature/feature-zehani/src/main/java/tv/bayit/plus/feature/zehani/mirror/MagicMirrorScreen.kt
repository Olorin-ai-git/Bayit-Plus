package tv.bayit.plus.feature.zehani.mirror

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.model.zehani.MagicMirrorGreeting
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun MagicMirrorRoute(
    onNavigateBack: () -> Unit,
    onCreateAvatar: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: MagicMirrorViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val avatarImageUrl by viewModel.avatarImageUrl.collectAsStateWithLifecycle()
    val noAvatar by viewModel.noAvatar.collectAsStateWithLifecycle()
    val context = LocalContext.current

    MagicMirrorScreen(
        uiState = uiState,
        avatarImageUrl = avatarImageUrl,
        noAvatar = noAvatar,
        onRefresh = viewModel::refreshGreeting,
        onRetry = viewModel::retry,
        onCreateAvatar = onCreateAvatar,
        onPlayLipsyncVideo = { url -> context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) },
        onNavigateBack = onNavigateBack,
        modifier = modifier,
    )
}

@Composable
internal fun MagicMirrorScreen(
    uiState: MagicMirrorUiState,
    avatarImageUrl: String?,
    noAvatar: Boolean,
    onRefresh: () -> Unit,
    onRetry: () -> Unit,
    onCreateAvatar: () -> Unit,
    onPlayLipsyncVideo: (String) -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = "Magic Mirror")
        when (uiState) {
            is MagicMirrorUiState.Loading -> GlassLoadingIndicator()
            is MagicMirrorUiState.GreetingReady -> GreetingContent(
                greeting = uiState.greeting,
                avatarImageUrl = avatarImageUrl,
                noAvatar = noAvatar,
                onRefresh = onRefresh,
                onCreateAvatar = onCreateAvatar,
                onPlayLipsyncVideo = onPlayLipsyncVideo,
            )
            is MagicMirrorUiState.Error -> ErrorSection(message = uiState.message, onRetry = onRetry)
        }
    }
}

@Composable
private fun GreetingContent(
    greeting: MagicMirrorGreeting,
    avatarImageUrl: String?,
    noAvatar: Boolean,
    onRefresh: () -> Unit,
    onCreateAvatar: () -> Unit,
    onPlayLipsyncVideo: (String) -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxSize().padding(DesignTokens.Spacing.base),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.lg),
    ) {
        if (noAvatar && avatarImageUrl == null) {
            NoAvatarSection(onCreateAvatar = onCreateAvatar)
        } else if (avatarImageUrl != null) {
            CachedAsyncImage(
                url = avatarImageUrl,
                contentDescription = "Avatar",
                modifier = Modifier.fillMaxWidth().aspectRatio(1f),
            )
        }

        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
                Text(
                    text = greeting.greetingTextHe,
                    style = MaterialTheme.typography.headlineMedium,
                    color = DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.End,
                    modifier = Modifier.fillMaxWidth(),
                )
                Text(text = greeting.greetingTextEn, style = MaterialTheme.typography.titleLarge, color = DesignTokens.Colors.Text.secondary)
            }
        }

        greeting.vocabularyOfTheDay?.let { vocab ->
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
                    Text(text = "Word of the Day", style = MaterialTheme.typography.titleMedium, color = DesignTokens.Colors.Text.primary, fontWeight = FontWeight.SemiBold)
                    Text(text = vocab, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Primary.light, fontWeight = FontWeight.Medium)
                }
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            if (greeting.lipsyncVideoUrl != null) {
                GlassButton(
                    text = "Play Lipsync",
                    onClick = { onPlayLipsyncVideo(greeting.lipsyncVideoUrl) },
                    isPrimary = false,
                    modifier = Modifier.weight(1f),
                )
            }
            GlassButton(text = "Refresh", onClick = onRefresh, modifier = Modifier.weight(1f))
        }
    }
}

@Composable
private fun NoAvatarSection(onCreateAvatar: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            Text(text = "No avatar yet", style = MaterialTheme.typography.titleMedium, color = DesignTokens.Colors.Text.primary, fontWeight = FontWeight.SemiBold)
            Text(text = "Create a 3D avatar to see yourself in the story", style = MaterialTheme.typography.bodyMedium, color = DesignTokens.Colors.Text.secondary, textAlign = TextAlign.Center)
            GlassButton(text = "Create Avatar", onClick = onCreateAvatar, modifier = Modifier.fillMaxWidth())
        }
    }
}

@Composable
private fun ErrorSection(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(text = message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = "Try Again", onClick = onRetry)
        }
    }
}
