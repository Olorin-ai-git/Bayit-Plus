package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface SubtitleRepository {
    suspend fun getAvailableSubtitles(mediaId: String): BayitResult<List<Any>>
    suspend fun getSubtitleTrack(mediaId: String, languageCode: String): BayitResult<Any>
    suspend fun getSubtitlePreferences(): BayitResult<Any>
    suspend fun updateSubtitlePreferences(preferences: Map<String, Any>): BayitResult<Unit>
    suspend fun requestSubtitle(mediaId: String, languageCode: String): BayitResult<Unit>
}
