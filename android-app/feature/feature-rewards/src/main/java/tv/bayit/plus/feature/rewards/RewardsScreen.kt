package tv.bayit.plus.feature.rewards

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
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
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.designsystem.i18n.bayitString

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
                    SectionLabel(text = bayitString("rewards.availableRewards"))
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
                    SectionLabel(text = bayitString("rewards.earnedRewards"))
                }
                items(items = uiState.earnedRewards, key = { "earned_${it.id}" }) { reward ->
                    EarnedRewardItem(reward = reward)
                }
            }
        }
    }
}

@Composable
internal fun SectionLabel(text: String, modifier: Modifier = Modifier) {
    Text(
        text = text,
        style = MaterialTheme.typography.titleLarge,
        color = DesignTokens.Colors.Text.primary,
        fontWeight = FontWeight.Bold,
        modifier = modifier.padding(top = DesignTokens.Spacing.sm),
    )
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
            GlassButton(text = bayitString("common.retry"), onClick = onRetry)
        }
    }
}
