package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.DubbingAvailability
import tv.bayit.plus.core.model.DubbingVoice

interface LiveDubbingRepository {
    suspend fun getAvailableLanguages(channelId: String): BayitResult<List<Any>>
    suspend fun getAvailability(channelId: String): BayitResult<DubbingAvailability>
    suspend fun getVoices(): BayitResult<List<DubbingVoice>>
    suspend fun startDubbing(channelId: String, languageCode: String): BayitResult<Any>
    suspend fun stopDubbing(sessionId: String): BayitResult<Unit>
    suspend fun getDubbingStatus(sessionId: String): BayitResult<Any>
    suspend fun setVolumeMix(sessionId: String, originalVolume: Float, dubbingVolume: Float): BayitResult<Unit>
}
