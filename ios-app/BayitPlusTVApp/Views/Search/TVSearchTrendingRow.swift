import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// Horizontal scrolling row of landscape trending content cards — "Trending Now".
/// First item is featured (wider). Cards are landscape ~1.4–1.7:1, rounded-2xl,
/// with gradient-to-top overlay and title pinned to bottom-left.
struct TVSearchTrendingRow: View {
    @Environment(LocalizationManager.self) private var localization
    let items: [UnifiedSearchResult]
    let onSelect: (UnifiedSearchResult) -> Void

    private let cardHeight: CGFloat = 280
    private let featuredWidth: CGFloat = 476 // 340:200 ratio scaled to tvOS
    private let regularWidth: CGFloat = 392 // 280:200 ratio scaled to tvOS

    var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("search.trendingSearches"))
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(.white.opacity(0.90))
                .padding(.horizontal, TVDesignTokens.Spacing.xl)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.md) {
                    ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                        trendingCard(item, isFeatured: index == 0)
                    }
                }
                .padding(.vertical, TVDesignTokens.Spacing.sm)
            }
            .focusSection()
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }
    }

    // MARK: - Card

    private func trendingCard(_ item: UnifiedSearchResult, isFeatured: Bool) -> some View {
        let width = isFeatured ? featuredWidth : regularWidth

        return Button { onSelect(item) } label: {
            ZStack(alignment: .bottomLeading) {
                thumbnailBackground(item, width: width)

                // Bottom gradient overlay
                LinearGradient(
                    stops: [
                        .init(color: .black.opacity(0.80), location: 0),
                        .init(color: .black.opacity(0.20), location: 0.5),
                        .init(color: .clear, location: 1),
                    ],
                    startPoint: .bottom,
                    endPoint: .top
                )

                // Title
                Text(item.title ?? localization.t("common.untitled"))
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .padding(.horizontal, TVDesignTokens.Spacing.base)
                    .padding(.bottom, TVDesignTokens.Spacing.base)
            }
            .frame(width: width, height: cardHeight)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }
        .tvCardStyle()
        .accessibilityLabel(item.title ?? localization.t("common.untitled"))
    }

    @ViewBuilder
    private func thumbnailBackground(_ item: UnifiedSearchResult, width: CGFloat) -> some View {
        if let urlString = item.thumbnail, let url = URL(string: urlString) {
            AsyncImage(url: url) { phase in
                switch phase {
                case let .success(image):
                    image.resizable().scaledToFill()
                default:
                    placeholderBackground
                }
            }
            .frame(width: width, height: cardHeight)
        } else {
            placeholderBackground
                .frame(width: width, height: cardHeight)
        }
    }

    private var placeholderBackground: some View {
        LinearGradient(
            colors: [DesignTokens.Primary.p900, DesignTokens.Primary.p950],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
}
