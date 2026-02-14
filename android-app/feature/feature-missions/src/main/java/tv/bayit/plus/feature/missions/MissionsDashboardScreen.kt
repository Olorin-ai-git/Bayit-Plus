package tv.bayit.plus.feature.missions

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun MissionsDashboardRoute(
    onNavigateToInteractiveMission: (String) -> Unit,
    onNavigateToStarStory: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: MissionsDashboardViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    MissionsDashboardScreen(
        uiState = uiState,
        onTabSelected = viewModel::selectTab,
        onClaimReward = viewModel::claimReward,
        onMissionClick = onNavigateToInteractiveMission,
        onStarStoryClick = onNavigateToStarStory,
        onRefresh = viewModel::refresh,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun MissionsDashboardScreen(
    uiState: MissionsDashboardUiState,
    onTabSelected: (MissionTab) -> Unit,
    onClaimReward: (String) -> Unit,
    onMissionClick: (String) -> Unit,
    onStarStoryClick: () -> Unit,
    onRefresh: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    when (uiState) {
        is MissionsDashboardUiState.Loading -> GlassLoadingIndicator(modifier = modifier)
        is MissionsDashboardUiState.Success -> MissionsContent(
            uiState = uiState,
            onTabSelected = onTabSelected,
            onClaimReward = onClaimReward,
            onMissionClick = onMissionClick,
            onStarStoryClick = onStarStoryClick,
            onRefresh = onRefresh,
            modifier = modifier,
        )
        is MissionsDashboardUiState.Error -> MissionsErrorSection(
            message = uiState.message,
            onRetry = onRetry,
            modifier = modifier,
        )
    }
}

@Composable
private fun MissionsContent(
    uiState: MissionsDashboardUiState.Success,
    onTabSelected: (MissionTab) -> Unit,
    onClaimReward: (String) -> Unit,
    onMissionClick: (String) -> Unit,
    onStarStoryClick: () -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val missions = when (uiState.selectedTab) {
        MissionTab.DAILY -> uiState.dailyMissions
        MissionTab.WEEKLY -> uiState.weeklyMissions
    }

    PullToRefreshBox(
        isRefreshing = uiState.isRefreshing,
        onRefresh = onRefresh,
        modifier = modifier,
    ) {
        LazyColumn(
            contentPadding = PaddingValues(DesignTokens.Spacing.base),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
            modifier = Modifier.fillMaxSize(),
        ) {
            item(key = "missions_header") {
                MissionsHeader()
            }
            item(key = "tab_selector") {
                MissionTabSelector(selectedTab = uiState.selectedTab, onTabSelected = onTabSelected)
            }
            item(key = "star_story_link") {
                GlassButton(
                    text = "Star Stories",
                    onClick = onStarStoryClick,
                    isPrimary = false,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            items(items = missions, key = { it.id }) { mission ->
                MissionCard(
                    mission = mission,
                    isClaiming = uiState.claimingMissionId == mission.id,
                    onClaimReward = { onClaimReward(mission.id) },
                    onClick = { onMissionClick(mission.id) },
                )
            }
        }
    }
}

@Composable
private fun MissionsErrorSection(
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
