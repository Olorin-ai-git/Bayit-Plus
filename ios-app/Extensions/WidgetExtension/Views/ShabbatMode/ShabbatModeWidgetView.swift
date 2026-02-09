import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

/// Routes to the appropriate Shabbat Mode layout based on widget family.
struct ShabbatModeWidgetView: View {
    let entry: ShabbatModeEntry

    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            ShabbatModeSmallView(entry: entry)
        case .systemMedium:
            ShabbatModeMediumView(entry: entry)
        case .systemLarge:
            ShabbatModeLargeView(entry: entry)
        case .accessoryInline:
            ShabbatLockScreenInlineView(entry: entry)
        case .accessoryCircular:
            ShabbatLockScreenCircularView(entry: entry)
        case .accessoryRectangular:
            ShabbatLockScreenRectangularView(entry: entry)
        default:
            ShabbatModeSmallView(entry: entry)
        }
    }
}
