package tv.bayit.plus.feature.rewards

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import tv.bayit.plus.core.model.Reward
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun PointsBalanceCard(points: Int, modifier: Modifier = Modifier) {
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(
                text = bayitString("rewards.yourPoints"),
                style = MaterialTheme.typography.titleMedium,
                color = DesignTokens.Colors.Text.secondary,
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            Text(
                text = points.toString(),
                style = MaterialTheme.typography.displaySmall,
                color = DesignTokens.Colors.gold,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

@Composable
internal fun RewardGridItem(
    reward: Reward,
    isClaiming: Boolean,
    canAfford: Boolean,
    onClaim: () -> Unit,
    modifier: Modifier = Modifier,
) {
    GlassCard(modifier = modifier) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            CachedAsyncImage(
                url = reward.iconUrl,
                contentDescription = reward.title,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(DesignTokens.Spacing.xxxl * 2),
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            Text(
                text = reward.title,
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.SemiBold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center,
            )
            Text(
                text = "${reward.points} pts",
                style = MaterialTheme.typography.labelMedium,
                color = DesignTokens.Colors.gold,
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            if (isClaiming) {
                GlassSpinner(size = SpinnerSize.SMALL)
            } else {
                GlassButton(
                    text = bayitString("rewards.claim"),
                    onClick = onClaim,
                    enabled = canAfford && !reward.isUnlocked,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }
}

@Composable
internal fun EarnedRewardItem(reward: Reward, modifier: Modifier = Modifier) {
    GlassCard(modifier = modifier) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            CachedAsyncImage(
                url = reward.iconUrl,
                contentDescription = reward.title,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(DesignTokens.Spacing.xxxl * 2),
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            Text(
                text = reward.title,
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Semantic.success,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center,
            )
        }
    }
}
