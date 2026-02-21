import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Promotional banner for movie collections with AI-generated text
/// Features:
/// - Glass design with poster thumbnail
/// - Fade-in animation
/// - Call-to-action button
/// - Localized content
struct CollectionPromoBannerView: View {
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization

    let collectionId: String
    let title: String
    let posterUrl: String?
    let promoText: String
    let movieCount: Int

    @State private var isVisible = false

    var body: some View {
        Button(action: navigateToCollection) {
            HStack(spacing: DesignTokens.Spacing.md) {
                if let posterUrl, let url = URL(string: posterUrl) {
                    CachedAsyncImage(url: url) { phase in
                        switch phase {
                        case let .success(image):
                            image.resizable().aspectRatio(contentMode: .fill)
                        default:
                            Rectangle().fill(DesignTokens.Glass.bgMedium)
                        }
                    }
                    .frame(width: 100, height: 150)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
                }

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                    HStack(spacing: DesignTokens.Spacing.xs) {
                        Image(systemName: "sparkles")
                            .foregroundColor(DesignTokens.Primary.default)
                            .font(.system(size: 16))

                        Text(localization.t("vod.collection.aiRecommendation"))
                            .font(.system(
                                size: DesignTokens.FontSize.xs,
                                weight: .semibold
                            ))
                            .foregroundColor(DesignTokens.Text.muted)
                            .textCase(.uppercase)
                    }

                    Text(title)
                        .font(.system(
                            size: DesignTokens.FontSize.lg,
                            weight: .bold
                        ))
                        .foregroundColor(DesignTokens.Text.primary)
                        .lineLimit(2)

                    Text(promoText)
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.secondary)
                        .lineLimit(3)
                        .lineSpacing(2)

                    Text("\(movieCount) \(localization.t("vod.collection.movies"))")
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundColor(DesignTokens.Text.muted)

                    Text(localization.t("vod.collection.watchNow"))
                        .font(.system(
                            size: DesignTokens.FontSize.sm,
                            weight: .semibold
                        ))
                        .foregroundColor(.white)
                        .padding(.horizontal, DesignTokens.Spacing.md)
                        .padding(.vertical, DesignTokens.Spacing.sm)
                        .background(DesignTokens.Primary.default)
                        .clipShape(Capsule())
                        .padding(.top, DesignTokens.Spacing.xs)
                }

                Spacer()
            }
            .padding(DesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bgMedium)
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                    .stroke(DesignTokens.Glass.border, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
            .opacity(isVisible ? 1 : 0)
            .scaleEffect(isVisible ? 1 : 0.95)
            .animation(.easeOut(duration: 0.6), value: isVisible)
        }
        .buttonStyle(.plain)
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                isVisible = true
            }
        }
    }

    private func navigateToCollection() {
        coordinator.navigate(to: .collectionDetail(collectionId: collectionId))
    }
}

/// Auto-rotating carousel of AI-featured collection banners.
/// Advances every 5 seconds using a looping Task. Swipe to navigate manually.
/// Shows page indicator dots when there are multiple collections.
struct FeaturedCollectionsCarousel: View {
    @Environment(LocalizationManager.self) private var localization

    let collections: [CollectionDetail]

    @State private var currentIndex = 0

    private static let autoAdvanceSeconds: TimeInterval = 5

    var body: some View {
        if !collections.isEmpty {
            VStack(spacing: DesignTokens.Spacing.sm) {
                TabView(selection: $currentIndex) {
                    ForEach(Array(collections.enumerated()), id: \.offset) { index, collection in
                        CollectionPromoBannerView(
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
                .frame(height: 190)

                if collections.count > 1 {
                    HStack(spacing: 6) {
                        ForEach(0 ..< collections.count, id: \.self) { index in
                            Circle()
                                .fill(
                                    index == currentIndex
                                        ? DesignTokens.Primary.default
                                        : DesignTokens.Glass.border
                                )
                                .frame(width: 6, height: 6)
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
