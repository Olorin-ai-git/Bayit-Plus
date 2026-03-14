package tv.bayit.plus.core.data.download

import android.content.Context
import android.content.SharedPreferences
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Persistent preferences for download settings: quality level and
 * WiFi-only mode. Backed by [SharedPreferences].
 */
@Singleton
class DownloadPreferences @Inject constructor(
    @ApplicationContext context: Context,
) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    var quality: DownloadQuality
        get() {
            val ordinal = prefs.getInt(KEY_QUALITY, DownloadQuality.HD.ordinal)
            return DownloadQuality.entries.getOrElse(ordinal) { DownloadQuality.HD }
        }
        set(value) = prefs.edit().putInt(KEY_QUALITY, value.ordinal).apply()

    var wifiOnly: Boolean
        get() = prefs.getBoolean(KEY_WIFI_ONLY, true)
        set(value) = prefs.edit().putBoolean(KEY_WIFI_ONLY, value).apply()

    companion object {
        private const val PREFS_NAME = "bayit_download_prefs"
        private const val KEY_QUALITY = "download_quality"
        private const val KEY_WIFI_ONLY = "wifi_only"
    }
}

enum class DownloadQuality {
    SD,
    HD,
    FHD,
}
