import BayitDesignSystem
import SwiftUI

/// Reusable sidebar button components for IPadSidebarView
struct IPadSidebarButton: View {
    let icon: String
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Label {
                Text(title)
                    .font(.system(
                        size: DesignTokens.FontSize.md,
                        weight: isSelected ? .semibold : .regular
                    ))
                    .foregroundColor(
                        isSelected ? DesignTokens.Primary.default : DesignTokens.Text.primary
                    )
            } icon: {
                Image(systemName: icon)
                    .font(.system(size: 18))
                    .foregroundColor(
                        isSelected ? DesignTokens.Primary.default : DesignTokens.Text.secondary
                    )
                    .frame(width: 28)
            }
        }
        .listRowBackground(
            isSelected
                ? DesignTokens.Glass.bgMedium
                : Color.clear
        )
    }
}

/// Compact icon-only button for collapsed sidebar
struct IPadSidebarIconButton: View {
    let icon: String
    let isSelected: Bool
    let action: () -> Void

    init(_ icon: String, isSelected: Bool = false, action: @escaping () -> Void) {
        self.icon = icon
        self.isSelected = isSelected
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(isSelected ? DesignTokens.Primary.default : DesignTokens.Text.secondary)
                .frame(width: 44, height: 44)
                .background(isSelected ? DesignTokens.Glass.bgMedium : Color.clear)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
        }
        .buttonStyle(.plain)
    }
}
