package tv.bayit.plus.feature.settings.subtitles

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.model.SubtitleSettings
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun SubtitleSettingsRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: SubtitleSettingsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    SubtitleSettingsScreen(
        uiState = uiState,
        onNavigateBack = onNavigateBack,
        onUpdate = viewModel::updateSettings,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun SubtitleSettingsScreen(
    uiState: SubtitleUiState,
    onNavigateBack: () -> Unit,
    onUpdate: (SubtitleSettings) -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = "Subtitles",
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = DesignTokens.Colors.Text.primary)
                }
            },
            actions = {
                if (uiState is SubtitleUiState.Success && uiState.isSaving) {
                    GlassSpinner(size = SpinnerSize.SMALL)
                }
            },
        )
        when (uiState) {
            is SubtitleUiState.Loading -> GlassLoadingIndicator()
            is SubtitleUiState.Error -> SubtitleErrorContent(message = uiState.message, onRetry = onRetry)
            is SubtitleUiState.Success -> SubtitleContent(state = uiState, onUpdate = onUpdate)
        }
    }
}

@Composable
private fun SubtitleContent(state: SubtitleUiState.Success, onUpdate: (SubtitleSettings) -> Unit) {
    val s = state.settings
    val saving = state.isSaving
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        item { Spacer(Modifier.height(DesignTokens.Spacing.base)) }
        item { ToggleRow("Show Subtitles", "Display subtitles during playback", s.enabled, saving) { onUpdate(s.copy(enabled = it)) } }
        item { SelectionRow("Position", listOf("bottom", "top"), s.position, saving && s.enabled) { onUpdate(s.copy(position = it)) } }
        item { SliderRow("Font Size", s.fontSize.toFloat(), 12f, 32f, "${s.fontSize}px", saving) { onUpdate(s.copy(fontSize = it.toInt())) } }
        item { SliderRow("Background Opacity", s.backgroundOpacity * 100f, 0f, 100f, "${(s.backgroundOpacity * 100).toInt()}%", saving) { onUpdate(s.copy(backgroundOpacity = it / 100f)) } }
        item { SelectionRow("Font Style", listOf("normal", "bold", "italic"), s.fontStyle, saving) { onUpdate(s.copy(fontStyle = it)) } }
        item { ToggleRow("AI Translation", "Auto-translate subtitles using AI", s.aiTranslationEnabled, saving) { onUpdate(s.copy(aiTranslationEnabled = it)) } }
        item { Spacer(Modifier.height(DesignTokens.Spacing.xxl)) }
    }
}

@Composable
private fun SubtitleErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(text = message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = "Retry", onClick = onRetry)
        }
    }
}

@Composable
private fun ToggleRow(label: String, description: String, checked: Boolean, isSaving: Boolean, onToggle: (Boolean) -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.weight(1f)) {
                Text(text = label, color = DesignTokens.Colors.Text.primary, style = MaterialTheme.typography.bodyLarge)
                Text(text = description, color = DesignTokens.Colors.Text.muted, style = MaterialTheme.typography.bodySmall)
            }
            Switch(
                checked = checked, onCheckedChange = onToggle, enabled = !isSaving,
                colors = SwitchDefaults.colors(checkedThumbColor = DesignTokens.Colors.Text.primary, checkedTrackColor = DesignTokens.Colors.Primary.base, uncheckedThumbColor = DesignTokens.Colors.Text.muted, uncheckedTrackColor = DesignTokens.Colors.Glass.bgStrong),
            )
        }
    }
}

@Composable
private fun SliderRow(label: String, value: Float, min: Float, max: Float, display: String, isSaving: Boolean, onValueChange: (Float) -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                Text(text = label, color = DesignTokens.Colors.Text.primary, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
                Text(text = display, color = DesignTokens.Colors.Primary.light, style = MaterialTheme.typography.bodyMedium)
            }
            Slider(
                value = value, onValueChange = onValueChange, valueRange = min..max, enabled = !isSaving,
                colors = SliderDefaults.colors(thumbColor = DesignTokens.Colors.Primary.light, activeTrackColor = DesignTokens.Colors.Primary.base, inactiveTrackColor = DesignTokens.Colors.Glass.bgStrong),
            )
        }
    }
}

@Composable
private fun SelectionRow(label: String, options: List<String>, selected: String, isSaving: Boolean, onSelect: (String) -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column {
            Text(text = label, color = DesignTokens.Colors.Text.primary, style = MaterialTheme.typography.bodyLarge)
            Spacer(Modifier.height(DesignTokens.Spacing.sm))
            Row(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
                options.forEach { option ->
                    val isSelected = option == selected
                    GlassButton(text = option.replaceFirstChar { it.uppercase() }, onClick = { if (!isSaving) onSelect(option) }, isPrimary = isSelected)
                }
            }
        }
    }
}
