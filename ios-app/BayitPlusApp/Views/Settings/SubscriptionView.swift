import BayitDesignSystem
import BayitLocalization
import StoreKit
import SwiftUI

/// Subscription management screen with native StoreKit 2 purchases.
struct SubscriptionView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) var localization
    @State var viewModel: SubscriptionViewModel?
    @State private var creditBalance: CreditBalance?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                LazyVStack(spacing: DesignTokens.Spacing.lg) {
                    if vm.isLoading {
                        ProgressView().tint(.white)
                            .padding(.top, DesignTokens.Spacing.xxxxl)
                    } else if let error = vm.error,
                              vm.monthlyProduct == nil
                    {
                        ErrorStateView(message: error) {
                            Task { await vm.load() }
                        }
                    } else {
                        headerSection
                        creditBalanceCard(vm)
                        if let error = vm.error {
                            errorBanner(error, vm)
                        }
                        if vm.isSubscribed {
                            subscribedBanner
                        } else {
                            billingPeriodPicker(vm)
                            plusProductCard(vm)
                            restoreButton(vm)
                        }
                    }
                }
                .padding(.vertical, DesignTokens.Spacing.lg)
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = SubscriptionViewModel(
                    storeManager: repos.storeManager
                )
            }
            async let subLoad: Void = viewModel?.load() ?? ()
            async let balanceFetch = repos.betaCredits.fetchBalance()
            await subLoad
            creditBalance = try? await balanceFetch
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

    // MARK: - Subscribed Banner

    private var subscribedBanner: some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "checkmark.seal.fill")
                    .font(.system(size: 32))
                    .foregroundStyle(DesignTokens.Success.default)

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                    Text(localization.t("subscription.activePlus"))
                        .font(.system(
                            size: DesignTokens.FontSize.lg,
                            weight: .bold
                        ))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Text(localization.t("subscription.manageInSettings"))
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }

                Spacer()
            }
            .padding(DesignTokens.Spacing.lg)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Error Banner

    private func errorBanner(
        _ message: String, _ vm: SubscriptionViewModel
    ) -> some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: DesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.ErrorColor.default)

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
                            size: DesignTokens.FontSize.sm,
                            weight: .semibold
                        ))
                        .foregroundStyle(
                            isSelected
                                ? DesignTokens.Text.primary
                                : DesignTokens.Text.muted
                        )
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, DesignTokens.Spacing.sm)
                        .background(
                            isSelected
                                ? DesignTokens.Glass.bgMedium
                                : Color.clear
                        )
                        .clipShape(
                            RoundedRectangle(
                                cornerRadius: DesignTokens.Radius.md
                            )
                        )
                }
            }
        }
        .glassCard(
            radius: DesignTokens.Radius.md,
            padding: DesignTokens.Spacing.xs
        )
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Restore

    private func restoreButton(
        _ vm: SubscriptionViewModel
    ) -> some View {
        GlassButton(
            localization.t("subscription.restorePurchases"),
            variant: .ghost,
            isLoading: vm.isProcessing
        ) {
            Task { await vm.restorePurchases() }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }
}
