package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.billing.BillingVerificationService
import tv.bayit.plus.core.data.billing.GoogleVerificationResponse
import tv.bayit.plus.core.data.repository.SubscriptionRepository
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Production implementation of [SubscriptionRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping.
 *
 * Endpoint paths mirror the backend subscriptions.py and payments.py routes.
 */
@Singleton
class ApiSubscriptionRepository @Inject constructor(
    private val client: BayitApiClient,
    private val billingVerificationService: BillingVerificationService,
) : SubscriptionRepository {

    private val service: SubscriptionService = client.createService()

    override suspend fun getPlans(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getPlans() }
            response.plans
        }

    override suspend fun getCurrentSubscription(): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.getCurrentSubscription() }
        }

    override suspend fun createCheckout(
        planId: String,
        billingPeriod: String,
    ): BayitResult<String> = runCatchingResult {
        val request = CheckoutRequestBody(planId = planId, billingPeriod = billingPeriod)
        val response = client.safeApiCall { service.createCheckout(request) }
        response.checkoutUrl
    }

    override suspend fun cancelSubscription(): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.cancelSubscription() }
            Unit
        }

    override suspend fun createPaymentIntent(planId: String): BayitResult<Any> =
        runCatchingResult {
            val request = PaymentIntentRequestBody(planId = planId)
            client.safeApiCall { service.createPaymentIntent(request) }
        }

    override suspend fun verifyGooglePurchase(
        purchaseToken: String,
        productId: String,
    ): BayitResult<GoogleVerificationResponse> =
        billingVerificationService.verifyPurchase(purchaseToken, productId)
}

private interface SubscriptionService {

    @GET("api/v1/subscriptions/plans")
    suspend fun getPlans(): PlansResponse

    @GET("api/v1/subscriptions/current")
    suspend fun getCurrentSubscription(): CurrentSubscriptionResponse

    @POST("api/v1/subscriptions/checkout")
    suspend fun createCheckout(@Body request: CheckoutRequestBody): CheckoutResponse

    @POST("api/v1/subscriptions/cancel")
    suspend fun cancelSubscription(): CancelSubscriptionResponse

    @POST("api/v1/payments/create-payment-intent")
    suspend fun createPaymentIntent(@Body request: PaymentIntentRequestBody): PaymentIntentResponse
}

/** Response containing available subscription plans. */
@Serializable
private data class PlansResponse(
    val plans: List<SubscriptionPlan>,
)

/** A single subscription plan returned by the plans endpoint. */
@Serializable
data class SubscriptionPlan(
    val id: String,
    val name: String,
    val price: Double,
    @SerialName("priceYearly") val priceYearly: Double? = null,
    @SerialName("includesAI") val includesAI: Boolean = false,
    @SerialName("aiCredits") val aiCredits: Int = 0,
    @SerialName("maxWidgets") val maxWidgets: Int = 1,
    @SerialName("maxProfiles") val maxProfiles: Int = 1,
    @SerialName("prioritySupport") val prioritySupport: Boolean = false,
)

/** Current subscription response. */
@Serializable
private data class CurrentSubscriptionResponse(
    val subscription: CurrentSubscription? = null,
)

/** Current subscription details. */
@Serializable
private data class CurrentSubscription(
    val id: String,
    val plan: String,
    val status: String,
    @SerialName("billingPeriod") val billingPeriod: String? = null,
    @SerialName("currentPeriodEnd") val currentPeriodEnd: String? = null,
    @SerialName("cancelAtPeriodEnd") val cancelAtPeriodEnd: Boolean = false,
    val price: String? = null,
)

/** Request body for creating a checkout session. */
@Serializable
private data class CheckoutRequestBody(
    @SerialName("plan_id") val planId: String,
    @SerialName("billing_period") val billingPeriod: String,
)

/** Response from checkout creation. */
@Serializable
private data class CheckoutResponse(
    @SerialName("checkoutUrl") val checkoutUrl: String,
)

/** Response from cancellation. */
@Serializable
private data class CancelSubscriptionResponse(
    val message: String? = null,
)

/** Request body for creating a payment intent. */
@Serializable
private data class PaymentIntentRequestBody(
    @SerialName("plan_id") val planId: String,
)

/** Response from payment intent creation. */
@Serializable
private data class PaymentIntentResponse(
    @SerialName("payment_intent_secret") val paymentIntentSecret: String,
    @SerialName("ephemeral_key") val ephemeralKey: String,
    @SerialName("customer_id") val customerId: String,
)
