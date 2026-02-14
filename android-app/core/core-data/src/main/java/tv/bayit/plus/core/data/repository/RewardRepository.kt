package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface RewardRepository {
    suspend fun getAvailableRewards(): BayitResult<List<Any>>
    suspend fun getEarnedRewards(): BayitResult<List<Any>>
    suspend fun claimReward(rewardId: String): BayitResult<Any>
    suspend fun getPointsBalance(): BayitResult<Int>
    suspend fun getPointsHistory(): BayitResult<List<Any>>
}
