package com.bayitplus.modules

import androidx.biometric.BiometricPrompt
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import org.junit.Before
import org.junit.Test
import org.mockito.Mock
import org.mockito.MockitoAnnotations
import org.mockito.kotlin.any
import org.mockito.kotlin.verify

/**
 * Unit tests for BiometricAuthCallback
 * Tests callback handling for authentication success, error, and failure scenarios
 */
class BiometricAuthCallbackTest {

    @Mock
    private lateinit var reactContext: ReactApplicationContext

    @Mock
    private lateinit var promise: Promise

    @Mock
    private lateinit var authResult: BiometricPrompt.AuthenticationResult

    private lateinit var sessionManager: BiometricSessionManager
    private lateinit var callback: BiometricAuthCallback

    @Before
    fun setUp() {
        MockitoAnnotations.openMocks(this)
        sessionManager = BiometricSessionManager(reactContext)
        callback = BiometricAuthCallback(reactContext, sessionManager, promise)
    }

    @Test
    fun testAuthenticationSucceededWithBiometric() {
        // Mock biometric authentication result
        authResult = mock(BiometricPrompt.AuthenticationResult::class.java) as BiometricPrompt.AuthenticationResult

        callback.onAuthenticationSucceeded(authResult)
        verify(promise).resolve(any())
    }

    @Test
    fun testAuthenticationSucceededWithDeviceCredential() {
        authResult = mock(BiometricPrompt.AuthenticationResult::class.java) as BiometricPrompt.AuthenticationResult

        callback.onAuthenticationSucceeded(authResult)
        verify(promise).resolve(any())
    }

    @Test
    fun testAuthenticationSucceededGeneratesToken() {
        authResult = mock(BiometricPrompt.AuthenticationResult::class.java) as BiometricPrompt.AuthenticationResult

        callback.onAuthenticationSucceeded(authResult)
        assert(sessionManager.isSessionValid())
    }

    @Test
    fun testAuthenticationSucceededClearsFailedAttempts() {
        sessionManager.recordFailedAttempt()
        sessionManager.recordFailedAttempt()

        authResult = mock(BiometricPrompt.AuthenticationResult::class.java) as BiometricPrompt.AuthenticationResult
        callback.onAuthenticationSucceeded(authResult)

        val lockoutStatus = sessionManager.getLockoutStatus()
        assert(!lockoutStatus.isLocked)
    }

    @Test
    fun testAuthenticationErrorCancelled() {
        callback.onAuthenticationError(BiometricPrompt.ERROR_CANCELED, "Cancelled")
        verify(promise).reject("AUTH_ERROR", any<String>())
    }

    @Test
    fun testAuthenticationErrorHardwareUnavailable() {
        callback.onAuthenticationError(BiometricPrompt.ERROR_HW_UNAVAILABLE, "Hardware unavailable")
        verify(promise).reject("AUTH_ERROR", any<String>())
    }

    @Test
    fun testAuthenticationErrorTimeout() {
        callback.onAuthenticationError(BiometricPrompt.ERROR_TIMEOUT, "Timeout")
        verify(promise).reject("AUTH_ERROR", any<String>())
    }

    @Test
    fun testAuthenticationErrorLockout() {
        callback.onAuthenticationError(BiometricPrompt.ERROR_LOCKOUT, "Locked out")
        verify(promise).reject("AUTH_ERROR", any<String>())
    }

    @Test
    fun testAuthenticationErrorNoEnrolled() {
        callback.onAuthenticationError(BiometricPrompt.ERROR_NO_BIOMETRICS, "No biometric enrolled")
        verify(promise).reject("AUTH_ERROR", any<String>())
    }

    @Test
    fun testAuthenticationFailedRecordsAttempt() {
        callback.onAuthenticationFailed()
        val lockoutStatus = sessionManager.getLockoutStatus()
        assert(lockoutStatus.isLocked)
    }

    @Test
    fun testAuthenticationFailedMultipleAttempts() {
        repeat(3) {
            callback.onAuthenticationFailed()
        }
        verify(promise).reject("AUTH_FAILED", any<String>())
    }

    @Test
    fun testAuthenticationFailedExponentialBackoff() {
        callback.onAuthenticationFailed()
        val firstLockout = sessionManager.getLockoutStatus().timeRemainingMs

        callback.onAuthenticationFailed()
        val secondLockout = sessionManager.getLockoutStatus().timeRemainingMs

        assert(secondLockout > firstLockout)
    }

    @Test
    fun testErrorMessageFormatCancelled() {
        callback.onAuthenticationError(BiometricPrompt.ERROR_CANCELED, "Cancelled")
        verify(promise).reject("AUTH_ERROR", "Authentication cancelled")
    }

    @Test
    fun testErrorMessageFormatPermanentLockout() {
        callback.onAuthenticationError(BiometricPrompt.ERROR_LOCKOUT_PERMANENT, "Permanent")
        verify(promise).reject("AUTH_ERROR", "Permanently locked out")
    }

    @Test
    fun testErrorMessageFormatSecurityUpdate() {
        callback.onAuthenticationError(BiometricPrompt.ERROR_SECURITY_UPDATE_REQUIRED, "Update")
        verify(promise).reject("AUTH_ERROR", "Security update required")
    }

    @Test
    fun testMultipleErrorsClearPreviousState() {
        callback.onAuthenticationError(BiometricPrompt.ERROR_TIMEOUT, "Timeout")
        callback.onAuthenticationError(BiometricPrompt.ERROR_HW_UNAVAILABLE, "Unavailable")
        verify(promise).reject("AUTH_ERROR", any<String>())
    }

    @Test
    fun testFailureFollowedByError() {
        callback.onAuthenticationFailed()
        val lockoutAfterFailure = sessionManager.getLockoutStatus().isLocked

        callback.onAuthenticationError(BiometricPrompt.ERROR_TIMEOUT, "Timeout")
        verify(promise).reject("AUTH_ERROR", any<String>())
    }

    @Test
    fun testPromiseResolvedOnlyOnce() {
        authResult = mock(BiometricPrompt.AuthenticationResult::class.java) as BiometricPrompt.AuthenticationResult
        callback.onAuthenticationSucceeded(authResult)
        verify(promise).resolve(any())

        // Second callback should not resolve again
        callback.onAuthenticationFailed()
        // Promise should have been cleared after success
    }

    @Test
    fun testPromiseRejectedOnlyOnce() {
        callback.onAuthenticationFailed()
        verify(promise).reject("AUTH_FAILED", any<String>())

        // Attempting another operation should not affect promise
        callback.onAuthenticationError(BiometricPrompt.ERROR_TIMEOUT, "Timeout")
        // Promise should have been cleared after rejection
    }

    @Test
    fun testAuthenticationFailedLockoutMessage() {
        repeat(5) {
            callback.onAuthenticationFailed()
        }

        val lockoutStatus = sessionManager.getLockoutStatus()
        assert(lockoutStatus.isLocked)
        verify(promise).reject("AUTH_FAILED", any<String>())
    }

    private fun <T> mock(clazz: Class<T>): T {
        return org.mockito.Mockito.mock(clazz)
    }
}
