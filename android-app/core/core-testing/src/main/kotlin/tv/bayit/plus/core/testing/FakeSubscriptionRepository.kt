package tv.bayit.plus.core.testing

import tv.bayit.plus.core.common.BayitResult

/**
 * Fake implementation of SubscriptionRepository for testing.
 */
class FakeSubscriptionRepository {

    private val plans = mutableListOf<Any>()
    private var currentSubscription: Any? = null

    var shouldReturnError = false
    var errorMessage = "Subscription repository error"

    suspend fun getPlans(): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(plans.toList())
        }
    }

    suspend fun getCurrentSubscription(): BayitResult<Any> {
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

    suspend fun createPaymentIntent(planId: String): BayitResult<Any> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val intent = mapOf(
                "id" to "pi_${System.currentTimeMillis()}",
                "clientSecret" to "secret_${System.currentTimeMillis()}",
                "planId" to planId
            )
            BayitResult.Success(intent)
        }
    }

    fun setPlans(plansList: List<Any>) {
        plans.clear()
        plans.addAll(plansList)
    }

    fun setCurrentSubscription(subscription: Any?) {
        currentSubscription = subscription
    }

    fun clear() {
        plans.clear()
        currentSubscription = null
        shouldReturnError = false
    }
}
