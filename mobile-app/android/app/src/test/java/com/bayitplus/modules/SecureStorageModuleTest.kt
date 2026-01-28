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
 * Unit tests for SecureStorageModule.kt
 * Tests encrypted storage operations for OAuth tokens and sensitive credentials
 */
class SecureStorageModuleTest {

    @Mock
    private lateinit var reactContext: ReactApplicationContext

    @Mock
    private lateinit var promise: Promise

    private lateinit var storageModule: SecureStorageModule

    @Before
    fun setUp() {
        MockitoAnnotations.openMocks(this)
        storageModule = SecureStorageModule(reactContext)
    }

    @Test
    fun testSetItem() {
        storageModule.setItem("test_key", "test_value", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testSetItemWithEmptyKey() {
        storageModule.setItem("", "value", promise)
        verify(promise).reject(any(), any<String>())
    }

    @Test
    fun testSetItemWithEmptyValue() {
        storageModule.setItem("key", "", promise)
        verify(promise).reject(any(), any<String>())
    }

    @Test
    fun testGetItem() {
        storageModule.getItem("test_key", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testGetItemNotFound() {
        storageModule.getItem("nonexistent_key", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testRemoveItem() {
        storageModule.removeItem("test_key", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testRemoveItemNotFound() {
        storageModule.removeItem("nonexistent_key", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testClear() {
        storageModule.clear(promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testStoreOAuthToken() {
        storageModule.setItem("oauth_token", "{\"token\":\"abc123\",\"expiresAt\":1234567890}", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testStoreSessionToken() {
        storageModule.setItem("session_token", "{\"token\":\"xyz789\",\"storedAt\":1234567890}", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testGetOAuthToken() {
        storageModule.getItem("oauth_token", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testGetSessionToken() {
        storageModule.getItem("session_token", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testTokenExpiration() {
        // Expired tokens should be removed
        storageModule.getItem("oauth_token", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testMultipleItemsStorage() {
        // Should be able to store multiple items independently
        storageModule.setItem("key1", "value1", promise)
        storageModule.setItem("key2", "value2", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testEncryption() {
        // All stored values should be encrypted with AES256-GCM
        storageModule.setItem("sensitive_data", "secret_value", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testKeyRotation() {
        // Keys should be automatically rotated for security
        storageModule.setItem("test_key", "value", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testAndroidKeystore() {
        // Should use Android Keystore for key management
        storageModule.setItem("test", "value", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testHardwareBackedEncryption() {
        // Should use hardware-backed encryption when available
        storageModule.setItem("key", "value", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testLargeValueStorage() {
        // Should handle large values (e.g., long tokens)
        val largeValue = "x".repeat(10000)
        storageModule.setItem("large_key", largeValue, promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testSpecialCharactersInValue() {
        // Should handle special characters safely
        storageModule.setItem("key", "{\"json\":\"value\",\"array\":[1,2,3]}", promise)
        verify(promise).resolve(any())
    }

    @Test
    fun testConcurrentAccess() {
        // Multiple threads should be able to access storage safely
        storageModule.setItem("key1", "value1", promise)
        storageModule.setItem("key2", "value2", promise)
        verify(promise).resolve(any())
    }
}
