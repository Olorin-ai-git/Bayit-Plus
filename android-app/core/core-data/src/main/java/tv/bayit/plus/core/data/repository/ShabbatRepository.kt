package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface ShabbatRepository {
    suspend fun getShabbatTimes(latitude: Double, longitude: Double): BayitResult<Any>
    suspend fun getShabbatMode(): BayitResult<Boolean>
    suspend fun setShabbatMode(enabled: Boolean): BayitResult<Unit>
    suspend fun getShabbatSchedule(): BayitResult<Any>
    suspend fun getAutoScheduleEnabled(): BayitResult<Boolean>
    suspend fun setAutoScheduleEnabled(enabled: Boolean): BayitResult<Unit>
}
