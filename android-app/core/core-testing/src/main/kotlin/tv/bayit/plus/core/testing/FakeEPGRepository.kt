package tv.bayit.plus.core.testing

import tv.bayit.plus.core.common.BayitResult

/**
 * Fake implementation of EPGRepository for testing Electronic Program Guide.
 */
class FakeEPGRepository {

    private val guides = mutableMapOf<String, List<Any>>()
    private val schedules = mutableMapOf<Pair<String, String>, List<Any>>()
    private val programDetails = mutableMapOf<String, Any>()
    private val reminders = mutableSetOf<String>()

    var shouldReturnError = false
    var errorMessage = "EPG repository error"

    suspend fun getGuide(date: String): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(guides[date] ?: emptyList())
        }
    }

    suspend fun getSchedule(channelId: String, date: String): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(schedules[channelId to date] ?: emptyList())
        }
    }

    suspend fun getProgramDetails(programId: String): BayitResult<Any> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val program = programDetails[programId]
            if (program != null) {
                BayitResult.Success(program)
            } else {
                BayitResult.Error(Exception("Program not found: $programId"))
            }
        }
    }

    suspend fun setReminder(programId: String): BayitResult<Unit> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            reminders.add(programId)
            BayitResult.Success(Unit)
        }
    }

    suspend fun removeReminder(programId: String): BayitResult<Unit> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            reminders.remove(programId)
            BayitResult.Success(Unit)
        }
    }

    fun setGuide(date: String, guideData: List<Any>) {
        guides[date] = guideData
    }

    fun setSchedule(channelId: String, date: String, scheduleData: List<Any>) {
        schedules[channelId to date] = scheduleData
    }

    fun setProgramDetails(programId: String, program: Any) {
        programDetails[programId] = program
    }

    fun hasReminder(programId: String): Boolean = programId in reminders

    fun clear() {
        guides.clear()
        schedules.clear()
        programDetails.clear()
        reminders.clear()
        shouldReturnError = false
    }
}
