package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.BetaCreditsRepository
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Production implementation of [BetaCreditsRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APIBetaCreditsRepository and web api.js.
 * Part of the Beta 500 AI credits program.
 */
@Singleton
class ApiBetaCreditsRepository @Inject constructor(
    private val client: BayitApiClient,
) : BetaCreditsRepository {

    private val service: BetaCreditsService = client.createService()

    override suspend fun getBalance(): BayitResult<Int> =
        runCatchingResult {
            val response = client.safeApiCall { service.getBalance() }
            response.balance
        }

    override suspend fun getTransactionHistory(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getTransactionHistory() }
            response.transactions
        }

    override suspend fun redeemCredits(
        amount: Int,
        featureId: String,
    ): BayitResult<Any> = runCatchingResult {
        val request = RedeemCreditsBody(amount = amount, featureId = featureId)
        client.safeApiCall { service.redeemCredits(request) }
    }

    override suspend fun getEligibleFeatures(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getBalance() }
            response.eligibleFeatures
        }

}

private interface BetaCreditsService {

    @GET("api/v1/beta/credits/balance")
    suspend fun getBalance(): CreditBalanceResponse

    @GET("api/v1/beta/credits/history")
    suspend fun getTransactionHistory(): CreditHistoryResponse

    @POST("api/v1/beta/credits/redeem")
    suspend fun redeemCredits(@Body request: RedeemCreditsBody): RedeemCreditsResponse

}

/** Response for credit balance with eligible features. */
@Serializable
private data class CreditBalanceResponse(
    val balance: Int,
    @SerialName("total_earned") val totalEarned: Int = 0,
    @SerialName("total_spent") val totalSpent: Int = 0,
    @SerialName("eligible_features") val eligibleFeatures: List<EligibleFeature> = emptyList(),
)

/** A feature eligible for credit redemption. */
@Serializable
private data class EligibleFeature(
    val id: String,
    val name: String,
    val cost: Int,
    val description: String? = null,
)

/** Response wrapper for credit transaction history. */
@Serializable
private data class CreditHistoryResponse(
    val transactions: List<CreditTransaction> = emptyList(),
    val total: Int? = null,
)

/** A single credit transaction record. */
@Serializable
private data class CreditTransaction(
    val id: String,
    val amount: Int,
    val type: String,
    val description: String? = null,
    @SerialName("feature_id") val featureId: String? = null,
    @SerialName("created_at") val createdAt: String,
)

/** Request body for redeeming credits against a feature. */
@Serializable
private data class RedeemCreditsBody(
    val amount: Int,
    @SerialName("feature_id") val featureId: String,
)

/** Response returned after redeeming credits. */
@Serializable
private data class RedeemCreditsResponse(
    @SerialName("remaining_balance") val remainingBalance: Int,
    @SerialName("amount_deducted") val amountDeducted: Int,
    @SerialName("feature_id") val featureId: String,
    val message: String? = null,
)

