import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

/// Medium Playlist widget for intent-based configuration.
/// Shows the selected playlist with more detail and action buttons.
@available(iOS 17.0, *)
struct PlaylistIntentMediumView: View {
    let entry: PlaylistIntentEntry

    var body: some View {
        if let playlist = entry.playlist {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                // Header with icon and title
                HStack(spacing: DesignTokens.Spacing.sm) {
                    Image(systemName: "music.note.list")
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Primary.p400)
                    Text("Playlist")
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.secondary)
                    Spacer()
                }

                // Main content
                HStack(spacing: DesignTokens.Spacing.md) {
                    // Thumbnail
                    Link(destination: WidgetDeepLinks.playlist(id: playlist.id)) {
                        ZStack {
                            AsyncImage(url: playlist.thumbnailURL) { image in
                                image.resizable().aspectRatio(contentMode: .fill)
                            } placeholder: {
                                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                                    .fill(DesignTokens.Glass.bg)
                                    .overlay(
                                        Image(systemName: "music.note.list")
                                            .font(.system(size: DesignTokens.FontSize.xl))
                                            .foregroundStyle(DesignTokens.Text.muted)
                                    )
                            }
                            .frame(width: 80, height: 80)
                            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))

                            // Play overlay
                            Image(systemName: "play.fill")
                                .font(.system(size: DesignTokens.FontSize.lg))
                                .foregroundStyle(.white)
                                .padding(DesignTokens.Spacing.sm)
                                .background(Circle().fill(Color.black.opacity(0.6)))
                        }
                        .accessibilityLabel("Playlist artwork")
                        .accessibilityHint("Tap to open playlist")
                    }

                    // Playlist info
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                        Text(playlist.name)
                            .font(.system(size: DesignTokens.FontSize.md, weight: .bold))
                            .foregroundStyle(DesignTokens.Text.primary)
                            .lineLimit(2)
                            .accessibilityLabel("Playlist name: \(playlist.name)")

                        Text(PlaylistWidgetHelpers.itemCountText(playlist.itemCount))
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.secondary)
                            .accessibilityLabel("\(playlist.itemCount) tracks")

                        Spacer()

                        // Action buttons
                        HStack(spacing: DesignTokens.Spacing.sm) {
                            Link(destination: WidgetDeepLinks.playlist(id: playlist.id)) {
                                HStack(spacing: DesignTokens.Spacing.xs) {
                                    Image(systemName: "play.fill")
                                    Text("Play")
                                }
                                .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                                .foregroundStyle(.white)
                                .padding(.horizontal, DesignTokens.Spacing.md)
                                .padding(.vertical, DesignTokens.Spacing.sm)
                                .frame(minWidth: 44, minHeight: 44)
                                .background(
                                    RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                                        .fill(DesignTokens.Primary.p500)
                                )
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Play playlist")

                            Link(destination: WidgetDeepLinks.home) {
                                Image(systemName: "shuffle")
                                    .font(.system(size: DesignTokens.FontSize.md))
                                    .foregroundStyle(DesignTokens.Text.secondary)
                                    .frame(minWidth: 44, minHeight: 44)
                                    .background(
                                        RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                                            .fill(DesignTokens.Glass.bg)
                                    )
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Shuffle playlist")
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .padding(DesignTokens.Spacing.md)
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
