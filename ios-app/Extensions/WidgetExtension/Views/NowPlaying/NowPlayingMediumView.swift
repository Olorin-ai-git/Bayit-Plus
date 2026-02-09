import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

/// Medium Now Playing widget: logo + show + next show + progress.
struct NowPlayingMediumView: View {
    let entry: NowPlayingEntry

    var body: some View {
        Link(destination: deepLink) {
            if let data = entry.nowPlaying {
                HStack(spacing: DesignTokens.Spacing.md) {
                    // Channel logo
                    AsyncImage(url: data.logoURL) { image in
                        image.resizable().aspectRatio(contentMode: .fit)
                    } placeholder: {
                        Image(systemName: contentIcon(for: data.contentType))
                            .font(.system(size: DesignTokens.FontSize.xxxl))
                            .foregroundStyle(DesignTokens.Primary.p400)
                    }
                    .frame(width: 56, height: 56)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))

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

                        // Progress bar
                        WidgetProgressBarView(progress: data.progress)

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

                    Spacer()

                    // Play/pause indicator
                    Image(systemName: data.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                        .font(.system(size: DesignTokens.FontSize.xxxl))
                        .foregroundStyle(DesignTokens.Primary.p400)
                }
                .padding(DesignTokens.Spacing.md)
            } else {
                emptyState
            }
        }
        .containerBackground(for: .widget) {
            LinearGradient(
                colors: [DesignTokens.Background.primary, DesignTokens.Background.elevated],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
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

/// Simple non-interactive progress bar for widget context.
private struct WidgetProgressBarView: View {
    let progress: Double

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(DesignTokens.Glass.bgMedium)
                Capsule()
                    .fill(DesignTokens.Primary.default)
                    .frame(width: max(0, geometry.size.width * CGFloat(min(max(progress, 0), 1))))
            }
        }
        .frame(height: 3)
    }
}
