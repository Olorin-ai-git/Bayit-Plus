import SwiftUI
import WidgetKit

@main
struct BayitWidgetsBundle: WidgetBundle {
    @WidgetBundleBuilder
    var body: some Widget {
        TestWidget()
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
    }
}
