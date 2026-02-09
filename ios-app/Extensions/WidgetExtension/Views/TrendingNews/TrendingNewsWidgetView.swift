import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

/// Routes to the appropriate Trending News layout based on widget family.
struct TrendingNewsWidgetView: View {
    let entry: TrendingNewsEntry

    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            TrendingNewsSmallView(entry: entry)
        case .systemMedium:
            TrendingNewsMediumView(entry: entry)
        case .systemLarge:
            TrendingNewsLargeView(entry: entry)
        default:
            TrendingNewsSmallView(entry: entry)
        }
    }
}
