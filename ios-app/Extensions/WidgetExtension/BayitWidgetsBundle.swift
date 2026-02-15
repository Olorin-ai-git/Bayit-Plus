import SwiftUI
import WidgetKit

@main
struct BayitWidgetsBundle: WidgetBundle {
    @WidgetBundleBuilder
    var body: some Widget {
        NowPlayingWidget()
        ContinueWatchingWidget()
        TrendingNewsWidget()
        QuickActionsWidget()
        ShabbatModeWidget()
        PlaylistWidget()
        NowPlayingLiveActivityView()

        // Configurable widgets (iOS 17+)
        if #available(iOS 17.0, *) {
            ConfigurablePlaylistWidget()
        }
    }
}
