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
