package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface EPGRepository {
    suspend fun getGuide(date: String): BayitResult<List<Any>>
    suspend fun getSchedule(channelId: String, date: String): BayitResult<List<Any>>
    suspend fun getProgramDetails(programId: String): BayitResult<Any>
    suspend fun setReminder(programId: String): BayitResult<Unit>
    suspend fun removeReminder(programId: String): BayitResult<Unit>
}
