package tv.bayit.plus.feature.voice.mission

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.delay
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

private val MIC_BUTTON_SIZE = 56.dp
private const val AUTO_CONFIRM_DELAY_MS = 1200L

@Composable
fun VoiceDecisionOverlay(
    prompt: String,
    options: List<String>,
    onDecisionMade: (String) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: VoiceDecisionViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    LaunchedEffect(prompt, options) { viewModel.setDecision(prompt, options) }
    LaunchedEffect(state.hasDecided, state.selectedOption) {
        if (state.hasDecided && state.selectedOption != null) onDecisionMade(state.selectedOption!!)
    }
    LaunchedEffect(state.confidence, state.selectedOption) {
        val conf = state.confidence ?: return@LaunchedEffect
        if (conf >= VoiceDecisionViewModel.AUTO_CONFIRM_THRESHOLD
            && state.selectedOption != null && !state.hasDecided
        ) { delay(AUTO_CONFIRM_DELAY_MS); viewModel.confirmSelection() }
    }

    Box(
        modifier = modifier.fillMaxSize()
            .background(DesignTokens.Colors.Glass.bgStrong)
            .clickable(role = Role.Button, onClick = onDismiss),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier = Modifier.fillMaxWidth()
                .padding(horizontal = DesignTokens.Spacing.xl)
                .clickable(enabled = false, onClick = {})
                .glassMorphism(
                    backgroundColor = DesignTokens.Colors.Glass.bgMedium,
                    cornerRadius = DesignTokens.Radius.xl,
                )
                .padding(DesignTokens.Spacing.xl)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.base),
        ) {
            Text(
                text = prompt,
                style = MaterialTheme.typography.titleMedium,
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
            )
            options.forEach { option ->
                OptionCard(option, state.selectedOption == option) { viewModel.selectOption(option) }
            }
            MicButton(state.isListening) {
                if (state.isListening) viewModel.stopListening() else viewModel.startListening()
            }
            if (state.transcript.isNotBlank()) {
                Text(
                    text = state.transcript,
                    style = MaterialTheme.typography.bodyMedium,
                    color = DesignTokens.Colors.Text.secondary,
                    textAlign = TextAlign.Center,
                )
            }
            state.selectedOption?.let {
                Text(
                    text = bayitString("voiceDecision.matched"),
                    style = MaterialTheme.typography.labelMedium,
                    color = DesignTokens.Colors.Semantic.success,
                )
            }
            state.error?.let {
                Text(it, style = MaterialTheme.typography.bodySmall, color = DesignTokens.Colors.Semantic.error)
            }
            Spacer(Modifier.height(DesignTokens.Spacing.sm))
            ActionButtons(
                canConfirm = state.selectedOption != null && !state.hasDecided,
                onConfirm = { viewModel.confirmSelection() },
                onCancel = { viewModel.reset(); onDismiss() },
            )
        }
    }
}

@Composable
private fun OptionCard(option: String, isSelected: Boolean, onClick: () -> Unit) {
    val borderColor by animateColorAsState(
        targetValue = if (isSelected) DesignTokens.Colors.Primary.base else DesignTokens.Colors.Glass.border,
        label = "optionBorder",
    )
    val bgColor = if (isSelected) DesignTokens.Colors.Glass.purpleLight else DesignTokens.Colors.Glass.bg
    GlassCard(
        modifier = Modifier.fillMaxWidth()
            .glassMorphism(cornerRadius = DesignTokens.Radius.md, borderColor = borderColor, backgroundColor = bgColor)
            .clickable(role = Role.RadioButton, onClick = onClick),
    ) {
        Text(
            text = option,
            style = MaterialTheme.typography.bodyLarge,
            color = if (isSelected) DesignTokens.Colors.Primary.light else DesignTokens.Colors.Text.primary,
            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
        )
    }
}

@Composable
private fun MicButton(isListening: Boolean, onToggle: () -> Unit) {
    Box(
        modifier = Modifier.size(MIC_BUTTON_SIZE)
            .glassMorphism(
                cornerRadius = DesignTokens.Radius.full,
                backgroundColor = if (isListening) DesignTokens.Colors.Semantic.error
                else DesignTokens.Colors.Primary.base,
            )
            .clickable(role = Role.Button, onClick = onToggle),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = bayitString(
                if (isListening) "voiceDecision.listening" else "voiceDecision.speakYourChoice",
            ),
            color = DesignTokens.Colors.Text.primary,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun ActionButtons(canConfirm: Boolean, onConfirm: () -> Unit, onCancel: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        GlassButton(
            text = bayitString("voiceDecision.cancel"),
            onClick = onCancel,
            isPrimary = false,
            modifier = Modifier.weight(1f),
        )
        GlassButton(
            text = bayitString("voiceDecision.confirm"),
            onClick = onConfirm,
            enabled = canConfirm,
            modifier = Modifier.weight(1f),
        )
    }
}
