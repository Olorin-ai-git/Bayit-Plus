package tv.bayit.plus.feature.auth.subscription

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun SubscribeRoute(
    onNavigateToCheckout: (String) -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: SubscribeViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val selectedPlanId by viewModel.selectedPlanId.collectAsStateWithLifecycle()
    val selectedBillingPeriod by viewModel.selectedBillingPeriod.collectAsStateWithLifecycle()

    val success = uiState as? SubscribeUiState.Success
    if (success?.checkoutUrl != null) {
        onNavigateToCheckout(success.checkoutUrl)
    }

    SubscribeScreen(
        uiState = uiState,
        selectedPlanId = selectedPlanId,
        selectedBillingPeriod = selectedBillingPeriod,
        onSelectPlan = viewModel::selectPlan,
        onSelectBillingPeriod = viewModel::selectBillingPeriod,
        onStartCheckout = viewModel::startCheckout,
        onNavigateBack = onNavigateBack,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun SubscribeScreen(
    uiState: SubscribeUiState,
    selectedPlanId: String?,
    selectedBillingPeriod: String,
    onSelectPlan: (String) -> Unit,
    onSelectBillingPeriod: (String) -> Unit,
    onStartCheckout: () -> Unit,
    onNavigateBack: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = "Subscribe to Bayit+")
        when (uiState) {
            is SubscribeUiState.Loading -> GlassLoadingIndicator()
            is SubscribeUiState.Error -> SubscribeErrorContent(message = uiState.message, onRetry = onRetry)
            is SubscribeUiState.Success -> SubscribeContent(
                state = uiState,
                selectedPlanId = selectedPlanId,
                selectedBillingPeriod = selectedBillingPeriod,
                onSelectPlan = onSelectPlan,
                onSelectBillingPeriod = onSelectBillingPeriod,
                onStartCheckout = onStartCheckout,
            )
        }
    }
}

@Composable
private fun SubscribeContent(
    state: SubscribeUiState.Success,
    selectedPlanId: String?,
    selectedBillingPeriod: String,
    onSelectPlan: (String) -> Unit,
    onSelectBillingPeriod: (String) -> Unit,
    onStartCheckout: () -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        item { Spacer(Modifier.height(DesignTokens.Spacing.sm)) }

        item {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    Text(
                        text = "Billing Period",
                        style = MaterialTheme.typography.titleMedium,
                        color = DesignTokens.Colors.Text.primary,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Spacer(Modifier.height(DesignTokens.Spacing.sm))
                    Row(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
                        BillingPeriodChip(
                            label = "Monthly",
                            period = "monthly",
                            isSelected = selectedBillingPeriod == "monthly",
                            onClick = { onSelectBillingPeriod("monthly") },
                        )
                        BillingPeriodChip(
                            label = "Yearly (Save 20%)",
                            period = "yearly",
                            isSelected = selectedBillingPeriod == "yearly",
                            onClick = { onSelectBillingPeriod("yearly") },
                        )
                    }
                }
            }
        }

        item {
            Text(
                text = "Choose Your Plan",
                style = MaterialTheme.typography.titleLarge,
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.Bold,
            )
        }

        items(state.plans, key = { it.hashCode() }) { plan ->
            val planId = plan.hashCode().toString()
            SubscribePlanCard(
                planText = plan.toString(),
                planId = planId,
                isSelected = planId == selectedPlanId,
                onSelectPlan = onSelectPlan,
            )
        }

        item {
            SubscribeCheckoutFooter(
                checkoutError = state.checkoutError,
                isProcessingCheckout = state.isProcessingCheckout,
                selectedPlanId = selectedPlanId,
                onStartCheckout = onStartCheckout,
            )
        }

        item { Spacer(Modifier.height(DesignTokens.Spacing.xxl)) }
    }
}
