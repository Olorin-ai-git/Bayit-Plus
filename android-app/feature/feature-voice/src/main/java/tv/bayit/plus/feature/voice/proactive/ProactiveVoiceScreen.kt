package tv.bayit.plus.feature.voice.proactive

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.i18n.bayitString

@Composable
fun ProactiveVoiceRoute(
    onNavigateBack: () -> Unit,
    onNavigateToContent: (String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ProactiveVoiceViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    DisposableEffect(Unit) {
        viewModel.startPolling()
        onDispose { viewModel.stopPolling() }
    }

    ProactiveVoiceScreen(
        uiState = uiState,
        onSuggestionTap = onNavigateToContent,
        onDismissSuggestion = viewModel::dismissSuggestion,
        onRetry = viewModel::retry,
        onNavigateBack = onNavigateBack,
        modifier = modifier,
    )
}

@Composable
internal fun ProactiveVoiceScreen(
    uiState: ProactiveVoiceUiState,
    onSuggestionTap: (String) -> Unit,
    onDismissSuggestion: (String) -> Unit,
    onRetry: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = bayitString("proactiveVoice.title"),
            navigationIcon = {
                GlassButton(
                    text = bayitString("common.back"),
                    onClick = onNavigateBack,
                    isPrimary = false,
                )
            },
        )
        when (uiState) {
            is ProactiveVoiceUiState.Loading ->
                GlassLoadingIndicator(modifier = Modifier.weight(1f))
            is ProactiveVoiceUiState.Error ->
                ProactiveVoiceErrorContent(
                    message = uiState.message,
                    onRetry = onRetry,
                    modifier = Modifier.weight(1f),
                )
            is ProactiveVoiceUiState.Ready ->
                SuggestionList(
                    suggestions = uiState.suggestions,
                    onSuggestionTap = onSuggestionTap,
                    onDismiss = onDismissSuggestion,
                    modifier = Modifier.weight(1f),
                )
        }
    }
}
