package tv.bayit.plus.feature.settings.audio

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
import tv.bayit.plus.core.model.AudioSettings
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.designsystem.i18n.bayitString

@Composable
fun AudioSettingsRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: AudioSettingsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    AudioSettingsScreen(
        uiState = uiState,
        onNavigateBack = onNavigateBack,
        onUpdate = viewModel::updateSettings,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun AudioSettingsScreen(
    uiState: AudioUiState,
    onNavigateBack: () -> Unit,
    onUpdate: (AudioSettings) -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = bayitString("settings.audio.title"),
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = bayitString("common.back"), tint = DesignTokens.Colors.Text.primary)
                }
            },
            actions = {
                if (uiState is AudioUiState.Success && uiState.isSaving) {
                    GlassSpinner(size = SpinnerSize.SMALL)
                }
            },
        )
        when (uiState) {
            is AudioUiState.Loading -> GlassLoadingIndicator()
            is AudioUiState.Error -> AudioErrorContent(message = uiState.message, onRetry = onRetry)
            is AudioUiState.Success -> AudioContent(state = uiState, onUpdate = onUpdate)
        }
    }
}

@Composable
private fun AudioContent(state: AudioUiState.Success, onUpdate: (AudioSettings) -> Unit) {
    val s = state.settings
    val saving = state.isSaving
    val qualityOptions = listOf("auto", "high", "medium", "low")
    val languageOptions = listOf("he", "en", "es", "fr", "ru")

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        item { Spacer(Modifier.height(DesignTokens.Spacing.base)) }
        item { AudioSelectRow(bayitString("settings.audio.preferredLanguage"), languageOptions, s.preferredLanguage, saving) { onUpdate(s.copy(preferredLanguage = it)) } }
        item { AudioSelectRow(bayitString("settings.audio.audioQuality"), qualityOptions, s.quality, saving) { onUpdate(s.copy(quality = it)) } }
        item { AudioToggleRow(bayitString("settings.audio.volumeNormalization"), bayitString("settings.audio.volumeNormalizationDescription"), s.volumeNormalization, saving) { onUpdate(s.copy(volumeNormalization = it)) } }
        item { AudioToggleRow(bayitString("settings.audio.preferDubbed"), bayitString("settings.audio.preferDubbedDescription"), s.preferDubbed, saving) { onUpdate(s.copy(preferDubbed = it)) } }
        if (s.preferDubbed) {
            item { AudioSelectRow(bayitString("settings.audio.dubbingLanguage"), languageOptions, s.dubbingLanguage, saving) { onUpdate(s.copy(dubbingLanguage = it)) } }
        }
        item { Spacer(Modifier.height(DesignTokens.Spacing.xxl)) }
    }
}

@Composable
private fun AudioToggleRow(label: String, description: String, checked: Boolean, isSaving: Boolean, onToggle: (Boolean) -> Unit) {
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
private fun AudioSelectRow(label: String, options: List<String>, selected: String, isSaving: Boolean, onSelect: (String) -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column {
            Text(text = label, color = DesignTokens.Colors.Text.primary, style = MaterialTheme.typography.bodyLarge)
            Spacer(Modifier.height(DesignTokens.Spacing.sm))
            Row(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
                options.forEach { option ->
                    GlassButton(text = option.replaceFirstChar { it.uppercase() }, onClick = { if (!isSaving) onSelect(option) }, isPrimary = option == selected)
                }
            }
        }
    }
}

@Composable
private fun AudioErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(text = message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = bayitString("common.retry"), onClick = onRetry)
        }
    }
}
