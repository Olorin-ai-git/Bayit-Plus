package tv.bayit.plus.feature.widgets

import android.content.Context
import android.content.SharedPreferences
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.updateAll
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

@Serializable
data class NowPlayingData(
    val title: String,
    val subtitle: String,
    val thumbnailUrl: String?,
    val contentId: String,
    val contentType: String,
    val isPlaying: Boolean,
    val positionMs: Long,
    val durationMs: Long,
)

@Serializable
data class ContinueWatchingItem(
    val contentId: String,
    val title: String,
    val thumbnailUrl: String?,
    val contentType: String,
    val progressPercent: Float,
)

@Serializable
data class LiveChannelItem(
    val channelId: String,
    val channelName: String,
    val logoUrl: String?,
    val currentProgram: String?,
)

@Singleton
class WidgetDataProvider @Inject constructor(
    private val json: Json,
) {
    fun getNowPlaying(context: Context): NowPlayingData? {
        val prefs = getPrefs(context)
        val raw = prefs.getString(KEY_NOW_PLAYING, null) ?: return null
        return runCatching { json.decodeFromString<NowPlayingData>(raw) }.getOrNull()
    }

    fun getContinueWatching(context: Context): List<ContinueWatchingItem> {
        val prefs = getPrefs(context)
        val raw = prefs.getString(KEY_CONTINUE_WATCHING, null) ?: return emptyList()
        return runCatching { json.decodeFromString<List<ContinueWatchingItem>>(raw) }.getOrDefault(emptyList())
    }

    fun getLiveChannels(context: Context): List<LiveChannelItem> {
        val prefs = getPrefs(context)
        val raw = prefs.getString(KEY_LIVE_CHANNELS, null) ?: return emptyList()
        return runCatching { json.decodeFromString<List<LiveChannelItem>>(raw) }.getOrDefault(emptyList())
    }

    fun isLoggedIn(context: Context): Boolean {
        return getPrefs(context).getBoolean(KEY_LOGGED_IN, false)
    }

    fun updateNowPlaying(context: Context, data: NowPlayingData?) {
        val prefs = getPrefs(context)
        if (data != null) {
            prefs.edit().putString(KEY_NOW_PLAYING, json.encodeToString(NowPlayingData.serializer(), data)).apply()
        } else {
            prefs.edit().remove(KEY_NOW_PLAYING).apply()
        }
    }

    fun updateContinueWatching(context: Context, items: List<ContinueWatchingItem>) {
        val prefs = getPrefs(context)
        val limited = items.take(MAX_CONTINUE_WATCHING)
        val serialized = json.encodeToString(ListSerializer(ContinueWatchingItem.serializer()), limited)
        prefs.edit().putString(KEY_CONTINUE_WATCHING, serialized).apply()
    }

    fun updateLiveChannels(context: Context, items: List<LiveChannelItem>) {
        val prefs = getPrefs(context)
        val limited = items.take(MAX_LIVE_CHANNELS)
        val serialized = json.encodeToString(ListSerializer(LiveChannelItem.serializer()), limited)
        prefs.edit().putString(KEY_LIVE_CHANNELS, serialized).apply()
    }

    fun updateLoginState(context: Context, loggedIn: Boolean) {
        getPrefs(context).edit().putBoolean(KEY_LOGGED_IN, loggedIn).apply()
    }

    suspend fun triggerWidgetUpdates(context: Context) = withContext(Dispatchers.Main) {
        NowPlayingWidget().updateAll(context)
        ContinueWatchingWidget().updateAll(context)
        LiveChannelsWidget().updateAll(context)
    }

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    companion object {
        private const val PREFS_NAME = "bayit_widget_data"
        private const val KEY_NOW_PLAYING = "now_playing"
        private const val KEY_CONTINUE_WATCHING = "continue_watching"
        private const val KEY_LIVE_CHANNELS = "live_channels"
        private const val KEY_LOGGED_IN = "logged_in"
        private const val MAX_CONTINUE_WATCHING = 4
        private const val MAX_LIVE_CHANNELS = 4
    }
}
