package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.MissionsRepository
import tv.bayit.plus.core.model.Mission
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Production implementation of [MissionsRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APIMissionsRepository and web api.js.
 */
@Singleton
class ApiMissionsRepository @Inject constructor(
    private val client: BayitApiClient,
) : MissionsRepository {

    private val service: MissionsService = client.createService()

    override suspend fun getActiveMissions(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getActiveMissions() }
            response.missions
        }

    override suspend fun getMission(missionId: String): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.getMission(missionId) }
        }

    override suspend fun claimMissionReward(missionId: String): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.claimMissionReward(missionId) }
        }

    override suspend fun getMissionProgress(missionId: String): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.getMissionProgress(missionId) }
        }

    override suspend fun getDailyMissions(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getDailyMissions() }
            response.missions
        }

    override suspend fun getWeeklyMissions(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getWeeklyMissions() }
            response.missions
        }
}

private interface MissionsService {

    @GET("api/v1/missions/active")
    suspend fun getActiveMissions(): MissionsListResponse

    @GET("api/v1/mission/{missionId}")
    suspend fun getMission(@Path("missionId") missionId: String): MissionDetailResponse

    @POST("api/v1/mission/{missionId}/claim")
    suspend fun claimMissionReward(
        @Path("missionId") missionId: String,
    ): ClaimMissionRewardResponse

    @GET("api/v1/mission/{missionId}/progress")
    suspend fun getMissionProgress(
        @Path("missionId") missionId: String,
    ): MissionProgressResponse

    @GET("api/v1/missions/daily")
    suspend fun getDailyMissions(): MissionsListResponse

    @GET("api/v1/missions/weekly")
    suspend fun getWeeklyMissions(): MissionsListResponse
}

/** Response wrapper for mission list endpoints. */
@Serializable
private data class MissionsListResponse(
    val missions: List<Mission> = emptyList(),
    val total: Int? = null,
)

/** Response wrapper for single mission detail. */
@Serializable
private data class MissionDetailResponse(
    val id: String,
    val title: String,
    val description: String? = null,
    val type: String,
    val status: String,
    val progress: Float = 0f,
    val reward: Int? = null,
    @SerialName("expires_at") val expiresAt: String? = null,
)

/** Response returned after claiming a mission reward. */
@Serializable
private data class ClaimMissionRewardResponse(
    @SerialName("mission_id") val missionId: String,
    @SerialName("points_awarded") val pointsAwarded: Int,
    val message: String? = null,
)

/** Response for mission progress tracking. */
@Serializable
private data class MissionProgressResponse(
    @SerialName("mission_id") val missionId: String,
    val progress: Float,
    @SerialName("steps_completed") val stepsCompleted: Int = 0,
    @SerialName("total_steps") val totalSteps: Int = 0,
    val status: String,
)
