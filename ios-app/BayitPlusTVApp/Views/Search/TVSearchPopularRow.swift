import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// Horizontal scrolling row of portrait content cards — "Popular on Bayit+".
/// Cards are 160×220 portrait (scaled to tvOS), title displayed below the image.
struct TVSearchPopularRow: View {
    @Environment(LocalizationManager.self) private var localization
    let items: [UnifiedSearchResult]
    let onSelect: (UnifiedSearchResult) -> Void

    private let cardWidth: CGFloat = 224 // 160px scaled ~1.4x for tvOS
    private let cardHeight: CGFloat = 308 // 220px scaled ~1.4x for tvOS

    var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("tvos.search.popular"))
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(.white.opacity(0.90))
                .padding(.horizontal, TVDesignTokens.Spacing.xl)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.md) {
                    ForEach(items) { item in
                        popularCard(item)
                    }
                }
                .padding(.vertical, TVDesignTokens.Spacing.sm)
            }
            .focusSection()
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }
    }

    // MARK: - Card

    private func popularCard(_ item: UnifiedSearchResult) -> some View {
        Button { onSelect(item) } label: {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                ZStack {
                    thumbnailBackground(item)

                    // Bottom gradient overlay (matches Figma gradient-to-t)
                    LinearGradient(
                        stops: [
                            .init(color: .black.opacity(0.70), location: 0),
                            .init(color: .clear, location: 0.55),
                        ],
                        startPoint: .bottom,
                        endPoint: .top
                    )
                }
                .frame(width: cardWidth, height: cardHeight)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))

                // Title below image (Figma: text-white/80, text-sm)
                Text(item.title ?? localization.t("common.untitled"))
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(.white.opacity(0.80))
                    .lineLimit(1)
                    .frame(width: cardWidth, alignment: .leading)
            }
        }
        .tvCardStyle()
        .accessibilityLabel(item.title ?? localization.t("common.untitled"))
    }

    @ViewBuilder
    private func thumbnailBackground(_ item: UnifiedSearchResult) -> some View {
        if let urlString = item.thumbnail, let url = URL(string: urlString) {
            AsyncImage(url: url) { phase in
                switch phase {
                case let .success(image):
                    image.resizable().scaledToFill()
                default:
                    placeholderBackground
                }
            }
            .frame(width: cardWidth, height: cardHeight)
        } else {
            placeholderBackground
                .frame(width: cardWidth, height: cardHeight)
        }
    }

    private var placeholderBackground: some View {
        LinearGradient(
            colors: [DesignTokens.Primary.p800, DesignTokens.Primary.p950],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
}
