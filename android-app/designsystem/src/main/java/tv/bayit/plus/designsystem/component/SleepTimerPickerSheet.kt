package tv.bayit.plus.designsystem.component

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bedtime
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

private const val TIMER_MIN_MINUTES = 5
private const val TIMER_MAX_MINUTES = 60
private const val TIMER_STEP_MINUTES = 5

/**
 * Bottom sheet picker for sleep timer duration selection.
 * Displays a grid of duration chips (5-60 min in 5-min increments)
 * plus an "Off" option. Follows SubtitleLanguagePicker overlay pattern.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SleepTimerPickerSheet(
    activeDurationMinutes: Int?,
    onSelect: (Int) -> Unit,
    onCancel: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(DesignTokens.Spacing.base),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            Icon(
                imageVector = Icons.Default.Bedtime,
                contentDescription = null,
                tint = DesignTokens.Colors.Primary.base,
                modifier = Modifier.height(DesignTokens.Spacing.xl),
            )
            Text(
                text = bayitString("player.sleepTimer.setTimer"),
                color = DesignTokens.Colors.Text.primary,
                fontSize = DesignTokens.FontSize.lg,
                fontWeight = FontWeight.Bold,
            )
        }

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))

        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            DurationChip(
                label = bayitString("player.sleepTimer.off"),
                isSelected = activeDurationMinutes == null,
                onClick = onCancel,
            )
            for (minutes in TIMER_MIN_MINUTES..TIMER_MAX_MINUTES step TIMER_STEP_MINUTES) {
                DurationChip(
                    label = bayitString(
                        "player.sleepTimer.minutesFormat",
                        mapOf("minutes" to minutes.toString()),
                    ),
                    isSelected = activeDurationMinutes == minutes,
                    onClick = { onSelect(minutes) },
                )
            }
        }

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))

        GlassButton(
            text = bayitString("player.sleepTimer.cancel"),
            onClick = onCancel,
            isPrimary = false,
        )
    }
}

@Composable
private fun DurationChip(
    label: String,
    isSelected: Boolean,
    onClick: () -> Unit,
) {
    GlassCard(
        modifier = Modifier.clickable(onClick = onClick),
    ) {
        Text(
            text = label,
            color = if (isSelected) DesignTokens.Colors.Primary.light else DesignTokens.Colors.Text.secondary,
            fontSize = DesignTokens.FontSize.base,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
        )
    }
}
