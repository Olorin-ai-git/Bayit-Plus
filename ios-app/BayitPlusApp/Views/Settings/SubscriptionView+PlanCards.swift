import BayitDesignSystem
import BayitLocalization
import StoreKit
import SwiftUI

// MARK: - Plus Product Card

extension SubscriptionView {
    func plusProductCard(_ vm: SubscriptionViewModel) -> some View {
        let product = vm.selectedProduct
        let features = [
            localization.t("subscription.feature.allChannels"),
            localization.t("subscription.feature.aiAssistant"),
            localization.t("subscription.feature.liveDubbing"),
            localization.t("subscription.feature.fourDevices"),
            localization.t("subscription.feature.4kQuality"),
            localization.t("subscription.feature.500Credits"),
            localization.t("subscription.feature.offlineDownload"),
        ]

        return GlassCard {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                HStack {
                    Text(localization.t("subscription.plusPlan"))
                        .font(.system(
                            size: DesignTokens.FontSize.lg,
                            weight: .bold
                        ))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Spacer()

                    GlassBadge(
                        text: localization.t("gate.recommended"),
                        variant: .primary
                    )
                }

                if let product {
                    Text(product.displayPrice)
                        .font(.system(
                            size: DesignTokens.FontSize.xxl,
                            weight: .bold
                        ))
                        .foregroundStyle(DesignTokens.Primary.default)
                        + Text(vm.selectedBillingPeriod == .monthly
                            ? localization.t("subscription.perMonth")
                            : localization.t("subscription.perYear"))
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                }

                ForEach(features, id: \.self) { feature in
                    HStack(spacing: DesignTokens.Spacing.sm) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 14))
                            .foregroundStyle(DesignTokens.Success.default)

                        Text(feature)
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                }

                GlassButton(
                    localization.t("subscription.subscribePlus"),
                    variant: .primary,
                    isLoading: vm.isProcessing
                ) {
                    Task {
                        guard !vm.isProcessing else { return }
                        HapticFeedbackService.impact(style: .medium)
                        _ = await vm.purchase()
                    }
                }
                .disabled(vm.isProcessing || product == nil)
            }
            .padding(DesignTokens.Spacing.lg)
        }
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .stroke(DesignTokens.Primary.default, lineWidth: 2)
        )
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }
}
