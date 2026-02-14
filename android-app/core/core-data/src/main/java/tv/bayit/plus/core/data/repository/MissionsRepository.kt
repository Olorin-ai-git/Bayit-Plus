package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface MissionsRepository {
    suspend fun getActiveMissions(): BayitResult<List<Any>>
    suspend fun getMission(missionId: String): BayitResult<Any>
    suspend fun claimMissionReward(missionId: String): BayitResult<Any>
    suspend fun getMissionProgress(missionId: String): BayitResult<Any>
    suspend fun getDailyMissions(): BayitResult<List<Any>>
    suspend fun getWeeklyMissions(): BayitResult<List<Any>>
}
