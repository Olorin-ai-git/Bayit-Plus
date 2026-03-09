import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Plan Card

extension TVSubscriptionView {
    func planCard(
        _ plan: SubscriptionPlan, viewModel vm: SubscriptionViewModel
    ) -> some View {
        let isCurrent = vm.currentSubscription?.plan == plan.id

        return VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            HStack {
                Text(plan.name)
                    .font(.system(
                        size: TVDesignTokens.FontSize.xl,
                        weight: .bold
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                if isCurrent {
                    Text(localization.t("subscription.current"))
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

            Text(localization.t(vm.billingPeriodKey))
                .font(.system(
                    size: TVDesignTokens.FontSize.xxl,
                    weight: .bold
                ))
                .foregroundStyle(DesignTokens.Primary.default)

            ForEach(plan.features, id: \.self) { feature in
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Success.default)

                    Text(feature)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
            }

            if !isCurrent {
                Text(localization.t("subscription.tvSubscribeMessage"))
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .frame(maxWidth: .infinity)
                    .multilineTextAlignment(.center)
                    .padding(.top, TVDesignTokens.Spacing.xs)
            }
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
        )
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                .stroke(
                    isCurrent
                        ? DesignTokens.Primary.default
                        : Color.clear,
                    lineWidth: 2
                )
        )
    }
}
