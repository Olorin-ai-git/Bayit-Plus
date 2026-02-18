import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

/// Small Playlist widget: first item with thumbnail + play overlay, title, playlist name.
struct PlaylistSmallView: View {
    let entry: PlaylistEntry

    var body: some View {
        if let playlist = entry.playlists.first {
            Link(destination: WidgetDeepLinks.playlist(id: playlist.id)) {
                VStack(spacing: DesignTokens.Spacing.sm) {
                    // Thumbnail with play overlay
                    ZStack {
                        if let firstItem = playlist.items.first {
                            AsyncImage(url: firstItem.thumbnailURL) { image in
                                image.resizable().aspectRatio(contentMode: .fill)
                            } placeholder: {
                                thumbnailPlaceholder
                            }
                        } else {
                            AsyncImage(url: playlist.thumbnailURL) { image in
                                image.resizable().aspectRatio(contentMode: .fill)
                            } placeholder: {
                                thumbnailPlaceholder
                            }
                        }

                        // Play overlay
                        Image(systemName: "play.fill")
                            .font(.system(size: DesignTokens.FontSize.lg))
                            .foregroundStyle(.white)
                            .padding(DesignTokens.Spacing.sm)
                            .background(Circle().fill(Color.black.opacity(0.6)))
                            .accessibilityLabel("Play")
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 70)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
                    .accessibilityLabel("Playlist thumbnail")

                    // First item title (or playlist name)
                    Text(playlist.items.first?.title ?? playlist.name)
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(1)

                    // Playlist name
                    Text(playlist.name)
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                        .lineLimit(1)
                }
                .padding(DesignTokens.Spacing.md)
                .frame(minWidth: 44, minHeight: 44)
            }
            .accessibilityLabel("Playlist: \(playlist.name)")
            .accessibilityHint("Opens and plays \(playlist.name)")
            .containerBackground(for: .widget) {
                LinearGradient(
                    colors: [DesignTokens.Background.primary, DesignTokens.Background.elevated],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            }
        } else {
            emptyState
        }
    }

    private var thumbnailPlaceholder: some View {
        RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
            .fill(DesignTokens.Glass.bg)
            .overlay(
                Image(systemName: "music.note.list")
                    .font(.system(size: DesignTokens.FontSize.xxl))
                    .foregroundStyle(DesignTokens.Text.muted)
            )
    }

    private var emptyState: some View {
        Link(destination: WidgetDeepLinks.home) {
            VStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "music.note.list")
                    .font(.system(size: DesignTokens.FontSize.xxl))
                    .foregroundStyle(DesignTokens.Text.muted)
                Text("No playlists")
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .frame(minWidth: 44, minHeight: 44)
            .padding(DesignTokens.Spacing.md)
        }
        .accessibilityLabel("No playlists available")
        .accessibilityHint("Opens home screen to create playlists")
        .containerBackground(for: .widget) {
            LinearGradient(
                colors: [DesignTokens.Background.primary, DesignTokens.Background.elevated],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }
}
