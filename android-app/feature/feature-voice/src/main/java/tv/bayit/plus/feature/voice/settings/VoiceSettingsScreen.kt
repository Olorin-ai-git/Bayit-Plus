package tv.bayit.plus.feature.voice.settings

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
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.text.font.FontWeight
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.voice.TTSVoiceInfo
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.voice.settings.VoiceSettingsViewModel.Companion as VM

private val sliderColors @Composable get() = SliderDefaults.colors(
    thumbColor = DesignTokens.Colors.Primary.light, activeTrackColor = DesignTokens.Colors.Primary.base, inactiveTrackColor = DesignTokens.Colors.Glass.bgStrong)

private val switchColors @Composable get() = SwitchDefaults.colors(
    checkedThumbColor = DesignTokens.Colors.Text.primary, checkedTrackColor = DesignTokens.Colors.Primary.base,
    uncheckedThumbColor = DesignTokens.Colors.Text.muted, uncheckedTrackColor = DesignTokens.Colors.Glass.bgStrong)

@Composable
fun VoiceSettingsRoute(onNavigateBack: () -> Unit, modifier: Modifier = Modifier, viewModel: VoiceSettingsViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    VoiceSettingsScreen(uiState, onNavigateBack, viewModel::updateTtsProvider, viewModel::updateSelectedVoice,
        viewModel::updateSpeechRate, viewModel::updateVoiceMode, viewModel::toggleWakeWord,
        viewModel::updateWakeWordSensitivity, viewModel::updateLanguage, viewModel::retry, modifier)
}

@Composable
internal fun VoiceSettingsScreen(
    uiState: VoiceUiState, onNavigateBack: () -> Unit, onTtsProvider: (String) -> Unit,
    onVoice: (String) -> Unit, onRate: (Float) -> Unit, onMode: (String) -> Unit,
    onWake: (Boolean) -> Unit, onSensitivity: (Float) -> Unit, onLang: (String) -> Unit,
    onRetry: () -> Unit, modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = bayitString("voiceSettings.title"),
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = bayitString("voiceSettings.title"), tint = DesignTokens.Colors.Text.primary)
                }
            },
            actions = { if (uiState is VoiceUiState.Success && uiState.isSaving) GlassSpinner(size = SpinnerSize.SMALL) },
        )
        when (uiState) {
            is VoiceUiState.Loading -> GlassLoadingIndicator()
            is VoiceUiState.Error -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
                    Text(uiState.message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error)
                    GlassButton(text = bayitString("voiceSettings.title"), onClick = onRetry)
                }
            }
            is VoiceUiState.Success -> VoiceContent(uiState, onTtsProvider, onVoice, onRate, onMode, onWake, onSensitivity, onLang)
        }
    }
}

