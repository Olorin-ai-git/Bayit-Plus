package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.EPGRepository
import tv.bayit.plus.core.model.ChannelEPGResponse
import tv.bayit.plus.core.model.EPGEntry
import tv.bayit.plus.core.model.MessageResponse
import tv.bayit.plus.core.network.api.BayitApiClient

/**
 * Production implementation of [EPGRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APIEPGRepository and web api.js.
 */
class ApiEPGRepository(
    private val client: BayitApiClient,
) : EPGRepository {

    private val service: EPGService = client.createService()

    override suspend fun getGuide(date: String): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getGuide(date) }
            response.channels
        }

    override suspend fun getSchedule(
        channelId: String,
        date: String,
    ): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall {
            service.getChannelSchedule(channelId, date)
        }
        response.entries
    }

    override suspend fun getProgramDetails(programId: String): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.getProgramDetails(programId) }
        }

    override suspend fun setReminder(programId: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.setReminder(programId) }
            Unit
        }

    override suspend fun removeReminder(programId: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.removeReminder(programId) }
            Unit
        }
}

private interface EPGService {

    @GET("api/v1/epg")
    suspend fun getGuide(@Query("date") date: String): EPGGuideResponse

    @GET("api/v1/epg/schedule/{channelId}")
    suspend fun getChannelSchedule(
        @Path("channelId") channelId: String,
        @Query("date") date: String,
    ): ChannelEPGResponse

    @GET("api/v1/epg/program/{programId}")
    suspend fun getProgramDetails(
        @Path("programId") programId: String,
    ): EPGProgramDetail

    @POST("api/v1/epg/reminders/{programId}")
    suspend fun setReminder(
        @Path("programId") programId: String,
    ): MessageResponse

    @DELETE("api/v1/epg/reminders/{programId}")
    suspend fun removeReminder(
        @Path("programId") programId: String,
    ): MessageResponse
}

/** Response from the full EPG guide endpoint containing per-channel schedules. */
@Serializable
private data class EPGGuideResponse(
    val channels: List<EPGChannelSchedule> = emptyList(),
    val date: String? = null,
)

/** A single channel's schedule within the EPG guide. */
@Serializable
private data class EPGChannelSchedule(
    @SerialName("channel_id") val channelId: String,
    @SerialName("channel_name") val channelName: String? = null,
    val entries: List<EPGEntry> = emptyList(),
)

/** Detailed program information from the EPG. */
@Serializable
private data class EPGProgramDetail(
    val id: String,
    val title: String? = null,
    val description: String? = null,
    val start: String? = null,
    val end: String? = null,
    val category: String? = null,
    val thumbnail: String? = null,
    @SerialName("channel_id") val channelId: String? = null,
    @SerialName("channel_name") val channelName: String? = null,
    @SerialName("has_catchup") val hasCatchup: Boolean? = null,
)
