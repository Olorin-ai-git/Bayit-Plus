package tv.bayit.plus.feature.rewards.beta

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
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.designsystem.i18n.bayitString

@Composable
fun BetaCreditsRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: BetaCreditsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    BetaCreditsScreen(
        uiState = uiState,
        onRedeem = viewModel::redeemCredits,
        onRefresh = viewModel::refresh,
        onRetry = viewModel::retry,
        onNavigateBack = onNavigateBack,
        modifier = modifier,
    )
}

@Composable
internal fun BetaCreditsScreen(
    uiState: BetaCreditsUiState,
    onRedeem: (Int, String) -> Unit,
    onRefresh: () -> Unit,
    onRetry: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = bayitString("rewards.beta.title"),
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = bayitString("common.back"), tint = DesignTokens.Colors.Text.primary)
                }
            },
        )
        when (uiState) {
            is BetaCreditsUiState.Loading -> GlassLoadingIndicator()
            is BetaCreditsUiState.Error -> CreditErrorContent(message = uiState.message, onRetry = onRetry)
            is BetaCreditsUiState.Success -> CreditContent(state = uiState, onRedeem = onRedeem, onRefresh = onRefresh)
        }
    }
}

@Composable
private fun CreditContent(
    state: BetaCreditsUiState.Success,
    onRedeem: (Int, String) -> Unit,
    onRefresh: () -> Unit,
) {
    PullToRefreshBox(isRefreshing = state.isRefreshing, onRefresh = onRefresh) {
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            item(key = "balance") {
                Spacer(Modifier.height(DesignTokens.Spacing.base))
                BalanceCard(balance = state.balance)
            }
            if (state.eligibleFeatures.isNotEmpty()) {
                item(key = "redeem_header") {
                    Text(
                        text = bayitString("rewards.beta.redeemCredits"),
                        style = MaterialTheme.typography.titleLarge,
                        color = DesignTokens.Colors.Text.primary,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(top = DesignTokens.Spacing.sm),
                    )
                }
                items(items = state.eligibleFeatures, key = { "feature_${it.hashCode()}" }) { feature ->
                    FeatureRedeemItem(
                        feature = feature,
                        balance = state.balance,
                        isRedeeming = false,
                        onRedeem = onRedeem,
                    )
                }
            }
            if (state.transactions.isNotEmpty()) {
                item(key = "history_header") {
                    Text(
                        text = bayitString("rewards.beta.usageHistory"),
                        style = MaterialTheme.typography.titleLarge,
                        color = DesignTokens.Colors.Text.primary,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(top = DesignTokens.Spacing.sm),
                    )
                }
                items(items = state.transactions, key = { "tx_${it.hashCode()}" }) { transaction ->
                    TransactionItem(transaction = transaction)
                }
            }
            item { Spacer(Modifier.height(DesignTokens.Spacing.xxl)) }
        }
    }
}

@Composable
private fun BalanceCard(balance: Int) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
            Text(text = bayitString("rewards.beta.creditsAvailable"), style = MaterialTheme.typography.titleMedium, color = DesignTokens.Colors.Text.secondary)
            Spacer(Modifier.height(DesignTokens.Spacing.xs))
            Text(
                text = balance.toString(),
                style = MaterialTheme.typography.displaySmall,
                color = DesignTokens.Colors.gold,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.height(DesignTokens.Spacing.xs))
            Text(text = bayitString("rewards.beta.programName"), style = MaterialTheme.typography.bodySmall, color = DesignTokens.Colors.Text.muted)
        }
    }
}

@Composable
private fun FeatureRedeemItem(feature: Any, balance: Int, isRedeeming: Boolean, onRedeem: (Int, String) -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(text = feature.toString(), style = MaterialTheme.typography.bodyMedium, color = DesignTokens.Colors.Text.primary)
            }
            if (isRedeeming) {
                GlassSpinner(size = SpinnerSize.SMALL)
            } else {
                GlassButton(text = bayitString("rewards.beta.redeem"), onClick = { onRedeem(1, feature.hashCode().toString()) }, enabled = balance > 0)
            }
        }
    }
}

@Composable
private fun TransactionItem(transaction: Any) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Text(text = transaction.toString(), style = MaterialTheme.typography.bodyMedium, color = DesignTokens.Colors.Text.secondary)
    }
}

@Composable
private fun CreditErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(text = message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = bayitString("common.retry"), onClick = onRetry)
        }
    }
}
