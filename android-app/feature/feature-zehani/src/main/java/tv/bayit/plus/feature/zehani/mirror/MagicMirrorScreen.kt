package tv.bayit.plus.feature.zehani.mirror

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.model.zehani.MagicMirrorGreeting
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun MagicMirrorRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: MagicMirrorViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    MagicMirrorScreen(
        uiState = uiState,
        onRefresh = viewModel::refreshGreeting,
        onRetry = viewModel::retry,
        onNavigateBack = onNavigateBack,
        modifier = modifier,
    )
}

@Composable
internal fun MagicMirrorScreen(
    uiState: MagicMirrorUiState,
    onRefresh: () -> Unit,
    onRetry: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = "Magic Mirror")
        when (uiState) {
            is MagicMirrorUiState.Loading -> GlassLoadingIndicator()
            is MagicMirrorUiState.GreetingReady -> GreetingContent(
                greeting = uiState.greeting,
                onRefresh = onRefresh,
            )
            is MagicMirrorUiState.Error -> ErrorSection(
                message = uiState.message,
                onRetry = onRetry,
            )
        }
    }
}

@Composable
private fun GreetingContent(
    greeting: MagicMirrorGreeting,
    onRefresh: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(DesignTokens.Spacing.base),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.lg),
    ) {
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
                Text(
                    text = greeting.greetingTextEn,
                    style = MaterialTheme.typography.titleLarge,
                    color = DesignTokens.Colors.Text.secondary,
                )
            }
        }

        if (greeting.vocabularyOfTheDay != null) {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
                    Text(
                        text = "Word of the Day",
                        style = MaterialTheme.typography.titleMedium,
                        color = DesignTokens.Colors.Text.primary,
                        fontWeight = FontWeight.SemiBold,
                    )
                    val vocabulary = greeting.vocabularyOfTheDay ?: return@GlassCard
                    Text(
                        text = vocabulary,
                        style = MaterialTheme.typography.bodyLarge,
                        color = DesignTokens.Colors.Primary.light,
                        fontWeight = FontWeight.Medium,
                    )
                }
            }
        }

        if (greeting.greetingAudioGcsPath != null) {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = "Audio greeting available",
                    style = MaterialTheme.typography.bodyMedium,
                    color = DesignTokens.Colors.Text.secondary,
                )
            }
        }

        Spacer(modifier = Modifier.weight(1f))
        GlassButton(
            text = "Refresh Greeting",
            onClick = onRefresh,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun ErrorSection(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            Text(
                text = message,
                style = MaterialTheme.typography.bodyLarge,
                color = DesignTokens.Colors.Semantic.error,
            )
            GlassButton(text = "Try Again", onClick = onRetry)
        }
    }
}
