package tv.bayit.plus.navigation

enum class AppTab(
    val route: Route,
    val labelKey: String,
    val iconName: String,
) {
    HOME(Route.Home, "nav.home", "home"),
    LIVE_TV(Route.LiveTV, "nav.liveTV", "tv"),
    VOD(Route.Vod, "nav.vod", "film"),
    ZEH_ANI(Route.ZehAni, "nav.zehAni", "person"),
    PODCASTS(Route.Podcasts, "nav.podcasts", "headphones"),
    SEARCH(Route.Search, "nav.search", "search"),
}