@Composable
private fun VoiceContent(
    state: VoiceUiState.Success, onTtsProvider: (String) -> Unit, onVoice: (String) -> Unit,
    onRate: (Float) -> Unit, onMode: (String) -> Unit, onWake: (Boolean) -> Unit,
    onSensitivity: (Float) -> Unit, onLang: (String) -> Unit,
) {
    val s = state.settings
    val saving = state.isSaving
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        item { Spacer(Modifier.height(DesignTokens.Spacing.base)) }
        item { SectionHeader(bayitString("voiceSettings.ttsProvider")) }
        item { OptionRow(listOf(VM.TTS_PROVIDER_SYSTEM, VM.TTS_PROVIDER_ELEVENLABS), s.ttsProvider, saving, onTtsProvider) }
        item { SectionHeader(bayitString("voiceSettings.language")) }
        item { LanguageRow(s.selectedLanguage, saving, onLang) }
        item { SectionHeader(bayitString("voiceSettings.voiceSelection")) }
        if (state.availableVoices.isNotEmpty()) {
            items(state.availableVoices, key = { it.id }) { voice ->
                VoiceOption(voice, voice.id == s.selectedVoiceId, saving, onVoice)
            }
        } else {
            item { GlassCard(Modifier.fillMaxWidth()) { Text(bayitString("voiceSettings.voiceSelection"), color = DesignTokens.Colors.Text.muted, style = MaterialTheme.typography.bodyMedium) } }
        }
        item { SectionHeader(bayitString("voiceSettings.speechRate")) }
        item { SettingsSlider(bayitString("voiceSettings.speechRate"), s.speechRate, VM.SPEECH_RATE_MIN, VM.SPEECH_RATE_MAX, "${String.format("%.1f", s.speechRate)}x", saving, onRate) }
        item { SectionHeader(bayitString("voiceSettings.voiceMode")) }
        item { OptionRow(listOf(VM.VOICE_MODE_FULL, VM.VOICE_MODE_COMPACT, VM.VOICE_MODE_MINIMAL), s.voiceMode, saving, onMode) }
        item { SectionHeader(bayitString("voiceSettings.wakeWord")) }
        item { WakeWordToggle(s.isWakeWordEnabled, saving, onWake) }
        if (s.isWakeWordEnabled) {
            item { SettingsSlider(bayitString("voiceSettings.wakeWord"), s.wakeWordSensitivity, VM.SENSITIVITY_MIN, VM.SENSITIVITY_MAX, "${(s.wakeWordSensitivity * 100).toInt()}%", saving, onSensitivity) }
        }
        item { Spacer(Modifier.height(DesignTokens.Spacing.xxl)) }
    }
}

@Composable
private fun SectionHeader(title: String) {
    Text(title, style = MaterialTheme.typography.titleSmall, color = DesignTokens.Colors.Primary.light,
        fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = DesignTokens.Spacing.md))
}

@Composable
private fun OptionRow(options: List<String>, selected: String, isSaving: Boolean, onSelect: (String) -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
            options.forEach { opt ->
                GlassButton(text = opt.replaceFirstChar { it.uppercase() }, onClick = { if (!isSaving) onSelect(opt) }, isPrimary = opt == selected, modifier = Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun LanguageRow(selected: String, isSaving: Boolean, onSelect: (String) -> Unit) {
    val langs = listOf("en", "he", "es", "fr", "ja", "zh", "hi", "it", "ta", "bn")
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs), modifier = Modifier.fillMaxWidth()) {
            langs.take(LANG_ROW_LIMIT).forEach { l ->
                GlassButton(text = l.uppercase(), onClick = { if (!isSaving) onSelect(l) }, isPrimary = l == selected, modifier = Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun VoiceOption(voice: TTSVoiceInfo, isSelected: Boolean, isSaving: Boolean, onSelect: (String) -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.weight(1f)) {
                Text(voice.name, color = DesignTokens.Colors.Text.primary, style = MaterialTheme.typography.bodyLarge)
                Text(voice.quality.name, color = DesignTokens.Colors.Text.muted, style = MaterialTheme.typography.bodySmall)
            }
            GlassButton(text = if (isSelected) bayitString("voiceSettings.voiceSelection") else voice.language,
                onClick = { if (!isSaving) onSelect(voice.id) }, isPrimary = isSelected)
        }
    }
}

@Composable
private fun SettingsSlider(label: String, value: Float, min: Float, max: Float, display: String, isSaving: Boolean, onChange: (Float) -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                Text(label, color = DesignTokens.Colors.Text.primary, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
                Text(display, color = DesignTokens.Colors.Primary.light, style = MaterialTheme.typography.bodyMedium)
            }
            Slider(value = value, onValueChange = onChange, valueRange = min..max, enabled = !isSaving, colors = sliderColors)
        }
    }
}

@Composable
private fun WakeWordToggle(enabled: Boolean, isSaving: Boolean, onToggle: (Boolean) -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            Text(bayitString("voiceSettings.wakeWord"), color = DesignTokens.Colors.Text.primary, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
            Switch(checked = enabled, onCheckedChange = onToggle, enabled = !isSaving, colors = switchColors)
        }
    }
}

private const val LANG_ROW_LIMIT = 5
