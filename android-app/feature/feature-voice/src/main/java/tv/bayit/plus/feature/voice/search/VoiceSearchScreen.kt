package tv.bayit.plus.feature.voice.search

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

private val MIC_BUTTON_SIZE = 96.dp
private val PULSE_DURATION_MS = 800

@Composable fun VoiceSearchRoute(
    onNavigateBack: () -> Unit,
    onNavigateToContent: (String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: VoiceSearchViewModel = hiltViewModel(),
) {
    val transcript by viewModel.transcript.collectAsStateWithLifecycle()
    val searchResults by viewModel.searchResults.collectAsStateWithLifecycle()
    val isListening by viewModel.isListening.collectAsStateWithLifecycle()
    val isSearching by viewModel.isSearching.collectAsStateWithLifecycle()
    val error by viewModel.error.collectAsStateWithLifecycle()
    VoiceSearchScreen(
        transcript = transcript, searchResults = searchResults,
        isListening = isListening, isSearching = isSearching, error = error,
        onMicTap = { if (isListening) viewModel.stopListening() else viewModel.startListening() },
        onResultTap = onNavigateToContent, onDismissError = viewModel::dismissError,
        onNavigateBack = onNavigateBack, modifier = modifier,
    )
}

@Composable internal fun VoiceSearchScreen(
    transcript: String, searchResults: List<VoiceSearchResult>,
    isListening: Boolean, isSearching: Boolean, error: String?,
    onMicTap: () -> Unit, onResultTap: (String) -> Unit,
    onDismissError: () -> Unit, onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = bayitString("voiceSearch.title"),
            navigationIcon = {
                GlassButton(text = bayitString("common.back"), onClick = onNavigateBack, isPrimary = false)
            },
        )
        Column(
            modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(DesignTokens.Spacing.xxl))
            MicButton(isListening = isListening, onClick = onMicTap)
            Spacer(Modifier.height(DesignTokens.Spacing.base))
            TranscriptLabel(transcript = transcript, isListening = isListening)
            Spacer(Modifier.height(DesignTokens.Spacing.xl))
            error?.let {
                ErrorBanner(message = it, onDismiss = onDismissError)
                Spacer(Modifier.height(DesignTokens.Spacing.base))
            }
            when {
                isSearching -> GlassLoadingIndicator(modifier = Modifier.weight(1f))
                searchResults.isEmpty() && transcript.isNotBlank() && !isListening ->
                    EmptyResults(modifier = Modifier.weight(1f))
                searchResults.isNotEmpty() ->
                    ResultsList(results = searchResults, onResultTap = onResultTap, modifier = Modifier.weight(1f))
                else -> Spacer(Modifier.weight(1f))
            }
        }
    }
}

@Composable private fun TranscriptLabel(transcript: String, isListening: Boolean) {
    Text(
        text = when {
            isListening -> bayitString("voiceSearch.listening")
            transcript.isBlank() -> bayitString("voiceSearch.tapToSpeak")
            else -> transcript
        },
        color = if (isListening) DesignTokens.Colors.Primary.light else DesignTokens.Colors.Text.secondary,
        fontSize = DesignTokens.FontSize.md, textAlign = TextAlign.Center,
        modifier = Modifier.fillMaxWidth(),
    )
}

@Composable private fun MicButton(isListening: Boolean, onClick: () -> Unit) {
    val scale = if (isListening) {
        val transition = rememberInfiniteTransition(label = "micPulse")
        val animated by transition.animateFloat(
            initialValue = 1f, targetValue = 1.15f,
            animationSpec = infiniteRepeatable(
                animation = tween(durationMillis = PULSE_DURATION_MS), repeatMode = RepeatMode.Reverse,
            ), label = "pulseScale",
        )
        animated
    } else { 1f }
    Box(
        modifier = Modifier.size(MIC_BUTTON_SIZE).scale(scale)
            .glassMorphism(
                cornerRadius = DesignTokens.Radius.full,
                backgroundColor = if (isListening) DesignTokens.Colors.Semantic.error else DesignTokens.Colors.Primary.base,
            )
            .clickable(onClick = onClick).semantics { role = Role.Button },
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = bayitString(if (isListening) "voiceSearch.stopLabel" else "voiceSearch.micLabel"),
            color = DesignTokens.Colors.Text.primary, fontWeight = FontWeight.Bold, fontSize = DesignTokens.FontSize.lg,
        )
    }
}

@Composable private fun ResultsList(
    results: List<VoiceSearchResult>, onResultTap: (String) -> Unit, modifier: Modifier = Modifier,
) {
    LazyColumn(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        items(results, key = { it.id }) { item ->
            GlassCard(modifier = Modifier.fillMaxWidth().clickable { onResultTap(item.id) }) {
                Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs)) {
                    Text(
                        text = item.title, color = DesignTokens.Colors.Text.primary,
                        fontSize = DesignTokens.FontSize.md, fontWeight = FontWeight.SemiBold,
                        maxLines = 1, overflow = TextOverflow.Ellipsis,
                    )
                    if (item.description.isNotBlank()) {
                        Text(
                            text = item.description, color = DesignTokens.Colors.Text.secondary,
                            fontSize = DesignTokens.FontSize.sm, maxLines = 2, overflow = TextOverflow.Ellipsis,
                        )
                    }
                    if (item.type.isNotBlank()) {
                        Text(text = item.type, color = DesignTokens.Colors.Text.muted, fontSize = DesignTokens.FontSize.xs)
                    }
                }
            }
        }
    }
}

@Composable private fun EmptyResults(modifier: Modifier = Modifier) {
    Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(
            text = bayitString("voiceSearch.noResults"), color = DesignTokens.Colors.Text.muted,
            style = MaterialTheme.typography.bodyLarge, textAlign = TextAlign.Center,
        )
    }
}

@Composable private fun ErrorBanner(message: String, onDismiss: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            Text(
                text = message, color = DesignTokens.Colors.Semantic.error,
                style = MaterialTheme.typography.bodyMedium, textAlign = TextAlign.Center,
            )
            GlassButton(text = bayitString("common.dismiss"), onClick = onDismiss, isPrimary = false)
        }
    }
}
