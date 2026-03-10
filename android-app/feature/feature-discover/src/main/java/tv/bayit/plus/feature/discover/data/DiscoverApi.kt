package tv.bayit.plus.feature.discover.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

/**
 * Retrofit service interface for all Discover API endpoints.
 *
 * Endpoint paths mirror the backend FastAPI routes defined in
 * `backend/app/api/routes/discover/`. This interface is package-private;
 * callers outside this module interact only with [DiscoverRepository].
 */
internal interface DiscoverApi {

    /**
     * Returns the server-side feature configuration, including per-feature
     * enable flags, demo video URLs, and walkthrough content IDs.
     */
    @GET("api/v1/discover/config")
    suspend fun getConfig(): DiscoverConfigDto

    /**
     * Records that the user completed (or skipped) a feature walkthrough.
     *
     * Fire-and-forget from the UI side; the result is logged but not surfaced.
     */
    @POST("api/v1/discover/walkthrough-complete")
    suspend fun recordWalkthroughComplete(
        @Body body: WalkthroughCompleteDto,
    )

    /**
     * Returns the remaining free character-generation slots for the current user.
     */
    @GET("api/v1/discover/character-generation-status")
    suspend fun getCharacterGenerationStatus(): CharacterGenerationStatusDto

    /**
     * Enqueues an asynchronous character-generation job for [contentId].
     *
     * Returns a [CharacterJobDto] with the job ID and initial status. The caller
     * should poll the job status endpoint to track completion.
     */
    @POST("api/v1/discover/generate-characters/{contentId}")
    suspend fun generateCharacters(
        @Path("contentId") contentId: String,
    ): CharacterJobDto
}

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

/**
 * Top-level response for `GET /discover/config`.
 *
 * @param features Per-feature configuration entries keyed by [FeatureConfigDto.featureId].
 */
@Serializable
data class DiscoverConfigDto(
    val features: List<FeatureConfigDto>,
)

/**
 * Server-side configuration for a single feature card.
 *
 * The [featureId] value matches [tv.bayit.plus.feature.discover.model.DiscoverFeature.id]
 * exactly so that the ViewModel can join by key without a mapping table.
 *
 * @param featureId           Stable feature identifier (e.g. `"pause_ask"`).
 * @param enabled             When false the "Try it now" CTA is hidden.
 * @param demoVideoUrl        Optional HLS/DASH URL for the inline demo clip.
 * @param demoThumbnailUrl    Optional thumbnail for the demo video poster frame.
 * @param walkthroughContentId Optional VOD content ID to load when launching the walkthrough.
 */
@Serializable
data class FeatureConfigDto(
    @SerialName("feature_id") val featureId: String,
    val enabled: Boolean = true,
    @SerialName("demo_video_url") val demoVideoUrl: String? = null,
    @SerialName("demo_thumbnail_url") val demoThumbnailUrl: String? = null,
    @SerialName("walkthrough_content_id") val walkthroughContentId: String? = null,
)

/**
 * Request body for `POST /discover/walkthrough-complete`.
 *
 * @param featureId      The feature whose walkthrough was just completed or skipped.
 * @param stepsCompleted Number of steps the user completed before finishing/skipping.
 * @param skipped        True when the user tapped "Skip" rather than completing all steps.
 */
@Serializable
data class WalkthroughCompleteDto(
    @SerialName("feature_id") val featureId: String,
    @SerialName("steps_completed") val stepsCompleted: Int,
    val skipped: Boolean,
)

/**
 * Response for `GET /discover/character-generation-status`.
 *
 * @param freeRemaining Number of free character-generation slots remaining this period.
 * @param freeLimit     Total number of free slots granted per period.
 */
@Serializable
internal data class CharacterGenerationStatusDto(
    @SerialName("free_remaining") val freeRemaining: Int,
    @SerialName("free_limit") val freeLimit: Int,
)

/**
 * Response for `POST /discover/generate-characters/{contentId}`.
 *
 * @param jobId         Server-assigned job identifier for status polling.
 * @param status        Initial job status string (e.g. `"queued"`, `"running"`).
 * @param alreadyExists True when the characters for this content were already generated
 *                      and the server reused an existing result rather than enqueuing.
 */
@Serializable
internal data class CharacterJobDto(
    @SerialName("job_id") val jobId: String,
    val status: String,
    @SerialName("already_exists") val alreadyExists: Boolean,
)
