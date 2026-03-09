import BayitDesignSystem
import BayitLocalization
import StoreKit
import SwiftUI

/// Individual subscription plan card for StoreKit 2 product display.
struct SubscriptionPlanCard: View {
    @Environment(LocalizationManager.self) private var localization

    let product: Product
    let isCurrent: Bool
    let isProcessing: Bool
    let features: [String]
    let onPurchase: () async -> Void

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                header
                priceText
                featureList
                if !isCurrent {
                    subscribeButton
                }
            }
            .padding(DesignTokens.Spacing.lg)
        }
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .stroke(
                    isCurrent
                        ? DesignTokens.Primary.default
                        : Color.clear,
                    lineWidth: 2
                )
        )
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            Text(product.displayName)
                .font(.system(
                    size: DesignTokens.FontSize.lg, weight: .bold
                ))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            if isCurrent {
                GlassBadge(
                    text: localization.t("subscription.current"),
                    variant: .success
                )
            }
        }
    }

    // MARK: - Price

    private var priceText: some View {
        Text(product.displayPrice)
            .font(.system(
                size: DesignTokens.FontSize.xxl, weight: .bold
            ))
            .foregroundStyle(DesignTokens.Primary.default)
    }

    // MARK: - Features

    private var featureList: some View {
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
    }

    // MARK: - Subscribe

    private var subscribeButton: some View {
        GlassButton(
            localization.t("subscription.subscribe"),
            variant: .primary,
            isLoading: isProcessing
        ) {
            Task {
                guard !isProcessing else { return }
                HapticFeedbackService.impact(style: .medium)
                await onPurchase()
            }
        }
        .disabled(isProcessing)
    }
}
