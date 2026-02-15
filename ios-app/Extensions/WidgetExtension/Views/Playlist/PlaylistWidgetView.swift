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

// MARK: - Intent-based Playlist Views (iOS 17+)

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

// MARK: - Shared Helpers

/// Shared helper functions for playlist widgets.
enum PlaylistWidgetHelpers {
    /// Format item count text with proper pluralization.
    static func itemCountText(_ count: Int) -> String {
        count == 1 ? "1 track" : "\(count) tracks"
    }
}

// MARK: - Intent Small View

/// Small Playlist widget for intent-based configuration.
@available(iOS 17.0, *)
struct PlaylistIntentSmallView: View {
    let entry: PlaylistIntentEntry

    var body: some View {
        if let playlist = entry.playlist {
            Link(destination: WidgetDeepLinks.playlist(id: playlist.id)) {
                VStack(spacing: DesignTokens.Spacing.sm) {
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

                        Image(systemName: "play.fill")
                            .font(.system(size: DesignTokens.FontSize.xl))
                            .foregroundStyle(.white)
                            .padding(DesignTokens.Spacing.md)
                            .background(Circle().fill(Color.black.opacity(0.6)))
                    }
                    .accessibilityLabel("Playlist artwork")

                    Text(playlist.name)
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(2)

                    Text(PlaylistWidgetHelpers.itemCountText(playlist.itemCount))
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.muted)
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

// MARK: - Intent Medium View

/// Medium Playlist widget for intent-based configuration.
@available(iOS 17.0, *)
struct PlaylistIntentMediumView: View {
    let entry: PlaylistIntentEntry

    var body: some View {
        if let playlist = entry.playlist {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    Image(systemName: "music.note.list")
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Primary.p400)
                    Text("Playlist")
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.secondary)
                    Spacer()
                }

                HStack(spacing: DesignTokens.Spacing.md) {
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

                            Image(systemName: "play.fill")
                                .font(.system(size: DesignTokens.FontSize.lg))
                                .foregroundStyle(.white)
                                .padding(DesignTokens.Spacing.sm)
                                .background(Circle().fill(Color.black.opacity(0.6)))
                        }
                    }

                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                        Text(playlist.name)
                            .font(.system(size: DesignTokens.FontSize.md, weight: .bold))
                            .foregroundStyle(DesignTokens.Text.primary)
                            .lineLimit(2)

                        Text(PlaylistWidgetHelpers.itemCountText(playlist.itemCount))
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.secondary)

                        Spacer()

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
