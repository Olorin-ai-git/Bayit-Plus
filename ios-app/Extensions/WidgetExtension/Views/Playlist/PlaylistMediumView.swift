import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

/// Medium Playlist widget: header + Play All + 3 items with thumbnails, titles, duration.
struct PlaylistMediumView: View {
    let entry: PlaylistEntry

    private var playlist: SharedPlaylistItem? {
        entry.playlists.first
    }

    private var displayItems: [SharedPlaylistContentItem] {
        guard let playlist else { return [] }
        return Array(playlist.items.prefix(3))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            if let playlist {
                // Header with Play All
                HStack {
                    Image(systemName: "music.note.list")
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Primary.p400)
                    Text("My Playlist")
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .accessibilityAddTraits(.isHeader)
                    Spacer()

                    // Play All button
                    if #available(iOS 17.0, *) {
                        Button(intent: PlayPlaylistIntent(
                            playlistID: playlist.id,
                            playlistName: playlist.name
                        )) {
                            HStack(spacing: DesignTokens.Spacing.xs) {
                                Image(systemName: "play.fill")
                                Text("Play All")
                            }
                            .font(.system(size: DesignTokens.FontSize.xs, weight: .semibold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, DesignTokens.Spacing.sm)
                            .padding(.vertical, DesignTokens.Spacing.xs)
                            .background(
                                RoundedRectangle(cornerRadius: DesignTokens.Radius.xs)
                                    .fill(DesignTokens.Primary.p500)
                            )
                        }
                        .buttonStyle(.plain)
                        .frame(minWidth: 44, minHeight: 44)
                        .accessibilityLabel("Play all")
                    } else {
                        Link(destination: WidgetDeepLinks.playlist(id: playlist.id)) {
                            HStack(spacing: DesignTokens.Spacing.xs) {
                                Image(systemName: "play.fill")
                                Text("Play All")
                            }
                            .font(.system(size: DesignTokens.FontSize.xs, weight: .semibold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, DesignTokens.Spacing.sm)
                            .padding(.vertical, DesignTokens.Spacing.xs)
                            .background(
                                RoundedRectangle(cornerRadius: DesignTokens.Radius.xs)
                                    .fill(DesignTokens.Primary.p500)
                            )
                        }
                        .frame(minWidth: 44, minHeight: 44)
                        .accessibilityLabel("Play all")
                    }
                }

                if displayItems.isEmpty {
                    emptyRow(playlist)
                } else {
                    HStack(spacing: DesignTokens.Spacing.sm) {
                        ForEach(displayItems) { item in
                            Link(destination: WidgetDeepLinks.content(
                                id: item.contentID,
                                type: item.contentType
                            )) {
                                itemCard(item)
                            }
                            .frame(minWidth: 44, minHeight: 44)
                            .accessibilityLabel(item.title)
                            .accessibilityValue(PlaylistWidgetHelpers.formattedDuration(
                                item.durationSeconds
                            ))
                        }
                    }
                }
            } else {
                globalEmptyRow
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

    private func itemCard(_ item: SharedPlaylistContentItem) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            // Thumbnail with play icon
            ZStack {
                AsyncImage(url: item.thumbnailURL) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(DesignTokens.Glass.bg)
                        .overlay(
                            Image(systemName: "music.note")
                                .foregroundStyle(DesignTokens.Text.muted)
                        )
                }
                .frame(maxWidth: .infinity)
                .frame(height: 55)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))

                Image(systemName: "play.fill")
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(.white)
                    .padding(DesignTokens.Spacing.xs)
                    .background(Circle().fill(Color.black.opacity(0.6)))
            }

            // Title
            Text(item.title)
                .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineLimit(1)

            // Duration
            Text(PlaylistWidgetHelpers.formattedDuration(item.durationSeconds))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity)
    }

    private func emptyRow(_ playlist: SharedPlaylistItem) -> some View {
        Link(destination: WidgetDeepLinks.playlist(id: playlist.id)) {
            HStack {
                Spacer()
                Text("Open playlist to see items")
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
                Spacer()
            }
            .frame(maxHeight: .infinity)
        }
    }

    private var globalEmptyRow: some View {
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
