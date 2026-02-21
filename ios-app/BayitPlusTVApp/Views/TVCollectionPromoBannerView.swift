import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS promotional banner for collections with remote focus navigation
struct TVCollectionPromoBannerView: View {
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization

    let collectionId: String
    let title: String
    let posterUrl: String?
    let promoText: String
    let movieCount: Int

    var body: some View {
        Button(action: navigateToCollection) {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                if let posterUrl, let url = URL(string: posterUrl) {
                    CachedAsyncImage(url: url) { phase in
                        switch phase {
                        case let .success(image):
                            image.resizable().aspectRatio(contentMode: .fill)
                        default:
                            Rectangle().fill(DesignTokens.Glass.bgMedium)
                        }
                    }
                    .frame(width: 200, height: 300)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
                }

                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Image(systemName: "sparkles")
                            .foregroundColor(DesignTokens.Primary.default)
                            .font(.system(size: TVDesignTokens.FontSize.xl))

                        Text(localization.t("vod.collection.aiRecommendation"))
                            .font(.system(
                                size: TVDesignTokens.FontSize.md,
                                weight: .semibold
                            ))
                            .foregroundColor(DesignTokens.Text.muted)
                            .textCase(.uppercase)
                    }

                    Text(title)
                        .font(.system(
                            size: TVDesignTokens.FontSize.xxxl,
                            weight: .bold
                        ))
                        .foregroundColor(DesignTokens.Text.primary)
                        .lineLimit(2)

                    Text(promoTextFormatted)
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .foregroundColor(DesignTokens.Text.secondary)
                        .lineLimit(4)
                        .lineSpacing(4)

                    Text("\(movieCount) \(localization.t("vod.collection.movies"))")
                        .font(.system(size: TVDesignTokens.FontSize.md))
                        .foregroundColor(DesignTokens.Text.muted)
                        .padding(.top, TVDesignTokens.Spacing.sm)

                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Image(systemName: "play.fill")
                        Text(localization.t("vod.collection.watchNow"))
                            .font(.system(
                                size: TVDesignTokens.FontSize.lg,
                                weight: .semibold
                            ))
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, TVDesignTokens.Spacing.lg)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
                    .background(DesignTokens.Primary.default)
                    .clipShape(Capsule())
                    .padding(.top, TVDesignTokens.Spacing.md)
                }

                Spacer()
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bgMedium)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
        }
        .buttonStyle(.plain)
        .tvFocusStyle()
    }

    /// Parses markdown bold/italic syntax into an AttributedString for display.
    /// Falls back to regex-based stripping of all common markdown syntax if parsing fails.
    private var promoTextFormatted: AttributedString {
        if let attributed = try? AttributedString(markdown: promoText) {
            return attributed
        }
        let stripped = promoText
            .replacingOccurrences(of: #"\*\*([^*]+)\*\*"#, with: "$1", options: .regularExpression)
            .replacingOccurrences(of: #"\*([^*]+)\*"#, with: "$1", options: .regularExpression)
            .replacingOccurrences(of: #"__([^_]+)__"#, with: "$1", options: .regularExpression)
            .replacingOccurrences(of: #"_([^_]+)_"#, with: "$1", options: .regularExpression)
        return AttributedString(stripped)
    }

    private func navigateToCollection() {
        coordinator.fullscreenRoute = .collectionDetail(collectionId: collectionId)
    }
}

/// Auto-rotating carousel of AI-featured collection banners for tvOS.
/// Advances every 6 seconds. Siri Remote swipe navigates between items.
/// Shows page indicator dots when there are multiple collections.
struct TVFeaturedCollectionsCarousel: View {
    @Environment(LocalizationManager.self) private var localization

    let collections: [CollectionDetail]

    @State private var currentIndex = 0

    private static let autoAdvanceSeconds: TimeInterval = 6

    var body: some View {
        if !collections.isEmpty {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                TabView(selection: $currentIndex) {
                    ForEach(Array(collections.enumerated()), id: \.offset) { index, collection in
                        TVCollectionPromoBannerView(
                            collectionId: collection.id,
                            title: collection.localizedTitle(
                                for: localization.currentLanguage.rawValue
                            ) ?? "",
                            posterUrl: collection.thumbnail,
                            promoText: collection.localizedPromoText(
                                for: localization.currentLanguage.rawValue
                            ) ?? "",
                            movieCount: collection.availableMovies ?? 0
                        )
                        .tag(index)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .frame(height: 360)

                if collections.count > 1 {
                    HStack(spacing: 8) {
                        ForEach(0 ..< collections.count, id: \.self) { index in
                            Circle()
                                .fill(
                                    index == currentIndex
                                        ? DesignTokens.Primary.default
                                        : DesignTokens.Glass.border
                                )
                                .frame(width: 8, height: 8)
                                .animation(.easeInOut, value: currentIndex)
                        }
                    }
                }
            }
            .task {
                await autoAdvance()
            }
        }
    }

    private func autoAdvance() async {
        guard collections.count > 1 else { return }
        while !Task.isCancelled {
            try? await Task.sleep(
                nanoseconds: UInt64(Self.autoAdvanceSeconds * 1_000_000_000)
            )
            guard !Task.isCancelled else { break }
            withAnimation(.easeInOut) {
                currentIndex = (currentIndex + 1) % collections.count
            }
        }
    }
}
