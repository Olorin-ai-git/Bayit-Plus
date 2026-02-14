package tv.bayit.plus.feature.livetv.epg

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun EPGRoute(
    onNavigateToChannel: (String) -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: EPGViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val selectedChannelId by viewModel.selectedChannelId.collectAsStateWithLifecycle()

    EPGScreen(
        uiState = uiState,
        selectedChannelId = selectedChannelId,
        onSelectChannel = { channelId ->
            viewModel.selectChannel(channelId)
            onNavigateToChannel(channelId)
        },
        onRefresh = viewModel::refresh,
        onNavigateBack = onNavigateBack,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun EPGScreen(
    uiState: EPGUiState,
    selectedChannelId: String?,
    onSelectChannel: (String) -> Unit,
    onRefresh: () -> Unit,
    onNavigateBack: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = "TV Guide")
        when (uiState) {
            is EPGUiState.Loading -> GlassLoadingIndicator()
            is EPGUiState.Error -> ErrorContent(message = uiState.message, onRetry = onRetry)
            is EPGUiState.Success -> EPGContent(
                epgData = uiState.epgData,
                selectedChannelId = selectedChannelId,
                isRefreshing = uiState.isRefreshing,
                onSelectChannel = onSelectChannel,
                onRefresh = onRefresh,
            )
        }
    }
}

@Composable
private fun EPGContent(
    epgData: List<Any>,
    selectedChannelId: String?,
    isRefreshing: Boolean,
    onSelectChannel: (String) -> Unit,
    onRefresh: () -> Unit,
) {
    PullToRefreshBox(isRefreshing = isRefreshing, onRefresh = onRefresh) {
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            items(epgData, key = { it.hashCode() }) { channel ->
                val channelId = channel.hashCode().toString()
                val isSelected = channelId == selectedChannelId

                GlassCard(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onSelectChannel(channelId) },
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = channel.toString(),
                                style = MaterialTheme.typography.bodyMedium,
                                color = if (isSelected) DesignTokens.Colors.Primary.light else DesignTokens.Colors.Text.primary,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                            )
                            Text(
                                text = "Now Playing • Next: TBA",
                                style = MaterialTheme.typography.bodySmall,
                                color = DesignTokens.Colors.Text.muted,
                            )
                        }
                        if (isSelected) {
                            Text(
                                text = "LIVE",
                                color = DesignTokens.Colors.Semantic.error,
                                fontSize = DesignTokens.FontSize.xs,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                }
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
            Text(text = message, color = DesignTokens.Colors.Semantic.error, style = MaterialTheme.typography.bodyLarge)
            GlassButton(text = "Retry", onClick = onRetry)
        }
    }
}
