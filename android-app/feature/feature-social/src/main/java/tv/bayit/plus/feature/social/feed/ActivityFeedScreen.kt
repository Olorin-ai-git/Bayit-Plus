package tv.bayit.plus.feature.social.feed

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.designsystem.i18n.bayitString

@Composable
fun ActivityFeedRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ActivityFeedViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    ActivityFeedScreen(
        uiState = uiState,
        onRefresh = viewModel::refresh,
        modifier = modifier,
    )
}

@Composable
internal fun ActivityFeedScreen(
    uiState: ActivityFeedUiState,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = bayitString("social.activityFeed.title"))
        when (uiState) {
            is ActivityFeedUiState.Loading -> GlassLoadingIndicator()
            is ActivityFeedUiState.Success -> ActivityList(
                activities = uiState.activities,
                onRefresh = onRefresh,
            )
            is ActivityFeedUiState.Error -> ErrorContent(
                message = uiState.message,
                onRetry = onRefresh,
            )
        }
    }
}

@Composable
private fun ActivityList(activities: List<ActivityItem>, onRefresh: () -> Unit) {
    PullToRefreshBox(
        isRefreshing = false,
        onRefresh = onRefresh,
    ) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = DesignTokens.Spacing.base),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            items(
                items = activities,
                key = { "${it.friendName}_${it.timestamp}" },
            ) { activity ->
                ActivityCard(activity = activity)
            }
        }
    }
}

@Composable
private fun ActivityCard(activity: ActivityItem) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
            verticalAlignment = Alignment.Top,
        ) {
            CachedAsyncImage(
                url = activity.avatarUrl,
                contentDescription = activity.friendName,
                modifier = Modifier.size(40.dp).clip(CircleShape),
            )
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
            ) {
                Text(
                    text = buildAnnotatedString {
                        withStyle(
                            SpanStyle(
                                fontWeight = FontWeight.SemiBold,
                                color = DesignTokens.Colors.Text.primary,
                            ),
                        ) {
                            append(activity.friendName)
                        }
                        append(" ")
                        withStyle(SpanStyle(color = DesignTokens.Colors.Text.secondary)) {
                            append(activity.action)
                        }
                        if (activity.contentTitle != null) {
                            append(" ")
                            withStyle(
                                SpanStyle(
                                    fontWeight = FontWeight.Medium,
                                    color = DesignTokens.Colors.Primary.light,
                                ),
                            ) {
                                append(activity.contentTitle)
                            }
                        }
                    },
                    fontSize = DesignTokens.FontSize.base,
                )
                Text(
                    text = activity.timestamp,
                    color = DesignTokens.Colors.Text.muted,
                    fontSize = DesignTokens.FontSize.xs,
                )
            }
        }
    }
}

@Composable
private fun ErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            Text(
                text = message,
                color = DesignTokens.Colors.Semantic.error,
                style = MaterialTheme.typography.bodyLarge,
            )
            GlassButton(text = bayitString("common.retry"), onClick = onRetry)
        }
    }
}
