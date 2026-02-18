import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

/// Routes to the appropriate Playlist layout based on widget family.
/// This is the intent-based version that works with configurable playlists.
@available(iOS 17.0, *)
struct PlaylistIntentView: View {
    let entry: PlaylistIntentEntry

    @Environment(\.widgetFamily) var family

    var body: some View {
        if !entry.isAuthenticated {
            unauthenticatedView
        } else if entry.playlist == nil {
            noPlaylistSelectedView
        } else {
            switch family {
            case .systemSmall:
                PlaylistIntentSmallView(entry: entry)
            case .systemMedium:
                PlaylistIntentMediumView(entry: entry)
            case .systemLarge:
                ConfigurablePlaylistIntentLargeView(entry: entry)
            default:
                PlaylistIntentSmallView(entry: entry)
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
        .accessibilityLabel("Sign in required")
        .accessibilityHint("Double tap to open Bayit+ and sign in")
    }

    private var noPlaylistSelectedView: some View {
        Link(destination: WidgetDeepLinks.home) {
            VStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "music.note.list")
                    .font(.system(size: DesignTokens.FontSize.xxl))
                    .foregroundStyle(DesignTokens.Text.muted)
                Text("No playlist selected")
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
                Text("Long-press widget to select a playlist")
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
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
        .accessibilityLabel("No playlist selected")
        .accessibilityHint("Long-press widget and select Edit to choose a playlist")
    }
}

