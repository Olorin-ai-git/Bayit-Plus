import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

/// Medium Now Playing widget: logo + show + next show + progress.
struct NowPlayingMediumView: View {
    let entry: NowPlayingEntry

    var body: some View {
        if let data = entry.nowPlaying {
            HStack(spacing: DesignTokens.Spacing.md) {
                // Channel logo (tappable to open content)
                Link(destination: deepLink(for: data)) {
                    AsyncImage(url: data.logoURL) { image in
                        image.resizable().aspectRatio(contentMode: .fit)
                    } placeholder: {
                        Image(systemName: contentIcon(for: data.contentType))
                            .font(.system(size: DesignTokens.FontSize.xxxl))
                            .foregroundStyle(DesignTokens.Primary.p400)
                    }
                    .frame(width: 56, height: 56)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
                }

                // Content info (tappable to open content)
                Link(destination: deepLink(for: data)) {
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                        // Channel name + live indicator
                        HStack(spacing: DesignTokens.Spacing.xs) {
                            Text(data.channelName)
                                .font(.system(size: DesignTokens.FontSize.xs, weight: .medium))
                                .foregroundStyle(DesignTokens.Text.secondary)

                            if data.contentType == .liveTV || data.contentType == .radio {
                                liveIndicator
                            }
                        }

                        // Show title
                        Text(data.showTitle)
                            .font(.system(size: DesignTokens.FontSize.md, weight: .bold))
                            .foregroundStyle(DesignTokens.Text.primary)
                            .lineLimit(1)

                        // Shared progress bar
                        WidgetProgressBar(progress: data.progress, height: 3)

                        // Next show
                        if let nextTitle = data.nextShowTitle {
                            HStack(spacing: DesignTokens.Spacing.xs) {
                                Text("Next:")
                                    .font(.system(size: DesignTokens.FontSize.xs))
                                    .foregroundStyle(DesignTokens.Text.muted)
                                Text(nextTitle)
                                    .font(.system(size: DesignTokens.FontSize.xs, weight: .medium))
                                    .foregroundStyle(DesignTokens.Text.secondary)
                                    .lineLimit(1)
                            }
                        }
                    }
                }

                Spacer()

                // Interactive play/pause button (iOS 17+)
                if #available(iOS 17.0, *) {
                    Button(intent: TogglePlayPauseIntent(
                        contentID: data.channelID,
                        isPlaying: data.isPlaying
                    )) {
                        Image(systemName: data.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                            .font(.system(size: DesignTokens.FontSize.xxxl))
                            .foregroundStyle(DesignTokens.Primary.p400)
                    }
                    .buttonStyle(.plain)
                    .frame(minWidth: 44, minHeight: 44)
                    .accessibilityLabel(data.isPlaying ? "Pause" : "Play")
                    .accessibilityHint("Toggles playback of \(data.channelName)")
                } else {
                    Image(systemName: data.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                        .font(.system(size: DesignTokens.FontSize.xxxl))
                        .foregroundStyle(DesignTokens.Primary.p400)
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
        } else {
            Link(destination: WidgetDeepLinks.liveTV) {
                emptyState
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

    private var liveIndicator: some View {
        HStack(spacing: 2) {
            Circle()
                .fill(DesignTokens.live)
                .frame(width: 6, height: 6)
            Text("LIVE")
                .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
                .foregroundStyle(DesignTokens.live)
        }
    }

    private var emptyState: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: "tv")
                .font(.system(size: DesignTokens.FontSize.xxxl))
                .foregroundStyle(DesignTokens.Text.muted)
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                Text("Nothing Playing")
                    .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.secondary)
                Text("Tap to open Bayit+")
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            Spacer()
        }
        .padding(DesignTokens.Spacing.md)
    }

    private func deepLink(for data: SharedNowPlayingData) -> URL {
        WidgetDeepLinks.content(id: data.channelID, type: data.contentType)
    }

    private func contentIcon(for type: SharedContentType) -> String {
        switch type {
        case .liveTV: return "tv"
        case .radio: return "radio"
        case .podcast: return "headphones"
        case .audiobook: return "book.fill"
        case .vod: return "film"
        }
    }
}
