import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

/// Routes to the appropriate Playlist layout based on widget family.
struct PlaylistWidgetView: View {
    let entry: PlaylistEntry

    @Environment(\.widgetFamily) var family

    var body: some View {
        if !entry.isAuthenticated {
            unauthenticatedView
        } else {
            switch family {
            case .systemSmall:
                PlaylistSmallView(entry: entry)
            case .systemMedium:
                PlaylistMediumView(entry: entry)
            case .systemLarge:
                PlaylistLargeView(entry: entry)
            default:
                PlaylistSmallView(entry: entry)
            }
        }
    }

    private var unauthenticatedView: some View {
        Link(destination: WidgetDeepLinks.login) {
            VStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "music.note.list")
                    .font(.system(size: DesignTokens.FontSize.xxl))
                    .foregroundStyle(DesignTokens.Primary.p400)
                Text("Sign in to access playlists")
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
