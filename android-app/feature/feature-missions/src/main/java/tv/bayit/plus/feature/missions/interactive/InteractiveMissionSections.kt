package tv.bayit.plus.feature.missions.interactive

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import tv.bayit.plus.core.model.MissionStep
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun MissionHeader(
    title: String,
    stepNumber: Int,
    totalSteps: Int,
    modifier: Modifier = Modifier,
) {
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Column {
            Text(
                text = title,
                style = MaterialTheme.typography.headlineSmall,
                color = DesignTokens.Colors.Primary.light,
                fontWeight = FontWeight.Bold,
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            Text(
                text = "Step $stepNumber of $totalSteps",
                style = MaterialTheme.typography.labelLarge,
                color = DesignTokens.Colors.Text.secondary,
            )
        }
    }
}

@Composable
internal fun StepCard(step: MissionStep, modifier: Modifier = Modifier) {
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = step.type.replaceFirstChar { it.uppercase() },
                    style = MaterialTheme.typography.labelMedium,
                    color = DesignTokens.Colors.Primary.light,
                    fontWeight = FontWeight.SemiBold,
                )
                if (step.isCompleted) {
                    Text(
                        text = "Done",
                        style = MaterialTheme.typography.labelMedium,
                        color = DesignTokens.Colors.Semantic.success,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
            Text(
                text = step.instruction,
                style = MaterialTheme.typography.bodyLarge,
                color = DesignTokens.Colors.Text.primary,
            )
        }
    }
}
