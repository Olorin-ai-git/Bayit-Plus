package tv.bayit.plus.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Request body for POST /api/v1/verification/phone/send */
@Serializable
data class PhoneVerificationRequest(
    @SerialName("phone_number") val phoneNumber: String,
)

/** Response from POST /api/v1/verification/phone/send */
@Serializable
data class PhoneVerificationSendResponse(
    val message: String? = null,
    @SerialName("phone_number") val phoneNumber: String? = null,
)

/** Request body for POST /api/v1/verification/phone/verify */
@Serializable
data class PhoneVerificationCodeRequest(
    val code: String,
)

/** Response from POST /api/v1/verification/phone/verify */
@Serializable
data class PhoneVerificationResponse(
    val message: String? = null,
    @SerialName("phone_verified") val phoneVerified: Boolean? = null,
    @SerialName("is_verified") val isVerified: Boolean? = null,
)

/** Response from GET /api/v1/verification/status */
@Serializable
data class VerificationStatusResponse(
    @SerialName("email_verified") val emailVerified: Boolean? = null,
    @SerialName("phone_verified") val phoneVerified: Boolean? = null,
    @SerialName("is_verified") val isVerified: Boolean? = null,
    @SerialName("is_admin") val isAdmin: Boolean? = null,
    @SerialName("phone_number") val phoneNumber: String? = null,
    val email: String? = null,
)
