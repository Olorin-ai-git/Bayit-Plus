package tv.bayit.plus.data.model.zehani

import com.google.gson.annotations.SerializedName

data class BiometricConsentStatus(
    @SerializedName("profile_id")
    val profileId: String,

    @SerializedName("consents")
    val consents: List<ConsentEntry>
)

data class ConsentEntry(
    @SerializedName("consent_type")
    val consentType: BiometricConsentType,

    @SerializedName("active")
    val active: Boolean
)

enum class BiometricConsentType {
    @SerializedName("mesh_generation") MESH_GENERATION,
    @SerializedName("voice_v2v") VOICE_V2V,
    @SerializedName("latent_features") LATENT_FEATURES
}

data class BiometricConsentRequest(
    @SerializedName("profile_id")
    val profileId: String,

    @SerializedName("consent_type")
    val consentType: String,

    @SerializedName("pin")
    val pin: String
)

data class BiometricConsentResponse(
    @SerializedName("profile_id")
    val profileId: String,

    @SerializedName("consent_type")
    val consentType: String,

    @SerializedName("active")
    val active: Boolean,

    @SerializedName("granted_at")
    val grantedAt: String
)
