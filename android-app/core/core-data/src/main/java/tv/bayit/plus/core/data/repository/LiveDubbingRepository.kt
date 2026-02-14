package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface LiveDubbingRepository {
    suspend fun getAvailableLanguages(channelId: String): BayitResult<List<Any>>
    suspend fun startDubbing(channelId: String, languageCode: String): BayitResult<Any>
    suspend fun stopDubbing(sessionId: String): BayitResult<Unit>
    suspend fun getDubbingStatus(sessionId: String): BayitResult<Any>
    suspend fun setVolumeMix(sessionId: String, originalVolume: Float, dubbingVolume: Float): BayitResult<Unit>
}
