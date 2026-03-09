package tv.bayit.plus.feature.settings.subscription

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassBadge
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun SubscriptionRoute(
    onNavigateBack: () -> Unit,
    onNavigateToUpgrade: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: SubscriptionViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = androidx.compose.ui.platform.LocalContext.current
    SubscriptionScreen(
        uiState = uiState,
        onNavigateBack = onNavigateBack,
        onUpgrade = onNavigateToUpgrade,
        onManageSubscription = { viewModel.manageSubscription(context) },
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun SubscriptionScreen(
    uiState: SubscriptionUiState,
    onNavigateBack: () -> Unit,
    onUpgrade: () -> Unit,
    onManageSubscription: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = "Subscription",
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = DesignTokens.Colors.Text.primary)
                }
            },
        )
        when (uiState) {
            is SubscriptionUiState.Loading -> GlassLoadingIndicator()
            is SubscriptionUiState.Error -> SubscriptionErrorContent(message = uiState.message, onRetry = onRetry)
            is SubscriptionUiState.Success -> SubscriptionContent(
                state = uiState, onUpgrade = onUpgrade, onManageSubscription = onManageSubscription,
            )
        }
    }
}

@Composable
private fun SubscriptionContent(
    state: SubscriptionUiState.Success,
    onUpgrade: () -> Unit,
    onManageSubscription: () -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        item { Spacer(Modifier.height(DesignTokens.Spacing.base)) }
        item {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(text = "Current Plan", color = DesignTokens.Colors.Text.muted, style = MaterialTheme.typography.bodySmall)
                        if (state.isBetaUser) {
                            GlassBadge(count = 1, modifier = Modifier.padding(start = DesignTokens.Spacing.sm))
                        }
                    }
                    Text(
                        text = state.plan.replaceFirstChar { it.titlecase() },
                        color = DesignTokens.Colors.Primary.light,
                        style = MaterialTheme.typography.headlineSmall,
                    )
                    Spacer(Modifier.height(DesignTokens.Spacing.xs))
                    Text(text = "Status: ${state.status}", color = DesignTokens.Colors.Text.secondary, style = MaterialTheme.typography.bodyMedium)
                    if (state.startDate.isNotEmpty()) {
                        Text(text = "Since: ${state.startDate}", color = DesignTokens.Colors.Text.muted, style = MaterialTheme.typography.bodySmall)
                    }
                    if (state.endDate.isNotEmpty()) {
                        Text(text = "Renews: ${state.endDate}", color = DesignTokens.Colors.Text.muted, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
        item {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    Text(text = "Features Included", color = DesignTokens.Colors.Text.primary, style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(DesignTokens.Spacing.sm))
                    FeatureRow(text = "Live TV with dubbing in 10 languages")
                    FeatureRow(text = "VOD library access")
                    FeatureRow(text = "Radio and podcast streaming")
                    FeatureRow(text = "Offline downloads")
                    if (state.isBetaUser) {
                        FeatureRow(text = "Beta 500 AI credits program")
                    }
                }
            }
        }
        item {
            Spacer(Modifier.height(DesignTokens.Spacing.sm))
            GlassButton(text = "Upgrade Plan", onClick = onUpgrade, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(DesignTokens.Spacing.sm))
            GlassButton(text = "Manage on Google Play", onClick = onManageSubscription, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(DesignTokens.Spacing.xxl))
        }
    }
}

@Composable
private fun FeatureRow(text: String) {
    Row(modifier = Modifier.padding(vertical = DesignTokens.Spacing.xs)) {
        Text(text = "  -  ", color = DesignTokens.Colors.Semantic.success, style = MaterialTheme.typography.bodyMedium)
        Text(text = text, color = DesignTokens.Colors.Text.secondary, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun SubscriptionErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(text = message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = "Retry", onClick = onRetry)
        }
    }
}
