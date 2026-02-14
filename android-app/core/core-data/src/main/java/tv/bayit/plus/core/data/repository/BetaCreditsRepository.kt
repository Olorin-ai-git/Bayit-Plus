package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface BetaCreditsRepository {
    suspend fun getBalance(): BayitResult<Int>
    suspend fun getTransactionHistory(): BayitResult<List<Any>>
    suspend fun redeemCredits(amount: Int, featureId: String): BayitResult<Any>
    suspend fun getEligibleFeatures(): BayitResult<List<Any>>
    suspend fun getBeta500Status(): BayitResult<Any>
}
