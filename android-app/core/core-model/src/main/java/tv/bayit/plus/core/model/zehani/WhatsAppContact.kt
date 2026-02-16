package tv.bayit.plus.core.model.zehani

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * WhatsApp contact for grandparent highlight reel sharing.
 *
 * Maps to the backend WhatsAppContact model returned from
 * `/api/v1/zeh-ani/contacts/` endpoints.
 */
@Serializable
data class WhatsAppContact(
    val id: String,
    @SerialName("profile_id") val profileId: String,
    @SerialName("display_name") val displayName: String,
    val relationship: String,
    val language: String = "he",
    @SerialName("last_sent_at") val lastSentAt: String? = null,
    @SerialName("total_reels_sent") val totalReelsSent: Int = 0,
    @SerialName("created_at") val createdAt: String,
)

@Serializable
data class AddWhatsAppContactRequest(
    @SerialName("profile_id") val profileId: String,
    @SerialName("phone_number") val phoneNumber: String,
    @SerialName("display_name") val displayName: String,
    val relationship: String = "grandparent",
    val language: String = "he",
    val pin: String,
)

@Serializable
data class DeleteContactResponse(
    val success: Boolean,
)
