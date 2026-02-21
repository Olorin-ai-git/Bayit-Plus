import BayitDesignSystem
import SwiftUI

/// Extension providing loading placeholder and navigation for TrendingRowView.
extension TrendingRowView {
    var loadingPlaceholder: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            ForEach(0 ..< 2, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .frame(height: 100)
                    .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
        .accessibilityHidden(true)
    }

    func navigateToItem(_ item: ContentItem) {
        let ct = item.type?.lowercased() ?? ""
        if ct == "series" {
            coordinator.navigate(to: .seriesDetail(seriesId: item.id))
        } else if ct == "collection" || item.isCollectionParent == true {
            coordinator.navigate(to: .collectionDetail(collectionId: item.id))
        } else if ct == "audiobook" {
            coordinator.navigate(to: .audiobookDetail(audiobookId: item.id))
        } else {
            coordinator.navigate(to: .movieDetail(movieId: item.id))
        }
    }
}
