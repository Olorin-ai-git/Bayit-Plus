package tv.bayit.plus.navigation

private const val SCHEME = "bayitplus"

/**
 * Converts a [Route] to a deep link URL string suitable for persistence and later restoration
 * via [DeepLinkHandler.parseUri].
 *
 * Returns null for routes that should not be restored after re-authentication (auth screens,
 * player, payment, settings sub-pages, onboarding, voice/AI flows, and transient screens).
 */
fun Route.toDeepLinkUrl(): String? = when (this) {
    Route.Home -> "$SCHEME://home"
    Route.LiveTV -> "$SCHEME://livetv"
    Route.Vod -> "$SCHEME://vod"
    Route.Radio -> "$SCHEME://radio"
    Route.Podcasts -> "$SCHEME://podcasts"
    Route.Discover -> "$SCHEME://discover"
    Route.Search -> "$SCHEME://search"
    Route.Audiobooks -> "$SCHEME://audiobooks"
    Route.Trending -> "$SCHEME://trending"
    Route.Epg -> "$SCHEME://epg"
    Route.Favorites -> "$SCHEME://favorites"
    Route.Playlist -> "$SCHEME://playlist"
    Route.Friends -> "$SCHEME://friends"
    Route.WatchParty -> "$SCHEME://watchparty"
    Route.ZehAni -> "$SCHEME://zehani"
    Route.Chatbot -> "$SCHEME://chatbot"
    Route.ActivityFeed -> "$SCHEME://activity"
    Route.Culture -> "$SCHEME://culture"
    Route.Glossary -> "$SCHEME://glossary"
    Route.MissionsDashboard -> "$SCHEME://missions"
    Route.LlmSearch -> "$SCHEME://llm-search"

    is Route.MovieDetail -> "$SCHEME://movie/$movieId"
    is Route.SeriesDetail -> "$SCHEME://series/$seriesId"
    is Route.CollectionDetail -> "$SCHEME://collection/$collectionId"
    is Route.PodcastDetail -> "$SCHEME://podcasts/$showId"
    is Route.AudiobookDetail -> "$SCHEME://audiobooks/$audiobookId"
    is Route.CategoryBrowse -> "$SCHEME://category/$categoryId"
    is Route.WatchPartyDetail -> "$SCHEME://watchparty/$partyId"
    is Route.GlossaryDetail -> "$SCHEME://glossary/$termId"

    // Explicitly excluded: auth, player, payment, settings sub-pages, onboarding, voice/AI,
    // transient or parameter-heavy flows, TV-specific routes.
    else -> null
}
