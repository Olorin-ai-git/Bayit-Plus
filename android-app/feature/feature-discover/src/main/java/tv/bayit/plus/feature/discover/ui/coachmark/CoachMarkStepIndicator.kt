package tv.bayit.plus.feature.discover.ui.coachmark

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun CoachMarkStepIndicator(
    currentStep: Int,
    totalSteps: Int,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        repeat(totalSteps) { index ->
            val isActive = index == currentStep
            Box(
                modifier = Modifier
                    .size(if (isActive) ACTIVE_DOT_SIZE else INACTIVE_DOT_SIZE)
                    .clip(CircleShape)
                    .background(
                        if (isActive) {
                            DesignTokens.Colors.Primary.light
                        } else {
                            DesignTokens.Colors.Text.muted
                        },
                    ),
            )
        }
    }
}

private val ACTIVE_DOT_SIZE = 8.dp
private val INACTIVE_DOT_SIZE = 6.dp
