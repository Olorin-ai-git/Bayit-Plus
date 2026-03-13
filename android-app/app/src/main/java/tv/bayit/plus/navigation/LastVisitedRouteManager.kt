package tv.bayit.plus.navigation

import android.content.Context
import android.content.SharedPreferences
import android.net.Uri
import dagger.hilt.android.qualifiers.ApplicationContext
import tv.bayit.plus.core.common.logging.BayitLogger
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Persists and restores the last meaningful route visited by each user.
 *
 * Routes are serialised to `bayitplus://` deep link URLs using [Route.toDeepLinkUrl] and stored
 * in plain [SharedPreferences] (route strings carry no sensitive data). Each entry is keyed by
 * user ID so that multi-profile households do not share history.
 *
 * Typical lifecycle:
 * 1. [save] is called on every navigable route change while the user is authenticated.
 * 2. On next login, [restore] is called; if a URL exists it is parsed back to a [Route].
 * 3. [clear] is called on sign-out so stale routes are not offered after re-login.
 */
@Singleton
class LastVisitedRouteManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val deepLinkHandler: DeepLinkHandler,
    private val logger: BayitLogger,
) {
    private val prefs: SharedPreferences by lazy {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    /**
     * Persists [route] for [userId]. Routes that return null from [Route.toDeepLinkUrl] (auth
     * screens, player, etc.) are silently ignored.
     */
    fun save(route: Route, userId: String) {
        val url = route.toDeepLinkUrl() ?: return
        prefs.edit().putString(storageKey(userId), url).apply()
        logger.debug("Last visited route saved", mapOf("route" to url, "user" to userId))
    }

    /**
     * Returns the last persisted [Route] for [userId], or null if none exists or the stored URL
     * can no longer be parsed (e.g. after a schema change in a future app version).
     */
    fun restore(userId: String): Route? {
        val url = prefs.getString(storageKey(userId), null) ?: return null
        val route = deepLinkHandler.parseUri(Uri.parse(url))
        logger.debug(
            "Last visited route restored",
            mapOf("url" to url, "resolved" to (route != null).toString(), "user" to userId),
        )
        return route
    }

    /**
     * Removes the stored route for [userId]. Call on sign-out.
     */
    fun clear(userId: String) {
        prefs.edit().remove(storageKey(userId)).apply()
        logger.debug("Last visited route cleared", mapOf("user" to userId))
    }

    private fun storageKey(userId: String) = "last_route_$userId"

    companion object {
        private const val PREFS_NAME = "bayit_last_visited"
    }
}
