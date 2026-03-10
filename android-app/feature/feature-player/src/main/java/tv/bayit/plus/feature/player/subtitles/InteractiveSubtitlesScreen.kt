package tv.bayit.plus.feature.player.subtitles

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.*
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun InteractiveSubtitlesRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: InteractiveSubtitlesViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val selectedLanguage by viewModel.selectedLanguage.collectAsStateWithLifecycle()
    InteractiveSubtitlesScreen(uiState, selectedLanguage, viewModel::selectLanguage, onNavigateBack, viewModel::retry, modifier)
}

@Composable
internal fun InteractiveSubtitlesScreen(
    uiState: InteractiveSubtitlesUiState, selectedLanguage: String, onSelectLanguage: (String) -> Unit,
    onNavigateBack: () -> Unit, onRetry: () -> Unit, modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = bayitString("subtitles.interactive_title"))
        when (uiState) {
            is InteractiveSubtitlesUiState.Loading -> GlassLoadingIndicator()
            is InteractiveSubtitlesUiState.Error -> Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)
                ) {
                    Text(uiState.message, color = DesignTokens.Colors.Semantic.error)
                    GlassButton(bayitString("common.retry"), onClick = onRetry)
                }
            }
            is InteractiveSubtitlesUiState.Success -> LazyColumn(
                modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
                verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)
            ) {
                item {
                    GlassCard(Modifier.fillMaxWidth()) {
                        Text(bayitString("player.subtitles.language"), fontWeight = FontWeight.SemiBold, color = DesignTokens.Colors.Text.primary)
                        Row(
                            modifier = Modifier,
                            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)
                        ) {
                            uiState.availableLanguages.forEach { lang ->
                                GlassChip(lang, lang == selectedLanguage, onClick = { onSelectLanguage(lang) })
                            }
                        }
                    }
                }
                items(uiState.subtitles) { subtitle ->
                    GlassCard(Modifier.fillMaxWidth()) {
                        Text(subtitle.toString(), color = DesignTokens.Colors.Text.secondary)
                    }
                }
            }
        }
    }
}
