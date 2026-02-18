package tv.bayit.plus.feature.voice.talkback

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

private val MIC_BUTTON_SIZE = 72.dp
private val BUBBLE_MAX_WIDTH = 280.dp
private val PULSE_DURATION_MS = 800

@Composable
fun TalkBackRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: TalkBackViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    TalkBackScreen(
        uiState = uiState,
        onStartInteraction = viewModel::startInteraction,
        onStopInteraction = viewModel::stopInteraction,
        onNavigateBack = onNavigateBack,
        modifier = modifier,
    )
}

@Composable
internal fun TalkBackScreen(
    uiState: TalkBackUiState,
    onStartInteraction: () -> Unit,
    onStopInteraction: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(modifier = modifier.fillMaxSize().background(DesignTokens.Colors.Glass.bgStrong.copy(alpha = 0.85f))) {
        Column(modifier = Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally) {
            TalkBackTopBar(characterName = uiState.characterName, onNavigateBack = onNavigateBack)
            ConversationArea(uiState = uiState, modifier = Modifier.weight(1f))
            StatusLabel(uiState = uiState)
            MicButton(
                isListening = uiState.isListening,
                isActive = !uiState.isProcessing && !uiState.isSpeaking,
                onTap = if (uiState.isListening) onStopInteraction else onStartInteraction,
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xl))
        }
        AnimatedVisibility(
            visible = uiState.error != null, enter = fadeIn(), exit = fadeOut(),
            modifier = Modifier.align(Alignment.BottomCenter).padding(DesignTokens.Spacing.md),
        ) {
            Box(
                modifier = Modifier.fillMaxWidth()
                    .glassMorphism(backgroundColor = DesignTokens.Colors.Semantic.error.copy(alpha = 0.9f), cornerRadius = DesignTokens.Radius.md)
                    .padding(DesignTokens.Spacing.md),
            ) { Text(text = uiState.error.orEmpty(), color = DesignTokens.Colors.Text.primary, style = MaterialTheme.typography.bodyMedium) }
        }
    }
}

@Composable
private fun TalkBackTopBar(characterName: String, onNavigateBack: () -> Unit) {
    Box(
        modifier = Modifier.fillMaxWidth().background(DesignTokens.Colors.Glass.bgStrong)
            .padding(horizontal = DesignTokens.Spacing.md, vertical = DesignTokens.Spacing.sm),
    ) {
        IconButton(onClick = onNavigateBack, modifier = Modifier.align(Alignment.CenterStart)) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = bayitString("talkback.title"), tint = DesignTokens.Colors.Text.primary)
        }
        Column(modifier = Modifier.align(Alignment.Center), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(bayitString("talkback.title"), style = MaterialTheme.typography.titleMedium, color = DesignTokens.Colors.Text.primary, fontWeight = FontWeight.SemiBold)
            if (characterName.isNotBlank()) {
                Text(characterName, style = MaterialTheme.typography.bodySmall, color = DesignTokens.Colors.Primary.light)
            }
        }
    }
}

@Composable
private fun ConversationArea(uiState: TalkBackUiState, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.fillMaxWidth().verticalScroll(rememberScrollState())
            .padding(horizontal = DesignTokens.Spacing.base, vertical = DesignTokens.Spacing.md),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        if (uiState.userTranscript.isNotBlank()) ChatBubble(text = uiState.userTranscript, isUser = true)
        if (uiState.characterResponse.isNotBlank()) ChatBubble(text = uiState.characterResponse, isUser = false, senderName = uiState.characterName)
        if (uiState.isProcessing) Box(modifier = Modifier.align(Alignment.Start)) { GlassSpinner(size = SpinnerSize.SMALL) }
    }
}

@Composable
private fun ChatBubble(text: String, isUser: Boolean, senderName: String = "") {
    val alignment = if (isUser) Alignment.CenterEnd else Alignment.CenterStart
    val bubbleColor = if (isUser) DesignTokens.Colors.Primary.base else DesignTokens.Colors.Glass.bgMedium
    val shape = RoundedCornerShape(
        topStart = DesignTokens.Radius.lg, topEnd = DesignTokens.Radius.lg,
        bottomStart = if (isUser) DesignTokens.Radius.lg else DesignTokens.Radius.sm,
        bottomEnd = if (isUser) DesignTokens.Radius.sm else DesignTokens.Radius.lg,
    )
    Box(modifier = Modifier.fillMaxWidth(), contentAlignment = alignment) {
        Column(modifier = Modifier.widthIn(max = BUBBLE_MAX_WIDTH).clip(shape).background(bubbleColor).padding(DesignTokens.Spacing.md)) {
            if (!isUser && senderName.isNotBlank()) {
                Text(senderName, color = DesignTokens.Colors.Primary.light, fontSize = DesignTokens.FontSize.xs, fontWeight = FontWeight.SemiBold)
            }
            Text(text, color = DesignTokens.Colors.Text.primary, fontSize = DesignTokens.FontSize.base)
        }
    }
}

@Composable
private fun StatusLabel(uiState: TalkBackUiState) {
    val key = when {
        uiState.isListening -> "talkback.listening"
        uiState.isProcessing -> "talkback.thinking"
        uiState.isSpeaking -> "talkback.speaking"
        else -> "talkback.tapToSpeak"
    }
    Text(bayitString(key), style = MaterialTheme.typography.bodyMedium, color = DesignTokens.Colors.Text.secondary, textAlign = TextAlign.Center, modifier = Modifier.padding(vertical = DesignTokens.Spacing.sm))
}

@Composable
private fun MicButton(isListening: Boolean, isActive: Boolean, onTap: () -> Unit) {
    val pulse = rememberInfiniteTransition(label = "micPulse")
    val scale by pulse.animateFloat(
        initialValue = 1f, targetValue = if (isListening) 1.15f else 1f,
        animationSpec = infiniteRepeatable(animation = tween(durationMillis = PULSE_DURATION_MS), repeatMode = RepeatMode.Reverse),
        label = "micScale",
    )
    val bgColor = when {
        isListening -> DesignTokens.Colors.Semantic.error
        !isActive -> DesignTokens.Colors.Glass.bgMedium
        else -> DesignTokens.Colors.Primary.base
    }
    Box(
        modifier = Modifier.size(MIC_BUTTON_SIZE).scale(scale)
            .glassMorphism(cornerRadius = DesignTokens.Radius.full, backgroundColor = bgColor)
            .clickable(enabled = isActive || isListening, onClick = onTap),
        contentAlignment = Alignment.Center,
    ) {
        Text(bayitString(if (isListening) "talkback.listening" else "talkback.tapToSpeak"), color = DesignTokens.Colors.Text.primary, fontSize = DesignTokens.FontSize.xs, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
    }
}
