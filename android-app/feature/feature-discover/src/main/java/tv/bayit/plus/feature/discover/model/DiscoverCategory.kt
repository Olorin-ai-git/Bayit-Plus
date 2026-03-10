package tv.bayit.plus.feature.discover.model

/**
 * Top-level grouping of features in the Discover tab.
 *
 * Mirrors the iOS `DiscoverCategory` enum in BayitCore. The [id] values are
 * identical to the iOS raw-value strings so that the backend config, analytics
 * events, and i18n keys align across all platforms without translation.
 *
 * @property id          Stable, snake_case identifier.
 * @property nameKey     i18n key for the section header label.
 * @property sortOrder   Ascending position in the Discover list.
 */
enum class DiscoverCategory(
    val id: String,
    val nameKey: String,
    val sortOrder: Int,
) {
    WATCHING_MOVIES(
        id = "watching_movies",
        nameKey = "discover.category.watching_movies",
        sortOrder = 0,
    ),
    WATCHING_LIVE_TV(
        id = "watching_live_tv",
        nameKey = "discover.category.watching_live_tv",
        sortOrder = 1,
    ),
    LEARN_HEBREW(
        id = "learn_hebrew",
        nameKey = "discover.category.learn_hebrew",
        sortOrder = 2,
    ),
    SEARCH_DISCOVERY(
        id = "search_discovery",
        nameKey = "discover.category.search_discovery",
        sortOrder = 3,
    ),
    CHAT_ASSISTANTS(
        id = "chat_assistants",
        nameKey = "discover.category.chat_assistants",
        sortOrder = 4,
    ),
}
