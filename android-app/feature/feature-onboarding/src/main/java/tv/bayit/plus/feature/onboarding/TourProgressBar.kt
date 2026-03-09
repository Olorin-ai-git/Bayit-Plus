package tv.bayit.plus.feature.onboarding

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.theme.DesignTokens

private const val ANIMATION_DURATION_MS = 300
private val DOT_SIZE_DEFAULT = 8.dp
private val DOT_SIZE_ACTIVE = 12.dp

@Composable
fun TourProgressBar(
    totalCards: Int,
    currentIndex: Int,
    modifier: Modifier = Modifier,
) {
    val progressLabel = stringResource(
        R.string.tour_progress_description,
        currentIndex + 1,
        totalCards,
    )

    Row(
        modifier = modifier.semantics {
            contentDescription = progressLabel
        },
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        repeat(totalCards) { index ->
            ProgressDot(isActive = index == currentIndex)
        }
    }
}

@Composable
private fun ProgressDot(isActive: Boolean) {
    val size by animateDpAsState(
        targetValue = if (isActive) DOT_SIZE_ACTIVE else DOT_SIZE_DEFAULT,
        animationSpec = tween(durationMillis = ANIMATION_DURATION_MS),
        label = "dotSize",
    )
    val color = if (isActive) {
        DesignTokens.Colors.Primary.base
    } else {
        DesignTokens.Colors.Text.muted
    }
    Box(
        modifier = Modifier
            .size(size)
            .clip(CircleShape)
            .background(color),
    )
}
