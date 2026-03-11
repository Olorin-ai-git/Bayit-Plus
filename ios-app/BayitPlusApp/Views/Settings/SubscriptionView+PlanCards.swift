import BayitDesignSystem
import BayitLocalization
import StoreKit
import SwiftUI

// MARK: - Credit Balance Card

extension SubscriptionView {
    func creditBalanceCard(_ vm: SubscriptionViewModel) -> some View {
        let remaining = creditBalance?.remainingCredits ?? 0
        let total = max(creditBalance?.totalCredits ?? 1, 1)
        let ratio = Double(remaining) / Double(total)
        let barColor: Color = ratio > 0.2
            ? DesignTokens.Success.default
            : ratio > 0.05
            ? DesignTokens.Warning.default
            : DesignTokens.ErrorColor.default
        let label = String(
            format: localization.t("plus.badge.creditsRemaining"),
            remaining
        )
        return GlassCard {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    Image(systemName: "sparkles")
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundStyle(barColor)
                    Text(label)
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                    Spacer()
                    if !vm.isSubscribed {
                        Text(localization.t("plus.upgrade.upgradeForMore"))
                            .font(.system(size: DesignTokens.FontSize.xs, weight: .medium))
                            .foregroundStyle(DesignTokens.Warning.default)
                    }
                }
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                            .fill(DesignTokens.Glass.bgMedium)
                            .frame(height: DesignTokens.Spacing.xs)
                        RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                            .fill(barColor)
                            .frame(
                                width: geo.size.width * min(ratio, 1.0),
                                height: DesignTokens.Spacing.xs
                            )
                    }
                }
                .frame(height: DesignTokens.Spacing.xs)
            }
            .padding(DesignTokens.Spacing.md)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }
}

// MARK: - Plus Product Card

extension SubscriptionView {
    func plusProductCard(_ vm: SubscriptionViewModel) -> some View {
        let product = vm.selectedProduct
        let features = [
            localization.t("subscription.feature.unlimitedAI"),
            localization.t("subscription.feature.unlimitedWidgets"),
            localization.t("subscription.feature.unlimitedProfiles"),
            localization.t("subscription.feature.prioritySupport"),
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
