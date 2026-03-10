package tv.bayit.plus.feature.auth.subscription

import android.app.Activity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.billing.BillingConnectionState
import tv.bayit.plus.core.data.billing.BillingManager
import tv.bayit.plus.core.data.billing.PurchaseResult
import tv.bayit.plus.core.common.i18n.BayitStringProvider
import tv.bayit.plus.core.data.billing.SubscriptionProduct
import javax.inject.Inject

@HiltViewModel
class SubscribeViewModel @Inject constructor(
    private val billingManager: BillingManager,
    private val logger: BayitLogger,
    private val stringProvider: BayitStringProvider,
) : ViewModel() {

    private val _uiState = MutableStateFlow<SubscribeUiState>(SubscribeUiState.Loading)
    val uiState: StateFlow<SubscribeUiState> = _uiState.asStateFlow()

    val products: StateFlow<List<SubscriptionProduct>> = billingManager.products
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(), emptyList())

    private val _selectedProduct = MutableStateFlow<SubscriptionProduct?>(null)
    val selectedProduct: StateFlow<SubscriptionProduct?> = _selectedProduct.asStateFlow()

    init {
        connectBilling()
        observeConnectionState()
        observePurchaseResults()
    }

    fun selectProduct(product: SubscriptionProduct) {
        _selectedProduct.value = product
        logger.debug("Product selected", mapOf("productId" to product.productId))
    }

    fun startPurchase(activity: Activity) {
        val product = _selectedProduct.value
        if (product == null) {
            updateSuccessState { copy(purchaseError = stringProvider.string("subscription.selectPlan")) }
            return
        }
        logger.debug("Starting native purchase", mapOf("productId" to product.productId))
        updateSuccessState { copy(isProcessingPurchase = true, purchaseError = null) }
        billingManager.launchPurchaseFlow(activity, product)
    }

    fun retry() {
        _uiState.value = SubscribeUiState.Loading
        billingManager.connect()
    }

    private fun connectBilling() {
        billingManager.connect()
    }

    private fun observeConnectionState() {
        viewModelScope.launch {
            billingManager.connectionState.collect { state ->
                when (state) {
                    is BillingConnectionState.Connected -> {
                        logger.info("Billing connected, loading products")
                        _uiState.value = SubscribeUiState.Success(
                            isProcessingPurchase = false,
                            purchaseError = null,
                        )
                    }
                    is BillingConnectionState.Error -> {
                        logger.error("Billing connection error", metadata = mapOf(
                            "responseCode" to state.responseCode.toString(),
                        ))
                        _uiState.value = SubscribeUiState.Error(state.message)
                    }
                    is BillingConnectionState.Connecting ->
                        _uiState.value = SubscribeUiState.Loading
                    is BillingConnectionState.Disconnected -> Unit
                }
            }
        }
    }

    private fun observePurchaseResults() {
        viewModelScope.launch {
            billingManager.purchaseResult.collect { result ->
                when (result) {
                    is PurchaseResult.Success -> {
                        logger.info("Purchase successful", mapOf("tier" to result.tier))
                        updateSuccessState {
                            copy(isProcessingPurchase = false, purchaseComplete = true)
                        }
                    }
                    is PurchaseResult.Cancelled -> {
                        logger.info("Purchase cancelled")
                        updateSuccessState { copy(isProcessingPurchase = false) }
                    }
                    is PurchaseResult.Error -> {
                        logger.error("Purchase failed", metadata = mapOf(
                            "message" to result.message,
                        ))
                        updateSuccessState {
                            copy(isProcessingPurchase = false, purchaseError = result.message)
                        }
                    }
                    is PurchaseResult.PendingVerification ->
                        updateSuccessState { copy(isProcessingPurchase = true) }
                }
            }
        }
    }

    private inline fun updateSuccessState(update: SubscribeUiState.Success.() -> SubscribeUiState.Success) {
        val current = _uiState.value as? SubscribeUiState.Success ?: return
        _uiState.value = current.update()
    }

    override fun onCleared() {
        super.onCleared()
        billingManager.disconnect()
    }
}

sealed interface SubscribeUiState {
    data object Loading : SubscribeUiState

    data class Success(
        val isProcessingPurchase: Boolean,
        val purchaseError: String?,
        val purchaseComplete: Boolean = false,
    ) : SubscribeUiState

    data class Error(val message: String) : SubscribeUiState
}
