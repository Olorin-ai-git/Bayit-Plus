package tv.bayit.plus.feature.missions

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
import androidx.compose.ui.text.style.TextOverflow
import tv.bayit.plus.core.model.Mission
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassChip
import tv.bayit.plus.designsystem.component.GlassProgressBar
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

private const val COMPLETED_STATUS = "completed"
private const val CLAIMED_STATUS = "claimed"
private const val PERCENT_MULTIPLIER = 100

@Composable
internal fun MissionsHeader(modifier: Modifier = Modifier) {
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Column {
            Text(
                text = bayitString("missions.title"),
                style = MaterialTheme.typography.headlineMedium,
                color = DesignTokens.Colors.Primary.light,
                fontWeight = FontWeight.Bold,
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            Text(
                text = bayitString("missions.subtitle"),
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.secondary,
            )
        }
    }
}

@Composable
internal fun MissionTabSelector(
    selectedTab: MissionTab,
    onTabSelected: (MissionTab) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        GlassChip(
            label = bayitString("missions.daily"),
            isSelected = selectedTab == MissionTab.DAILY,
            onClick = { onTabSelected(MissionTab.DAILY) },
        )
        GlassChip(
            label = bayitString("missions.weekly"),
            isSelected = selectedTab == MissionTab.WEEKLY,
            onClick = { onTabSelected(MissionTab.WEEKLY) },
        )
    }
}

@Composable
internal fun MissionCard(
    mission: Mission,
    isClaiming: Boolean,
    onClaimReward: () -> Unit,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val isComplete = mission.status == COMPLETED_STATUS
    val isClaimed = mission.status == CLAIMED_STATUS

    GlassCard(modifier = modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs)) {
            Text(
                text = mission.title,
                style = MaterialTheme.typography.titleMedium,
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.SemiBold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            mission.description?.let { desc ->
                Text(
                    text = desc,
                    style = MaterialTheme.typography.bodySmall,
                    color = DesignTokens.Colors.Text.secondary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            GlassProgressBar(progress = mission.progress)
            Text(
                text = bayitString("missions.progressPercent", mapOf("percent" to (mission.progress * PERCENT_MULTIPLIER).toInt().toString())),
                style = MaterialTheme.typography.labelSmall,
                color = DesignTokens.Colors.Text.muted,
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                mission.reward?.let { reward ->
                    Text(
                        text = "+$reward pts",
                        style = MaterialTheme.typography.labelMedium,
                        color = DesignTokens.Colors.gold,
                        fontWeight = FontWeight.Bold,
                    )
                }
                when {
                    isClaiming -> GlassSpinner(size = SpinnerSize.SMALL)
                    isClaimed -> Text(
                        text = bayitString("missions.claimed"),
                        style = MaterialTheme.typography.labelMedium,
                        color = DesignTokens.Colors.Semantic.success,
                    )
                    isComplete -> GlassButton(text = bayitString("missions.claim"), onClick = onClaimReward)
                    else -> GlassButton(text = bayitString("missions.start"), onClick = onClick, isPrimary = false)
                }
            }
        }
    }
}
