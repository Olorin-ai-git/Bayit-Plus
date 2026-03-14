package tv.bayit.plus.feature.settings.playback

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
import tv.bayit.plus.core.model.PlaybackSettings
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.designsystem.i18n.bayitString

@Composable
fun PlaybackSettingsRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: PlaybackSettingsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    PlaybackSettingsScreen(
        uiState = uiState,
        onNavigateBack = onNavigateBack,
        onUpdate = viewModel::updateSettings,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun PlaybackSettingsScreen(
    uiState: PlaybackUiState,
    onNavigateBack: () -> Unit,
    onUpdate: (PlaybackSettings) -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = bayitString("settings.playback"),
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = bayitString("common.back"), tint = DesignTokens.Colors.Text.primary)
                }
            },
            actions = {
                if (uiState is PlaybackUiState.Success && uiState.isSaving) {
                    GlassSpinner(size = SpinnerSize.SMALL)
                }
            },
        )
        when (uiState) {
            is PlaybackUiState.Loading -> GlassLoadingIndicator()
            is PlaybackUiState.Error -> PlaybackErrorContent(message = uiState.message, onRetry = onRetry)
            is PlaybackUiState.Success -> PlaybackContent(state = uiState, onUpdate = onUpdate)
        }
    }
}

@Composable
private fun PlaybackContent(state: PlaybackUiState.Success, onUpdate: (PlaybackSettings) -> Unit) {
    val s = state.settings
    val saving = state.isSaving
    val qualityOptions = listOf("auto", "high", "medium", "low")
    val speedOptions = listOf("0.5", "0.75", "1", "1.25", "1.5", "2")

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        item { Spacer(Modifier.height(DesignTokens.Spacing.base)) }
        item { PlaybackSelect(bayitString("settings.playback.videoQuality"), qualityOptions, s.videoQuality, saving) { onUpdate(s.copy(videoQuality = it)) } }
        item { PlaybackToggle(bayitString("settings.playback.autoplay"), bayitString("settings.playback.autoplayDescription"), s.autoplay, saving) { onUpdate(s.copy(autoplay = it)) } }
        item { PlaybackToggle(bayitString("settings.playback.autoplayNextEpisode"), bayitString("settings.playback.autoplayNextEpisodeDescription"), s.autoplayNextEpisode, saving) { onUpdate(s.copy(autoplayNextEpisode = it)) } }
        item { PlaybackToggle(bayitString("settings.playback.continueWatching"), bayitString("settings.playback.continueWatchingDescription"), s.continueWatching, saving) { onUpdate(s.copy(continueWatching = it)) } }
        item { PlaybackToggle(bayitString("settings.playback.skipIntro"), bayitString("settings.playback.skipIntroDescription"), s.skipIntro, saving) { onUpdate(s.copy(skipIntro = it)) } }
        item { PlaybackToggle(bayitString("settings.playback.skipCredits"), bayitString("settings.playback.skipCreditsDescription"), s.skipCredits, saving) { onUpdate(s.copy(skipCredits = it)) } }
        item { SpeedSelect(speedOptions, s.playbackSpeed, saving) { onUpdate(s.copy(playbackSpeed = it)) } }
        item { PlaybackToggle(bayitString("settings.playback.hardwareAcceleration"), bayitString("settings.playback.hardwareAccelerationDescription"), s.hardwareAcceleration, saving) { onUpdate(s.copy(hardwareAcceleration = it)) } }
        item { PlaybackToggle(bayitString("settings.playback.interactiveMoments"), bayitString("settings.playback.interactiveMomentsDescription"), s.interactiveMomentsEnabled, saving) { onUpdate(s.copy(interactiveMomentsEnabled = it)) } }
        item { Spacer(Modifier.height(DesignTokens.Spacing.xxl)) }
    }
}

@Composable
private fun PlaybackToggle(label: String, description: String, checked: Boolean, isSaving: Boolean, onToggle: (Boolean) -> Unit) {
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
private fun PlaybackSelect(label: String, options: List<String>, selected: String, isSaving: Boolean, onSelect: (String) -> Unit) {
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
private fun SpeedSelect(options: List<String>, current: Float, isSaving: Boolean, onSelect: (Float) -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column {
            Text(text = bayitString("settings.playback.speed"), color = DesignTokens.Colors.Text.primary, style = MaterialTheme.typography.bodyLarge)
            Spacer(Modifier.height(DesignTokens.Spacing.sm))
            Row(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs)) {
                options.forEach { option ->
                    val speed = option.toFloatOrNull() ?: 1f
                    GlassButton(text = "${option}x", onClick = { if (!isSaving) onSelect(speed) }, isPrimary = speed == current)
                }
            }
        }
    }
}

@Composable
private fun PlaybackErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(text = message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = bayitString("common.retry"), onClick = onRetry)
        }
    }
}
