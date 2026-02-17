import SwiftUI

/// Reusable flow layout that wraps child views into multiple rows
/// when they exceed the available width. Used by filter chips, tags, etc.
struct FlowLayout: Layout {
    var spacing: CGFloat

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let rows = computeRows(proposal: proposal, subviews: subviews)
        let height = rows.reduce(CGFloat.zero) { total, row in
            total + (row.map { $0.sizeThatFits(.unspecified).height }.max() ?? 0)
        }
        let totalSpacing = CGFloat(max(rows.count - 1, 0)) * spacing
        return CGSize(width: proposal.width ?? 0, height: height + totalSpacing)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var yOffset = bounds.minY
        for row in computeRows(proposal: proposal, subviews: subviews) {
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
            let widthNeeded = rows[rows.count - 1].isEmpty ? size.width : spacing + size.width
            if currentRowWidth + widthNeeded > maxWidth, !rows[rows.count - 1].isEmpty {
                rows.append([])
                currentRowWidth = 0
            }
            currentRowWidth += rows[rows.count - 1].isEmpty ? size.width : spacing + size.width
            rows[rows.count - 1].append(subview)
        }
        return rows
    }
}
