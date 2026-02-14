package tv.bayit.plus.feature.widgets

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.text.font.FontWeight
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.*
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun WidgetGalleryRoute(onNavigateBack: () -> Unit, modifier: Modifier = Modifier, viewModel: WidgetGalleryViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    WidgetGalleryScreen(uiState, viewModel::configureWidget, onNavigateBack, viewModel::retry, modifier)
}

@Composable
internal fun WidgetGalleryScreen(uiState: WidgetGalleryUiState, onConfigureWidget: (String) -> Unit, onNavigateBack: () -> Unit, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    Column(modifier.fillMaxSize()) {
        GlassTopBar("Widget Gallery")
        when (uiState) {
            WidgetGalleryUiState.Loading -> GlassLoadingIndicator()
            is WidgetGalleryUiState.Error -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                Column(Alignment.CenterHorizontally, Arrangement.spacedBy(DesignTokens.Spacing.md)) {
                    Text(uiState.message, color = DesignTokens.Colors.Semantic.error)
                    GlassButton("Retry", onRetry)
                }
            }
            is WidgetGalleryUiState.Success -> LazyVerticalGrid(GridCells.Fixed(2), Modifier.fillMaxSize().padding(DesignTokens.Spacing.base), verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm), horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
                items(uiState.widgets, key = { it.hashCode() }) { widget ->
                    GlassCard(Modifier.aspectRatio(1f)) {
                        Column(Arrangement.spacedBy(DesignTokens.Spacing.sm), Alignment.CenterHorizontally) {
                            Text(widget.toString(), fontWeight = FontWeight.Medium, color = DesignTokens.Colors.Text.primary)
                            GlassButton("Configure", { onConfigureWidget(widget.hashCode().toString()) })
                        }
                    }
                }
            }
        }
    }
}
