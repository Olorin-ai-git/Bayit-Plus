import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

/// Small Playlist widget for intent-based configuration.
/// Shows the selected playlist with thumbnail and play button.
@available(iOS 17.0, *)
struct PlaylistIntentSmallView: View {
    let entry: PlaylistIntentEntry

    var body: some View {
        if let playlist = entry.playlist {
            Link(destination: WidgetDeepLinks.playlist(id: playlist.id)) {
                VStack(spacing: DesignTokens.Spacing.sm) {
                    // Thumbnail
                    ZStack {
                        AsyncImage(url: playlist.thumbnailURL) { image in
                            image.resizable().aspectRatio(contentMode: .fill)
                        } placeholder: {
                            RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                                .fill(DesignTokens.Glass.bg)
                                .overlay(
                                    Image(systemName: "music.note.list")
                                        .font(.system(size: DesignTokens.FontSize.xxl))
                                        .foregroundStyle(DesignTokens.Text.muted)
                                )
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 80)
                        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))

                        // Play overlay
                        Image(systemName: "play.fill")
                            .font(.system(size: DesignTokens.FontSize.xl))
                            .foregroundStyle(.white)
                            .padding(DesignTokens.Spacing.md)
                            .background(Circle().fill(Color.black.opacity(0.6)))
                    }
                    .accessibilityLabel("Playlist artwork")
                    .accessibilityHint("Tap to open playlist")

                    // Playlist name
                    Text(playlist.name)
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(2)
                        .accessibilityLabel("Playlist name: \(playlist.name)")

                    // Item count
                    Text(PlaylistWidgetHelpers.itemCountText(playlist.itemCount))
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.muted)
                        .accessibilityLabel("\(playlist.itemCount) tracks")
                }
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
}
