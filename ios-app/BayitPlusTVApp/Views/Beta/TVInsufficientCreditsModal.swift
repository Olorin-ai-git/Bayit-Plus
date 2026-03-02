#if os(tvOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS full-screen modal alert shown when Beta 500 credits are exhausted.
/// Displays warning icon, message, and close button.
struct TVInsufficientCreditsModal: View {
    let onDismiss: () -> Void

    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.opacity(0.95)

            VStack(spacing: TVDesignTokens.Spacing.xxl) {
                warningIcon

                Text(localization.t("beta.credits.insufficient.title"))
                    .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .multilineTextAlignment(.center)

                Text(localization.t("beta.credits.insufficient.message"))
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
                    .lineSpacing(6)
                    .frame(maxWidth: 600)

                closeButton
            }
            .padding(TVDesignTokens.Spacing.xxxl)
        }
        .ignoresSafeArea()
    }

    private var warningIcon: some View {
        ZStack {
            Circle()
                .fill(DesignTokens.Colors.Semantic.error.opacity(0.2))
                .frame(width: 160, height: 160)

            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Colors.Semantic.error)
        }
    }

    private var closeButton: some View {
        Button(action: onDismiss) {
            Text(localization.t("common.close"))
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                .padding(.vertical, TVDesignTokens.Spacing.lg)
                .frame(minWidth: 300)
                .background(DesignTokens.Glass.bgStrong)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
        }
        .tvCardStyle()
    }
}
#endif
