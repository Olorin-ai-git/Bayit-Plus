package tv.bayit.plus.feature.rewards

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.model.Reward
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassProgressBar
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.theme.DesignTokens

private const val GRID_COLUMNS = 2

@Composable
fun RewardsRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: RewardsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    RewardsScreen(
        uiState = uiState,
        onClaimReward = viewModel::claimReward,
        onRefresh = viewModel::refresh,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun RewardsScreen(
    uiState: RewardsUiState,
    onClaimReward: (String) -> Unit,
    onRefresh: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    when (uiState) {
        is RewardsUiState.Loading -> GlassLoadingIndicator(modifier = modifier)
        is RewardsUiState.Success -> RewardsContent(
            uiState = uiState,
            onClaimReward = onClaimReward,
            onRefresh = onRefresh,
            modifier = modifier,
        )
        is RewardsUiState.Error -> RewardsErrorSection(
            message = uiState.message,
            onRetry = onRetry,
            modifier = modifier,
        )
    }
}

@Composable
private fun RewardsContent(
    uiState: RewardsUiState.Success,
    onClaimReward: (String) -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
) {
    PullToRefreshBox(
        isRefreshing = uiState.isRefreshing,
        onRefresh = onRefresh,
        modifier = modifier,
    ) {
        LazyVerticalGrid(
            columns = GridCells.Fixed(GRID_COLUMNS),
            contentPadding = PaddingValues(DesignTokens.Spacing.base),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
            modifier = Modifier.fillMaxSize(),
        ) {
            item(key = "points_header", span = { GridItemSpan(GRID_COLUMNS) }) {
                PointsBalanceCard(points = uiState.pointsBalance)
            }
            if (uiState.availableRewards.isNotEmpty()) {
                item(key = "available_label", span = { GridItemSpan(GRID_COLUMNS) }) {
                    SectionLabel(text = "Available Rewards")
                }
                items(items = uiState.availableRewards, key = { it.id }) { reward ->
                    RewardGridItem(
                        reward = reward,
                        isClaiming = uiState.claimingRewardId == reward.id,
                        canAfford = uiState.pointsBalance >= reward.points,
                        onClaim = { onClaimReward(reward.id) },
                    )
                }
            }
            if (uiState.earnedRewards.isNotEmpty()) {
                item(key = "earned_label", span = { GridItemSpan(GRID_COLUMNS) }) {
                    SectionLabel(text = "Earned Rewards")
                }
                items(items = uiState.earnedRewards, key = { "earned_${it.id}" }) { reward ->
                    EarnedRewardItem(reward = reward)
                }
            }
        }
    }
}

@Composable
private fun PointsBalanceCard(points: Int, modifier: Modifier = Modifier) {
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(
                text = "Your Points",
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
private fun SectionLabel(text: String, modifier: Modifier = Modifier) {
    Text(
        text = text,
        style = MaterialTheme.typography.titleLarge,
        color = DesignTokens.Colors.Text.primary,
        fontWeight = FontWeight.Bold,
        modifier = modifier.padding(top = DesignTokens.Spacing.sm),
    )
}

@Composable
private fun RewardGridItem(
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
                    text = "Claim",
                    onClick = onClaim,
                    enabled = canAfford && !reward.isUnlocked,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }
}

@Composable
private fun EarnedRewardItem(reward: Reward, modifier: Modifier = Modifier) {
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

@Composable
private fun RewardsErrorSection(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            Text(
                text = message,
                style = MaterialTheme.typography.bodyLarge,
                color = DesignTokens.Colors.Semantic.error,
            )
            GlassButton(text = "Retry", onClick = onRetry)
        }
    }
}
