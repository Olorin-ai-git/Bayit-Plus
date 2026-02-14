import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

/// Small Now Playing widget: channel logo + show title + play indicator.
struct NowPlayingSmallView: View {
    let entry: NowPlayingEntry

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            if let data = entry.nowPlaying {
                // Channel logo and content (tappable to open app)
                Link(destination: deepLink) {
                    VStack(spacing: DesignTokens.Spacing.sm) {
                        // Channel logo
                        AsyncImage(url: data.logoURL) { image in
                            image.resizable().aspectRatio(contentMode: .fit)
                        } placeholder: {
                            Image(systemName: contentIcon(for: data.contentType))
                                .font(.system(size: DesignTokens.FontSize.xxl))
                                .foregroundStyle(DesignTokens.Primary.p400)
                        }
                        .frame(width: 40, height: 40)
                        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))

                        // Show title
                        Text(data.showTitle)
                            .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                            .foregroundStyle(DesignTokens.Text.primary)
                            .lineLimit(2)
                            .multilineTextAlignment(.center)
                            .accessibilityLabel("Now playing: \(data.showTitle)")

                        // Channel name
                        Text(data.channelName)
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.secondary)
                            .lineLimit(1)
                            .accessibilityLabel("On \(data.channelName)")
                    }
                }

                // Interactive play/pause button (iOS 17+)
                if #available(iOS 17.0, *) {
                    Button(intent: TogglePlayPauseIntent(
                        contentID: data.channelID,
                        isPlaying: data.isPlaying
                    )) {
                        Image(systemName: data.isPlaying ? "pause.fill" : "play.fill")
                            .font(.system(size: DesignTokens.FontSize.lg))
                            .foregroundStyle(DesignTokens.Primary.p400)
                    }
                    .buttonStyle(.plain)
                    .frame(minWidth: 44, minHeight: 44)
                    .accessibilityLabel(data.isPlaying ? "Pause" : "Play")
                    .accessibilityHint("Toggles playback")
                } else {
                    // Fallback for iOS 16 - just show icon
                    Image(systemName: data.isPlaying ? "pause.fill" : "play.fill")
                        .font(.system(size: DesignTokens.FontSize.lg))
                        .foregroundStyle(DesignTokens.Primary.p400)
                }
            } else {
                Link(destination: WidgetDeepLinks.liveTV) {
                    emptyState
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(DesignTokens.Spacing.md)
        .containerBackground(for: .widget) {
            LinearGradient(
                colors: [DesignTokens.Background.primary, DesignTokens.Background.elevated],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }

    private var emptyState: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "tv")
                .font(.system(size: DesignTokens.FontSize.xxl))
                .foregroundStyle(DesignTokens.Text.muted)
            Text("Nothing Playing")
                .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                .foregroundStyle(DesignTokens.Text.secondary)
            Text("Tap to open Bayit+")
                .font(.system(size: DesignTokens.FontSize.xs))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }

    private var deepLink: URL {
        guard let data = entry.nowPlaying else { return WidgetDeepLinks.liveTV }
        return data.contentType == .radio ? WidgetDeepLinks.radio : WidgetDeepLinks.liveTV
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
