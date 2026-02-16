package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.ExternalSubtitleImportResponse
import tv.bayit.plus.core.model.SubtitleCuesResponse
import tv.bayit.plus.core.model.SubtitleEnglishMode
import tv.bayit.plus.core.model.SubtitleHebrewMode
import tv.bayit.plus.core.model.TranslationResult

interface SubtitleRepository {

    suspend fun getAvailableSubtitles(mediaId: String): BayitResult<List<Any>>

    suspend fun getSubtitleTrack(mediaId: String, languageCode: String): BayitResult<Any>

    suspend fun getSubtitlePreferences(): BayitResult<Any>

    suspend fun updateSubtitlePreferences(preferences: Map<String, Any>): BayitResult<Unit>

    suspend fun requestSubtitle(mediaId: String, languageCode: String): BayitResult<Unit>

    suspend fun fetchCues(
        contentId: String,
        language: String,
        hebrewMode: SubtitleHebrewMode? = null,
        englishMode: SubtitleEnglishMode? = null,
    ): BayitResult<SubtitleCuesResponse>

    suspend fun fetchExternalSubtitles(
        contentId: String,
    ): BayitResult<ExternalSubtitleImportResponse>

    suspend fun translateWord(
        word: String,
        sourceLanguage: String,
        targetLanguage: String,
    ): BayitResult<TranslationResult>

    suspend fun translatePhrase(
        phrase: String,
        sourceLanguage: String,
        targetLanguage: String,
    ): BayitResult<TranslationResult>

    suspend fun fetchContentPreferences(
        contentId: String,
    ): BayitResult<Any>

    suspend fun updateContentPreferences(
        contentId: String,
        language: String?,
        hebrewMode: SubtitleHebrewMode?,
        englishMode: SubtitleEnglishMode?,
        fontSize: Float?,
        showBackground: Boolean?,
    ): BayitResult<Unit>
}
