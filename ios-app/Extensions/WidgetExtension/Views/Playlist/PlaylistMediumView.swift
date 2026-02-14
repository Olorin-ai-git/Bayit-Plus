import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

/// Medium Playlist widget: 2-3 playlists with play/shuffle.
struct PlaylistMediumView: View {
    let entry: PlaylistEntry

    private var displayPlaylists: [SharedPlaylistItem] {
        Array(entry.playlists.prefix(3))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            // Header
            HStack {
                Image(systemName: "music.note.list")
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Primary.p400)
                Text("My Playlists")
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .accessibilityAddTraits(.isHeader)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }

            if displayPlaylists.isEmpty {
                emptyRow
            } else {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    ForEach(displayPlaylists) { playlist in
                        playlistCard(playlist)
                    }
                }
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

    private func playlistCard(_ playlist: SharedPlaylistItem) -> some View {
        Link(destination: WidgetDeepLinks.playlist(id: playlist.id)) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                // Thumbnail with play icon
                ZStack {
                    AsyncImage(url: playlist.thumbnailURL) { image in
                        image.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Rectangle()
                            .fill(DesignTokens.Glass.bg)
                            .overlay(
                                Image(systemName: "music.note.list")
                                    .foregroundStyle(DesignTokens.Text.muted)
                            )
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 55)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
                    .accessibilityLabel("Playlist thumbnail for \(playlist.name)")

                    // Play overlay
                    Image(systemName: "play.fill")
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(.white)
                        .padding(DesignTokens.Spacing.xs)
                        .background(Circle().fill(Color.black.opacity(0.6)))
                        .accessibilityLabel("Play")
                }

                // Name
                Text(playlist.name)
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)

                // Item count
                Text(itemCountText(playlist.itemCount))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity)
            .frame(minWidth: 44, minHeight: 44)
        }
        .accessibilityLabel("Playlist: \(playlist.name), \(itemCountText(playlist.itemCount))")
        .accessibilityHint("Opens and plays \(playlist.name)")
    }

    private func itemCountText(_ count: Int) -> String {
        count == 1 ? "1 item" : "\(count) items"
    }

    private var emptyRow: some View {
        HStack {
            Spacer()
            Text("Create playlists to see them here")
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
            Spacer()
        }
        .frame(maxHeight: .infinity)
    }
}
