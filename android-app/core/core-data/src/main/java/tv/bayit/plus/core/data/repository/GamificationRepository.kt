package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface GamificationRepository {
    suspend fun getPlayerProfile(): BayitResult<Any>
    suspend fun getLevel(): BayitResult<Int>
    suspend fun getXpProgress(): BayitResult<Any>
    suspend fun getAchievements(): BayitResult<List<Any>>
    suspend fun claimAchievement(achievementId: String): BayitResult<Any>
    suspend fun getLeaderboard(scope: String): BayitResult<List<Any>>
    suspend fun getBadges(): BayitResult<List<Any>>
}
