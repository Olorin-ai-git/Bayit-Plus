package tv.bayit.plus.core.auth

import androidx.biometric.BiometricPrompt

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
internal fun mapBiometricErrorMessage(errorCode: Int, errString: CharSequence): String =
    when (errorCode) {
        BiometricPrompt.ERROR_CANCELED -> "Authentication cancelled"
        BiometricPrompt.ERROR_HW_UNAVAILABLE -> "Biometric hardware unavailable"
        BiometricPrompt.ERROR_HW_NOT_PRESENT -> "No biometric hardware"
        BiometricPrompt.ERROR_LOCKOUT -> "Too many attempts - locked out"
        BiometricPrompt.ERROR_LOCKOUT_PERMANENT -> "Permanently locked out"
        BiometricPrompt.ERROR_NEGATIVE_BUTTON -> "User cancelled"
        BiometricPrompt.ERROR_NO_BIOMETRICS -> "No biometric enrolled"
        BiometricPrompt.ERROR_NO_DEVICE_CREDENTIAL -> "No device credential"
        BiometricPrompt.ERROR_NO_SPACE -> "No space for biometric"
        BiometricPrompt.ERROR_SECURITY_UPDATE_REQUIRED -> "Security update required"
        BiometricPrompt.ERROR_TIMEOUT -> "Authentication timeout"
        BiometricPrompt.ERROR_UNABLE_TO_PROCESS -> "Unable to process biometric"
        BiometricPrompt.ERROR_USER_CANCELED -> "User cancelled"
        else -> "Biometric error: $errString"
    }
