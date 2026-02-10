import BayitDesignSystem
import SwiftUI

/// Page header with icon and title - optimized for tvOS 10-foot UI
struct TVPageHeader: View {
    let icon: String  // SF Symbol name
    let title: String

    var body: some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: icon)
                .font(.system(size: TVDesignTokens.FontSize.xl))
                .foregroundColor(DesignTokens.Primary.p600)

            Text(title)
                .font(.system(size: TVDesignTokens.FontSize.display, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)

            Spacer()
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
    }
}
