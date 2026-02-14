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
import tv.bayit.plus.core.data.repository.InteractiveMissionRepository
import tv.bayit.plus.core.model.InteractiveMissionDetail
import tv.bayit.plus.core.model.MessageResponse
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Production implementation of [InteractiveMissionRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APIInteractiveMissionRepository and web api.js.
 */
@Singleton
class ApiInteractiveMissionRepository @Inject constructor(
    private val client: BayitApiClient,
) : InteractiveMissionRepository {

    private val service: InteractiveMissionService = client.createService()

    override suspend fun getAvailableMissions(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getInteractiveMissions() }
            response.missions
        }

    override suspend fun startMission(missionId: String): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.startMission(missionId) }
        }

    override suspend fun submitStep(
        missionId: String,
        stepId: String,
        answer: Any,
    ): BayitResult<Any> = runCatchingResult {
        val request = StepSubmissionBody(answer = answer.toString())
        client.safeApiCall { service.submitStep(missionId, stepId, request) }
    }

    override suspend fun getMissionState(missionId: String): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.getMissionState(missionId) }
        }

    override suspend fun abandonMission(missionId: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.abandonMission(missionId) }
            Unit
        }

    override suspend fun getCompletedMissions(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getCompletedMissions() }
            response.missions
        }
}

private interface InteractiveMissionService {

    @GET("api/v1/missions/interactive")
    suspend fun getInteractiveMissions(): InteractiveMissionsListResponse

    @POST("api/v1/mission/{missionId}/start")
    suspend fun startMission(
        @Path("missionId") missionId: String,
    ): MissionStartResponse

    @POST("api/v1/mission/{missionId}/step/{stepId}")
    suspend fun submitStep(
        @Path("missionId") missionId: String,
        @Path("stepId") stepId: String,
        @Body request: StepSubmissionBody,
    ): StepResultResponse

    @GET("api/v1/mission/{missionId}/state")
    suspend fun getMissionState(
        @Path("missionId") missionId: String,
    ): MissionStateResponse

    @DELETE("api/v1/mission/{missionId}/abandon")
    suspend fun abandonMission(
        @Path("missionId") missionId: String,
    ): MessageResponse

    @GET("api/v1/missions/completed")
    suspend fun getCompletedMissions(): InteractiveMissionsListResponse
}

/** Response wrapper for interactive missions list. */
@Serializable
private data class InteractiveMissionsListResponse(
    val missions: List<InteractiveMissionDetail> = emptyList(),
    val total: Int? = null,
)

/** Response returned when a mission is started. */
@Serializable
private data class MissionStartResponse(
    @SerialName("mission_id") val missionId: String,
    @SerialName("current_step") val currentStep: Int = 0,
    @SerialName("total_steps") val totalSteps: Int,
    val status: String,
)

/** Request body for submitting a step answer. */
@Serializable
private data class StepSubmissionBody(
    val answer: String,
)

/** Response from submitting a mission step. */
@Serializable
private data class StepResultResponse(
    @SerialName("step_id") val stepId: String,
    @SerialName("is_correct") val isCorrect: Boolean,
    val feedback: String? = null,
    @SerialName("next_step") val nextStep: Int? = null,
    @SerialName("points_earned") val pointsEarned: Int = 0,
)

/** Current state snapshot of an interactive mission. */
@Serializable
private data class MissionStateResponse(
    @SerialName("mission_id") val missionId: String,
    @SerialName("current_step") val currentStep: Int,
    @SerialName("total_steps") val totalSteps: Int,
    val status: String,
    @SerialName("steps_completed") val stepsCompleted: Int = 0,
    @SerialName("score") val score: Int = 0,
)
