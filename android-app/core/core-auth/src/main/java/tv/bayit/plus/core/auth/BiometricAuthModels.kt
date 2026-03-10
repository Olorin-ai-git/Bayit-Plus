package tv.bayit.plus.core.auth

import androidx.biometric.BiometricPrompt
import tv.bayit.plus.core.common.i18n.BayitStringProvider

/**
 * Data types and enumerations for [BiometricAuthService].
 */
sealed interface BiometricAuthState {
    data object Idle : BiometricAuthState
    data object Authenticating : BiometricAuthState
    data class Authenticated(val session: SessionToken) : BiometricAuthState
    data class Failed(val message: String, val lockout: LockoutStatus) : BiometricAuthState
    data class Error(val message: String) : BiometricAuthState
}

data class SessionToken(
    val token: String,
    val expiresAt: Long,
    val authenticator: String,
)

data class LockoutStatus(
    val isLocked: Boolean,
    val timeRemainingMs: Long,
)

data class BiometricCapability(
    val canAuthenticate: Boolean,
    val deviceSecure: Boolean,
    val hasStrongBiometric: Boolean,
    val hasWeakBiometric: Boolean,
    val availableTypes: List<BiometricType>,
)

enum class BiometricType {
    BIOMETRIC_STRONG,
    BIOMETRIC_WEAK,
    DEVICE_CREDENTIAL,
}

/**
 * Maps [BiometricPrompt] error codes to user-facing messages.
 */
internal fun mapBiometricErrorMessage(
    errorCode: Int,
    errString: CharSequence,
    stringProvider: BayitStringProvider,
): String =
    when (errorCode) {
        BiometricPrompt.ERROR_CANCELED -> stringProvider.string("biometric.error.cancelled")
        BiometricPrompt.ERROR_HW_UNAVAILABLE -> stringProvider.string("biometric.error.hwUnavailable")
        BiometricPrompt.ERROR_HW_NOT_PRESENT -> stringProvider.string("biometric.error.hwNotPresent")
        BiometricPrompt.ERROR_LOCKOUT -> stringProvider.string("biometric.error.lockout")
        BiometricPrompt.ERROR_LOCKOUT_PERMANENT -> stringProvider.string("biometric.error.lockoutPermanent")
        BiometricPrompt.ERROR_NEGATIVE_BUTTON -> stringProvider.string("biometric.error.userCancelled")
        BiometricPrompt.ERROR_NO_BIOMETRICS -> stringProvider.string("biometric.error.noBiometrics")
        BiometricPrompt.ERROR_NO_DEVICE_CREDENTIAL -> stringProvider.string("biometric.error.noCredential")
        BiometricPrompt.ERROR_NO_SPACE -> stringProvider.string("biometric.error.noSpace")
        BiometricPrompt.ERROR_SECURITY_UPDATE_REQUIRED -> stringProvider.string("biometric.error.securityUpdate")
        BiometricPrompt.ERROR_TIMEOUT -> stringProvider.string("biometric.error.timeout")
        BiometricPrompt.ERROR_UNABLE_TO_PROCESS -> stringProvider.string("biometric.error.unableToProcess")
        BiometricPrompt.ERROR_USER_CANCELED -> stringProvider.string("biometric.error.userCancelled")
        else -> stringProvider.string("biometric.error.unknown", mapOf("error" to errString.toString()))
    }
