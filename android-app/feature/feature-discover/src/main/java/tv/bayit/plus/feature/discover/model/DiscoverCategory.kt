package tv.bayit.plus.feature.discover.model

enum class DiscoverCategory(
    val id: String,
    val nameKey: String,
    val iconName: String,
    val sortOrder: Int,
) {
    WATCHING_MOVIES(
        id = "watching_movies",
        nameKey = "discover.category.watching_movies",
        iconName = "film",
        sortOrder = 0,
    ),
    WATCHING_LIVE_TV(
        id = "watching_live_tv",
        nameKey = "discover.category.watching_live_tv",
        iconName = "tv",
        sortOrder = 1,
    ),
    LEARN_HEBREW(
        id = "learn_hebrew",
        nameKey = "discover.category.learn_hebrew",
        iconName = "book",
        sortOrder = 2,
    ),
    SEARCH_DISCOVERY(
        id = "search_discovery",
        nameKey = "discover.category.search_discovery",
        iconName = "search",
        sortOrder = 3,
    ),
    CHAT_ASSISTANTS(
        id = "chat_assistants",
        nameKey = "discover.category.chat_assistants",
        iconName = "chat",
        sortOrder = 4,
    ),
    ;

    companion object {
        fun fromId(id: String): DiscoverCategory? = entries.firstOrNull { it.id == id }
    }
}
