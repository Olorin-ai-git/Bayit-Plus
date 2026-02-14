package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.FamilyControlsRepository
import tv.bayit.plus.core.network.api.BayitApiClient

/**
 * Production implementation of [FamilyControlsRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Family controls use the unified /api/v1/family/controls endpoints for PIN-
 * protected parental controls. Profile management uses /api/v1/family/profiles.
 * Screen time and content restrictions are per-profile settings.
 *
 * Endpoint paths mirror the iOS APIFamilyControlsRepository and web api.js.
 */
class ApiFamilyControlsRepository(
    private val client: BayitApiClient,
) : FamilyControlsRepository {

    private val service: FamilyControlsService = client.createService()

    override suspend fun getProfiles(): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall { service.getSections() }
        buildList {
            response.kids?.let { add(it) }
            response.youngsters?.let { add(it) }
        }
    }

    override suspend fun createProfile(
        name: String,
        ageGroup: String,
    ): BayitResult<Any> = runCatchingResult {
        val request = ProfileCreateBody(name = name, ageGroup = ageGroup)
        client.safeApiCall { service.createProfile(request) }
    }

    override suspend fun updateProfile(
        profileId: String,
        updates: Map<String, Any>,
    ): BayitResult<Any> = runCatchingResult {
        val request = FamilyControlsUpdateBody(
            kidsAgeLimit = (updates["kids_age_limit"] as? Number)?.toInt(),
            youngstersAgeLimit = (updates["youngsters_age_limit"] as? Number)?.toInt(),
            kidsEnabled = updates["kids_enabled"] as? Boolean,
            youngstersEnabled = updates["youngsters_enabled"] as? Boolean,
            maxContentRating = updates["max_content_rating"] as? String,
            viewingHoursEnabled = updates["viewing_hours_enabled"] as? Boolean,
            viewingStartHour = (updates["viewing_start_hour"] as? Number)?.toInt(),
            viewingEndHour = (updates["viewing_end_hour"] as? Number)?.toInt(),
        )
        client.safeApiCall { service.updateControls(request) }
    }

    override suspend fun deleteProfile(profileId: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.resetControls() }
            Unit
        }

    override suspend fun getContentRestrictions(
        profileId: String,
    ): BayitResult<Any> = runCatchingResult {
        client.safeApiCall { service.getControls() }
    }

    override suspend fun setContentRestrictions(
        profileId: String,
        restrictions: Map<String, Any>,
    ): BayitResult<Unit> = runCatchingResult {
        val request = FamilyControlsUpdateBody(
            maxContentRating = restrictions["max_content_rating"] as? String,
            kidsAgeLimit = (restrictions["kids_age_limit"] as? Number)?.toInt(),
            youngstersAgeLimit = (restrictions["youngsters_age_limit"] as? Number)?.toInt(),
        )
        client.safeApiCall { service.updateControls(request) }
        Unit
    }

    override suspend fun getScreenTimeRules(
        profileId: String,
    ): BayitResult<Any> = runCatchingResult {
        val response = client.safeApiCall { service.getSections() }
        ScreenTimeRules(
            viewingHoursEnabled = response.viewingHoursEnabled,
            viewingAllowed = response.viewingAllowed,
            viewingHours = response.viewingHours,
            blockReason = response.blockReason,
        )
    }

    override suspend fun setScreenTimeRules(
        profileId: String,
        rules: Map<String, Any>,
    ): BayitResult<Unit> = runCatchingResult {
        val request = FamilyControlsUpdateBody(
            viewingHoursEnabled = rules["viewing_hours_enabled"] as? Boolean,
            viewingStartHour = (rules["viewing_start_hour"] as? Number)?.toInt(),
            viewingEndHour = (rules["viewing_end_hour"] as? Number)?.toInt(),
        )
        client.safeApiCall { service.updateControls(request) }
        Unit
    }
}

private interface FamilyControlsService {

    @GET("api/v1/family/controls")
    suspend fun getControls(): FamilyControlsResponse

    @PATCH("api/v1/family/controls")
    suspend fun updateControls(
        @Body request: FamilyControlsUpdateBody,
    ): FamilyControlsWrappedResponse

