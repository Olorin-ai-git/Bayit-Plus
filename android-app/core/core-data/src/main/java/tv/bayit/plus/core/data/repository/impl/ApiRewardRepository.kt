package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.RewardRepository
import tv.bayit.plus.core.model.Reward
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Production implementation of [RewardRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APIRewardRepository and web api.js.
 */
@Singleton
class ApiRewardRepository @Inject constructor(
    private val client: BayitApiClient,
) : RewardRepository {

    private val service: RewardService = client.createService()

    override suspend fun getAvailableRewards(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getAvailableRewards() }
            response.rewards
        }

    override suspend fun getEarnedRewards(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getEarnedRewards() }
            response.rewards
        }

    override suspend fun claimReward(rewardId: String): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.claimReward(rewardId) }
        }

    override suspend fun getPointsBalance(): BayitResult<Int> =
        runCatchingResult {
            val response = client.safeApiCall { service.getPointsBalance() }
            response.balance
        }

    override suspend fun getPointsHistory(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getPointsHistory() }
            response.transactions
        }
}

private interface RewardService {

    @GET("api/v1/rewards/available")
    suspend fun getAvailableRewards(): RewardsListResponse

    @GET("api/v1/rewards/earned")
    suspend fun getEarnedRewards(): RewardsListResponse

    @POST("api/v1/reward/{rewardId}/claim")
    suspend fun claimReward(
        @Path("rewardId") rewardId: String,
    ): ClaimRewardResponse

    @GET("api/v1/rewards/points/balance")
    suspend fun getPointsBalance(): PointsBalanceResponse

    @GET("api/v1/rewards/points/history")
    suspend fun getPointsHistory(): PointsHistoryResponse
}

/** Response wrapper for reward list endpoints. */
@Serializable
private data class RewardsListResponse(
    val rewards: List<Reward> = emptyList(),
    val total: Int? = null,
)

/** Response returned after claiming a reward. */
@Serializable
private data class ClaimRewardResponse(
    @SerialName("reward_id") val rewardId: String,
    val title: String,
    @SerialName("points_deducted") val pointsDeducted: Int,
    @SerialName("remaining_balance") val remainingBalance: Int,
    val message: String? = null,
)

/** Response for points balance query. */
@Serializable
private data class PointsBalanceResponse(
    val balance: Int,
    val level: Int? = null,
    @SerialName("next_level_points") val nextLevelPoints: Int? = null,
)

/** Response wrapper for points transaction history. */
@Serializable
private data class PointsHistoryResponse(
    val transactions: List<PointsTransaction> = emptyList(),
    val total: Int? = null,
)

/** A single points transaction record. */
@Serializable
private data class PointsTransaction(
    val id: String,
    val amount: Int,
    val type: String,
    val description: String? = null,
    @SerialName("created_at") val createdAt: String,
)
