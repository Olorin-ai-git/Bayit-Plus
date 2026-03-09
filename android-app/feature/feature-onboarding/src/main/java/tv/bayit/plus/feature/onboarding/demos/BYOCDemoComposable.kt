// # DEMO-ONLY
package tv.bayit.plus.feature.onboarding.demos

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.onboarding.R

private const val TOTAL_STEPS = 3
private const val STEP_DURATION_MS = 2500L

private data class BYOCStep(
    val titleResId: Int,
    val descResId: Int,
    val iconChar: String,
)

private val STEPS = listOf(
    BYOCStep(R.string.demo_byoc_step_1_title, R.string.demo_byoc_step_1_desc, "+"),
    BYOCStep(R.string.demo_byoc_step_2_title, R.string.demo_byoc_step_2_desc, "AI"),
    BYOCStep(R.string.demo_byoc_step_3_title, R.string.demo_byoc_step_3_desc, ">>"),
)

@Composable
fun BYOCDemoComposable(
    onClose: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var currentStep by remember { mutableIntStateOf(0) }

    LaunchedEffect(Unit) {
        while (true) {
            delay(STEP_DURATION_MS)
            currentStep = (currentStep + 1) % TOTAL_STEPS
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(DesignTokens.Colors.Background.primary),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        DemoTopBar(
            label = stringResource(R.string.demo_banner_label),
            onClose = onClose,
        )

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.xxxl))

        Text(
            text = stringResource(
                R.string.demo_byoc_step_indicator,
                currentStep + 1,
                TOTAL_STEPS,
            ),
            style = MaterialTheme.typography.labelMedium,
            color = DesignTokens.Colors.Text.muted,
        )

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.xl))

        AnimatedContent(
            targetState = currentStep,
            label = "byoc_step",
            transitionSpec = {
                (slideInHorizontally { it } + fadeIn()) togetherWith
                    (slideOutHorizontally { -it } + fadeOut())
            },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = DesignTokens.Spacing.xxl),
        ) { step ->
            val data = STEPS[step]
            StepCard(data)
        }

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.xl))

        StepIndicatorRow(currentStep = currentStep, totalSteps = TOTAL_STEPS)

        Spacer(modifier = Modifier.weight(1f))

        GlassButton(
            text = stringResource(R.string.demo_close),
            onClick = onClose,
            isPrimary = false,
            modifier = Modifier
                .fillMaxWidth()
                .padding(DesignTokens.Spacing.base),
        )
    }
}

@Composable
private fun StepCard(step: BYOCStep) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Box(
                modifier = Modifier
                    .size(72.dp)
                    .background(DesignTokens.Colors.Primary.dark, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = step.iconChar,
                    style = MaterialTheme.typography.headlineMedium,
                    color = DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.Bold,
                )
            }
            Text(
                text = stringResource(step.titleResId),
                style = MaterialTheme.typography.headlineSmall,
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
            )
            Text(
                text = stringResource(step.descResId),
                style = MaterialTheme.typography.bodyLarge,
                color = DesignTokens.Colors.Text.secondary,
                textAlign = TextAlign.Center,
            )
        }
    }
}

@Composable
private fun StepIndicatorRow(currentStep: Int, totalSteps: Int) {
    androidx.compose.foundation.layout.Row(
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        repeat(totalSteps) { index ->
            Box(
                modifier = Modifier
                    .size(if (index == currentStep) 12.dp else 8.dp)
                    .background(
                        if (index == currentStep) {
                            DesignTokens.Colors.Primary.light
                        } else {
                            DesignTokens.Colors.Glass.border
                        },
                        CircleShape,
                    ),
            )
        }
    }
}
