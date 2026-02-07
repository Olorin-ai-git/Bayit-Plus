import BayitDesignSystem
import SwiftUI

/// Reusable error state with retry button, used across all content screens
struct ErrorStateView: View {
    let message: String
    let onRetry: () -> Void

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 48))
                .foregroundColor(DesignTokens.Warning.default)

            Text(message)
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundColor(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, DesignTokens.Spacing.xl)

            GlassButton("Retry", variant: .secondary, size: .medium, action: onRetry)
                .frame(width: 120)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 100)
    }
}
