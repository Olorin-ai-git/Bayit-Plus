package tv.bayit.plus.feature.player.dialogue

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

/**
 * Retrofit service interface for shared interaction endpoints within watch parties.
 *
 * Endpoint paths mirror the backend routes defined in
 * `backend/app/api/routes/vod_interaction_shared.py`.
 */
interface SharedInteractionApi {

    @POST("api/v1/parties/{partyId}/interaction/start")
    suspend fun startSharedInteraction(
        @Path("partyId") partyId: String,
        @Body request: SharedStartRequest,
    ): SessionResponse

    @POST("api/v1/parties/{partyId}/interaction/{sessionId}/message")
    suspend fun sendSharedMessage(
        @Path("partyId") partyId: String,
        @Path("sessionId") sessionId: String,
        @Body request: SharedMessageRequest,
    ): SharedExchangeResponse

    @POST("api/v1/parties/{partyId}/interaction/{sessionId}/end")
    suspend fun endSharedInteraction(
        @Path("partyId") partyId: String,
        @Path("sessionId") sessionId: String,
    ): SessionResponse

    @GET("api/v1/parties/{partyId}/interaction/{sessionId}")
    suspend fun getSharedInteractionState(
        @Path("partyId") partyId: String,
        @Path("sessionId") sessionId: String,
    ): SharedSessionState
}
