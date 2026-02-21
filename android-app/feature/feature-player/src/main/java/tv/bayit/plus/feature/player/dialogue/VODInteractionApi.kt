package tv.bayit.plus.feature.player.dialogue

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

/**
 * Retrofit service interface for VOD character interaction endpoints.
 *
 * Endpoint paths mirror the backend FastAPI routes defined in
 * `backend/app/api/routes/vod_interactions.py`. All paths are relative
 * to the base URL configured in [NetworkModule].
 */
interface VODInteractionApi {

    @GET("api/v1/avatar-mesh/content/{contentId}/interactive-moments")
    suspend fun getInteractiveMoments(
        @Path("contentId") contentId: String,
    ): List<InteractiveMoment>

    @GET("api/v1/vod-interactions/characters/{contentId}")
    suspend fun getInteractiveCharacters(
        @Path("contentId") contentId: String,
    ): List<ContentCharacter>

    @POST("api/v1/vod-interactions/sessions/start-free")
    suspend fun startFreeSession(
        @Body request: StartFreeSessionRequest,
    ): SessionResponse

    @POST("api/v1/vod-interactions/sessions/{sessionId}/message")
    suspend fun sendMessage(
        @Path("sessionId") sessionId: String,
        @Body request: MessageRequest,
    ): CharacterResponse

    @POST("api/v1/vod-interactions/sessions/{sessionId}/complete")
    suspend fun completeSession(
        @Path("sessionId") sessionId: String,
    ): SessionStatusResponse

    @POST("api/v1/vod-interactions/sessions/{sessionId}/multi-message")
    suspend fun sendMultiMessage(
        @Path("sessionId") sessionId: String,
        @Body request: MultiMessageRequest,
    ): MultiCharacterResponse

    @POST("api/v1/vod-interactions/reels/generate")
    suspend fun generateVodReel(
        @Body request: VodReelRequest,
    ): VodReelResponse
}

data class VodReelRequest(
    val sessionIds: List<String>,
    val contentId: String,
    val profileId: String,
)

data class VodReelResponse(
    val reelId: String,
    val shareToken: String?,
    val status: String,
)
