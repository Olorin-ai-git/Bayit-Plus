import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

/// Routes to the appropriate Quick Actions layout based on widget family.
struct QuickActionsWidgetView: View {
    let entry: QuickActionsEntry

    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            QuickActionsSmallView()
        case .systemMedium:
            QuickActionsMediumView()
        case .accessoryInline:
            QuickActionsLockScreenInlineView()
        case .accessoryCircular:
            QuickActionsLockScreenCircularView()
        default:
            QuickActionsSmallView()
        }
    }
}
