import BayitDesignSystem
import SwiftUI

/// Extension providing loading state placeholder for ProfileView.
extension ProfileView {
    var loadingState: some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            Circle()
                .fill(DesignTokens.Glass.bg)
                .frame(width: 96, height: 96)

            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                .fill(DesignTokens.Glass.bg)
                .frame(width: 200, height: 24)

            HStack(spacing: DesignTokens.Spacing.md) {
                ForEach(0 ..< 3, id: \.self) { _ in
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                        .fill(DesignTokens.Glass.bg)
                        .frame(height: 80)
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
        .padding(.top, DesignTokens.Spacing.xxl)
    }
}
