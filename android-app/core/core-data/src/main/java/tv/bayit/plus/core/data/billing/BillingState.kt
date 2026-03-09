package tv.bayit.plus.core.data.billing

import com.android.billingclient.api.ProductDetails

/**
 * Represents the current state of the billing connection and products.
 */
sealed interface BillingConnectionState {
    data object Disconnected : BillingConnectionState
    data object Connecting : BillingConnectionState
    data object Connected : BillingConnectionState
    data class Error(val message: String, val responseCode: Int) : BillingConnectionState
}

/**
 * Represents a subscription product available for purchase.
 */
data class SubscriptionProduct(
    val productId: String,
    val title: String,
    val description: String,
    val formattedPrice: String,
    val priceMicros: Long,
    val currencyCode: String,
    val billingPeriod: String,
    val productDetails: ProductDetails,
    val offerToken: String,
)

/**
 * Result of a purchase attempt.
 */
sealed interface PurchaseResult {
    data class Success(val productId: String, val tier: String) : PurchaseResult
    data class Cancelled(val productId: String?) : PurchaseResult
    data class Error(val message: String, val responseCode: Int) : PurchaseResult
    data class PendingVerification(val productId: String) : PurchaseResult
}

/**
 * Backend verification response for Google Play purchases.
 */
data class GoogleVerificationResponse(
    val status: String,
    val tier: String,
)
