package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.data.billing.GoogleVerificationResponse

interface SubscriptionRepository {
    suspend fun getPlans(): BayitResult<List<Any>>
    suspend fun getCurrentSubscription(): BayitResult<Any>
    suspend fun createCheckout(planId: String, billingPeriod: String): BayitResult<String>
    suspend fun cancelSubscription(): BayitResult<Unit>
    suspend fun createPaymentIntent(planId: String): BayitResult<Any>
    suspend fun verifyGooglePurchase(
        purchaseToken: String,
        productId: String,
    ): BayitResult<GoogleVerificationResponse>
}
