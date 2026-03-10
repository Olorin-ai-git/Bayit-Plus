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
import tv.bayit.plus.core.data.repository.PracticePhrase
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.designsystem.i18n.bayitString

private val RECORD_BUTTON_SIZE = 80.dp

@Composable
fun V2VPracticeRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: V2VPracticeViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val isRecording by viewModel.isRecording.collectAsStateWithLifecycle()
    val currentPhrase by viewModel.currentPhrase.collectAsStateWithLifecycle()

    V2VPracticeScreen(
        uiState = uiState,
        isRecording = isRecording,
        currentPhrase = currentPhrase,
        onStartRecording = viewModel::startRecording,
        onStopRecording = viewModel::stopRecording,
        onLoadProgress = viewModel::loadProgress,
        onNextPhrase = viewModel::nextPhrase,
        onReset = viewModel::resetToReady,
        onNavigateBack = onNavigateBack,
        modifier = modifier,
    )
}

@Composable
internal fun V2VPracticeScreen(
    uiState: V2VPracticeUiState,
    isRecording: Boolean,
    currentPhrase: PracticePhrase?,
    onStartRecording: () -> Unit,
    onStopRecording: (ByteArray, String) -> Unit,
    onLoadProgress: () -> Unit,
    onNextPhrase: () -> Unit,
    onReset: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = bayitString("zehAni.v2v.title"))
        when (uiState) {
            is V2VPracticeUiState.Ready -> RecordingSection(
                isRecording = isRecording,
                currentPhrase = currentPhrase,
                onStartRecording = onStartRecording,
                onStopRecording = onStopRecording,
                onNextPhrase = onNextPhrase,
                onLoadProgress = onLoadProgress,
            )
            is V2VPracticeUiState.LoadingGuide -> GlassLoadingIndicator()
            is V2VPracticeUiState.Analyzing -> AnalyzingSection()
            is V2VPracticeUiState.FeedbackReady -> FeedbackSection(
                feedback = uiState.feedback,
                onReset = onReset,
                onNextPhrase = onNextPhrase,
            )
            is V2VPracticeUiState.ProgressLoaded -> ProgressSection(sessions = uiState.sessions, onReset = onReset)
            is V2VPracticeUiState.Error -> ErrorSection(message = uiState.message, onRetry = onReset)
        }
    }
}

@Composable
private fun RecordingSection(
    isRecording: Boolean,
    currentPhrase: PracticePhrase?,
    onStartRecording: () -> Unit,
    onStopRecording: (ByteArray, String) -> Unit,
    onNextPhrase: () -> Unit,
    onLoadProgress: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxSize().padding(DesignTokens.Spacing.base).verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.lg),
    ) {
        currentPhrase?.let { phrase ->
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
                    Text(
                        text = phrase.phraseHe,
                        style = MaterialTheme.typography.headlineMedium,
                        color = DesignTokens.Colors.Text.primary,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.End,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Text(text = phrase.transliteration, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Primary.light)
                    Text(text = phrase.translation, style = MaterialTheme.typography.bodyMedium, color = DesignTokens.Colors.Text.secondary)
                    GlassButton(text = bayitString("zehAni.v2v.nextPhrase"), onClick = onNextPhrase, isPrimary = false, modifier = Modifier.fillMaxWidth())
                }
            }
        }
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
        Box(
            modifier = Modifier
                .size(RECORD_BUTTON_SIZE)
                .glassMorphism(
                    cornerRadius = DesignTokens.Radius.full,
                    backgroundColor = if (isRecording) DesignTokens.Colors.Semantic.error else DesignTokens.Colors.Primary.base,
                ),
            contentAlignment = Alignment.Center,
        ) {
            Text(text = if (isRecording) bayitString("zehAni.selfie.rec") else bayitString("zehAni.v2v.mic"), color = DesignTokens.Colors.Text.primary, fontWeight = FontWeight.Bold)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            if (isRecording) {
                GlassButton(text = bayitString("zehAni.v2v.stop"), onClick = { onStopRecording(ByteArray(0), currentPhrase?.phraseHe ?: "") })
            } else {
                GlassButton(text = bayitString("zehAni.v2v.record"), onClick = onStartRecording)
            }
        }
        GlassButton(text = bayitString("zehAni.v2v.viewProgress"), onClick = onLoadProgress, isPrimary = false)
    }
}

@Composable
private fun AnalyzingSection() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            GlassLoadingIndicator()
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
            Text(text = bayitString("zehAni.v2v.analyzingPronunciation"), color = DesignTokens.Colors.Text.secondary)
        }
    }
}

@Composable
private fun ErrorSection(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(text = message, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = bayitString("common.retry"), onClick = onRetry)
        }
    }
}
