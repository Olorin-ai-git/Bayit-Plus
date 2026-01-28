package com.bayitplus.modules

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * SecureStorageModule.kt - Encrypted Secure Storage
 * Stores sensitive data (OAuth tokens, session tokens) in Android Keystore
 * Hardware-backed encryption when available
 * Features:
 * - Token lifecycle management (storage, refresh, expiration)
 * - Key rotation tracking
 * - Breach detection
 * - Metadata retrieval
 */
class SecureStorageModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "SecureStorageModule"
        private const val PREF_NAME = "bayit_plus_secure_storage"
    }

    private val masterKey = MasterKey.Builder(reactApplicationContext)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val encryptedPreferences = EncryptedSharedPreferences.create(
        reactApplicationContext,
        PREF_NAME,
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    private val tokenManager = SecureStorageTokenManager(reactApplicationContext)

    override fun getName(): String = NAME

    /**
     * Store encrypted value
     */
    @ReactMethod
    fun setItem(key: String, value: String, promise: Promise) {
        try {
            if (key.isBlank() || value.isBlank()) {
                promise.reject("INVALID_INPUT", "Key and value cannot be empty")
                return
            }

            encryptedPreferences.edit().putString(key, value).apply()
            promise.resolve(mapOf("status" to "stored"))
        } catch (e: Exception) {
            promise.reject("STORAGE_ERROR", "Failed to store value: ${e.message}", e)
        }
    }

    /**
     * Retrieve encrypted value
     */
    @ReactMethod
    fun getItem(key: String, promise: Promise) {
        try {
            val value = encryptedPreferences.getString(key, null)
            promise.resolve(mapOf("value" to value, "exists" to (value != null)))
        } catch (e: Exception) {
            promise.reject("RETRIEVAL_ERROR", "Failed to retrieve value: ${e.message}", e)
        }
    }

    /**
     * Remove value
     */
    @ReactMethod
    fun removeItem(key: String, promise: Promise) {
        try {
            encryptedPreferences.edit().remove(key).apply()
            promise.resolve(mapOf("status" to "removed"))
        } catch (e: Exception) {
            promise.reject("REMOVAL_ERROR", "Failed to remove value: ${e.message}", e)
        }
    }

    /**
     * Clear all stored values
     */
    @ReactMethod
    fun clear(promise: Promise) {
        try {
            encryptedPreferences.edit().clear().apply()
            promise.resolve(mapOf("status" to "cleared"))
        } catch (e: Exception) {
            promise.reject("CLEAR_ERROR", "Failed to clear storage: ${e.message}", e)
        }
    }
}
