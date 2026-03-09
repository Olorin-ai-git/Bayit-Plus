import BayitDesignSystem
import BayitLocalization
import StoreKit
import SwiftUI

// MARK: - Plan Card

extension TVSubscriptionView {
    func planCard(
        _ product: Product, viewModel vm: SubscriptionViewModel
    ) -> some View {
        let isSelected = vm.selectedProduct?.id == product.id

        return VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            HStack {
                Text(product.displayName)
                    .font(.system(
                        size: TVDesignTokens.FontSize.xl,
                        weight: .bold
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                if isSelected {
                    Text(localization.t("subscription.selected"))
                        .font(.system(
                            size: TVDesignTokens.FontSize.sm,
                            weight: .semibold
                        ))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .padding(.horizontal, TVDesignTokens.Spacing.sm)
                        .padding(.vertical, TVDesignTokens.Spacing.xxs)
                        .background(DesignTokens.Success.default)
                        .clipShape(Capsule())
                }
            }

            Text(product.displayPrice)
                .font(.system(
                    size: TVDesignTokens.FontSize.xxl,
                    weight: .bold
                ))
                .foregroundStyle(DesignTokens.Primary.default)

            Text(product.description)
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)

            Text(localization.t("subscription.tvSubscribeMessage"))
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
                .frame(maxWidth: .infinity)
                .multilineTextAlignment(.center)
                .padding(.top, TVDesignTokens.Spacing.xs)
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
        )
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                .stroke(
                    isSelected
                        ? DesignTokens.Primary.default
                        : Color.clear,
                    lineWidth: 2
                )
        )
    }
}
