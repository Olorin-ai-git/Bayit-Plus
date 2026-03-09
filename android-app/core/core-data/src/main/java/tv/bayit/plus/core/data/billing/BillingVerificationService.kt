package tv.bayit.plus.core.data.billing

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.POST
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Verifies Google Play purchase tokens with the Bayit+ backend.
 *
 * The backend endpoint validates the purchase token with Google Play,
 * provisions the subscription, and returns the granted tier.
 */
@Singleton
class BillingVerificationService @Inject constructor(
    private val client: BayitApiClient,
) {

    private val api: VerificationApi = client.createService()

    suspend fun verifyPurchase(
        purchaseToken: String,
        productId: String,
    ): BayitResult<GoogleVerificationResponse> = runCatchingResult {
        val request = VerifyGoogleRequest(
            purchaseToken = purchaseToken,
            productId = productId,
        )
        val response = client.safeApiCall { api.verifyGooglePurchase(request) }
        GoogleVerificationResponse(
            status = response.status,
            tier = response.tier,
        )
    }
}

private interface VerificationApi {
    @POST("api/v1/subscriptions/verify-google")
    suspend fun verifyGooglePurchase(
        @Body request: VerifyGoogleRequest,
    ): VerifyGoogleResponse
}

@Serializable
private data class VerifyGoogleRequest(
    @SerialName("purchase_token") val purchaseToken: String,
    @SerialName("product_id") val productId: String,
)

@Serializable
private data class VerifyGoogleResponse(
    val status: String,
    val tier: String,
)
