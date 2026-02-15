package tv.bayit.plus.core.testing

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.UserSubscription

/**
 * Fake implementation of SubscriptionRepository for testing.
 */
class FakeSubscriptionRepository {

    data class SubscriptionPlan(
        val id: String,
        val name: String,
        val price: Double,
        val billingPeriod: String
    )

    data class PaymentIntent(
        val id: String,
        val clientSecret: String,
        val planId: String
    )

    private val plans = mutableListOf<SubscriptionPlan>()
    private var currentSubscription: UserSubscription? = null

    var shouldReturnError = false
    var errorMessage = "Subscription repository error"

    suspend fun getPlans(): BayitResult<List<SubscriptionPlan>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(plans.toList())
        }
    }

    suspend fun getCurrentSubscription(): BayitResult<UserSubscription> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else if (currentSubscription != null) {
            BayitResult.Success(currentSubscription!!)
        } else {
            BayitResult.Error(Exception("No active subscription"))
        }
    }

    suspend fun createCheckout(planId: String, billingPeriod: String): BayitResult<String> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success("https://checkout.example.com/session-${System.currentTimeMillis()}")
        }
    }

    suspend fun cancelSubscription(): BayitResult<Unit> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            currentSubscription = null
            BayitResult.Success(Unit)
        }
    }

    suspend fun createPaymentIntent(planId: String): BayitResult<PaymentIntent> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val intent = PaymentIntent(
                id = "pi_${System.currentTimeMillis()}",
                clientSecret = "secret_${System.currentTimeMillis()}",
                planId = planId
            )
            BayitResult.Success(intent)
        }
    }

    fun setPlans(plansList: List<SubscriptionPlan>) {
        plans.clear()
        plans.addAll(plansList)
    }

    fun setCurrentSubscription(subscription: UserSubscription?) {
        currentSubscription = subscription
    }

    fun clear() {
        plans.clear()
        currentSubscription = null
        shouldReturnError = false
    }
}
