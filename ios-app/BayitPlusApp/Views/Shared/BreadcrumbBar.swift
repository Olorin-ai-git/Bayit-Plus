import BayitDesignSystem
import SwiftUI

/// Glass-styled breadcrumb navigation bar showing the current navigation trail
struct BreadcrumbBar: View {
    @Environment(NavigationCoordinator.self) private var coordinator

    var body: some View {
        let entries = coordinator.currentBreadcrumbs

        FlowLayout(spacing: DesignTokens.Spacing.xs) {
            ForEach(Array(entries.enumerated()), id: \.element.id) { index, entry in
                let isLast = index == entries.count - 1

                if index > 0 {
                    chevronSeparator
                }

                breadcrumbItem(entry, isActive: isLast)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.sm)
        .background(DesignTokens.Glass.bg)
    }

    private func breadcrumbItem(_ entry: BreadcrumbEntry, isActive: Bool) -> some View {
        Button {
            guard entry.popCount > 0 else { return }
            coordinator.pop(count: entry.popCount)
        } label: {
            HStack(spacing: DesignTokens.Spacing.xs) {
                if let icon = entry.icon {
                    Image(systemName: icon)
                        .font(.system(size: 12))
                }

                Text(entry.label)
                    .font(.system(size: DesignTokens.FontSize.sm, weight: isActive ? .semibold : .regular))
                    .lineLimit(1)
            }
            .foregroundColor(
                isActive
                    ? DesignTokens.Primary.p400
                    : DesignTokens.Text.secondary
            )
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, DesignTokens.Spacing.xs)
            .background(
                isActive
                    ? DesignTokens.Glass.purpleLight.opacity(0.3)
                    : Color.clear
            )
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
        }
        .disabled(isActive)
        .accessibilityLabel(entry.label)
        .accessibilityAddTraits(isActive ? .isSelected : [])
    }

    private var chevronSeparator: some View {
        Image(systemName: "chevron.right")
            .font(.system(size: 10, weight: .semibold))
            .foregroundColor(DesignTokens.Text.muted)
    }
}

private struct FlowLayout: Layout {
    let spacing: CGFloat

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = arrange(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(
        in bounds: CGRect,
        proposal: ProposedViewSize,
        subviews: Subviews,
        cache: inout ()
    ) {
        let result = arrange(proposal: proposal, subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(
                at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y),
                proposal: .unspecified
            )
        }
    }

    private func arrange(
        proposal: ProposedViewSize,
        subviews: Subviews
    ) -> (size: CGSize, positions: [CGPoint]) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var currentX: CGFloat = 0
        var currentY: CGFloat = 0
        var rowHeight: CGFloat = 0
        var maxHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if currentX + size.width > maxWidth, currentX > 0 {
                currentX = 0
                currentY += rowHeight + spacing
                rowHeight = 0
            }
            positions.append(CGPoint(x: currentX, y: currentY))
            currentX += size.width + spacing
            rowHeight = max(rowHeight, size.height)
            maxHeight = max(maxHeight, currentY + rowHeight)
        }

        return (CGSize(width: maxWidth, height: maxHeight), positions)
    }
}
