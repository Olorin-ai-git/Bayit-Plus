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

@Serializable
internal data class SubtitleTracksResponse(
    val tracks: List<SubtitleTrackItem> = emptyList(),
)

@Serializable
internal data class SubtitleTrackItem(
    val id: String,
    @SerialName("content_id") val contentId: String,
    val language: String,
    @SerialName("language_name") val languageName: String? = null,
    val format: String? = null,
    @SerialName("has_nikud_version") val hasNikudVersion: Boolean? = null,
    @SerialName("has_shoresh_version") val hasShoreshVersion: Boolean? = null,
    @SerialName("has_heblish_version") val hasHeblishVersion: Boolean? = null,
    @SerialName("has_engrew_version") val hasEngrewVersion: Boolean? = null,
    @SerialName("is_default") val isDefault: Boolean? = null,
    @SerialName("is_auto_generated") val isAutoGenerated: Boolean? = null,
    @SerialName("cue_count") val cueCount: Int? = null,
)

@Serializable
internal data class SubtitleTrackDetail(
    val tracks: List<SubtitleTrackItem> = emptyList(),
)

@Serializable
internal data class SubtitlePreferencesResponse(
    val preferences: List<SubtitlePreferenceItem> = emptyList(),
    val total: Int? = null,
)

@Serializable
internal data class SubtitlePreferenceItem(
    @SerialName("content_id") val contentId: String,
    @SerialName("preferred_language") val preferredLanguage: String? = null,
    @SerialName("hebrew_mode") val hebrewMode: String? = null,
    @SerialName("last_used_at") val lastUsedAt: String? = null,
)

@Serializable
internal data class SubtitlePreferencesBody(
    val language: String? = null,
    @SerialName("hebrew_mode") val hebrewMode: String? = null,
    @SerialName("english_mode") val englishMode: String? = null,
    @SerialName("font_size") val fontSize: Float? = null,
    @SerialName("show_background") val showBackground: Boolean? = null,
)

@Serializable
internal data class SubtitleDeletePreferenceResponse(
    val status: String? = null,
    @SerialName("content_id") val contentId: String? = null,
    val message: String? = null,
)

@Serializable
internal data class AIGenerationJobResponse(
    @SerialName("job_id") val jobId: String? = null,
    @SerialName("content_id") val contentId: String? = null,
    @SerialName("job_type") val jobType: String? = null,
    val status: String? = null,
    val progress: Double? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("completed_at") val completedAt: String? = null,
    val message: String? = null,
    val error: String? = null,
)

@Serializable
internal data class CancelJobResponse(
    val message: String? = null,
    val job: AIGenerationJobResponse? = null,
)

@Serializable
internal data class ActiveJobsResponse(
    @SerialName("content_id") val contentId: String? = null,
    @SerialName("nikud_job") val nikudJob: AIGenerationJobResponse? = null,
    @SerialName("shoresh_job") val shoreshJob: AIGenerationJobResponse? = null,
    @SerialName("heblish_job") val heblishJob: AIGenerationJobResponse? = null,
    @SerialName("grammar_flip_job") val grammarFlipJob: AIGenerationJobResponse? = null,
    @SerialName("slang_synthesis_job") val slangSynthesisJob: AIGenerationJobResponse? = null,
    @SerialName("engrew_job") val engrewJob: AIGenerationJobResponse? = null,
)
