package tv.bayit.plus.core.data.billing

/**
 * Google Play subscription product identifiers.
 *
 * These IDs must match the products configured in the Google Play Console.
 * They are injected via Hilt so they can be overridden in tests.
 */
data class BillingProductConfig(
    val monthlyProductId: String,
    val yearlyProductId: String,
) {
    /** All product IDs for querying Play Billing. */
    val allProductIds: List<String>
        get() = listOf(monthlyProductId, yearlyProductId)
}
