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
        NowPlayingLiveActivityView()
    }
}
