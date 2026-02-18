package tv.bayit.plus.feature.settings.ai

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
import tv.bayit.plus.core.model.AIFeaturesSettings
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun AIFeaturesRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: AIFeaturesViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    AIFeaturesScreen(
        uiState = uiState,
        onNavigateBack = onNavigateBack,
        onUpdate = viewModel::updateSettings,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun AIFeaturesScreen(
    uiState: AIFeaturesUiState,
    onNavigateBack: () -> Unit,
    onUpdate: (AIFeaturesSettings) -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = "AI Features",
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = DesignTokens.Colors.Text.primary)
                }
            },
            actions = {
                if (uiState is AIFeaturesUiState.Success && uiState.isSaving) {
                    GlassSpinner(size = SpinnerSize.SMALL)
                }
            },
        )
        when (uiState) {
            is AIFeaturesUiState.Loading -> GlassLoadingIndicator()
            is AIFeaturesUiState.Error -> AIErrorContent(message = uiState.message, onRetry = onRetry)
            is AIFeaturesUiState.Success -> AIContent(state = uiState, onUpdate = onUpdate)
        }
    }
}

@Composable
private fun AIContent(state: AIFeaturesUiState.Success, onUpdate: (AIFeaturesSettings) -> Unit) {
    val s = state.settings
    val saving = state.isSaving
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        item { Spacer(Modifier.height(DesignTokens.Spacing.base)) }
        item { CreditsCard(balance = state.creditsBalance) }
        item { AIToggle("AI Assistant", "Enable AI-powered chatbot", s.chatbotEnabled, saving) { onUpdate(s.copy(chatbotEnabled = it)) } }
        item { AIToggle("Personalized Recommendations", "AI-powered content suggestions", s.personalizedRecommendations, saving) { onUpdate(s.copy(personalizedRecommendations = it)) } }
        item { SectionHeader("Dubbing") }
        item { AIToggle("Auto-Dub", "Automatically dub content", s.autoDub, saving) { onUpdate(s.copy(autoDub = it)) } }
        item { AISelect("Voice Preference", listOf("default", "male", "female"), s.voicePreference, saving) { onUpdate(s.copy(voicePreference = it)) } }
        item { AISlider("Original Audio Mix", s.originalAudioMix.toFloat(), 0f, 100f, "${s.originalAudioMix}%", saving) { onUpdate(s.copy(originalAudioMix = it.toInt())) } }
        item { SectionHeader("Trivia") }
        item { AIToggle("Enable Trivia", "Show trivia during content", s.triviaEnabled, saving) { onUpdate(s.copy(triviaEnabled = it)) } }
        item { AIToggle("Auto-Show Trivia", "Display trivia automatically", s.triviaAutoShow, saving && s.triviaEnabled) { onUpdate(s.copy(triviaAutoShow = it)) } }
        item { AISelect("Difficulty", listOf("easy", "medium", "hard"), s.triviaDifficulty, saving) { onUpdate(s.copy(triviaDifficulty = it)) } }
        item { Spacer(Modifier.height(DesignTokens.Spacing.xxl)) }
    }
}

@Composable
private fun CreditsCard(balance: Int) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.weight(1f)) {
                Text(text = "Beta Credits", color = DesignTokens.Colors.Text.primary, style = MaterialTheme.typography.titleMedium)
                Text(text = "Available balance", color = DesignTokens.Colors.Text.muted, style = MaterialTheme.typography.bodySmall)
            }
            Text(text = balance.toString(), color = DesignTokens.Colors.Primary.light, style = MaterialTheme.typography.headlineMedium)
        }
    }
}

@Composable
private fun SectionHeader(title: String) {
    Text(
        text = title.uppercase(),
        color = DesignTokens.Colors.Text.muted,
        style = MaterialTheme.typography.labelSmall,
        modifier = Modifier.padding(top = DesignTokens.Spacing.md),
    )
}

@Composable
private fun AIToggle(label: String, description: String, checked: Boolean, isSaving: Boolean, onToggle: (Boolean) -> Unit) {
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
private fun AISelect(label: String, options: List<String>, selected: String, isSaving: Boolean, onSelect: (String) -> Unit) {
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
private fun AISlider(label: String, value: Float, min: Float, max: Float, display: String, isSaving: Boolean, onValueChange: (Float) -> Unit) {
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
private fun AIErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(text = message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = "Retry", onClick = onRetry)
        }
    }
}
