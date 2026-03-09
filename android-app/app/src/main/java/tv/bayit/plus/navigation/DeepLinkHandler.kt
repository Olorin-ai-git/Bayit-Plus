package tv.bayit.plus.navigation

import android.content.Intent
import android.net.Uri
import tv.bayit.plus.core.common.logging.BayitLogger
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DeepLinkHandler @Inject constructor(
    private val logger: BayitLogger,
) {

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
        logger.debug(
            "Deep link custom scheme",
            mapOf("scheme" to uri.scheme.orEmpty(), "host" to host.orEmpty(), "path" to segments.joinToString("/")),
        )
        return when (host) {
            "player" -> segments.firstOrNull()?.let { Route.Player(it, uri.getQueryParameter("type") ?: "movie") }
            "play" -> segments.firstOrNull()?.let { Route.Player(it, uri.getQueryParameter("type") ?: "movie") }
            "movie" -> segments.firstOrNull()?.let { Route.MovieDetail(it) }
            "series" -> segments.firstOrNull()?.let { Route.SeriesDetail(it) }
            "livetv", "live" -> Route.LiveTV
            "radio" -> Route.Radio
            "podcasts" -> Route.Podcasts
            "search" -> Route.Search
            "resume" -> Route.Home
            "profile" -> Route.Profile
            "settings" -> Route.Settings
            "rewards" -> Route.Rewards
            "trivia" -> segments.firstOrNull()?.let { Route.Trivia(it) }
            "chess" -> Route.Chess(segments.firstOrNull())
            "tv-login" -> {
                val sessionId = uri.getQueryParameter("session") ?: return null
                val token = uri.getQueryParameter("token") ?: return null
                val expires = uri.getQueryParameter("expires") ?: return null
                Route.TVLogin(sessionId = sessionId, token = token, expires = expires)
            }
            "messages" -> Route.DirectMessages
            "watchparty" -> segments.firstOrNull()?.let { Route.WatchPartyDetail(it) } ?: Route.WatchParty
            "zehani" -> Route.ZehAni
            "byoc" -> Route.BYOCSettings
            "onboarding" -> when (segments.firstOrNull()) {
                "ai" -> Route.OnboardingAI
                "voice" -> Route.VoiceOnboarding
                else -> Route.FeatureTour
            }
            "feature-tour" -> Route.FeatureTour
            else -> null
        }
    }

    private fun handleUniversalLink(segments: List<String>, uri: Uri): Route? {
        logger.debug("Universal link received", mapOf("uri" to uri.toString()))
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
            "chess" -> Route.Chess(segments.getOrNull(1))
            "onboarding" -> when (segments.getOrNull(1)) {
                "ai" -> Route.OnboardingAI
                "voice" -> Route.VoiceOnboarding
                else -> Route.FeatureTour
            }
            "feature-tour" -> Route.FeatureTour
            else -> null
        }
    }
}
