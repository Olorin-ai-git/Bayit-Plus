package tv.bayit.plus.feature.player.talkback

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.runtime.Composable
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.RecordVoiceOver
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Audio description (TalkBack) overlay for accessibility.
 *
 * Displays the current audio description text with character
 * identification and scene context.
 */
@Composable
fun TalkBackOverlay(
    isActive: Boolean,
    currentDescription: String?,
    currentCharacter: String?,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(DesignTokens.Spacing.md),
        contentAlignment = Alignment.BottomStart,
    ) {
        AnimatedVisibility(
            visible = isActive && currentDescription != null,
            enter = fadeIn(),
            exit = fadeOut(),
        ) {
            Column(
                modifier = Modifier
                    .glassMorphism(
                        cornerRadius = DesignTokens.Radius.md,
                        backgroundColor = DesignTokens.Colors.Glass.bgStrong,
                    )
                    .padding(DesignTokens.Spacing.md),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.RecordVoiceOver,
                        contentDescription = null,
                        tint = DesignTokens.Colors.Semantic.info,
                        modifier = Modifier.size(16.dp),
                    )
                    Spacer(modifier = Modifier.width(DesignTokens.Spacing.sm))
                    Text(
                        text = bayitString("player.audio_description"),
                        color = DesignTokens.Colors.Semantic.info,
                        fontSize = DesignTokens.FontSize.xs,
                        fontWeight = FontWeight.SemiBold,
                    )
                }

                currentCharacter?.let { character ->
                    Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
                    TalkBackCharacter(name = character)
                }

                currentDescription?.let { desc ->
                    Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
                    TalkBackResult(text = desc)
                }
            }
        }
    }
}

@Composable
fun TalkBackCharacter(
    name: String,
    modifier: Modifier = Modifier,
) {
    Text(
        text = name,
        color = DesignTokens.Colors.Primary.light,
        fontSize = DesignTokens.FontSize.sm,
        fontWeight = FontWeight.Bold,
        modifier = modifier,
    )
}

@Composable
fun TalkBackResult(
    text: String,
    modifier: Modifier = Modifier,
) {
    Text(
        text = text,
        color = DesignTokens.Colors.Text.primary,
        fontSize = DesignTokens.FontSize.sm,
        modifier = modifier,
    )
}
