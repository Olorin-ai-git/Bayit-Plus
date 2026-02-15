package tv.bayit.plus.feature.zehani.v2v

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.model.zehani.V2VSession
import tv.bayit.plus.core.model.zehani.V2VTransformResult
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

private val RECORD_BUTTON_SIZE = 80.dp

@Composable
fun V2VPracticeRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: V2VPracticeViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val isRecording by viewModel.isRecording.collectAsStateWithLifecycle()

    V2VPracticeScreen(
        uiState = uiState,
        isRecording = isRecording,
        onStartRecording = viewModel::startRecording,
        onStopRecording = viewModel::stopRecording,
        onLoadProgress = viewModel::loadProgress,
        onReset = viewModel::resetToReady,
        onNavigateBack = onNavigateBack,
        modifier = modifier,
    )
}

@Composable
internal fun V2VPracticeScreen(
    uiState: V2VPracticeUiState,
    isRecording: Boolean,
    onStartRecording: () -> Unit,
    onStopRecording: (ByteArray, String) -> Unit,
    onLoadProgress: () -> Unit,
    onReset: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = "Voice Practice")
        when (uiState) {
            is V2VPracticeUiState.Ready -> RecordingSection(
                isRecording = isRecording,
                onStartRecording = onStartRecording,
                onStopRecording = onStopRecording,
                onLoadProgress = onLoadProgress,
            )
            is V2VPracticeUiState.LoadingGuide -> GlassLoadingIndicator()
            is V2VPracticeUiState.Analyzing -> AnalyzingSection()
            is V2VPracticeUiState.FeedbackReady -> FeedbackSection(
                feedback = uiState.feedback,
                onReset = onReset,
            )
            is V2VPracticeUiState.ProgressLoaded -> ProgressSection(
                sessions = uiState.sessions,
                onReset = onReset,
            )
            is V2VPracticeUiState.Error -> ErrorSection(message = uiState.message, onRetry = onReset)
        }
    }
}

@Composable
private fun RecordingSection(
    isRecording: Boolean,
    onStartRecording: () -> Unit,
    onStopRecording: (ByteArray, String) -> Unit,
    onLoadProgress: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxSize().padding(DesignTokens.Spacing.base).verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xl),
    ) {
        Text(
            text = "Practice pronunciation by recording your voice",
            style = MaterialTheme.typography.bodyLarge,
            color = DesignTokens.Colors.Text.secondary,
            textAlign = TextAlign.Center,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.lg))
        Box(
            modifier = Modifier
                .size(RECORD_BUTTON_SIZE)
                .glassMorphism(
                    cornerRadius = DesignTokens.Radius.full,
                    backgroundColor = if (isRecording) DesignTokens.Colors.Semantic.error
                    else DesignTokens.Colors.Primary.base,
                ),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = if (isRecording) "REC" else "MIC",
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.Bold,
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            if (isRecording) {
                GlassButton(text = "Stop", onClick = { onStopRecording(ByteArray(0), "practice") })
            } else {
                GlassButton(text = "Record", onClick = onStartRecording)
            }
        }
        GlassButton(text = "View Progress", onClick = onLoadProgress, isPrimary = false)
    }
}

@Composable
private fun AnalyzingSection() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            GlassLoadingIndicator()
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
            Text(text = "Analyzing pronunciation...", color = DesignTokens.Colors.Text.secondary)
        }
    }
}

@Composable
private fun FeedbackSection(feedback: V2VTransformResult, onReset: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(DesignTokens.Spacing.base),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
                Text(
                    text = "Pronunciation Feedback",
                    style = MaterialTheme.typography.titleMedium,
                    color = DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    text = "Similarity: ${(feedback.similarityScore * 100).toInt()}%",
                    style = MaterialTheme.typography.bodyLarge,
                    color = DesignTokens.Colors.Primary.light,
                    fontWeight = FontWeight.Bold,
                )
                if (feedback.pronunciationFeedback != null) {
                    Text(text = feedback.pronunciationFeedback, color = DesignTokens.Colors.Text.secondary)
                }
            }
        }
        GlassButton(text = "Try Again", onClick = onReset)
    }
}

@Composable
private fun ProgressSection(sessions: List<V2VSession>, onReset: () -> Unit) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        item {
            Text(
                text = "Your Progress",
                style = MaterialTheme.typography.titleMedium,
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.SemiBold,
            )
        }
        items(sessions, key = { it.id }) { session ->
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column {
                        Text(text = "Transforms: ${session.totalTransforms}", color = DesignTokens.Colors.Text.primary)
                        Text(text = "Improvement: ${(session.scoreImprovement * 100).toInt()}%", color = DesignTokens.Colors.Text.secondary)
                    }
                    Text(text = session.status, color = DesignTokens.Colors.Text.muted, fontSize = DesignTokens.FontSize.sm)
                }
            }
        }
        item { GlassButton(text = "Continue Practicing", onClick = onReset) }
    }
}

@Composable
private fun ErrorSection(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            Text(text = message, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = "Retry", onClick = onRetry)
        }
    }
}
