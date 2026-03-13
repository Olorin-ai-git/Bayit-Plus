package tv.bayit.plus.navigation

import androidx.navigation.NavBackStackEntry
import androidx.navigation.toRoute

/**
 * Converts a [NavBackStackEntry] to the corresponding typed [Route] instance.
 *
 * Uses the destination route pattern (qualified class name) to identify which [Route] subclass
 * to deserialise. Only routes that are restorable (i.e. have a non-null [Route.toDeepLinkUrl])
 * are returned; all others yield null to avoid persisting transient or auth-flow destinations.
 */
fun NavBackStackEntry.toBayitRoute(): Route? {
    val pattern = destination.route ?: return null
    return when {
        matchesRoute(pattern, Route.Home::class) -> toRoute<Route.Home>()
        matchesRoute(pattern, Route.LiveTV::class) -> toRoute<Route.LiveTV>()
        matchesRoute(pattern, Route.Vod::class) -> toRoute<Route.Vod>()
        matchesRoute(pattern, Route.Radio::class) -> toRoute<Route.Radio>()
        matchesRoute(pattern, Route.Podcasts::class) -> toRoute<Route.Podcasts>()
        matchesRoute(pattern, Route.Discover::class) -> toRoute<Route.Discover>()
        matchesRoute(pattern, Route.Search::class) -> toRoute<Route.Search>()
        matchesRoute(pattern, Route.Audiobooks::class) -> toRoute<Route.Audiobooks>()
        matchesRoute(pattern, Route.Trending::class) -> toRoute<Route.Trending>()
        matchesRoute(pattern, Route.Epg::class) -> toRoute<Route.Epg>()
        matchesRoute(pattern, Route.Favorites::class) -> toRoute<Route.Favorites>()
        matchesRoute(pattern, Route.Playlist::class) -> toRoute<Route.Playlist>()
        matchesRoute(pattern, Route.Friends::class) -> toRoute<Route.Friends>()
        matchesRoute(pattern, Route.WatchParty::class) -> toRoute<Route.WatchParty>()
        matchesRoute(pattern, Route.ZehAni::class) -> toRoute<Route.ZehAni>()
        matchesRoute(pattern, Route.Chatbot::class) -> toRoute<Route.Chatbot>()
        matchesRoute(pattern, Route.ActivityFeed::class) -> toRoute<Route.ActivityFeed>()
        matchesRoute(pattern, Route.Culture::class) -> toRoute<Route.Culture>()
        matchesRoute(pattern, Route.Glossary::class) -> toRoute<Route.Glossary>()
        matchesRoute(pattern, Route.MissionsDashboard::class) -> toRoute<Route.MissionsDashboard>()
        matchesRoute(pattern, Route.LlmSearch::class) -> toRoute<Route.LlmSearch>()
        matchesRoute(pattern, Route.MovieDetail::class) -> toRoute<Route.MovieDetail>()
        matchesRoute(pattern, Route.SeriesDetail::class) -> toRoute<Route.SeriesDetail>()
        matchesRoute(pattern, Route.CollectionDetail::class) -> toRoute<Route.CollectionDetail>()
        matchesRoute(pattern, Route.PodcastDetail::class) -> toRoute<Route.PodcastDetail>()
        matchesRoute(pattern, Route.AudiobookDetail::class) -> toRoute<Route.AudiobookDetail>()
        matchesRoute(pattern, Route.CategoryBrowse::class) -> toRoute<Route.CategoryBrowse>()
        matchesRoute(pattern, Route.WatchPartyDetail::class) -> toRoute<Route.WatchPartyDetail>()
        matchesRoute(pattern, Route.GlossaryDetail::class) -> toRoute<Route.GlossaryDetail>()
        else -> null
    }
}

private fun matchesRoute(pattern: String, klass: kotlin.reflect.KClass<*>): Boolean {
    val qualifiedName = klass.qualifiedName ?: return false
    return pattern == qualifiedName || pattern.startsWith("$qualifiedName/") || pattern.startsWith("$qualifiedName?")
}
