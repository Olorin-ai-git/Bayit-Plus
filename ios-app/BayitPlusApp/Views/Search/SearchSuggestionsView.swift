import BayitDesignSystem
import SwiftUI

/// Displays trending and recent search suggestions when the search query is empty.
struct SearchSuggestionsView: View {
    let trendingSearches: [String]
    let recentSearches: [String]
    let onSelect: (String) -> Void
    let onClearRecent: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xl) {
            if !trendingSearches.isEmpty {
                trendingSection
            }
            if !recentSearches.isEmpty {
                recentSection
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, DesignTokens.Spacing.lg)
    }

    // MARK: - Trending

    private var trendingSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "chart.line.uptrend.xyaxis")
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundColor(DesignTokens.Primary.default)
                    .accessibilityHidden(true)

                Text("Trending Searches")
                    .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                    .foregroundColor(DesignTokens.Text.primary)
            }
            .accessibilityElement(children: .combine)

            WrappingChipLayout(spacing: DesignTokens.Spacing.sm) {
                ForEach(trendingSearches, id: \.self) { query in
                    GlassChip(title: query, isSelected: false) {
                        onSelect(query)
                    }
                    .accessibilityLabel("Search for \(query)")
                }
            }
        }
    }

    // MARK: - Recent

    private var recentSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            HStack {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    Image(systemName: "clock.arrow.circlepath")
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundColor(DesignTokens.Text.secondary)
                        .accessibilityHidden(true)

                    Text("Recent Searches")
                        .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                        .foregroundColor(DesignTokens.Text.primary)
                }

                Spacer()

                Button("Clear") {
                    onClearRecent()
                }
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundColor(DesignTokens.Primary.default)
                .accessibilityLabel("Clear recent searches")
            }

            WrappingChipLayout(spacing: DesignTokens.Spacing.sm) {
                ForEach(recentSearches, id: \.self) { query in
                    GlassChip(title: query, isSelected: false) {
                        onSelect(query)
                    }
                    .accessibilityLabel("Search for \(query)")
                }
            }
        }
    }
}

// MARK: - Wrapping Layout

/// A layout that wraps GlassChip elements into multiple rows
/// when they exceed the available width.
private struct WrappingChipLayout: Layout {
    var spacing: CGFloat

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let rows = computeRows(proposal: proposal, subviews: subviews)
        let height = rows.reduce(CGFloat.zero) { total, row in
            let rowHeight = row.map { $0.sizeThatFits(.unspecified).height }.max() ?? 0
            return total + rowHeight
        }
        let totalSpacing = CGFloat(max(rows.count - 1, 0)) * spacing
        return CGSize(width: proposal.width ?? 0, height: height + totalSpacing)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let rows = computeRows(proposal: proposal, subviews: subviews)
        var yOffset = bounds.minY

        for row in rows {
            let rowHeight = row.map { $0.sizeThatFits(.unspecified).height }.max() ?? 0
            var xOffset = bounds.minX

            for subview in row {
                let size = subview.sizeThatFits(.unspecified)
                subview.place(at: CGPoint(x: xOffset, y: yOffset), proposal: .init(size))
                xOffset += size.width + spacing
            }

            yOffset += rowHeight + spacing
        }
    }

    private func computeRows(proposal: ProposedViewSize, subviews: Subviews) -> [[LayoutSubviews.Element]] {
        let maxWidth = proposal.width ?? .infinity
        var rows: [[LayoutSubviews.Element]] = [[]]
        var currentRowWidth: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if currentRowWidth + size.width > maxWidth, !rows[rows.count - 1].isEmpty {
                rows.append([])
                currentRowWidth = 0
            }
            rows[rows.count - 1].append(subview)
            currentRowWidth += size.width + spacing
        }

        return rows
    }
}
