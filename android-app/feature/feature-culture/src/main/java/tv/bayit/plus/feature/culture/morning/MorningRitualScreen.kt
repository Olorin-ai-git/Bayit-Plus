package tv.bayit.plus.feature.culture.morning

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
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
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.designsystem.i18n.bayitString

@Composable
fun MorningRitualRoute(
    modifier: Modifier = Modifier,
    viewModel: MorningRitualViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    MorningRitualScreen(
        uiState = uiState,
        onRefresh = viewModel::refresh,
        modifier = modifier,
    )
}

@Composable
internal fun MorningRitualScreen(
    uiState: MorningRitualUiState,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
) {
    when (uiState) {
        is MorningRitualUiState.Loading -> GlassLoadingIndicator(modifier = modifier)
        is MorningRitualUiState.Success -> {
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
                    item(key = "morning_header") {
                        MorningHeader()
                    }
                    item(key = "daily_content") {
                        DailyContentSection()
                    }
                    item(key = "modeh_ani") {
                        RitualSection(
                            title = bayitString("culture.morning.modehAni"),
                            subtitle = bayitString("culture.morning.modehAniDescription"),
                        )
                    }
                    item(key = "netilat_yadayim") {
                        RitualSection(
                            title = bayitString("culture.morning.netilatYadayim"),
                            subtitle = bayitString("culture.morning.netilatYadayimDescription"),
                        )
                    }
                    item(key = "shacharit") {
                        RitualSection(
                            title = bayitString("culture.morning.shacharit"),
                            subtitle = bayitString("culture.morning.shacharitDescription"),
                        )
                    }
                }
            }
        }
        is MorningRitualUiState.Error -> MorningRitualErrorSection(
            message = uiState.message,
            onRetry = onRefresh,
            modifier = modifier,
        )
    }
}

@Composable
private fun MorningHeader(modifier: Modifier = Modifier) {
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Column {
            Text(
                text = bayitString("culture.morning.title"),
                style = MaterialTheme.typography.headlineMedium,
                color = DesignTokens.Colors.Primary.light,
                fontWeight = FontWeight.Bold,
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            Text(
                text = bayitString("culture.morning.description"),
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.secondary,
            )
        }
    }
}

@Composable
private fun DailyContentSection(modifier: Modifier = Modifier) {
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Column {
            Text(
                text = bayitString("culture.morning.dailyInspiration"),
                style = MaterialTheme.typography.titleMedium,
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            Text(
                text = bayitString("culture.morning.dailyInspirationDescription"),
                style = MaterialTheme.typography.bodySmall,
                color = DesignTokens.Colors.Text.secondary,
            )
        }
    }
}

@Composable
private fun RitualSection(
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier,
) {
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Column {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xxs))
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = DesignTokens.Colors.Text.muted,
            )
        }
    }
}

@Composable
private fun MorningRitualErrorSection(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
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
