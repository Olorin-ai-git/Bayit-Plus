import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Banner prompting free-tier users to subscribe to Plus when
/// their AI credits are running low. Shows live pricing from StoreKit.
struct UpgradePaywallBannerView: View {
    @Environment(LocalizationManager.self) private var localization

    let storeManager: StoreManager
    let onSubscribe: () -> Void

    var body: some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "star.circle.fill")
                    .font(.system(size: DesignTokens.FontSize.xl))
                    .foregroundStyle(DesignTokens.Primary.p300)

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                    Text(localization.t("beta.getPlusTitle"))
                        .font(.system(
                            size: DesignTokens.FontSize.md,
                            weight: .bold
                        ))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Text(priceDescription)
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }

                Spacer()

                GlassButton(
                    localization.t("beta.getPlusButton"),
                    variant: .primary,
                    size: .small
                ) {
                    HapticFeedbackService.impact(style: .medium)
                    onSubscribe()
                }
            }
        }
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .stroke(
                    LinearGradient(
                        colors: [
                            DesignTokens.Primary.p500,
                            DesignTokens.Secondary.s500,
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 2
                )
        )
        .task { await storeManager.loadProducts() }
    }

    private var priceDescription: String {
        if let monthly = storeManager.monthlyProduct {
            return localization.t("beta.getPlusMessage")
                + " " + monthly.displayPrice
                + "/" + localization.t("subscription.monthly").lowercased()
        }
        return localization.t("beta.getPlusMessage")
    }
}
