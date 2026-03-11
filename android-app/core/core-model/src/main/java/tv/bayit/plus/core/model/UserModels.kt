package tv.bayit.plus.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Response from GET /api/v1/profiles/me */
@Serializable
data class ProfileResponse(
    val id: String,
    val email: String? = null,
    @SerialName("display_name") val displayName: String? = null,
    val avatar: String? = null,
    val language: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
    val preferences: ProfilePreferences? = null,
    @SerialName("phone_number") val phoneNumber: String? = null,
    @SerialName("phone_verified") val phoneVerified: Boolean? = null,
    @SerialName("has_password") val hasPassword: Boolean? = null,
    @SerialName("auth_provider") val authProvider: String? = null,
    @SerialName("email_verified") val emailVerified: Boolean? = null,
    val role: String? = null,
)

/** User preferences nested within ProfileResponse. */
@Serializable
data class ProfilePreferences(
    val language: String? = null,
    @SerialName("subtitle_language") val subtitleLanguage: String? = null,
    val autoplay: Boolean? = null,
    val notifications: Boolean? = null,
    @SerialName("content_rating") val contentRating: String? = null,
    val quality: String? = null,
)

/** Request body for PUT /api/v1/profiles/me */
@Serializable
data class ProfileUpdateRequest(
    @SerialName("display_name") val displayName: String? = null,
    val avatar: String? = null,
    val language: String? = null,
    val preferences: ProfilePreferencesUpdate? = null,
    @SerialName("phone_number") val phoneNumber: String? = null,
)

/** Preferences update nested within ProfileUpdateRequest. */
@Serializable
data class ProfilePreferencesUpdate(
    val language: String? = null,
    @SerialName("subtitle_language") val subtitleLanguage: String? = null,
    val autoplay: Boolean? = null,
    val notifications: Boolean? = null,
    @SerialName("content_rating") val contentRating: String? = null,
    val quality: String? = null,
)

/** Response from GET /api/v1/profile/stats */
@Serializable
data class ProfileStats(
    @SerialName("total_watched") val totalWatched: Int? = null,
    @SerialName("total_favorites") val totalFavorites: Int? = null,
    @SerialName("total_playlists") val totalPlaylists: Int? = null,
    @SerialName("total_downloads") val totalDownloads: Int? = null,
    @SerialName("total_recordings") val totalRecordings: Int? = null,
    @SerialName("watch_time_minutes") val watchTimeMinutes: Int? = null,
    @SerialName("streak_days") val streakDays: Int? = null,
)

/** User subscription info returned as part of user response. */
@Serializable
data class UserSubscription(
    val id: String? = null,
    val plan: String? = null,
    val status: String? = null,
    @SerialName("start_date") val startDate: String? = null,
    @SerialName("end_date") val endDate: String? = null,
)

/** User response from auth endpoints. */
@Serializable
data class UserResponse(
    val id: String,
    val email: String,
    val name: String,
    val avatar: String? = null,
    @SerialName("is_active") val isActive: Boolean = true,
    val role: String = "user",
    val subscription: UserSubscription? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("last_login") val lastLogin: String? = null,
    @SerialName("is_verified") val isVerified: Boolean = false,
    @SerialName("payment_pending") val paymentPending: Boolean = false,
    @SerialName("pending_plan_id") val pendingPlanId: String? = null,
)

/** Token response from login/register endpoints. */
@Serializable
data class TokenResponse(
    @SerialName("access_token") val accessToken: String,
    @SerialName("token_type") val tokenType: String = "bearer",
    val user: UserResponse,
    @SerialName("refresh_token") val refreshToken: String? = null,
    @SerialName("requires_payment") val requiresPayment: Boolean = false,
)

/** Generic message response for delete/clear operations. */
@Serializable
data class MessageResponse(
    val message: String? = null,
)
