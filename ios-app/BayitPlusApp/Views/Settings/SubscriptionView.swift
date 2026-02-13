import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Subscription management screen with plan selection cards
/// and billing period toggle.
struct SubscriptionView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: SubscriptionViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                LazyVStack(spacing: DesignTokens.Spacing.lg) {
                    if vm.isLoading && vm.plans.isEmpty {
                        ProgressView().tint(.white).padding(.top, DesignTokens.Spacing.xxxxl)
                    } else if let error = vm.error, vm.plans.isEmpty {
                        ErrorStateView(message: error) { Task { await vm.load() } }
                    } else {
                        headerSection
                        if let error = vm.error {
                            errorBanner(error, vm)
                        }
                        billingPeriodPicker(vm)
                        planCards(vm)
                        if vm.isSubscribed {
                            cancelSection(vm)
                        }
                    }
                }
                .padding(.vertical, DesignTokens.Spacing.lg)
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
        VStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "crown.fill")
                .font(.system(size: 48))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("subscription.choosePlan"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    // MARK: - Error Banner

    private func errorBanner(_ message: String, _ vm: SubscriptionViewModel) -> some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: DesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Error.default)

                Text(message)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)

                Spacer()

                Button(action: { vm.setError("") }) {
                    Image(systemName: "xmark")
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }
            .padding(DesignTokens.Spacing.md)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Billing Period

    private func billingPeriodPicker(_ vm: SubscriptionViewModel) -> some View {
        HStack(spacing: 0) {
            ForEach(BillingPeriod.allCases, id: \.rawValue) { period in
                let isSelected = vm.selectedBillingPeriod == period
                Button {
                    vm.selectedBillingPeriod = period
                } label: {
                    Text(period == .monthly
                        ? localization.t("subscription.monthly")
                        : localization.t("subscription.yearly")
                    )
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundStyle(
                        isSelected ? DesignTokens.Text.primary : DesignTokens.Text.muted
                    )
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, DesignTokens.Spacing.sm)
                    .background(
                        isSelected
                            ? DesignTokens.Glass.bgMedium
                            : Color.clear
                    )
                    .clipShape(
                        RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    )
                }
            }
        }
        .glassCard(radius: DesignTokens.Radius.md, padding: DesignTokens.Spacing.xs)
        .padding(.horizontal, DesignTokens.Spacing.lg)
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

                Text(vm.displayPrice(for: plan))
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
                                await MainActor.run {
                                    UIApplication.shared.open(url, options: [:]) { success in
                                        if !success {
                                            Task { @MainActor in
                                                vm.setError("Failed to open subscription page. Please try again.")
                                            }
                                        }
                                    }
                                }
                            } else if vm.error == nil {
                                vm.setError("Unable to start subscription. Please try again later.")
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

    // MARK: - Cancel

    private func cancelSection(_ vm: SubscriptionViewModel) -> some View {
        GlassButton(
            localization.t("subscription.cancel"),
            variant: .ghost,
            isLoading: vm.isProcessing
        ) {
            Task { await vm.cancelSubscription() }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }
}
