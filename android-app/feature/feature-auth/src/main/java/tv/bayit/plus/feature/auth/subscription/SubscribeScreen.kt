package tv.bayit.plus.feature.auth.subscription

import androidx.compose.foundation.clickable
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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.RadioButtonDefaults
import androidx.compose.material3.Text
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
            is SubscribeUiState.Error -> ErrorContent(message = uiState.message, onRetry = onRetry)
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
            val isSelected = planId == selectedPlanId

            GlassCard(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onSelectPlan(planId) },
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = plan.toString(),
                            style = MaterialTheme.typography.bodyMedium,
                            color = if (isSelected) DesignTokens.Colors.Primary.light else DesignTokens.Colors.Text.primary,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                        )
                    }
                    RadioButton(
                        selected = isSelected,
                        onClick = { onSelectPlan(planId) },
                        colors = RadioButtonDefaults.colors(
                            selectedColor = DesignTokens.Colors.Primary.base,
                        ),
                    )
                }
            }
        }

        item {
            state.checkoutError?.let {
                Text(
                    text = it,
                    color = DesignTokens.Colors.Semantic.error,
                    style = MaterialTheme.typography.bodyMedium,
                )
            }

            if (state.isProcessingCheckout) {
                GlassSpinner(size = SpinnerSize.MEDIUM, modifier = Modifier.padding(DesignTokens.Spacing.lg))
            } else {
                GlassButton(
                    text = "Continue to Checkout",
                    onClick = onStartCheckout,
                    enabled = selectedPlanId != null,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }

        item { Spacer(Modifier.height(DesignTokens.Spacing.xxl)) }
    }
}

@Composable
private fun BillingPeriodChip(
    label: String,
    period: String,
    isSelected: Boolean,
    onClick: () -> Unit,
) {
    GlassCard(
        modifier = Modifier.clickable(onClick = onClick),
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = if (isSelected) DesignTokens.Colors.Primary.light else DesignTokens.Colors.Text.secondary,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
        )
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
