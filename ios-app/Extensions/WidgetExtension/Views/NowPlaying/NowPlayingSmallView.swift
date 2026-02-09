import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

/// Small Now Playing widget: channel logo + show title + play indicator.
struct NowPlayingSmallView: View {
    let entry: NowPlayingEntry

    var body: some View {
        Link(destination: deepLink) {
            VStack(spacing: DesignTokens.Spacing.sm) {
                if let data = entry.nowPlaying {
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

                    // Channel name
                    Text(data.channelName)
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(1)

                    // Play indicator
                    Image(systemName: data.isPlaying ? "pause.fill" : "play.fill")
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Primary.p400)
                } else {
                    emptyState
                }
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
