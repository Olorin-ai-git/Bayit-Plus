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
    @State private var creditBalance: CreditBalance?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                LazyVStack(spacing: TVDesignTokens.Spacing.lg) {
                    if vm.isLoading && !hasProducts(vm) {
                        ProgressView()
                            .tint(.white)
                            .padding(.top, TVDesignTokens.Spacing.xxxxl)
                    } else if let error = vm.error, !hasProducts(vm) {
                        errorSection(message: error, viewModel: vm)
                    } else {
                        headerSection
                        creditBalanceCard
                        billingPeriodPicker(vm)
                        planCards(vm)
                        if vm.isSubscribed {
                            manageSection
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
                viewModel = SubscriptionViewModel(storeManager: repos.storeManager, localization: localization)
            }
            await viewModel?.load()
            creditBalance = try? await repos.betaCredits.fetchBalance()
        }
    }

    private func hasProducts(_ vm: SubscriptionViewModel) -> Bool {
        vm.monthlyProduct != nil || vm.yearlyProduct != nil
    }

    // MARK: - Credit Balance

    @ViewBuilder
    private var creditBalanceCard: some View {
        if let balance = creditBalance {
            let total = balance.totalCredits ?? 0
            let remaining = balance.remainingCredits ?? 0
            let progress = total > 0 ? Double(remaining) / Double(total) : 0
            let statusColor: Color = balance.isCritical == true
                ? DesignTokens.ErrorColor.default
                : balance.isLow == true ? DesignTokens.Warning.default : DesignTokens.Success.default
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: "sparkles")
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .foregroundStyle(statusColor)
                    Text(String(format: localization.t("plus.badge.creditsRemaining"),
                                remaining))
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                    Spacer()
                    Text("\(remaining) / \(total)")
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 3).fill(Color.white.opacity(0.1)).frame(height: 6)
                        RoundedRectangle(cornerRadius: 3).fill(statusColor)
                            .frame(width: geo.size.width * progress, height: 6)
                    }
                }
                .frame(height: 6)
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
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
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            if let monthly = vm.monthlyProduct {
                planCard(monthly, viewModel: vm)
            }
            if let yearly = vm.yearlyProduct {
                planCard(yearly, viewModel: vm)
            }
        }
    }

    // MARK: - Manage Subscription

    private var manageSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("subscription.tvSubscribeMessage"))
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
                .multilineTextAlignment(.center)
        }
    }
}
