import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Modal sheet displayed when a user attempts an action requiring
/// more credits than their current balance.
struct InsufficientCreditsModalView: View {
    @Environment(LocalizationManager.self) private var localization

    let requiredCredits: Int
    let currentBalance: Int
    let onUpgrade: () -> Void
    let onDismiss: () -> Void

    private var deficit: Int {
        max(0, requiredCredits - currentBalance)
    }

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            // Icon
            Image(systemName: "exclamationmark.circle.fill")
                .font(.system(size: DesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Warning.default)

            // Title
            Text(localization.t("beta.insufficientTitle"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)

            // Balance Comparison
            GlassCard(padding: DesignTokens.Spacing.md) {
                VStack(spacing: DesignTokens.Spacing.md) {
                    balanceRow(
                        label: localization.t("beta.required"),
                        value: "\(requiredCredits)",
                        color: DesignTokens.ErrorColor.default
                    )
                    Divider().overlay(DesignTokens.Glass.border)
                    balanceRow(
                        label: localization.t("beta.current"),
                        value: "\(currentBalance)",
                        color: DesignTokens.Warning.default
                    )
                    Divider().overlay(DesignTokens.Glass.border)
                    balanceRow(
                        label: localization.t("beta.deficit"),
                        value: "\(deficit)",
                        color: DesignTokens.ErrorColor.e400
                    )
                }
            }

            // Explanation
            Text(localization.t("beta.creditsExplanation"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)

            // Actions
            VStack(spacing: DesignTokens.Spacing.sm) {
                GlassButton(
                    localization.t("beta.upgrade"),
                    variant: .primary
                ) {
                    HapticFeedbackService.notification(type: .success)
                    onUpgrade()
                }

                GlassButton(
                    localization.t("common.dismiss"),
                    variant: .ghost
                ) {
                    onDismiss()
                }
            }
        }
        .padding(DesignTokens.Spacing.xl)
    }

    private func balanceRow(label: String, value: String, color: Color) -> some View {
        HStack {
            Text(label)
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
            Spacer()
            Text(value)
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundStyle(color)
        }
    }
}
