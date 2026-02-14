package tv.bayit.plus.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Response from GET /api/v1/profiles -- a single profile within a user account.
 *
 * Each user account can have multiple profiles (kids, adults).
 * The backend Profile model (profiles collection in MongoDB) returns these fields.
 */
@Serializable
data class AccountProfile(
    val id: String,
    @SerialName("user_id") val userId: String,
    val name: String,
    val avatar: String? = null,
    @SerialName("avatar_color") val avatarColor: String = "#00d9ff",
    @SerialName("is_kids_profile") val isKidsProfile: Boolean = false,
    @SerialName("kids_age_limit") val kidsAgeLimit: Int? = null,
    @SerialName("has_pin") val hasPin: Boolean = false,
    val preferences: Map<String, String> = emptyMap(),
    @SerialName("favorite_categories") val favoriteCategories: List<String> = emptyList(),
    @SerialName("inherit_household_controls") val inheritHouseholdControls: Boolean = true,
    @SerialName("custom_controls_id") val customControlsId: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("last_used_at") val lastUsedAt: String? = null,
)

/**
 * Request body for POST /api/v1/profiles/{profile_id}/select.
 * Optional PIN when the selected profile has a lock.
 */
@Serializable
data class ProfileSelectRequest(
    val pin: String? = null,
)
