package tv.bayit.plus.feature.auth.subscription

import android.app.Activity
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.data.billing.SubscriptionProduct
import tv.bayit.plus.core.data.billing.billingPeriodLabel
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun SubscribeRoute(
    onSubscriptionComplete: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: SubscribeViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val products by viewModel.products.collectAsStateWithLifecycle()
    val selectedProduct by viewModel.selectedProduct.collectAsStateWithLifecycle()

    val success = uiState as? SubscribeUiState.Success
    if (success?.purchaseComplete == true) {
        onSubscriptionComplete()
    }

    val activity = LocalContext.current as? Activity

    SubscribeScreen(
        uiState = uiState,
        products = products,
        selectedProduct = selectedProduct,
        onSelectProduct = viewModel::selectProduct,
        onStartPurchase = { activity?.let { viewModel.startPurchase(it) } },
        onNavigateBack = onNavigateBack,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun SubscribeScreen(
    uiState: SubscribeUiState,
    products: List<SubscriptionProduct>,
    selectedProduct: SubscriptionProduct?,
    onSelectProduct: (SubscriptionProduct) -> Unit,
    onStartPurchase: () -> Unit,
    onNavigateBack: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = "Subscribe to Bayit+")
        when (uiState) {
            is SubscribeUiState.Loading -> GlassLoadingIndicator()
            is SubscribeUiState.Error -> SubscribeErrorContent(
                message = uiState.message, onRetry = onRetry,
            )
            is SubscribeUiState.Success -> SubscribeContent(
                state = uiState,
                products = products,
                selectedProduct = selectedProduct,
                onSelectProduct = onSelectProduct,
                onStartPurchase = onStartPurchase,
            )
        }
    }
}

@Composable
private fun SubscribeContent(
    state: SubscribeUiState.Success,
    products: List<SubscriptionProduct>,
    selectedProduct: SubscriptionProduct?,
    onSelectProduct: (SubscriptionProduct) -> Unit,
    onStartPurchase: () -> Unit,
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        item { Spacer(Modifier.height(DesignTokens.Spacing.sm)) }
        item {
            Text(
                text = "Choose Your Plan",
                style = MaterialTheme.typography.titleLarge,
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.Bold,
            )
        }
        items(products, key = { it.productId }) { product ->
            SubscriptionProductCard(
                product = product,
                isSelected = product.productId == selectedProduct?.productId,
                onSelect = { onSelectProduct(product) },
            )
        }
        if (products.isEmpty()) {
            item {
                Text(
                    text = "Loading available plans...",
                    style = MaterialTheme.typography.bodyMedium,
                    color = DesignTokens.Colors.Text.muted,
                )
            }
        }
        item {
            SubscribeCheckoutFooter(
                checkoutError = state.purchaseError,
                isProcessingCheckout = state.isProcessingPurchase,
                selectedPlanId = selectedProduct?.productId,
                onStartCheckout = onStartPurchase,
            )
        }
        item { Spacer(Modifier.height(DesignTokens.Spacing.xxl)) }
    }
}
