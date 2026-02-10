import BayitDesignSystem
import SwiftUI

/// tvOS subscription management screen with plan selection cards
/// and billing period toggle, adapted for 10-foot UI and remote navigation.
/// Subscription actions redirect users to bayit.tv or their mobile device
/// since tvOS cannot open external checkout URLs.
struct TVSubscriptionView: View {
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

            Text("Choose Your Plan")
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

            GlassButton("Retry", variant: .primary) {
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
                    Text(period == .monthly ? "Monthly" : "Yearly")
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
                .buttonStyle(.plain)
                .tvFocusStyle()
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

    private func planCard(
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
                    Text("Current")
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

            Text(vm.displayPrice(for: plan))
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
                Text("Subscribe at bayit.tv or from your mobile device")
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

    // MARK: - Cancel

    private func cancelSection(
        _ vm: SubscriptionViewModel
    ) -> some View {
        GlassButton(
            "Cancel Subscription",
            variant: .ghost,
            isLoading: vm.isProcessing
        ) {
            Task { await vm.cancelSubscription() }
        }
    }
}
