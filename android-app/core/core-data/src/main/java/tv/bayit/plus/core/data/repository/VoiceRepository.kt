package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface VoiceRepository {
    suspend fun getAvailableVoices(languageCode: String): BayitResult<List<Any>>
    suspend fun getSelectedVoice(): BayitResult<Any>
    suspend fun setVoice(voiceId: String): BayitResult<Unit>
    suspend fun previewVoice(voiceId: String): BayitResult<String>
    suspend fun getVoiceSettings(): BayitResult<Any>
    suspend fun updateVoiceSettings(settings: Map<String, Any>): BayitResult<Unit>
}
