import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Trending culture news row for tvOS (What's Hot in Israel)
/// Optimized for 10-foot UI with focus navigation
struct TVTrendingRow: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(TVNavigationCoordinator.self) private var coordinator

    let items: [CultureTrendingItem]

    /// Max cards that fit the 1920pt screen without horizontal scrolling.
    private static let maxVisibleCards = 4

    var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            header
            topicsRow
            sourcesFooter
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
        .background {
            Canvas { context, size in
                let resolved = context.resolve(Image("Masada"))
                let imgSize = resolved.size
                guard imgSize.width > 0, imgSize.height > 0 else { return }
                let scale = max(size.width / imgSize.width, size.height / imgSize.height)
                let w = imgSize.width * scale
                let h = imgSize.height * scale
                context.draw(resolved, in: CGRect(
                    x: (size.width - w) / 2,
                    y: (size.height - h) / 2,
                    width: w, height: h
                ))
            }
            .overlay {
                LinearGradient(
                    stops: [
                        .init(color: .black.opacity(0.5), location: 0),
                        .init(color: .black.opacity(0.2), location: 0.3),
                        .init(color: .black.opacity(0.4), location: 0.6),
                        .init(color: .black.opacity(0.75), location: 1.0),
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                .stroke(Color.white.opacity(0.1), lineWidth: 2)
        )
    }

    private var header: some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            Text(localizedTitle)
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundColor(.white)
                .shadow(color: .black.opacity(0.6), radius: 4, x: 0, y: 2)

            Image(systemName: "flame.fill")
                .font(.system(size: TVDesignTokens.FontSize.xxl))
                .foregroundColor(.orange)
                .shadow(color: .black.opacity(0.5), radius: 3, x: 0, y: 2)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
    }

    private var topicsRow: some View {
        HStack(spacing: TVDesignTokens.Spacing.focusGap) {
            ForEach(Array(items.prefix(Self.maxVisibleCards))) { item in
                Button {
                    if let urlString = item.url, let url = URL(string: urlString) {
                        coordinator.presentWebView(url: url, title: item.title)
                    }
                } label: {
                    TVTrendingTopicCard(item: item)
                }
                .tvCardStyle()
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        .padding(.vertical, TVDesignTokens.Spacing.md)
        .focusSection()
    }

    private var sourcesFooter: some View {
        let sources = uniqueSources
        return Group {
            if !sources.isEmpty {
                HStack(spacing: TVDesignTokens.Spacing.xs) {
                    Text(localization.t("trending.sources"))
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.muted)

                    Text(sources.joined(separator: ", "))
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.muted)
                        .lineLimit(1)
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            }
        }
    }

    private var localizedTitle: String {
        localization.t("home.whatsHot")
    }

    private var uniqueSources: [String] {
        let allSources = items.compactMap(\.sourceName)
        return Array(Set(allSources)).sorted()
    }
}