    @GET("api/v1/family/controls/sections")
    suspend fun getSections(): FamilySectionsResponse

    @POST("api/v1/family/controls/setup")
    suspend fun createProfile(
        @Body request: ProfileCreateBody,
    ): FamilyControlsWrappedResponse

    @POST("api/v1/family/controls/migrate")
    suspend fun resetControls(): FamilyControlsWrappedResponse
}

/** Response from GET /api/v1/family/controls. */
@Serializable
private data class FamilyControlsResponse(
    @SerialName("user_id") val userId: String? = null,
    @SerialName("kids_age_limit") val kidsAgeLimit: Int? = null,
    @SerialName("youngsters_age_limit") val youngstersAgeLimit: Int? = null,
    @SerialName("kids_enabled") val kidsEnabled: Boolean? = null,
    @SerialName("youngsters_enabled") val youngstersEnabled: Boolean? = null,
    @SerialName("max_content_rating") val maxContentRating: String? = null,
    @SerialName("viewing_hours_enabled") val viewingHoursEnabled: Boolean? = null,
    @SerialName("viewing_start_hour") val viewingStartHour: Int? = null,
    @SerialName("viewing_end_hour") val viewingEndHour: Int? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
)

/** Wrapped response from setup/update endpoints. */
@Serializable
private data class FamilyControlsWrappedResponse(
    val status: String? = null,
    val message: String? = null,
    val controls: FamilyControlsResponse? = null,
)

/** Response from GET /api/v1/family/controls/sections. */
@Serializable
private data class FamilySectionsResponse(
    val kids: FamilySectionInfo? = null,
    val youngsters: FamilySectionInfo? = null,
    @SerialName("max_content_rating") val maxContentRating: String? = null,
    @SerialName("viewing_hours_enabled") val viewingHoursEnabled: Boolean? = null,
    @SerialName("viewing_allowed") val viewingAllowed: Boolean? = null,
    @SerialName("viewing_hours") val viewingHours: ViewingHoursInfo? = null,
    @SerialName("block_reason") val blockReason: String? = null,
)

/** Information about a single family section (kids or youngsters). */
@Serializable
private data class FamilySectionInfo(
    val enabled: Boolean? = null,
    @SerialName("age_limit") val ageLimit: Int? = null,
)

/** Viewing hours range within the sections response. */
@Serializable
private data class ViewingHoursInfo(
    val start: Int? = null,
    val end: Int? = null,
)

/** Request body for creating a profile via the setup endpoint. */
@Serializable
private data class ProfileCreateBody(
    val name: String,
    @SerialName("age_group") val ageGroup: String,
    val pin: String = "0000",
    @SerialName("kids_age_limit") val kidsAgeLimit: Int = 12,
    @SerialName("youngsters_age_limit") val youngstersAgeLimit: Int = 17,
)

/** Request body for updating family controls. */
@Serializable
private data class FamilyControlsUpdateBody(
    @SerialName("kids_age_limit") val kidsAgeLimit: Int? = null,
    @SerialName("youngsters_age_limit") val youngstersAgeLimit: Int? = null,
    @SerialName("kids_enabled") val kidsEnabled: Boolean? = null,
    @SerialName("youngsters_enabled") val youngstersEnabled: Boolean? = null,
    @SerialName("max_content_rating") val maxContentRating: String? = null,
    @SerialName("viewing_hours_enabled") val viewingHoursEnabled: Boolean? = null,
    @SerialName("viewing_start_hour") val viewingStartHour: Int? = null,
    @SerialName("viewing_end_hour") val viewingEndHour: Int? = null,
)

/** Screen time rules extracted from the sections response. */
@Serializable
private data class ScreenTimeRules(
    @SerialName("viewing_hours_enabled") val viewingHoursEnabled: Boolean? = null,
    @SerialName("viewing_allowed") val viewingAllowed: Boolean? = null,
    @SerialName("viewing_hours") val viewingHours: ViewingHoursInfo? = null,
    @SerialName("block_reason") val blockReason: String? = null,
)
