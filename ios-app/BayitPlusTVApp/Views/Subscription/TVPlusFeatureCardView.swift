import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// TV-adapted promotional card highlighting a Plus subscription feature.
/// Focus-navigable for 10-foot UI, hidden for Plus subscribers.
/// Tapping navigates to the subscription gate screen.
struct TVPlusFeatureCardView: View {
    let feature: String
    @Environment(AuthManager.self) private var authManager
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        if shouldShow {
            Button {
                coordinator.fullscreenRoute = .subscriptionGate
            } label: {
                cardContent
            }
            .buttonStyle(.card)
        }
    }

    private var shouldShow: Bool {
        guard authManager.isAuthenticated, let user = authManager.user else {
            return true
        }
        return !user.isPremium
    }

    private var cardContent: some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: "crown.fill")
                .font(.system(size: TVDesignTokens.FontSize.xl))
                .foregroundStyle(DesignTokens.Subscription.premium)

            Text(localization.t("plus.feature.\(feature)"))
                .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineLimit(2)

            Spacer()

            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Text(localization.t("common.learnMore"))
                    .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundStyle(DesignTokens.Primary.default)

                Image(systemName: "chevron.right")
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Primary.default)
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DesignTokens.Glass.bg)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
    }
}
