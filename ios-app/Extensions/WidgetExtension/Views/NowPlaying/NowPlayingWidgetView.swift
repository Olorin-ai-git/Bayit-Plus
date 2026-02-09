import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

/// Routes to the appropriate Now Playing layout based on widget family.
struct NowPlayingWidgetView: View {
    let entry: NowPlayingEntry

    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            NowPlayingSmallView(entry: entry)
        case .systemMedium:
            NowPlayingMediumView(entry: entry)
        case .systemLarge:
            NowPlayingLargeView(entry: entry)
        case .accessoryInline:
            NowPlayingLockScreenInlineView(entry: entry)
        case .accessoryCircular:
            NowPlayingLockScreenCircularView(entry: entry)
        case .accessoryRectangular:
            NowPlayingLockScreenRectangularView(entry: entry)
        default:
            NowPlayingSmallView(entry: entry)
        }
    }
}
