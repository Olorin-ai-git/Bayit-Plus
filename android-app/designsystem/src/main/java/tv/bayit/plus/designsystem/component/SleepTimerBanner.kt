package tv.bayit.plus.designsystem.component

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bedtime
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

private const val EXTEND_MINUTES = 5

/**
 * Compact banner overlay showing sleep timer countdown.
 * Displays moon icon, remaining time, extend button, and cancel control.
 * Uses [AnimatedVisibility] for smooth enter/exit transitions.
 */
@Composable
fun SleepTimerBanner(
    isVisible: Boolean,
    remainingSeconds: Int,
    onExtend: (Int) -> Unit,
    onCancel: () -> Unit,
    modifier: Modifier = Modifier,
) {
    AnimatedVisibility(
        visible = isVisible,
        enter = slideInVertically(initialOffsetY = { -it }) + fadeIn(),
        exit = slideOutVertically(targetOffsetY = { -it }) + fadeOut(),
    ) {
        Row(
            modifier = modifier
                .fillMaxWidth()
                .glassMorphism()
                .padding(
                    horizontal = DesignTokens.Spacing.md,
                    vertical = DesignTokens.Spacing.xs,
                ),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
            ) {
                Icon(
                    imageVector = Icons.Default.Bedtime,
                    contentDescription = null,
                    tint = DesignTokens.Colors.Primary.light,
                    modifier = Modifier.padding(end = DesignTokens.Spacing.xxs),
                )
                Text(
                    text = bayitString(
                        "player.sleepTimer.remaining",
                        mapOf("time" to formatCountdown(remainingSeconds)),
                    ),
                    color = DesignTokens.Colors.Primary.light,
                    fontSize = DesignTokens.FontSize.sm,
                    fontWeight = FontWeight.Medium,
                )
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
            ) {
                GlassButton(
                    text = bayitString(
                        "player.sleepTimer.extend",
                        mapOf("minutes" to EXTEND_MINUTES.toString()),
                    ),
                    onClick = { onExtend(EXTEND_MINUTES) },
                    isPrimary = false,
                )
                IconButton(onClick = onCancel) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = bayitString("player.sleepTimer.cancel"),
                        tint = DesignTokens.Colors.Text.muted,
                    )
                }
            }
        }
    }
}

private fun formatCountdown(totalSeconds: Int): String {
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    return "${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}"
}
