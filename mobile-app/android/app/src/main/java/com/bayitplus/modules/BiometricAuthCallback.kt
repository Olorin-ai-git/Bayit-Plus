package com.bayitplus.modules

import androidx.biometric.BiometricPrompt
import com.facebook.react.bridge.Promise
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.Arguments

/**
 * BiometricAuthCallback.kt - Authentication Callback Handler
 * Encapsulates BiometricPrompt authentication callback logic
 * Handles success, error, and failure scenarios with session management
 */
class BiometricAuthCallback(
    private val reactContext: ReactApplicationContext,
    private val sessionManager: BiometricSessionManager,
    private var currentPromise: Promise?
) : BiometricPrompt.AuthenticationCallback() {

    override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
        val authenticator = when (result.authenticationType) {
            BiometricPrompt.AUTHENTICATION_RESULT_TYPE_DEVICE_CREDENTIAL -> "device_credential"
            BiometricPrompt.AUTHENTICATION_RESULT_TYPE_BIOMETRIC -> "biometric"
            else -> "unknown"
        }

        // Generate session token
        val sessionToken = sessionManager.generateSessionToken(authenticator)
        sessionManager.clearFailedAttempts()

        // Emit success callback
        emitEvent("onBiometricAuthSuccess", mapOf(
            "sessionToken" to sessionToken.token,
            "expiresAt" to sessionToken.expiresAt,
            "authenticator" to authenticator
        ))

        currentPromise?.resolve(mapOf(
            "status" to "authenticated",
            "authenticator" to authenticator,
            "token" to sessionToken.token
        ))
        currentPromise = null
    }

    override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
        val errorMessage = getErrorMessage(errorCode, errString)

        emitEvent("onBiometricAuthError", mapOf(
            "errorCode" to errorCode,
            "message" to errorMessage
        ))

        currentPromise?.reject("AUTH_ERROR", errorMessage)
        currentPromise = null
    }

    override fun onAuthenticationFailed() {
        sessionManager.recordFailedAttempt()
        val lockoutStatus = sessionManager.getLockoutStatus()

        emitEvent("onBiometricAuthFailed", mapOf(
            "isLocked" to lockoutStatus.isLocked,
            "lockoutTimeMs" to lockoutStatus.timeRemainingMs
        ))

        val msg = if (lockoutStatus.isLocked) {
            "Too many failed attempts. Locked out for ${lockoutStatus.timeRemainingMs}ms"
        } else {
            "Biometric authentication failed"
        }
        currentPromise?.reject("AUTH_FAILED", msg)
        currentPromise = null
    }

    private fun getErrorMessage(errorCode: Int, errString: CharSequence): String {
        return when (errorCode) {
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
    }

    private fun emitEvent(eventName: String, data: Map<String, Any?>?) {
        try {
            val eventData = if (data != null) Arguments.makeNativeMap(data) else Arguments.createMap()
            reactContext
                .getJSModule(RCTDeviceEventEmitter::class.java)
                .emit(eventName, eventData)
        } catch (e: Exception) {
            // Silently fail event emission
        }
    }
}
