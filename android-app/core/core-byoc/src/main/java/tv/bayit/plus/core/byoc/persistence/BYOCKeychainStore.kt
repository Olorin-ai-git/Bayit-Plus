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

    fun removeCredentials(sourceId: String) {
        encryptedPrefs.edit()
            .remove(keyForToken(sourceId))
            .remove(keyForUsername(sourceId))
            .remove(keyForPassword(sourceId))
            .apply()
    }

    private fun keyForToken(sourceId: String) = "byoc_token_$sourceId"
    private fun keyForUsername(sourceId: String) = "byoc_user_$sourceId"
    private fun keyForPassword(sourceId: String) = "byoc_pass_$sourceId"
}
