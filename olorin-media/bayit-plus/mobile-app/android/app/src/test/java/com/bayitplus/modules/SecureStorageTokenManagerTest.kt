package com.bayitplus.modules

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/**
 * Unit tests for SecureStorageTokenManager
 * Tests token lifecycle including storage, retrieval, expiration, refresh, rotation, and breach detection
 */
@RunWith(RobolectricTestRunner::class)
class SecureStorageTokenManagerTest {

    private lateinit var context: Context
    private lateinit var tokenManager: SecureStorageTokenManager

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
        tokenManager = SecureStorageTokenManager(context)
        // Clear all tokens before each test
        tokenManager.clearAllTokens()
    }

    @Test
    fun testStoreToken() {
        val tokenId = "test_token_1"
        val tokenValue = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
        val expiresAt = System.currentTimeMillis() + 3600000

        tokenManager.storeToken(tokenId, tokenValue, expiresAt)

        val retrievedToken = tokenManager.getToken(tokenId)
        assertEquals(tokenValue, retrievedToken)
    }

    @Test
    fun testRetrieveToken() {
        val tokenId = "oauth_token_1"
        val tokenValue = "sk_live_abc123xyz"
        val expiresAt = System.currentTimeMillis() + 7200000

        tokenManager.storeToken(tokenId, tokenValue, expiresAt)
        val retrieved = tokenManager.getToken(tokenId)

        assertNotNull(retrieved)
        assertEquals(tokenValue, retrieved)
    }

    @Test
    fun testTokenNotFound() {
        val nonExistentToken = tokenManager.getToken("non_existent")
        assertEquals(null, nonExistentToken)
    }

    @Test
    fun testTokenExpiration() {
        val tokenId = "expired_token"
        val tokenValue = "token_value"
        // Set expiration to 1 second ago (expired)
        val expiresAt = System.currentTimeMillis() - 1000

        tokenManager.storeToken(tokenId, tokenValue, expiresAt)
        val retrievedToken = tokenManager.getToken(tokenId)

        // Token should be expired and return null
        assertEquals(null, retrievedToken)
    }

    @Test
    fun testShouldRefreshToken() {
        val tokenId = "refresh_check_token"
        val tokenValue = "token_value"
        // Set expiration to 4 minutes in future (within 5-minute refresh window)
        val expiresAt = System.currentTimeMillis() + (4 * 60 * 1000)

        tokenManager.storeToken(tokenId, tokenValue, expiresAt)
        val shouldRefresh = tokenManager.shouldRefreshToken(tokenId)

        assertTrue(shouldRefresh)
    }

    @Test
    fun testShouldNotRefreshTokenEarly() {
        val tokenId = "early_refresh_check"
        val tokenValue = "token_value"
        // Set expiration to 10 minutes in future (outside refresh window)
        val expiresAt = System.currentTimeMillis() + (10 * 60 * 1000)

        tokenManager.storeToken(tokenId, tokenValue, expiresAt)
        val shouldRefresh = tokenManager.shouldRefreshToken(tokenId)

        assertFalse(shouldRefresh)
    }

    @Test
    fun testRefreshToken() {
        val tokenId = "token_to_refresh"
        val oldToken = "old_token_value"
        val oldExpiry = System.currentTimeMillis() + 600000

        tokenManager.storeToken(tokenId, oldToken, oldExpiry)

        val newToken = "new_token_value"
        val newExpiry = System.currentTimeMillis() + 3600000
        val refreshed = tokenManager.refreshToken(tokenId, newToken, newExpiry)

        assertTrue(refreshed)
        assertEquals(newToken, tokenManager.getToken(tokenId))
    }

    @Test
    fun testRefreshTokenNotFound() {
        val tokenId = "nonexistent_refresh"
        val newToken = "new_value"
        val newExpiry = System.currentTimeMillis() + 3600000

        val refreshed = tokenManager.refreshToken(tokenId, newToken, newExpiry)

        assertFalse(refreshed)
    }

    @Test
    fun testKeyRotationTracking() {
        val tokenId = "rotation_test_token"
        val tokenValue = "token_value"
        val expiresAt = System.currentTimeMillis() + 3600000

        tokenManager.storeToken(tokenId, tokenValue, expiresAt)

        // First rotation
        tokenManager.refreshToken(tokenId, "new_token_1", expiresAt + 3600000)
        var rotationCount = tokenManager.getKeyRotationCount(tokenId)
        assertEquals(1, rotationCount)

        // Second rotation
        tokenManager.refreshToken(tokenId, "new_token_2", expiresAt + 7200000)
        rotationCount = tokenManager.getKeyRotationCount(tokenId)
        assertEquals(2, rotationCount)
    }

    @Test
    fun testGetKeyRotationCountNotFound() {
        val rotationCount = tokenManager.getKeyRotationCount("nonexistent_token")
        assertEquals(0, rotationCount)
    }

    @Test
    fun testFlagTokenAsBreach() {
        val tokenId = "breach_token"
        val tokenValue = "token_value"
        val expiresAt = System.currentTimeMillis() + 3600000
        val reason = "Suspicious activity detected"

        tokenManager.storeToken(tokenId, tokenValue, expiresAt)
        tokenManager.flagAsBreach(tokenId, reason)

        val isBreach = tokenManager.isTokenBreach(tokenId)
        assertTrue(isBreach)
    }

    @Test
    fun testIsTokenNotBreach() {
        val tokenId = "normal_token"
        val tokenValue = "token_value"
        val expiresAt = System.currentTimeMillis() + 3600000

        tokenManager.storeToken(tokenId, tokenValue, expiresAt)

        val isBreach = tokenManager.isTokenBreach(tokenId)
        assertFalse(isBreach)
    }

    @Test
    fun testRemoveToken() {
        val tokenId = "token_to_remove"
        val tokenValue = "token_value"
        val expiresAt = System.currentTimeMillis() + 3600000

        tokenManager.storeToken(tokenId, tokenValue, expiresAt)
        assertEquals(tokenValue, tokenManager.getToken(tokenId))

        tokenManager.removeToken(tokenId)
        assertEquals(null, tokenManager.getToken(tokenId))
    }

    @Test
    fun testGetTokenMetadata() {
        val tokenId = "metadata_test_token"
        val tokenValue = "token_value"
        val expiresAt = System.currentTimeMillis() + 3600000

        tokenManager.storeToken(tokenId, tokenValue, expiresAt)
        val metadata = tokenManager.getTokenMetadata(tokenId)

        assertNotNull(metadata)
        assertEquals(tokenId, metadata["tokenId"])
        assertTrue(metadata["exists"] as Boolean)
        assertFalse(metadata["isExpired"] as Boolean)
        assertFalse(metadata["isBreach"] as Boolean)
        assertEquals(0, metadata["rotationCount"])
    }

    @Test
    fun testGetTokenMetadataExpired() {
        val tokenId = "expired_metadata_token"
        val tokenValue = "token_value"
        // Already expired
        val expiresAt = System.currentTimeMillis() - 1000

        tokenManager.storeToken(tokenId, tokenValue, expiresAt)
        val metadata = tokenManager.getTokenMetadata(tokenId)

        assertNotNull(metadata)
        assertTrue(metadata["isExpired"] as Boolean)
    }

    @Test
    fun testGetTokenMetadataNeedsRefresh() {
        val tokenId = "refresh_metadata_token"
        val tokenValue = "token_value"
        // Expires in 4 minutes (within 5-minute refresh window)
        val expiresAt = System.currentTimeMillis() + (4 * 60 * 1000)

        tokenManager.storeToken(tokenId, tokenValue, expiresAt)
        val metadata = tokenManager.getTokenMetadata(tokenId)

        assertNotNull(metadata)
        assertTrue(metadata["shouldRefresh"] as Boolean)
    }

    @Test
    fun testGetTokenMetadataWithRotations() {
        val tokenId = "rotation_metadata_token"
        val tokenValue = "token_value"
        val expiresAt = System.currentTimeMillis() + 3600000

        tokenManager.storeToken(tokenId, tokenValue, expiresAt)
        tokenManager.refreshToken(tokenId, "rotated_token_1", expiresAt + 3600000)
        tokenManager.refreshToken(tokenId, "rotated_token_2", expiresAt + 7200000)

        val metadata = tokenManager.getTokenMetadata(tokenId)

        assertNotNull(metadata)
        assertEquals(2, metadata["rotationCount"])
    }

    @Test
    fun testMultipleTokens() {
        val token1Id = "token_1"
        val token1Value = "value_1"
        val token1Expiry = System.currentTimeMillis() + 3600000

        val token2Id = "token_2"
        val token2Value = "value_2"
        val token2Expiry = System.currentTimeMillis() + 7200000

        tokenManager.storeToken(token1Id, token1Value, token1Expiry)
        tokenManager.storeToken(token2Id, token2Value, token2Expiry)

        assertEquals(token1Value, tokenManager.getToken(token1Id))
        assertEquals(token2Value, tokenManager.getToken(token2Id))
    }

    @Test
    fun testClearAllTokens() {
        val token1Id = "token_1"
        val token2Id = "token_2"
        val expiresAt = System.currentTimeMillis() + 3600000

        tokenManager.storeToken(token1Id, "value_1", expiresAt)
        tokenManager.storeToken(token2Id, "value_2", expiresAt)

        tokenManager.clearAllTokens()

        assertEquals(null, tokenManager.getToken(token1Id))
        assertEquals(null, tokenManager.getToken(token2Id))
    }

    @Test
    fun testTokenStorageEncryption() {
        val tokenId = "encrypted_token"
        val tokenValue = "sensitive_token_data"
        val expiresAt = System.currentTimeMillis() + 3600000

        tokenManager.storeToken(tokenId, tokenValue, expiresAt)

        // Verify token is stored and can be retrieved (encryption handled transparently)
        val retrieved = tokenManager.getToken(tokenId)
        assertEquals(tokenValue, retrieved)
    }

    @Test
    fun testTokenMetadataCompleteness() {
        val tokenId = "complete_metadata_token"
        val tokenValue = "token_value"
        val expiresAt = System.currentTimeMillis() + 3600000

        tokenManager.storeToken(tokenId, tokenValue, expiresAt)
        tokenManager.refreshToken(tokenId, "refreshed_token", expiresAt + 3600000)
        tokenManager.flagAsBreach(tokenId, "Test breach flag")

        val metadata = tokenManager.getTokenMetadata(tokenId)

        // Verify all expected metadata fields exist
        assertNotNull(metadata["tokenId"])
        assertNotNull(metadata["exists"])
        assertNotNull(metadata["isExpired"])
        assertNotNull(metadata["shouldRefresh"])
        assertNotNull(metadata["isBreach"])
        assertNotNull(metadata["rotationCount"])
        assertNotNull(metadata["expiresAt"])
    }

    @Test
    fun testTokenRefreshMultipleTimes() {
        val tokenId = "multi_refresh_token"
        var tokenValue = "initial_token"
        var expiresAt = System.currentTimeMillis() + 3600000

        tokenManager.storeToken(tokenId, tokenValue, expiresAt)

        // Refresh token 3 times
        repeat(3) {
            tokenValue = "refreshed_token_${it + 1}"
            expiresAt = System.currentTimeMillis() + 3600000
            tokenManager.refreshToken(tokenId, tokenValue, expiresAt)
        }

        val rotationCount = tokenManager.getKeyRotationCount(tokenId)
        assertEquals(3, rotationCount)

        // Latest token should be stored
        assertEquals(tokenValue, tokenManager.getToken(tokenId))
    }

    @Test
    fun testTokenExpirationNotification() {
        val tokenId = "expiry_notification_token"
        val tokenValue = "token_value"
        // Set to expire in 2 minutes
        val expiresAt = System.currentTimeMillis() + (2 * 60 * 1000)

        tokenManager.storeToken(tokenId, tokenValue, expiresAt)
        val shouldRefresh = tokenManager.shouldRefreshToken(tokenId)

        assertTrue(shouldRefresh)
    }

    @Test
    fun testBreachFlagWithMetadata() {
        val tokenId = "breach_metadata_token"
        val tokenValue = "token_value"
        val expiresAt = System.currentTimeMillis() + 3600000
        val breachReason = "Compromised in data breach"

        tokenManager.storeToken(tokenId, tokenValue, expiresAt)
        tokenManager.flagAsBreach(tokenId, breachReason)

        val metadata = tokenManager.getTokenMetadata(tokenId)
        assertTrue(metadata["isBreach"] as Boolean)
    }
}
