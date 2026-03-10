package tv.bayit.plus.feature.discover.ui.coachmark

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

data class CoachMarkStep(
    val instructionText: String,
    val targetRect: Rect,
)

@Composable
internal fun CoachMarkOverlay(
    steps: List<CoachMarkStep>,
    currentStepIndex: Int,
    onNext: () -> Unit,
    onSkip: () -> Unit,
    onDone: () -> Unit,
    modifier: Modifier = Modifier,
) {
    if (steps.isEmpty() || currentStepIndex !in steps.indices) return

    val step = steps[currentStepIndex]
    val isLastStep = currentStepIndex >= steps.size - 1

    Box(modifier = modifier.fillMaxSize()) {
        CoachMarkSpotlight(targetRect = step.targetRect)

        InstructionCard(
            step = step,
            currentStepIndex = currentStepIndex,
            totalSteps = steps.size,
            isLastStep = isLastStep,
            onNext = onNext,
            onSkip = onSkip,
            onDone = onDone,
        )
    }
}

@Composable
private fun InstructionCard(
    step: CoachMarkStep,
    currentStepIndex: Int,
    totalSteps: Int,
    isLastStep: Boolean,
    onNext: () -> Unit,
    onSkip: () -> Unit,
    onDone: () -> Unit,
) {
    val density = LocalDensity.current
    val screenHeight = with(density) {
        LocalConfiguration.current.screenHeightDp.dp.toPx()
    }
    val showAbove = step.targetRect.center.y > screenHeight / 2

    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = DesignTokens.Spacing.xl),
        contentAlignment = if (showAbove) Alignment.TopCenter else Alignment.BottomCenter,
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = CARD_VERTICAL_PADDING)
                .animateContentSize(),
            shape = RoundedCornerShape(DesignTokens.Radius.lg),
            color = DesignTokens.Colors.Glass.bgStrong,
            border = null,
        ) {
            Column(
                modifier = Modifier.padding(DesignTokens.Spacing.xl),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
            ) {
                Text(
                    text = step.instructionText,
                    style = MaterialTheme.typography.bodyLarge,
                    color = DesignTokens.Colors.Text.primary,
                    textAlign = TextAlign.Center,
                )
                CoachMarkStepIndicator(
                    currentStep = currentStepIndex,
                    totalSteps = totalSteps,
                )
                ButtonRow(
                    isLastStep = isLastStep,
                    onNext = onNext,
                    onSkip = onSkip,
                    onDone = onDone,
                )
            }
        }
    }
}

@Composable
private fun ButtonRow(
    isLastStep: Boolean,
    onNext: () -> Unit,
    onSkip: () -> Unit,
    onDone: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (isLastStep) {
            TextButton(onClick = onDone) {
                Text(
                    text = bayitString("discover.walkthrough.done"),
                    color = DesignTokens.Colors.Primary.light,
                    style = MaterialTheme.typography.labelLarge,
                )
            }
        } else {
            TextButton(onClick = onSkip) {
                Text(
                    text = bayitString("discover.walkthrough.skip"),
                    color = DesignTokens.Colors.Text.secondary,
                    style = MaterialTheme.typography.labelLarge,
                )
            }
            Spacer(modifier = Modifier.weight(1f))
            TextButton(onClick = onNext) {
                Text(
                    text = bayitString("discover.walkthrough.next"),
                    color = DesignTokens.Colors.Primary.light,
                    style = MaterialTheme.typography.labelLarge,
                )
            }
        }
    }
}

private val CARD_VERTICAL_PADDING = 80.dp
