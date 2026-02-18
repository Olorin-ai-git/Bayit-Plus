package tv.bayit.plus.feature.voice.avatar

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.LinearEasing
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun AvatarOverlayRoute(onNavigateBack: () -> Unit, viewModel: AvatarViewModel = hiltViewModel()) {
    val avatarState by viewModel.avatarState.collectAsStateWithLifecycle()
    val dialogueText by viewModel.dialogueText.collectAsStateWithLifecycle()
    val gestureHint by viewModel.gestureHint.collectAsStateWithLifecycle()
    DisposableEffect(Unit) {
        viewModel.startSession()
        onDispose { viewModel.endSession() }
    }
    AvatarOverlayScreen(
        avatarState = avatarState, dialogueText = dialogueText, gestureHint = gestureHint,
        onToggleListening = viewModel::toggleListening,
        onClose = { viewModel.endSession(); onNavigateBack() },
    )
}

@Composable
internal fun AvatarOverlayScreen(
    avatarState: AvatarAnimationState,
    dialogueText: String,
    gestureHint: String?,
    onToggleListening: () -> Unit,
    onClose: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(modifier = modifier.fillMaxSize().background(DesignTokens.Colors.Glass.bgStrong)) {
        IconButton(
            onClick = onClose,
            modifier = Modifier.align(Alignment.TopEnd).padding(DesignTokens.Spacing.base),
        ) {
            Icon(
                imageVector = Icons.Default.Close,
                contentDescription = bayitString("avatar.title"),
                tint = DesignTokens.Colors.Text.primary,
                modifier = Modifier.size(DesignTokens.Spacing.xl),
            )
        }
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text(
                text = bayitString("avatar.title"),
                color = DesignTokens.Colors.Text.primary,
                fontSize = DesignTokens.FontSize.xxl,
                fontWeight = FontWeight.Bold,
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xxl))
            AvatarCircle(state = avatarState, onClick = onToggleListening)
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xl))
            StatusLabel(state = avatarState)
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.base))
            DialogueBubble(text = dialogueText)
            gestureHint?.let { hint ->
                Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
                Text(text = hint, color = DesignTokens.Colors.Text.muted, fontSize = DesignTokens.FontSize.sm)
            }
        }
    }
}

@Composable
private fun AvatarCircle(state: AvatarAnimationState, onClick: () -> Unit) {
    val transition = rememberInfiniteTransition(label = "avatar")
    val isListening = state == AvatarAnimationState.LISTENING
    val isThinking = state == AvatarAnimationState.THINKING
    val isSpeaking = state == AvatarAnimationState.SPEAKING

    val pulseScale by transition.animateFloat(
        initialValue = 1f, targetValue = if (isListening) 1.15f else 1f,
        animationSpec = infiniteRepeatable(tween(durationMillis = 800), RepeatMode.Reverse),
        label = "pulse",
    )
    val rotation by transition.animateFloat(
        initialValue = 0f, targetValue = if (isThinking) 360f else 0f,
        animationSpec = infiniteRepeatable(tween(1200, easing = LinearEasing), RepeatMode.Restart),
        label = "spin",
    )
    val glowAlpha by transition.animateFloat(
        initialValue = 0.4f, targetValue = if (isSpeaking) 1f else 0.4f,
        animationSpec = infiniteRepeatable(tween(durationMillis = 600), RepeatMode.Reverse),
        label = "glow",
    )
    val bgColor = when (state) {
        AvatarAnimationState.IDLE -> DesignTokens.Colors.Glass.bgMedium
        AvatarAnimationState.LISTENING -> DesignTokens.Colors.Primary.base
        AvatarAnimationState.THINKING -> DesignTokens.Colors.Glass.purpleStrong
        AvatarAnimationState.SPEAKING -> DesignTokens.Colors.Primary.light
    }

    Box(
        modifier = Modifier
            .size(120.dp)
            .scale(pulseScale)
            .rotate(rotation)
            .alpha(glowAlpha)
            .shadow(
                elevation = if (isSpeaking) 16.dp else 4.dp,
                shape = CircleShape,
                ambientColor = DesignTokens.Colors.Glass.purpleGlow,
                spotColor = DesignTokens.Colors.Glass.purpleGlow,
            )
            .clip(CircleShape)
            .glassMorphism(cornerRadius = DesignTokens.Radius.full, backgroundColor = bgColor)
            .clickable { onClick() },
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = Icons.Default.Mic,
            contentDescription = bayitString("avatar.tapToSpeak"),
            tint = DesignTokens.Colors.Text.primary,
            modifier = Modifier.size(DesignTokens.Spacing.xxxl),
        )
    }
}

@Composable
private fun StatusLabel(state: AvatarAnimationState) {
    val labelKey = when (state) {
        AvatarAnimationState.IDLE -> "avatar.tapToSpeak"
        AvatarAnimationState.LISTENING -> "avatar.listening"
        AvatarAnimationState.THINKING -> "avatar.thinking"
        AvatarAnimationState.SPEAKING -> "avatar.speaking"
    }
    Text(
        text = bayitString(labelKey),
        color = DesignTokens.Colors.Text.secondary,
        fontSize = DesignTokens.FontSize.md,
        fontWeight = FontWeight.Medium,
    )
}

@Composable
private fun DialogueBubble(text: String) {
    AnimatedVisibility(
        visible = text.isNotEmpty(),
        enter = fadeIn(tween(durationMillis = 300)),
        exit = fadeOut(tween(durationMillis = 200)),
    ) {
        GlassCard(modifier = Modifier.fillMaxWidth().padding(horizontal = DesignTokens.Spacing.xxl)) {
            Text(
                text = text,
                color = DesignTokens.Colors.Text.primary,
                fontSize = DesignTokens.FontSize.base,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
