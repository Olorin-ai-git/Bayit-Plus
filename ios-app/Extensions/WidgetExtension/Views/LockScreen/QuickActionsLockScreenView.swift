import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

// MARK: - Inline

/// Lock Screen inline quick action: "Bayit+ - Live TV"
struct QuickActionsLockScreenInlineView: View {
    var body: some View {
        Label("Bayit+ Live TV", systemImage: "tv")
    }
}

// MARK: - Circular

/// Lock Screen circular quick action: TV icon linking to live TV.
struct QuickActionsLockScreenCircularView: View {
    var body: some View {
        Link(destination: WidgetDeepLinks.liveTV) {
            ZStack {
                AccessoryWidgetBackground()
                Image(systemName: "tv")
                    .font(.system(size: DesignTokens.FontSize.lg))
                    .widgetAccentable()
            }
        }
    }
}
