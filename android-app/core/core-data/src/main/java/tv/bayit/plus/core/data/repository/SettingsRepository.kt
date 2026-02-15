package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface SettingsRepository {
    suspend fun getSettings(): BayitResult<Any>
    suspend fun updateSetting(key: String, value: Any): BayitResult<Unit>
    suspend fun getLanguage(): BayitResult<String>
    suspend fun setLanguage(languageCode: String): BayitResult<Unit>
    suspend fun getStreamingQuality(): BayitResult<String>
    suspend fun setStreamingQuality(quality: String): BayitResult<Unit>
    suspend fun submitSupportRequest(subject: String, message: String): BayitResult<Unit>
}
