import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

/// Routes to the appropriate Continue Watching layout based on widget family.
struct ContinueWatchingWidgetView: View {
    let entry: ContinueWatchingEntry

    @Environment(\.widgetFamily) var family

    var body: some View {
        if !entry.isAuthenticated {
            unauthenticatedView
        } else {
            switch family {
            case .systemSmall:
                ContinueWatchingSmallView(entry: entry)
            case .systemMedium:
                ContinueWatchingMediumView(entry: entry)
            case .systemLarge:
                ContinueWatchingLargeView(entry: entry)
            default:
                ContinueWatchingSmallView(entry: entry)
            }
        }
    }

    private var unauthenticatedView: some View {
        Link(destination: WidgetDeepLinks.login) {
            VStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "person.crop.circle")
                    .font(.system(size: DesignTokens.FontSize.xxl))
                    .foregroundStyle(DesignTokens.Primary.p400)
                Text("Sign in to see your watchlist")
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(DesignTokens.Spacing.md)
        }
        .containerBackground(for: .widget) {
            LinearGradient(
                colors: [DesignTokens.Background.primary, DesignTokens.Background.elevated],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }
}
