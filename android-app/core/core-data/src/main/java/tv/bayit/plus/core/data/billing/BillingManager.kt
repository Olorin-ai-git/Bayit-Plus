package tv.bayit.plus.core.data.billing

import android.app.Activity
import android.content.Context
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.acknowledgePurchase
import com.android.billingclient.api.queryProductDetails
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger

/**
 * Manages Google Play Billing: connection, product queries, purchases,
 * backend verification, and acknowledgement.
 *
 * Wraps [BillingClient] and exposes reactive state via [StateFlow] for
 * products and [SharedFlow] for purchase results. Mirrors iOS StoreManager.
 */
class BillingManager(
    context: Context,
    private val config: BillingProductConfig,
    private val verificationService: BillingVerificationService,
    private val logger: BayitLogger,
    private val scope: CoroutineScope,
) : PurchasesUpdatedListener {

    private val billingClient: BillingClient = BillingClient.newBuilder(context)
        .setListener(this)
        .enablePendingPurchases(
            PendingPurchasesParams.newBuilder().enableOneTimeProducts().build(),
        )
        .build()

    private val _connectionState = MutableStateFlow<BillingConnectionState>(
        BillingConnectionState.Disconnected,
    )
    val connectionState: StateFlow<BillingConnectionState> = _connectionState.asStateFlow()

    private val _products = MutableStateFlow<List<SubscriptionProduct>>(emptyList())
    val products: StateFlow<List<SubscriptionProduct>> = _products.asStateFlow()

    private val _purchaseResult = MutableSharedFlow<PurchaseResult>(extraBufferCapacity = 1)
    val purchaseResult: SharedFlow<PurchaseResult> = _purchaseResult.asSharedFlow()

    fun connect() {
        if (_connectionState.value is BillingConnectionState.Connected) return
        _connectionState.value = BillingConnectionState.Connecting
        logger.debug("Connecting to Google Play Billing")
        billingClient.startConnection(ConnectionListener())
    }

    fun launchPurchaseFlow(activity: Activity, product: SubscriptionProduct) {
        val params = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(
                BillingFlowParams.ProductDetailsParams.newBuilder()
                    .setProductDetails(product.productDetails)
                    .setOfferToken(product.offerToken)
                    .build(),
            ))
            .build()
        logger.debug("Launching purchase flow", mapOf("productId" to product.productId))
        billingClient.launchBillingFlow(activity, params)
    }

    override fun onPurchasesUpdated(result: BillingResult, purchases: List<Purchase>?) {
        when (result.responseCode) {
            BillingClient.BillingResponseCode.OK ->
                purchases?.forEach { scope.launch { processPurchase(it) } }
            BillingClient.BillingResponseCode.USER_CANCELED -> {
                logger.info("Purchase cancelled by user")
                _purchaseResult.tryEmit(PurchaseResult.Cancelled(productId = null))
            }
            else -> {
                logger.error("Purchase error", metadata = mapOf(
                    "responseCode" to result.responseCode.toString(),
                ))
                _purchaseResult.tryEmit(
                    PurchaseResult.Error(result.debugMessage, result.responseCode),
                )
            }
        }
    }

    internal suspend fun queryProducts() {
        val productList = config.allProductIds.map { id ->
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(id)
                .setProductType(BillingClient.ProductType.SUBS)
                .build()
        }
        val result = billingClient.queryProductDetails(
            QueryProductDetailsParams.newBuilder().setProductList(productList).build(),
        )
        if (result.billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
            val mapped = result.productDetailsList.orEmpty().mapNotNull { it.toSubscriptionProduct() }
            _products.value = mapped
            logger.info("Products loaded", mapOf("count" to mapped.size.toString()))
        } else {
            logger.error("Product query failed", metadata = mapOf(
                "responseCode" to result.billingResult.responseCode.toString(),
            ))
        }
    }

    private suspend fun processPurchase(purchase: Purchase) {
        val productId = purchase.products.firstOrNull().orEmpty()
        if (purchase.purchaseState != Purchase.PurchaseState.PURCHASED) {
            _purchaseResult.tryEmit(PurchaseResult.PendingVerification(productId))
            return
        }
        verifyAndAcknowledge(purchase, productId)
    }

    private suspend fun verifyAndAcknowledge(purchase: Purchase, productId: String) {
        when (val result = verificationService.verifyPurchase(purchase.purchaseToken, productId)) {
            is BayitResult.Success -> {
                acknowledgePurchase(purchase)
                _purchaseResult.tryEmit(PurchaseResult.Success(productId, result.data.tier))
                logger.info("Purchase verified", mapOf("productId" to productId))
            }
            is BayitResult.Error -> {
                logger.error("Verification failed", result.exception)
                _purchaseResult.tryEmit(PurchaseResult.Error(
                    result.message ?: result.exception.message.orEmpty(), -1,
                ))
            }
            is BayitResult.Loading -> Unit
        }
    }

    private suspend fun acknowledgePurchase(purchase: Purchase) {
        if (purchase.isAcknowledged) return
        val params = AcknowledgePurchaseParams.newBuilder()
            .setPurchaseToken(purchase.purchaseToken).build()
        val ackResult = billingClient.acknowledgePurchase(params)
        if (ackResult.responseCode != BillingClient.BillingResponseCode.OK) {
            logger.warning("Acknowledgement failed", mapOf(
                "responseCode" to ackResult.responseCode.toString(),
            ))
        }
    }

    fun disconnect() {
        if (billingClient.isReady) billingClient.endConnection()
    }

    private inner class ConnectionListener : BillingClientStateListener {
        override fun onBillingSetupFinished(result: BillingResult) {
            if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                _connectionState.value = BillingConnectionState.Connected
                logger.info("Play Billing connected")
                scope.launch { queryProducts() }
            } else {
                _connectionState.value = BillingConnectionState.Error(
                    result.debugMessage, result.responseCode,
                )
            }
        }

        override fun onBillingServiceDisconnected() {
            _connectionState.value = BillingConnectionState.Disconnected
            logger.warning("Play Billing disconnected")
        }
    }
}
