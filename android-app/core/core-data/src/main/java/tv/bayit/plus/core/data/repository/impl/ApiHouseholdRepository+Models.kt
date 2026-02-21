package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PUT
import retrofit2.http.POST
import retrofit2.http.Path
import tv.bayit.plus.core.model.MessageResponse

internal interface HouseholdService {

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

    @POST("api/v1/profiles")
    suspend fun addProfile(@Body request: AddProfileBody): ProfileResponse
}

@Serializable
internal data class AddProfileBody(
    val name: String,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    @SerialName("age_group") val ageGroup: String,
)

@Serializable
internal data class ProfileResponse(
    @SerialName("profile_id") val profileId: String? = null,
    val name: String? = null,
)

@Serializable
internal data class HouseholdResponse(
    @SerialName("household_id") val householdId: String,
    val name: String? = null,
    @SerialName("owner_id") val ownerId: String? = null,
    val members: List<HouseholdMember> = emptyList(),
    @SerialName("shared_controls_id") val sharedControlsId: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
)

@Serializable
internal data class HouseholdMember(
    @SerialName("user_id") val userId: String? = null,
    val role: String? = null,
    @SerialName("joined_at") val joinedAt: String? = null,
    @SerialName("display_name") val displayName: String? = null,
    val avatar: String? = null,
)

@Serializable
internal data class InviteMemberBody(
    val email: String,
    val role: String,
)

@Serializable
internal data class InvitationResponse(
    @SerialName("invitation_id") val invitationId: String? = null,
    @SerialName("expires_at") val expiresAt: String? = null,
)

@Serializable
internal data class RoleUpdateBody(
    val role: String,
)

@Serializable
internal data class SharedControlsResponse(
    val controls: SharedControlsDetail? = null,
    val devices: List<HouseholdDevice>? = null,
)

@Serializable
internal data class SharedControlsDetail(
    val id: String? = null,
    @SerialName("max_content_rating") val maxContentRating: String? = null,
    @SerialName("viewing_hours_enabled") val viewingHoursEnabled: Boolean? = null,
)

@Serializable
internal data class HouseholdDevice(
    val id: String? = null,
    val name: String? = null,
    val type: String? = null,
    @SerialName("last_active") val lastActive: String? = null,
    @SerialName("user_id") val userId: String? = null,
)
