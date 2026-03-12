package tv.bayit.plus.core.byoc.persistence

import android.content.SharedPreferences
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BYOCKeychainStore @Inject constructor(
    private val encryptedPrefs: SharedPreferences,
) {
    fun storeToken(sourceId: String, token: String) {
        encryptedPrefs.edit().putString(keyForToken(sourceId), token).apply()
    }

    fun getToken(sourceId: String): String? {
        return encryptedPrefs.getString(keyForToken(sourceId), null)
    }

    fun storeCredentials(sourceId: String, username: String, password: String) {
        encryptedPrefs.edit()
            .putString(keyForUsername(sourceId), username)
            .putString(keyForPassword(sourceId), password)
            .apply()
    }

    fun getUsername(sourceId: String): String? {
        return encryptedPrefs.getString(keyForUsername(sourceId), null)
    }

    fun getPassword(sourceId: String): String? {
        return encryptedPrefs.getString(keyForPassword(sourceId), null)
    }

    fun storeRefreshToken(sourceId: String, token: String) {
        encryptedPrefs.edit().putString(keyForRefreshToken(sourceId), token).apply()
    }

    fun getRefreshToken(sourceId: String): String? {
        return encryptedPrefs.getString(keyForRefreshToken(sourceId), null)
    }

    fun removeCredentials(sourceId: String) {
        encryptedPrefs.edit()
            .remove(keyForToken(sourceId))
            .remove(keyForRefreshToken(sourceId))
            .remove(keyForUsername(sourceId))
            .remove(keyForPassword(sourceId))
            .apply()
    }

    fun getOrCreatePlexClientId(): String {
        val existing = encryptedPrefs.getString(KEY_PLEX_CLIENT_ID, null)
        if (existing != null) return existing
        val newId = java.util.UUID.randomUUID().toString()
        encryptedPrefs.edit().putString(KEY_PLEX_CLIENT_ID, newId).apply()
        return newId
    }

    private fun keyForToken(sourceId: String) = "byoc_token_$sourceId"
    private fun keyForRefreshToken(sourceId: String) = "byoc_refresh_$sourceId"
    private fun keyForUsername(sourceId: String) = "byoc_user_$sourceId"
    private fun keyForPassword(sourceId: String) = "byoc_pass_$sourceId"

    companion object {
        private const val KEY_PLEX_CLIENT_ID = "byoc_plex_client_id"
    }
}
