import SwiftUI
import WidgetKit

@main
struct BayitWidgetsBundle: WidgetBundle {
    var body: some Widget {
        NowPlayingWidget()
        ContinueWatchingWidget()
        TrendingNewsWidget()
        QuickActionsWidget()
        ShabbatModeWidget()
        PlaylistWidget()

        // Configurable widgets (iOS 17+)
        if #available(iOS 17.0, *) {
            ConfigurablePlaylistWidget()
        }

        NowPlayingLiveActivityView()
    }
}
