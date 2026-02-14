package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.StarStoryRepository
import tv.bayit.plus.core.model.MessageResponse
import tv.bayit.plus.core.model.StarStory
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Production implementation of [StarStoryRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APIStarStoryRepository and web api.js.
 */
@Singleton
class ApiStarStoryRepository @Inject constructor(
    private val client: BayitApiClient,
) : StarStoryRepository {

    private val service: StarStoryService = client.createService()

    override suspend fun getStarStories(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getStarStories() }
            response.stories
        }

    override suspend fun getStarStory(storyId: String): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.getStarStory(storyId) }
        }

    override suspend fun markAsViewed(storyId: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.markAsViewed(storyId) }
            Unit
        }

    override suspend fun reactToStory(
        storyId: String,
        reaction: String,
    ): BayitResult<Unit> = runCatchingResult {
        val request = StoryReactionBody(reaction = reaction)
        client.safeApiCall { service.reactToStory(storyId, request) }
        Unit
    }

    override suspend fun getStarProfiles(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getStarProfiles() }
            response.profiles
        }
}

private interface StarStoryService {

    @GET("api/v1/star-stories")
    suspend fun getStarStories(): StarStoriesListResponse

    @GET("api/v1/star-story/{storyId}")
    suspend fun getStarStory(@Path("storyId") storyId: String): StarStoryDetailResponse

    @PUT("api/v1/star-story/{storyId}/viewed")
    suspend fun markAsViewed(@Path("storyId") storyId: String): MessageResponse

    @POST("api/v1/star-story/{storyId}/react")
    suspend fun reactToStory(
        @Path("storyId") storyId: String,
        @Body request: StoryReactionBody,
    ): MessageResponse

    @GET("api/v1/star-stories/profiles")
    suspend fun getStarProfiles(): StarProfilesResponse
}

/** Response wrapper for the star stories list endpoint. */
@Serializable
private data class StarStoriesListResponse(
    val stories: List<StarStory> = emptyList(),
    val total: Int? = null,
)

/** Full detail for a single star story. */
@Serializable
private data class StarStoryDetailResponse(
    val id: String,
    val title: String,
    val description: String? = null,
    @SerialName("thumbnail_url") val thumbnailUrl: String? = null,
    val duration: Long? = null,
    @SerialName("view_count") val viewCount: Int = 0,
    @SerialName("reaction_count") val reactionCount: Int = 0,
    @SerialName("is_viewed") val isViewed: Boolean = false,
)

/** Request body for reacting to a star story. */
@Serializable
private data class StoryReactionBody(
    val reaction: String,
)

/** Response wrapper for star profiles list. */
@Serializable
private data class StarProfilesResponse(
    val profiles: List<StarProfileItem> = emptyList(),
)

/** A star profile summary. */
@Serializable
private data class StarProfileItem(
    val id: String,
    val name: String,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    @SerialName("story_count") val storyCount: Int = 0,
)
