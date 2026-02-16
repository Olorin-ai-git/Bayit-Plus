package tv.bayit.plus.core.data.repository.impl

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.SubtitleRepository
import tv.bayit.plus.core.model.ExternalSubtitleImportResponse
import tv.bayit.plus.core.model.SubtitleCuesResponse
import tv.bayit.plus.core.model.SubtitleEnglishMode
import tv.bayit.plus.core.model.SubtitleHebrewMode
import tv.bayit.plus.core.model.TranslationResult
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Production implementation of [SubtitleRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping.
 */
@Singleton
class ApiSubtitleRepository @Inject constructor(
    private val client: BayitApiClient,
) : SubtitleRepository {

    private val service: SubtitleService = client.createService()

    override suspend fun getAvailableSubtitles(
        mediaId: String,
    ): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall { service.getAvailableTracks(mediaId) }
        response.tracks
    }

    override suspend fun getSubtitleTrack(
        mediaId: String,
        languageCode: String,
    ): BayitResult<Any> = runCatchingResult {
        client.safeApiCall { service.getSubtitleTrack(mediaId, languageCode) }
    }

    override suspend fun getSubtitlePreferences(): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.getSubtitlePreferences() }
        }

    override suspend fun updateSubtitlePreferences(
        preferences: Map<String, Any>,
    ): BayitResult<Unit> = runCatchingResult {
        val body = SubtitlePreferencesBody(
            language = preferences["language"] as? String,
            hebrewMode = preferences["hebrew_mode"] as? String,
            fontSize = (preferences["font_size"] as? Number)?.toFloat(),
            showBackground = preferences["show_background"] as? Boolean,
        )
        client.safeApiCall { service.updateSubtitlePreferences(body) }
        Unit
    }

    override suspend fun requestSubtitle(
        mediaId: String,
        languageCode: String,
    ): BayitResult<Unit> = runCatchingResult {
        val body = SubtitleRequestBody(contentId = mediaId, language = languageCode)
        client.safeApiCall { service.requestSubtitle(body) }
        Unit
    }

    override suspend fun fetchCues(
        contentId: String,
        language: String,
        hebrewMode: SubtitleHebrewMode?,
        englishMode: SubtitleEnglishMode?,
    ): BayitResult<SubtitleCuesResponse> = runCatchingResult {
        client.safeApiCall {
            service.getCues(
                contentId = contentId,
                language = language,
                hebrewMode = hebrewMode?.name?.lowercase(),
                englishMode = englishMode?.name?.lowercase(),
            )
        }
    }

    override suspend fun fetchExternalSubtitles(
        contentId: String,
    ): BayitResult<ExternalSubtitleImportResponse> = runCatchingResult {
        client.safeApiCall { service.fetchExternalSubtitles(contentId) }
    }

    override suspend fun translateWord(
        word: String,
        sourceLanguage: String,
        targetLanguage: String,
    ): BayitResult<TranslationResult> = runCatchingResult {
        val body = TranslateBody(
            text = word,
            sourceLanguage = sourceLanguage,
            targetLanguage = targetLanguage,
        )
        client.safeApiCall { service.translateWord(body) }
    }

    override suspend fun translatePhrase(
        phrase: String,
        sourceLanguage: String,
        targetLanguage: String,
    ): BayitResult<TranslationResult> = runCatchingResult {
        val body = TranslateBody(
            text = phrase,
            sourceLanguage = sourceLanguage,
            targetLanguage = targetLanguage,
        )
        client.safeApiCall { service.translatePhrase(body) }
    }

    override suspend fun fetchContentPreferences(
        contentId: String,
    ): BayitResult<Any> = runCatchingResult {
        client.safeApiCall { service.getContentPreferences(contentId) }
    }

    override suspend fun updateContentPreferences(
        contentId: String,
        language: String?,
        hebrewMode: SubtitleHebrewMode?,
        englishMode: SubtitleEnglishMode?,
        fontSize: Float?,
        showBackground: Boolean?,
    ): BayitResult<Unit> = runCatchingResult {
        val body = SubtitlePreferencesBody(
            language = language,
            hebrewMode = hebrewMode?.name?.lowercase(),
            englishMode = englishMode?.name?.lowercase(),
            fontSize = fontSize,
            showBackground = showBackground,
        )
        client.safeApiCall { service.updateContentPreferences(contentId, body) }
        Unit
    }
}
