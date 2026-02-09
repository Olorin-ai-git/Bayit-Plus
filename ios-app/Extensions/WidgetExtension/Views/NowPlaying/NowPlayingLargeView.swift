import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

/// Large Now Playing widget: full EPG snippet + channel info.
struct NowPlayingLargeView: View {
    let entry: NowPlayingEntry

    var body: some View {
        Link(destination: deepLink) {
            if let data = entry.nowPlaying {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                    // Header: logo + channel name + live badge
                    HStack(spacing: DesignTokens.Spacing.md) {
                        AsyncImage(url: data.logoURL) { image in
                            image.resizable().aspectRatio(contentMode: .fit)
                        } placeholder: {
                            Image(systemName: contentIcon(for: data.contentType))
                                .font(.system(size: DesignTokens.FontSize.xxl))
                                .foregroundStyle(DesignTokens.Primary.p400)
                        }
                        .frame(width: 48, height: 48)
                        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))

                        VStack(alignment: .leading, spacing: 2) {
                            Text(data.channelName)
                                .font(.system(size: DesignTokens.FontSize.md, weight: .bold))
                                .foregroundStyle(DesignTokens.Text.primary)
                            if data.contentType == .liveTV || data.contentType == .radio {
                                HStack(spacing: 2) {
                                    Circle().fill(DesignTokens.live).frame(width: 6, height: 6)
                                    Text("LIVE")
                                        .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
                                        .foregroundStyle(DesignTokens.live)
                                }
                            }
                        }

                        Spacer()

                        Image(systemName: data.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                            .font(.system(size: DesignTokens.FontSize.display))
                            .foregroundStyle(DesignTokens.Primary.p400)
                    }

                    // Current show card
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                        Text("NOW")
                            .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
                            .foregroundStyle(DesignTokens.Primary.p400)
                        Text(data.showTitle)
                            .font(.system(size: DesignTokens.FontSize.lg, weight: .semibold))
                            .foregroundStyle(DesignTokens.Text.primary)
                            .lineLimit(2)

                        // Progress
                        progressBar(progress: data.progress)
                    }
                    .padding(DesignTokens.Spacing.md)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(
                        RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                            .fill(DesignTokens.Glass.bg)
                            .overlay(
                                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                                    .stroke(DesignTokens.Glass.borderLight, lineWidth: 1)
                            )
                    )

                    // Next show
                    if let nextTitle = data.nextShowTitle {
                        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                            Text("UP NEXT")
                                .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
                                .foregroundStyle(DesignTokens.Text.muted)
                            HStack {
                                Text(nextTitle)
                                    .font(.system(size: DesignTokens.FontSize.base, weight: .medium))
                                    .foregroundStyle(DesignTokens.Text.secondary)
                                    .lineLimit(1)
                                Spacer()
                                if let nextTime = data.nextShowTime {
                                    Text(nextTime)
                                        .font(.system(size: DesignTokens.FontSize.sm))
                                        .foregroundStyle(DesignTokens.Text.muted)
                                }
                            }
                        }
                        .padding(DesignTokens.Spacing.md)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(
                            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                                .fill(DesignTokens.Glass.bgLight)
                        )
                    }

                    Spacer()
                }
                .padding(DesignTokens.Spacing.base)
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

    private func progressBar(progress: Double) -> some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                Capsule().fill(DesignTokens.Glass.bgMedium)
                Capsule()
                    .fill(DesignTokens.Primary.default)
                    .frame(width: max(0, geometry.size.width * CGFloat(min(max(progress, 0), 1))))
            }
        }
        .frame(height: 4)
    }

    private var emptyState: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Spacer()
            Image(systemName: "tv")
                .font(.system(size: DesignTokens.FontSize.display))
                .foregroundStyle(DesignTokens.Text.muted)
            Text("Nothing Playing")
                .font(.system(size: DesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.secondary)
            Text("Tap to start watching")
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
            Spacer()
        }
        .frame(maxWidth: .infinity)
        .padding(DesignTokens.Spacing.base)
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
