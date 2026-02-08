import BayitDesignSystem
import SwiftUI

/// Skeleton loading placeholder for movie detail screens
struct MovieDetailLoadingView: View {
    var body: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            RoundedRectangle(cornerRadius: 0)
                .fill(DesignTokens.Glass.bg)
                .frame(height: 280)

            VStack(spacing: DesignTokens.Spacing.md) {
                RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                    .fill(DesignTokens.Glass.bg)
                    .frame(height: 24)
                    .padding(.horizontal, DesignTokens.Spacing.lg)

                RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                    .fill(DesignTokens.Glass.bg)
                    .frame(height: 60)
                    .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
    }
}
