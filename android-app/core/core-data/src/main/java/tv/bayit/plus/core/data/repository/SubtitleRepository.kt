package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.ExternalSubtitleImportResponse
import tv.bayit.plus.core.model.SubtitleCuesResponse
import tv.bayit.plus.core.model.SubtitleEnglishMode
import tv.bayit.plus.core.model.SubtitleHebrewMode
import tv.bayit.plus.core.model.SubtitlePreferencesInfo
import tv.bayit.plus.core.model.SubtitlePreferencesUpdate
import tv.bayit.plus.core.model.SubtitleTrack
import tv.bayit.plus.core.model.TranslationResult

interface SubtitleRepository {

    suspend fun getAvailableSubtitles(mediaId: String): BayitResult<List<SubtitleTrack>>

    suspend fun getSubtitleTrack(mediaId: String, languageCode: String): BayitResult<List<SubtitleTrack>>

    suspend fun getSubtitlePreferences(): BayitResult<List<SubtitlePreferencesInfo>>

    suspend fun fetchCues(
        contentId: String,
        language: String,
        hebrewMode: SubtitleHebrewMode? = null,
        englishMode: SubtitleEnglishMode? = null,
    ): BayitResult<SubtitleCuesResponse>

    suspend fun fetchExternalSubtitles(contentId: String): BayitResult<ExternalSubtitleImportResponse>

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

    suspend fun fetchContentPreferences(contentId: String): BayitResult<List<SubtitlePreferencesInfo>>

    suspend fun updateContentPreferences(
        contentId: String,
        language: String?,
        hebrewMode: SubtitleHebrewMode?,
        englishMode: SubtitleEnglishMode?,
        fontSize: Float?,
        showBackground: Boolean?,
    ): BayitResult<Unit>

    suspend fun deleteContentPreference(contentId: String): BayitResult<Unit>

    suspend fun generateNikud(contentId: String, language: String, force: Boolean): BayitResult<Any>

    suspend fun generateShoresh(contentId: String, language: String, force: Boolean): BayitResult<Any>

    suspend fun generateHeblish(contentId: String, language: String, force: Boolean): BayitResult<Any>

    suspend fun generateEngrew(contentId: String, language: String, force: Boolean): BayitResult<Any>

    suspend fun generateGrammarFlip(contentId: String, language: String, force: Boolean): BayitResult<Any>

    suspend fun generateSlangSynthesis(contentId: String, language: String, force: Boolean): BayitResult<Any>

    suspend fun getJobStatus(jobId: String): BayitResult<Any>

    suspend fun cancelJob(jobId: String): BayitResult<Unit>

    suspend fun getActiveJobs(contentId: String): BayitResult<Any>
}
