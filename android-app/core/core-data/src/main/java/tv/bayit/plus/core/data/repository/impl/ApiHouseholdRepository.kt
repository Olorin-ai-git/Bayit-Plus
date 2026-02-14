package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PUT
import retrofit2.http.POST
import retrofit2.http.Path
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.HouseholdRepository
import tv.bayit.plus.core.model.MessageResponse
import tv.bayit.plus.core.network.api.BayitApiClient

/**
 * Production implementation of [HouseholdRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * The household API manages family groups. GET /api/v1/household returns the
 * current user's household. Members, invitations, and role management use
 * sub-paths under the household ID.
 *
 * Endpoint paths mirror the iOS APIHouseholdRepository and web api.js.
 */
class ApiHouseholdRepository(
    private val client: BayitApiClient,
) : HouseholdRepository {

    private val service: HouseholdService = client.createService()

    override suspend fun getHousehold(): BayitResult<Any> = runCatchingResult {
        client.safeApiCall { service.getHousehold() }
    }

    override suspend fun getMembers(): BayitResult<List<Any>> = runCatchingResult {
        val household = client.safeApiCall { service.getHousehold() }
        household.members
    }

    override suspend fun inviteMember(email: String): BayitResult<Unit> =
        runCatchingResult {
            val household = client.safeApiCall { service.getHousehold() }
            val request = InviteMemberBody(email = email, role = "GUARDIAN")
            client.safeApiCall {
                service.inviteMember(household.householdId, request)
            }
            Unit
        }

    override suspend fun removeMember(memberId: String): BayitResult<Unit> =
        runCatchingResult {
            val household = client.safeApiCall { service.getHousehold() }
            client.safeApiCall {
                service.removeMember(household.householdId, memberId)
            }
            Unit
        }

    override suspend fun updateMemberRole(
        memberId: String,
        role: String,
    ): BayitResult<Unit> = runCatchingResult {
        val household = client.safeApiCall { service.getHousehold() }
        val request = RoleUpdateBody(role = role)
        client.safeApiCall {
            service.updateMemberRole(household.householdId, memberId, request)
        }
        Unit
    }

    override suspend fun getDevices(): BayitResult<List<Any>> = runCatchingResult {
        val household = client.safeApiCall { service.getHousehold() }
        val response = client.safeApiCall {
            service.getSharedControls(household.householdId)
        }
        response.devices ?: emptyList()
    }
}

private interface HouseholdService {

    @GET("api/v1/household")
    suspend fun getHousehold(): HouseholdResponse

    @POST("api/v1/household/{householdId}/invite")
    suspend fun inviteMember(
        @Path("householdId") householdId: String,
        @Body request: InviteMemberBody,
    ): InvitationResponse

    @DELETE("api/v1/household/{householdId}/members/{userId}")
    suspend fun removeMember(
        @Path("householdId") householdId: String,
        @Path("userId") userId: String,
    ): MessageResponse

    @PUT("api/v1/household/{householdId}/members/{userId}/role")
    suspend fun updateMemberRole(
        @Path("householdId") householdId: String,
        @Path("userId") userId: String,
        @Body request: RoleUpdateBody,
    ): MessageResponse

    @GET("api/v1/household/{householdId}/controls")
    suspend fun getSharedControls(
        @Path("householdId") householdId: String,
    ): SharedControlsResponse
}

/** Response from GET /api/v1/household. */
@Serializable
private data class HouseholdResponse(
    @SerialName("household_id") val householdId: String,
    val name: String? = null,
    @SerialName("owner_id") val ownerId: String? = null,
    val members: List<HouseholdMember> = emptyList(),
    @SerialName("shared_controls_id") val sharedControlsId: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
)

/** A member within a household response. */
@Serializable
private data class HouseholdMember(
    @SerialName("user_id") val userId: String? = null,
    val role: String? = null,
    @SerialName("joined_at") val joinedAt: String? = null,
    @SerialName("display_name") val displayName: String? = null,
    val avatar: String? = null,
)

/** Request body for inviting a member to the household. */
@Serializable
private data class InviteMemberBody(
    val email: String,
    val role: String,
)

/** Response from the invite endpoint. */
@Serializable
private data class InvitationResponse(
    @SerialName("invitation_id") val invitationId: String? = null,
    @SerialName("expires_at") val expiresAt: String? = null,
)

/** Request body for updating a member's role. */
@Serializable
private data class RoleUpdateBody(
    val role: String,
)

/** Response from the shared controls endpoint, includes device info. */
@Serializable
private data class SharedControlsResponse(
    val controls: SharedControlsDetail? = null,
    val devices: List<HouseholdDevice>? = null,
)

/** Shared family controls detail. */
@Serializable
private data class SharedControlsDetail(
    val id: String? = null,
    @SerialName("max_content_rating") val maxContentRating: String? = null,
    @SerialName("viewing_hours_enabled") val viewingHoursEnabled: Boolean? = null,
)

/** A device registered to the household. */
@Serializable
private data class HouseholdDevice(
    val id: String? = null,
    val name: String? = null,
    val type: String? = null,
    @SerialName("last_active") val lastActive: String? = null,
    @SerialName("user_id") val userId: String? = null,
)
