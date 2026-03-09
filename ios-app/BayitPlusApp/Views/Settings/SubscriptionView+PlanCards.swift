import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Plan Cards

extension SubscriptionView {
    func planCards(_ vm: SubscriptionViewModel) -> some View {
        ForEach(vm.plans) { plan in
            planCard(plan, viewModel: vm)
        }
    }

    func planCard(
        _ plan: SubscriptionPlan, viewModel vm: SubscriptionViewModel
    ) -> some View {
        let isCurrent = vm.currentSubscription?.plan == plan.id

        return GlassCard {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                HStack {
                    Text(plan.name)
                        .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Spacer()

                    if isCurrent {
                        GlassBadge(text: localization.t("subscription.current"), variant: .success)
                    }
                }

                Text(localization.t(vm.billingPeriodKey))
                    .font(.system(size: DesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Primary.default)

                ForEach(plan.features, id: \.self) { feature in
                    HStack(spacing: DesignTokens.Spacing.sm) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 14))
                            .foregroundStyle(DesignTokens.Success.default)

                        Text(feature)
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                }

                if !isCurrent {
                    GlassButton(
                        localization.t("subscription.subscribe"),
                        variant: .primary,
                        isLoading: vm.isProcessing
                    ) {
                        Task { @MainActor in
                            guard !vm.isProcessing else { return }
                            if let url = await vm.subscribe(to: plan) {
                                pendingCheckoutURL = url
                                showDisclosure = true
                            } else if vm.error == nil {
                                vm.setError(localization.t("subscription.subscribeError"))
                            }
                        }
                    }
                    .disabled(vm.isProcessing)
                }
            }
            .padding(DesignTokens.Spacing.lg)
        }
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .stroke(
                    isCurrent ? DesignTokens.Primary.default : Color.clear,
                    lineWidth: 2
                )
        )
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }
}
