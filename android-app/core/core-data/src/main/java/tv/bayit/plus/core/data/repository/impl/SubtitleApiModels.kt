package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import tv.bayit.plus.core.model.ExternalSubtitleImportResponse
import tv.bayit.plus.core.model.SubtitleCuesResponse
import tv.bayit.plus.core.model.TranslationResult

/**
 * Retrofit service for all subtitle-related API endpoints.
 */
internal interface SubtitleService {

    @GET("api/v1/subtitles/{contentId}")
    suspend fun getAvailableTracks(
        @Path("contentId") contentId: String,
    ): SubtitleTracksResponse

    @GET("api/v1/subtitles/{contentId}")
    suspend fun getSubtitleTrack(
        @Path("contentId") contentId: String,
        @Query("language") language: String,
    ): SubtitleTrackDetail

    @GET("api/v1/subtitles/preferences")
    suspend fun getSubtitlePreferences(): SubtitlePreferencesResponse

    @GET("api/v1/subtitles/{contentId}/cues")
    suspend fun getCues(
        @Path("contentId") contentId: String,
        @Query("language") language: String,
        @Query("hebrew_mode") hebrewMode: String? = null,
        @Query("english_mode") englishMode: String? = null,
    ): SubtitleCuesResponse

    @POST("api/v1/subtitles/{contentId}/fetch-external")
    suspend fun fetchExternalSubtitles(
        @Path("contentId") contentId: String,
    ): ExternalSubtitleImportResponse

    @POST("api/v1/subtitles/translate/word")
    suspend fun translateWord(
        @Query("word") word: String,
        @Query("source_lang") sourceLanguage: String,
        @Query("target_lang") targetLanguage: String,
    ): TranslationResult

    @POST("api/v1/subtitles/translate/phrase")
    suspend fun translatePhrase(
        @Query("phrase") phrase: String,
        @Query("source_lang") sourceLanguage: String,
        @Query("target_lang") targetLanguage: String,
    ): TranslationResult

    @GET("api/v1/subtitles/preferences/{contentId}")
    suspend fun getContentPreferences(
        @Path("contentId") contentId: String,
    ): SubtitlePreferencesResponse

    @POST("api/v1/subtitles/preferences/{contentId}")
    suspend fun updateContentPreferences(
        @Path("contentId") contentId: String,
        @Body body: SubtitlePreferencesBody,
    ): SubtitlePreferencesResponse

    @DELETE("api/v1/subtitles/preferences/{contentId}")
    suspend fun deleteContentPreference(
        @Path("contentId") contentId: String,
    ): SubtitleDeletePreferenceResponse

    @POST("api/v1/subtitles/{contentId}/nikud")
    suspend fun generateNikud(
        @Path("contentId") contentId: String,
        @Query("language") language: String,
        @Query("force") force: Boolean,
    ): AIGenerationJobResponse

    @POST("api/v1/subtitles/{contentId}/shoresh")
    suspend fun generateShoresh(
        @Path("contentId") contentId: String,
        @Query("language") language: String,
        @Query("force") force: Boolean,
    ): AIGenerationJobResponse

    @POST("api/v1/subtitles/{contentId}/heblish")
    suspend fun generateHeblish(
        @Path("contentId") contentId: String,
        @Query("language") language: String,
        @Query("force") force: Boolean,
    ): AIGenerationJobResponse

    @POST("api/v1/subtitles/{contentId}/engrew")
    suspend fun generateEngrew(
        @Path("contentId") contentId: String,
        @Query("language") language: String,
        @Query("force") force: Boolean,
    ): AIGenerationJobResponse

    @POST("api/v1/subtitles/{contentId}/grammar-flip")
    suspend fun generateGrammarFlip(
        @Path("contentId") contentId: String,
        @Query("language") language: String,
        @Query("force") force: Boolean,
    ): AIGenerationJobResponse

    @POST("api/v1/subtitles/{contentId}/slang-synthesis")
    suspend fun generateSlangSynthesis(
        @Path("contentId") contentId: String,
        @Query("language") language: String,
        @Query("force") force: Boolean,
    ): AIGenerationJobResponse

    @GET("api/v1/subtitles/job/{jobId}")
    suspend fun getJobStatus(
        @Path("jobId") jobId: String,
    ): AIGenerationJobResponse

    @POST("api/v1/subtitles/job/{jobId}/cancel")
    suspend fun cancelJob(
        @Path("jobId") jobId: String,
    ): CancelJobResponse

    @GET("api/v1/subtitles/{contentId}/job/active")
    suspend fun getActiveJobs(
        @Path("contentId") contentId: String,
    ): ActiveJobsResponse
}

// Types moved to SubtitleApiModels+Types.kt
