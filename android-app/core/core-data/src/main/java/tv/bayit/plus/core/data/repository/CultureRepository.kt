package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface CultureRepository {
    suspend fun getDailyContent(): BayitResult<Any>
    suspend fun getParashaWeekly(): BayitResult<Any>
    suspend fun getHolidayContent(holidayId: String): BayitResult<List<Any>>
    suspend fun getUpcomingHolidays(): BayitResult<List<Any>>
    suspend fun getHebrewDate(): BayitResult<Any>
    suspend fun getJerusalemContent(): BayitResult<List<Any>>
    suspend fun getTelAvivContent(): BayitResult<List<Any>>
}
