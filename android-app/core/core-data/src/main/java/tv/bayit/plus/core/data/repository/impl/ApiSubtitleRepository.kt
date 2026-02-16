package tv.bayit.plus.core.data.repository.impl

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.SubtitleRepository
import tv.bayit.plus.core.model.ExternalSubtitleImportResponse
import tv.bayit.plus.core.model.SubtitleCuesResponse
import tv.bayit.plus.core.model.SubtitleEnglishMode
import tv.bayit.plus.core.model.SubtitleHebrewMode
import tv.bayit.plus.core.model.SubtitlePreferencesInfo
import tv.bayit.plus.core.model.SubtitlePreferencesUpdate
import tv.bayit.plus.core.model.SubtitleTrack
import tv.bayit.plus.core.model.TranslationResult
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ApiSubtitleRepository @Inject constructor(
    private val client: BayitApiClient,
) : SubtitleRepository {

    private val service: SubtitleService = client.createService()

    override suspend fun getAvailableSubtitles(
        mediaId: String,
    ): BayitResult<List<SubtitleTrack>> = runCatchingResult {
        val response = client.safeApiCall { service.getAvailableTracks(mediaId) }
        response.tracks.map { it.toPublic() }
    }

    override suspend fun getSubtitleTrack(
        mediaId: String,
        languageCode: String,
    ): BayitResult<List<SubtitleTrack>> = runCatchingResult {
        val response = client.safeApiCall { service.getSubtitleTrack(mediaId, languageCode) }
        response.tracks.map { it.toPublic() }
    }

    override suspend fun getSubtitlePreferences(): BayitResult<List<SubtitlePreferencesInfo>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getSubtitlePreferences() }
            response.preferences.map { it.toPublic() }
        }

    override suspend fun updateSubtitlePreferences(
        preferences: SubtitlePreferencesUpdate,
    ): BayitResult<Unit> = runCatchingResult {
        val body = SubtitlePreferencesBody(
            language = preferences.language,
            hebrewMode = preferences.hebrewMode?.name?.lowercase(),
            englishMode = preferences.englishMode?.name?.lowercase(),
            fontSize = preferences.fontSize,
            showBackground = preferences.showBackground,
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
        val body = TranslateBody(text = word, sourceLanguage = sourceLanguage, targetLanguage = targetLanguage)
        client.safeApiCall { service.translateWord(body) }
    }

    override suspend fun translatePhrase(
        phrase: String,
        sourceLanguage: String,
        targetLanguage: String,
    ): BayitResult<TranslationResult> = runCatchingResult {
        val body = TranslateBody(text = phrase, sourceLanguage = sourceLanguage, targetLanguage = targetLanguage)
        client.safeApiCall { service.translatePhrase(body) }
    }

    override suspend fun fetchContentPreferences(
        contentId: String,
    ): BayitResult<List<SubtitlePreferencesInfo>> = runCatchingResult {
        val response = client.safeApiCall { service.getContentPreferences(contentId) }
        response.preferences.map { it.toPublic() }
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

private fun SubtitleTrackItem.toPublic() = SubtitleTrack(
    id = id, contentId = contentId, language = language, languageName = languageName,
    format = format, hasNikudVersion = hasNikudVersion ?: false,
    hasShoreshVersion = hasShoreshVersion ?: false, hasHeblishVersion = hasHeblishVersion ?: false,
    hasEngrewVersion = hasEngrewVersion ?: false, isDefault = isDefault ?: false,
    isAutoGenerated = isAutoGenerated ?: false, cueCount = cueCount,
)

private fun SubtitlePreferenceItem.toPublic() = SubtitlePreferencesInfo(
    contentId = contentId, preferredLanguage = preferredLanguage,
    hebrewMode = hebrewMode, lastUsedAt = lastUsedAt,
)
