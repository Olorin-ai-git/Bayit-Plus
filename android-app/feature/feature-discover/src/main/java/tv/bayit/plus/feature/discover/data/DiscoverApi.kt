package tv.bayit.plus.feature.discover.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

internal interface DiscoverApi {

    @GET("api/v1/discover/config")
    suspend fun getConfig(): DiscoverConfigDto

    @POST("api/v1/discover/walkthrough-complete")
    suspend fun recordWalkthroughComplete(
        @Body body: WalkthroughCompleteDto,
    )

    @GET("api/v1/discover/character-generation-status")
    suspend fun getCharacterGenerationStatus(): CharacterGenerationStatusDto

    @POST("api/v1/discover/generate-characters/{contentId}")
    suspend fun generateCharacters(
        @Path("contentId") contentId: String,
    ): CharacterJobDto
}

@Serializable
data class DiscoverConfigDto(
    val features: List<FeatureConfigDto> = emptyList(),
)

@Serializable
data class FeatureConfigDto(
    @SerialName("feature_id") val featureId: String,
    val enabled: Boolean,
    @SerialName("demo_video_url") val demoVideoUrl: String? = null,
    @SerialName("demo_thumbnail_url") val demoThumbnailUrl: String? = null,
    @SerialName("walkthrough_content_id") val walkthroughContentId: String? = null,
)

@Serializable
data class WalkthroughCompleteDto(
    @SerialName("feature_id") val featureId: String,
    @SerialName("steps_completed") val stepsCompleted: Int,
    val skipped: Boolean,
)

@Serializable
data class CharacterGenerationStatusDto(
    @SerialName("free_remaining") val freeRemaining: Int,
    @SerialName("free_limit") val freeLimit: Int,
)

@Serializable
data class CharacterJobDto(
    @SerialName("job_id") val jobId: String,
    val status: String,
    @SerialName("already_exists") val alreadyExists: Boolean = false,
)
