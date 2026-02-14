package tv.bayit.plus.navigation

import android.content.Intent
import android.net.Uri
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DeepLinkHandler @Inject constructor() {

    fun handleIntent(intent: Intent?): Route? {
        val uri = intent?.data ?: return null
        return parseUri(uri)
    }

    fun parseUri(uri: Uri): Route? {
        val scheme = uri.scheme
        val host = uri.host
        val pathSegments = uri.pathSegments

        return when {
            scheme == "bayitplus" -> handleCustomScheme(host, pathSegments, uri)
            host == "bayit.tv" || host == "www.bayit.tv" -> handleUniversalLink(pathSegments, uri)
            else -> null
        }
    }

    private fun handleCustomScheme(host: String?, segments: List<String>, uri: Uri): Route? {
        Timber.d("Deep link custom scheme: %s://%s/%s", uri.scheme, host, segments.joinToString("/"))
        return when (host) {
            "player" -> segments.firstOrNull()?.let { Route.Player(it, uri.getQueryParameter("type") ?: "movie") }
            "movie" -> segments.firstOrNull()?.let { Route.MovieDetail(it) }
            "series" -> segments.firstOrNull()?.let { Route.SeriesDetail(it) }
            "livetv" -> Route.LiveTV
            "radio" -> Route.Radio
            "search" -> Route.Search
            "profile" -> Route.Profile
            "settings" -> Route.Settings
            "rewards" -> Route.Rewards
            "trivia" -> segments.firstOrNull()?.let { Route.Trivia(it) }
            "chess" -> Route.Chess(segments.firstOrNull())
            "messages" -> Route.DirectMessages
            "watchparty" -> segments.firstOrNull()?.let { Route.WatchPartyDetail(it) } ?: Route.WatchParty
            "zehani" -> Route.ZehAni
            else -> null
        }
    }

    private fun handleUniversalLink(segments: List<String>, uri: Uri): Route? {
        Timber.d("Universal link: %s", uri)
        if (segments.isEmpty()) return Route.Home
        return when (segments.first()) {
            "watch" -> segments.getOrNull(1)?.let { Route.Player(it, uri.getQueryParameter("type") ?: "movie") }
            "movie" -> segments.getOrNull(1)?.let { Route.MovieDetail(it) }
            "series" -> segments.getOrNull(1)?.let { Route.SeriesDetail(it) }
            "live" -> Route.LiveTV
            "radio" -> Route.Radio
            "podcasts" -> Route.Podcasts
            "search" -> Route.Search
            "rewards" -> Route.Rewards
            "trivia" -> segments.getOrNull(1)?.let { Route.Trivia(it) }
            else -> null
        }
    }
}
