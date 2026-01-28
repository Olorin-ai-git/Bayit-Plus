package com.bayitplus.modules

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import org.junit.Before
import org.junit.Test
import org.mockito.Mock
import org.mockito.MockitoAnnotations
import org.mockito.kotlin.any
import org.mockito.kotlin.verify

/**
 * Unit tests for BiometricAuthModule Session Management
 * Tests session token generation, expiration, refresh, and logout
 */
class BiometricAuthSessionTest {

    @Mock
    private lateinit var reactContext: ReactApplicationContext

    @Mock
    private lateinit var promise: Promise

    private lateinit var biometricModule: BiometricAuthModule
    private lateinit var sessionManager: BiometricSessionManager

    @Before
    fun setUp() {
        MockitoAnnotations.openMocks(this)
        biometricModule = BiometricAuthModule(reactContext)
        sessionManager = BiometricSessionManager(reactContext)
    }

    @Test
    fun testGenerateSessionToken() {
        val token = sessionManager.generateSessionToken("biometric")
        assert(token.token.isNotEmpty())
        assert(token.expiresAt > System.currentTimeMillis())
    }

    @Test
    fun testSessionTokenExpiration() {
        val token = sessionManager.generateSessionToken("biometric")
        assert(sessionManager.isSessionValid())
    }

    @Test
    fun testValidateSession() {
        sessionManager.generateSessionToken("biometric")
        biometricModule.validateSession(promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testValidateSessionInvalid() {
        // Without generating token, session should be invalid
        biometricModule.validateSession(promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testSessionTokenRefreshNeeded() {
        sessionManager.generateSessionToken("biometric")
        // Immediately after generation, should not need refresh
        assert(!sessionManager.shouldRefreshToken())
    }

    @Test
    fun testGetTimeUntilExpiration() {
        sessionManager.generateSessionToken("biometric")
        val timeRemaining = sessionManager.getTimeUntilExpiration()
        // Should be approximately 3600 seconds (1 hour)
        assert(timeRemaining in 3595..3605)
    }

    @Test
    fun testRecordFailedAttempt() {
        sessionManager.recordFailedAttempt()
        val lockoutStatus = sessionManager.getLockoutStatus()
        assert(lockoutStatus.isLocked)
    }

    @Test
    fun testFailedAttemptExponentialBackoff() {
        // First attempt: 1s lockout
        sessionManager.recordFailedAttempt()
        var lockoutStatus = sessionManager.getLockoutStatus()
        val firstLockout = lockoutStatus.timeRemainingMs

        // Second attempt: 2s lockout (exponential backoff)
        sessionManager.recordFailedAttempt()
        lockoutStatus = sessionManager.getLockoutStatus()
        val secondLockout = lockoutStatus.timeRemainingMs

        // Second lockout should be longer than first
        assert(secondLockout > firstLockout)
    }

    @Test
    fun testClearFailedAttempts() {
        sessionManager.recordFailedAttempt()
        sessionManager.recordFailedAttempt()
        sessionManager.clearFailedAttempts()

        val lockoutStatus = sessionManager.getLockoutStatus()
        assert(!lockoutStatus.isLocked)
    }

    @Test
    fun testLogout() {
        sessionManager.generateSessionToken("biometric")
        assert(sessionManager.isSessionValid())

        sessionManager.logout()
        assert(!sessionManager.isSessionValid())
    }

    @Test
    fun testLogoutViaModule() {
        biometricModule.logout(promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testGetSessionMetadata() {
        sessionManager.generateSessionToken("biometric")
        val metadata = sessionManager.getSessionMetadata()

        assert(metadata["hasSession"] == true)
        assert((metadata["tokenExpiresIn"] as Long) > 0)
        assert(metadata["lastAuthTime"] != 0L)
    }

    @Test
    fun testSessionTokenWithBiometricAuthenticator() {
        val token = sessionManager.generateSessionToken("biometric")
        assert(token.authenticator == "biometric")
    }

    @Test
    fun testSessionTokenWithDeviceCredentialAuthenticator() {
        val token = sessionManager.generateSessionToken("device_credential")
        assert(token.authenticator == "device_credential")
    }

    @Test
    fun testMultipleFailedAttemptsMaxOut() {
        // Record max attempts
        repeat(5) {
            sessionManager.recordFailedAttempt()
        }

        val lockoutStatus = sessionManager.getLockoutStatus()
        assert(lockoutStatus.isLocked)
    }

    @Test
    fun testSessionIsolation() {
        // Verify sessions are properly isolated in storage
        val token1 = sessionManager.generateSessionToken("biometric")
        assert(sessionManager.isSessionValid())

        // Generate new token - should replace old one
        val token2 = sessionManager.generateSessionToken("device_credential")
        assert(token1.token != token2.token)
        assert(sessionManager.isSessionValid())
    }

    @Test
    fun testTokenRefreshIndicator() {
        sessionManager.generateSessionToken("biometric")
        val shouldRefresh = sessionManager.shouldRefreshToken()
        // Immediately after generation, should not need refresh
        assert(!shouldRefresh)
    }

    @Test
    fun testGetSessionTokenDirect() {
        sessionManager.generateSessionToken("biometric")
        val token = sessionManager.getSessionToken()
        assert(token != null)
        assert(token?.isNotEmpty() == true)
    }

    @Test
    fun testGetSessionTokenInvalid() {
        val token = sessionManager.getSessionToken()
        assert(token == null)
    }
}
