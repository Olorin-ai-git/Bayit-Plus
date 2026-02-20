#if os(tvOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Fullscreen grid view for browsing all items from a homepage category section.
/// Presented when the user taps "See All" on a category row, showing the exact
/// same content items from the featured API in a 4-column grid layout.
struct TVCategoryBrowseView: View {
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization

    let title: String
    let icon: String
    let items: [ContentItem]

    private let columns = Array(
        repeating: GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        count: 4
    )

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xl) {
                header
                itemGrid
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .padding(.vertical, TVDesignTokens.Spacing.xl)
        }
        .background(DesignTokens.Background.primary)
    }

    private var header: some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                .foregroundStyle(DesignTokens.Primary.default)

            Text(title.localizedCapitalized)
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            Text("\(items.count)")
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .padding(.bottom, TVDesignTokens.Spacing.md)
    }

    private var itemGrid: some View {
        LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
            ForEach(items) { item in
                TVContentCard(
                    imageURL: item.thumbnail,
                    title: item.title ?? localization.t("common.untitled"),
                    badge: item.isSeries == true
                        ? localization.t("home.series") : nil,
                    aspectRatio: 2.0 / 3.0,
                    placeholderIcon: "film",
                    availableSubtitleLanguages: item.availableSubtitleLanguages
                ) {
                    navigateToItem(item)
                }
            }
        }
    }

    private func navigateToItem(_ item: ContentItem) {
        if item.isSeries == true {
            coordinator.fullscreenRoute = .seriesDetail(seriesId: item.id)
        } else if item.isCollectionParent == true {
            coordinator.fullscreenRoute = .collectionDetail(
                collectionId: item.id
            )
        } else {
            coordinator.fullscreenRoute = .movieDetail(movieId: item.id)
        }
    }
}
#endif
