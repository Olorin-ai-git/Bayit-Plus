package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.WatchPartyRepository
import tv.bayit.plus.core.model.Friend
import tv.bayit.plus.core.model.WatchParty
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Production implementation of [WatchPartyRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APIWatchPartyRepository and web api.js.
 */
@Singleton
class ApiWatchPartyRepository @Inject constructor(
    private val client: BayitApiClient,
) : WatchPartyRepository {

    private val service: WatchPartyService = client.createService()

    override suspend fun createParty(mediaId: String): BayitResult<Any> = runCatchingResult {
        val body = CreatePartyBody(mediaId = mediaId)
        client.safeApiCall { service.createParty(body) }
    }

    override suspend fun joinParty(partyCode: String): BayitResult<Any> = runCatchingResult {
        val body = JoinPartyBody(partyCode = partyCode)
        client.safeApiCall { service.joinParty(body) }
    }

    override suspend fun leaveParty(partyId: String): BayitResult<Unit> = runCatchingResult {
        client.safeApiCall { service.leaveParty(partyId) }
        Unit
    }

    override suspend fun getPartyState(partyId: String): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.getPartyState(partyId) }
        }

    override suspend fun syncPlayback(
        partyId: String,
        positionMs: Long,
        isPlaying: Boolean,
    ): BayitResult<Unit> = runCatchingResult {
        val body = SyncPlaybackBody(
            positionMs = positionMs,
            isPlaying = isPlaying,
        )
        client.safeApiCall { service.syncPlayback(partyId, body) }
        Unit
    }

    override suspend fun getPartyMembers(partyId: String): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getPartyMembers(partyId) }
            response.members
        }
}

private interface WatchPartyService {

    @POST("api/v1/social/watch-party")
    suspend fun createParty(@Body request: CreatePartyBody): WatchParty

    @POST("api/v1/social/watch-party/join")
    suspend fun joinParty(@Body request: JoinPartyBody): WatchParty

    @DELETE("api/v1/social/watch-party/{id}/leave")
    suspend fun leaveParty(@Path("id") partyId: String): PartyActionResponse

    @GET("api/v1/social/watch-party/{id}")
    suspend fun getPartyState(@Path("id") partyId: String): WatchParty

    @POST("api/v1/social/watch-party/{id}/sync")
    suspend fun syncPlayback(
        @Path("id") partyId: String,
        @Body request: SyncPlaybackBody,
    ): PartyActionResponse

    @GET("api/v1/social/watch-party/{id}/members")
    suspend fun getPartyMembers(@Path("id") partyId: String): PartyMembersResponse
}

/** Request body for creating a new watch party. */
@Serializable
private data class CreatePartyBody(
    @SerialName("media_id") val mediaId: String,
)

/** Request body for joining an existing watch party by code. */
@Serializable
private data class JoinPartyBody(
    @SerialName("party_code") val partyCode: String,
)

/** Request body for synchronizing playback state across party members. */
@Serializable
private data class SyncPlaybackBody(
    @SerialName("position_ms") val positionMs: Long,
    @SerialName("is_playing") val isPlaying: Boolean,
)

/** Generic response for party mutation actions. */
@Serializable
private data class PartyActionResponse(
    val success: Boolean = true,
    val message: String? = null,
)

/** Response wrapper for watch party member list. */
@Serializable
private data class PartyMembersResponse(
    val members: List<Friend> = emptyList(),
)
