import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

/// Large Playlist widget: header + Play All button + list of up to 6 items.
struct PlaylistLargeView: View {
    let entry: PlaylistEntry

    private var playlist: SharedPlaylistItem? {
        entry.playlists.first
    }

    private var displayItems: [SharedPlaylistContentItem] {
        guard let playlist else { return [] }
        return Array(playlist.items.prefix(6))
    }

    var body: some View {
        if let playlist {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                // Header
                HStack {
                    Image(systemName: "music.note.list")
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Primary.p400)
                    Text("My Playlist")
                        .font(.system(size: DesignTokens.FontSize.md, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .accessibilityAddTraits(.isHeader)
                    Spacer()

                    // Play All button
                    if #available(iOS 17.0, *) {
                        Button(intent: {
                            var intent = PlayPlaylistIntent()
                            intent.playlistID = playlist.id
                            intent.playlistName = playlist.name
                            return intent
                        }()) {
                            HStack(spacing: DesignTokens.Spacing.xs) {
                                Image(systemName: "play.fill")
                                Text("Play All")
                            }
                            .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, DesignTokens.Spacing.md)
                            .padding(.vertical, DesignTokens.Spacing.sm)
                            .background(
                                RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                                    .fill(DesignTokens.Primary.p500)
                            )
                        }
                        .buttonStyle(.plain)
                        .frame(minWidth: 44, minHeight: 44)
                        .accessibilityLabel("Play all items in playlist")
                    } else {
                        Link(destination: WidgetDeepLinks.playlist(id: playlist.id)) {
                            HStack(spacing: DesignTokens.Spacing.xs) {
                                Image(systemName: "play.fill")
                                Text("Play All")
                            }
                            .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, DesignTokens.Spacing.md)
                            .padding(.vertical, DesignTokens.Spacing.sm)
                            .background(
                                RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                                    .fill(DesignTokens.Primary.p500)
                            )
                        }
                        .frame(minWidth: 44, minHeight: 44)
                        .accessibilityLabel("Play all items in playlist")
                    }
                }

                // Item list
                if displayItems.isEmpty {
                    Spacer()
                    emptyListState
                    Spacer()
                } else {
                    VStack(spacing: 0) {
                        ForEach(displayItems) { item in
                            Link(destination: WidgetDeepLinks.content(
                                id: item.contentID,
                                type: item.contentType
                            )) {
                                itemRow(item)
                            }
                            .frame(minWidth: 44, minHeight: 44)
                            .accessibilityLabel(item.title)
                            .accessibilityValue(PlaylistWidgetHelpers.formattedDuration(
                                item.durationSeconds
                            ))

                            if item.id != displayItems.last?.id {
                                Divider()
                                    .background(DesignTokens.Glass.border)
                            }
                        }
                    }
                }
            }
            .padding(DesignTokens.Spacing.base)
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

    private func itemRow(_ item: SharedPlaylistContentItem) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            // Thumbnail
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
                .frame(width: 56, height: 32)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))

                // Play icon
                Image(systemName: "play.fill")
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(.white)
                    .padding(2)
                    .background(Circle().fill(Color.black.opacity(0.6)))
            }

            // Title + duration
            VStack(alignment: .leading, spacing: 2) {
                Text(item.title)
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)

                HStack(spacing: DesignTokens.Spacing.xs) {
                    Text(PlaylistWidgetHelpers.formattedDuration(item.durationSeconds))
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)

                    if item.progress > 0 {
                        WidgetProgressBar(progress: item.progress, height: 2)
                            .frame(width: 40)
                    }
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: DesignTokens.FontSize.xs))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .padding(.vertical, DesignTokens.Spacing.xs)
    }

    private var emptyListState: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Text("Add items to your playlist")
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity)
    }

    private var emptyState: some View {
        Link(destination: WidgetDeepLinks.home) {
            VStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "music.note.list")
                    .font(.system(size: DesignTokens.FontSize.xxxl))
                    .foregroundStyle(DesignTokens.Text.muted)
                Text("No playlists")
                    .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.secondary)
                Text("Create a playlist to see it here")
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(DesignTokens.Spacing.base)
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
