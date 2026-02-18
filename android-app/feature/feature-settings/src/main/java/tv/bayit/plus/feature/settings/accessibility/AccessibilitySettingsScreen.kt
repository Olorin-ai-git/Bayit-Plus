package tv.bayit.plus.feature.settings.accessibility

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
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.model.AccessibilitySettings
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun AccessibilitySettingsRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: AccessibilitySettingsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    AccessibilitySettingsScreen(
        uiState = uiState,
        onNavigateBack = onNavigateBack,
        onUpdate = viewModel::updateSettings,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun AccessibilitySettingsScreen(
    uiState: AccessibilityUiState,
    onNavigateBack: () -> Unit,
    onUpdate: (AccessibilitySettings) -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = "Accessibility",
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = DesignTokens.Colors.Text.primary)
                }
            },
            actions = {
                if (uiState is AccessibilityUiState.Success && uiState.isSaving) {
                    GlassSpinner(size = SpinnerSize.SMALL)
                }
            },
        )
        when (uiState) {
            is AccessibilityUiState.Loading -> GlassLoadingIndicator()
            is AccessibilityUiState.Error -> A11yErrorContent(message = uiState.message, onRetry = onRetry)
            is AccessibilityUiState.Success -> A11yContent(state = uiState, onUpdate = onUpdate)
        }
    }
}

@Composable
private fun A11yContent(state: AccessibilityUiState.Success, onUpdate: (AccessibilitySettings) -> Unit) {
    val s = state.settings
    val saving = state.isSaving
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        item { Spacer(Modifier.height(DesignTokens.Spacing.base)) }
        item { A11yToggle("Large Text", "Increase text size throughout the app", s.largeText, saving) { onUpdate(s.copy(largeText = it)) } }
        item { A11yToggle("Bold Text", "Use bolder fonts for better readability", s.boldText, saving) { onUpdate(s.copy(boldText = it)) } }
        item { A11yToggle("High Contrast", "Increase contrast for better visibility", s.highContrast, saving) { onUpdate(s.copy(highContrast = it)) } }
        item { A11yToggle("Reduce Motion", "Minimize animations and transitions", s.reduceMotion, saving) { onUpdate(s.copy(reduceMotion = it)) } }
        item { A11yToggle("Audio Descriptions", "Narrated descriptions of visual content", s.audioDescriptions, saving) { onUpdate(s.copy(audioDescriptions = it)) } }
        item { A11yToggle("Closed Captions", "Show captions for hearing accessibility", s.closedCaptions, saving) { onUpdate(s.copy(closedCaptions = it)) } }
        item { ColorBlindRow(selected = s.colorBlindMode, isSaving = saving) { onUpdate(s.copy(colorBlindMode = it)) } }
        item { Spacer(Modifier.height(DesignTokens.Spacing.xxl)) }
    }
}

@Composable
private fun A11yToggle(label: String, description: String, checked: Boolean, isSaving: Boolean, onToggle: (Boolean) -> Unit) {
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
private fun ColorBlindRow(selected: String, isSaving: Boolean, onSelect: (String) -> Unit) {
    val options = listOf("none", "protanopia", "deuteranopia", "tritanopia")
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column {
            Text(text = "Color Blind Mode", color = DesignTokens.Colors.Text.primary, style = MaterialTheme.typography.bodyLarge)
            Text(text = "Adjust colors for color vision deficiency", color = DesignTokens.Colors.Text.muted, style = MaterialTheme.typography.bodySmall)
            Spacer(Modifier.height(DesignTokens.Spacing.sm))
            Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs)) {
                options.forEach { option ->
                    GlassButton(
                        text = option.replaceFirstChar { it.uppercase() },
                        onClick = { if (!isSaving) onSelect(option) },
                        isPrimary = option == selected,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        }
    }
}

@Composable
private fun A11yErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(text = message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = "Retry", onClick = onRetry)
        }
    }
}
