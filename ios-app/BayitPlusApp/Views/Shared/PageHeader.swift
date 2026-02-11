import BayitDesignSystem
import SwiftUI

/// Page header with icon and title
struct PageHeader: View {
    let icon: String  // SF Symbol name
    let title: String

    var body: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: icon)
                .font(.system(size: 24))
                .foregroundColor(DesignTokens.Primary.p600)

            Text(title)
                .font(.system(size: DesignTokens.FontSize.xxl, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)

            Spacer()
        }
        .padding(.leading, DesignTokens.Spacing.lg + 4)
        .padding(.trailing, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.md)
    }
}
