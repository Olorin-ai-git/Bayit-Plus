package tv.bayit.plus.core.model.zehani

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Biometric consent model for Zeh Ani features that require
 * parental consent and PIN verification.
 *
 * Maps to the backend BiometricConsent model returned from
 * `/api/v1/zeh-ani/consent/` endpoints.
 */
@Serializable
data class BiometricConsent(
    val id: String? = null,
    @SerialName("consent_type") val consentType: String,
    val active: Boolean,
    @SerialName("granted_at") val grantedAt: String? = null,
    @SerialName("on_device_only") val onDeviceOnly: Boolean = true,
)

@Serializable
data class BiometricConsentRequest(
    @SerialName("profile_id") val profileId: String,
    @SerialName("consent_type") val consentType: String,
    val pin: String,
    @SerialName("on_device_only") val onDeviceOnly: Boolean = true,
    @SerialName("latent_features_cloud") val latentFeaturesCloud: Boolean = false,
)

@Serializable
data class BiometricConsentStatusResponse(
    @SerialName("profile_id") val profileId: String,
    val consents: List<ConsentStatus>,
)

@Serializable
data class ConsentStatus(
    @SerialName("consent_type") val consentType: String,
    val active: Boolean,
)

/**
 * Known biometric consent types matching the backend enum.
 */
object BiometricConsentType {
    const val MESH_GENERATION = "mesh_generation"
    const val VOICE_V2V = "voice_v2v"
    const val VIDEO_SELFIE = "video_selfie"
    const val HIGHLIGHT_SHARE = "highlight_share"
    const val WHATSAPP_CONTACT = "whatsapp_contact"
}
