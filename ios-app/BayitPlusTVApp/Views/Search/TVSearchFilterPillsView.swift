import BayitDesignSystem
import SwiftUI

/// Horizontal row of content type filter pills for tvOS search.
struct TVSearchFilterPillsView: View {
    @Binding var selectedFilter: SearchContentTypeFilter
    let onFilterChanged: (SearchContentTypeFilter) -> Void

    private var visibleFilters: [SearchContentTypeFilter] {
        SearchContentTypeFilter.allCases.filter { $0 != .vod }
    }

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(visibleFilters, id: \.self) { filter in
                    GlassChip(
                        title: filter.displayLabel,
                        isSelected: selectedFilter == filter
                    ) {
                        onFilterChanged(filter)
                    }
                    .accessibilityLabel("\(filter.displayLabel) filter")
                }
            }
            .padding(.vertical, TVDesignTokens.Spacing.sm)
        }
        .focusSection()
        .accessibilityLabel("Content type filters")
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
    }
}
