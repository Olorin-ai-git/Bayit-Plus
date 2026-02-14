package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface StatsRepository {
    suspend fun getWatchStats(period: String): BayitResult<Any>
    suspend fun getGenreBreakdown(): BayitResult<List<Any>>
    suspend fun getWeeklyReport(): BayitResult<Any>
    suspend fun getTotalWatchTime(): BayitResult<Long>
    suspend fun getStreakInfo(): BayitResult<Any>
}
