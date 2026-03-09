package tv.bayit.plus.core.data.billing

import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.QueryPurchasesParams
import com.android.billingclient.api.queryPurchasesAsync

/**
 * Maps a [ProductDetails] from Google Play Billing to the app's
 * [SubscriptionProduct] model. Returns null if the product has no
 * subscription offer (e.g., a one-time product).
 */
internal fun ProductDetails.toSubscriptionProduct(): SubscriptionProduct? {
    val offer = subscriptionOfferDetails?.firstOrNull() ?: return null
    val pricingPhase = offer.pricingPhases.pricingPhaseList.firstOrNull() ?: return null

    return SubscriptionProduct(
        productId = productId,
        title = title,
        description = description,
        formattedPrice = pricingPhase.formattedPrice,
        priceMicros = pricingPhase.priceAmountMicros,
        currencyCode = pricingPhase.priceCurrencyCode,
        billingPeriod = pricingPhase.billingPeriod,
        productDetails = this,
        offerToken = offer.offerToken,
    )
}

/**
 * Queries existing subscription purchases from Google Play.
 *
 * Used to restore subscription state on app launch without requiring
 * a new purchase flow.
 */
suspend fun BillingClient.queryExistingSubscriptions(): List<Purchase> {
    val params = QueryPurchasesParams.newBuilder()
        .setProductType(BillingClient.ProductType.SUBS)
        .build()
    val result = queryPurchasesAsync(params)
    return if (result.billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
        result.purchasesList
    } else {
        emptyList()
    }
}

/**
 * Returns a human-readable billing period label from an ISO 8601 duration.
 *
 * Google Play returns periods like "P1M" (monthly), "P1Y" (yearly).
 */
fun SubscriptionProduct.billingPeriodLabel(): String = when (billingPeriod) {
    "P1M" -> "Monthly"
    "P3M" -> "Quarterly"
    "P6M" -> "Semi-Annual"
    "P1Y" -> "Yearly"
    else -> billingPeriod
}
