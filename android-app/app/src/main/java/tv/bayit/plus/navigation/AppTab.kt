package tv.bayit.plus.navigation

enum class AppTab(
    val route: Route,
    val label: String,
    val iconName: String,
) {
    HOME(Route.Home, "Home", "home"),
    LIVE_TV(Route.LiveTV, "Live TV", "tv"),
    VOD(Route.Vod, "VOD", "film"),
    PODCASTS(Route.Podcasts, "Podcasts", "headphones"),
    SEARCH(Route.Search, "Search", "search"),
}
