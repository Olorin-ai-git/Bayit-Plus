import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS subscription management screen with plan selection cards
/// and billing period toggle, adapted for 10-foot UI and remote navigation.
/// Subscription actions redirect users to bayit.tv or their mobile device
/// since tvOS cannot open external checkout URLs.
struct TVSubscriptionView: View {
    @Environment(LocalizationManager.self) var localization
    @Environment(TVRepositoryProvider.self) private var repos
    @State private var viewModel: SubscriptionViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                LazyVStack(spacing: TVDesignTokens.Spacing.lg) {
                    if vm.isLoading && vm.plans.isEmpty {
                        ProgressView()
                            .tint(.white)
                            .padding(.top, TVDesignTokens.Spacing.xxxxl)
                    } else if let error = vm.error, vm.plans.isEmpty {
                        errorSection(message: error, viewModel: vm)
                    } else {
                        headerSection
                        billingPeriodPicker(vm)
                        planCards(vm)
                        if vm.isSubscribed {
                            cancelSection(vm)
                        }
                    }
                }
                .padding(.vertical, TVDesignTokens.Spacing.xxl)
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = SubscriptionViewModel(repository: repos.settings)
            }
            await viewModel?.load()
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: "crown.fill")
                .font(.system(size: TVDesignTokens.FontSize.xxxl))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("subscription.choosePlan"))
                .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    // MARK: - Error

    private func errorSection(
        message: String, viewModel vm: SubscriptionViewModel
    ) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Text(message)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)

            GlassButton(localization.t("common.retry"), variant: .primary) {
                Task { await vm.load() }
            }
        }
        .padding(.top, TVDesignTokens.Spacing.xxxxl)
    }

    // MARK: - Billing Period Picker

    private func billingPeriodPicker(
        _ vm: SubscriptionViewModel
    ) -> some View {
        HStack(spacing: 0) {
            ForEach(BillingPeriod.allCases, id: \.rawValue) { period in
                let isSelected = vm.selectedBillingPeriod == period

                Button {
                    vm.selectedBillingPeriod = period
                } label: {
                    Text(period == .monthly
                        ? localization.t("subscription.monthly")
                        : localization.t("subscription.yearly"))
                        .font(.system(
                            size: TVDesignTokens.FontSize.sm,
                            weight: .semibold
                        ))
                        .foregroundStyle(
                            isSelected
                                ? DesignTokens.Text.primary
                                : DesignTokens.Text.muted
                        )
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, TVDesignTokens.Spacing.md)
                        .background(
                            isSelected
                                ? DesignTokens.Glass.bgMedium
                                : Color.clear
                        )
                        .clipShape(
                            RoundedRectangle(
                                cornerRadius: TVDesignTokens.Radius.sm
                            )
                        )
                }
                .tvCardStyle()
            }
        }
        .padding(TVDesignTokens.Spacing.xs)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
        )
    }

    // MARK: - Plan Cards

    private func planCards(_ vm: SubscriptionViewModel) -> some View {
        ForEach(vm.plans) { plan in
            planCard(plan, viewModel: vm)
        }
    }

    // MARK: - Cancel

    private func cancelSection(
        _ vm: SubscriptionViewModel
    ) -> some View {
        GlassButton(
            localization.t("subscription.cancel"),
            variant: .ghost,
            isLoading: vm.isProcessing
        ) {
            Task { await vm.cancelSubscription() }
        }
    }
}
