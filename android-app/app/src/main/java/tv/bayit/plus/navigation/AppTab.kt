package tv.bayit.plus.navigation

enum class AppTab(
    val route: Route,
    val labelKey: String,
    val iconName: String,
    val requiresOwnerMode: Boolean = false,
) {
    HOME(Route.Home, "nav.home", "home"),
    LIVE_TV(Route.LiveTV, "nav.liveTV", "tv"),
    VOD(Route.Vod, "nav.vod", "film", requiresOwnerMode = true),
    ZEH_ANI(Route.ZehAni, "nav.zehAni", "person"),
    PODCASTS(Route.Podcasts, "nav.podcasts", "headphones"),
    SEARCH(Route.Search, "nav.search", "search"),
    DISCOVER(Route.Discover, "nav.discover", "auto_awesome"),
    DOWNLOADS(Route.Downloads, "downloads.title", "download", requiresOwnerMode = true),
    ;

    companion object {
        fun visibleTabs(ownerMode: Boolean): List<AppTab> {
            return entries.filter { !it.requiresOwnerMode || ownerMode }
        }
    }
}
