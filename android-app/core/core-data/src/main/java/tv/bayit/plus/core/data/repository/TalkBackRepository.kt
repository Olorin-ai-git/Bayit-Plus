package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface TalkBackRepository {
    suspend fun startSession(channelId: String): BayitResult<Any>
    suspend fun endSession(sessionId: String): BayitResult<Unit>
    suspend fun sendAudioChunk(sessionId: String, audioData: ByteArray): BayitResult<Unit>
    suspend fun getActiveSession(): BayitResult<Any?>
    suspend fun getSessionHistory(): BayitResult<List<Any>>
    suspend fun updateSessionSettings(sessionId: String, settings: Map<String, Any>): BayitResult<Unit>
}
