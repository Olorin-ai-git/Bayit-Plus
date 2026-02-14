package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface InteractiveMissionRepository {
    suspend fun getAvailableMissions(): BayitResult<List<Any>>
    suspend fun startMission(missionId: String): BayitResult<Any>
    suspend fun submitStep(missionId: String, stepId: String, answer: Any): BayitResult<Any>
    suspend fun getMissionState(missionId: String): BayitResult<Any>
    suspend fun abandonMission(missionId: String): BayitResult<Unit>
    suspend fun getCompletedMissions(): BayitResult<List<Any>>
}
