#if os(tvOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct TVShekelsWalletView: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(TVRepositoryProvider.self) private var repos
    @State private var viewModel: MissionsViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.walletBalance == nil {
                    loadingState
                } else if let error = vm.errorMessage, vm.walletBalance == nil {
                    tvErrorState(error, retryLabel: localization.t("common.retry")) {
                        Task { await vm.fetchWalletBalance() }
                    }
                } else {
                    contentSections(vm)
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = MissionsViewModel(repository: repos.missions)
            }
            await viewModel?.fetchWalletBalance()
        }
    }

    @ViewBuilder
    private func contentSections(_ vm: MissionsViewModel) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xxl) {
            walletHeader(vm)
            transactionsSection(vm)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        .padding(.vertical, TVDesignTokens.Spacing.xl)
    }

    private func walletHeader(_ vm: MissionsViewModel) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: "shekel.sign.circle.fill")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Warning.default)

            Text(localization.t("missions.wallet.title"))
                .font(.system(size: TVDesignTokens.FontSize.display, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            if let balance = vm.walletBalance {
                Text("\(balance.balance)")
                    .font(.system(size: 96, weight: .bold))
                    .foregroundStyle(DesignTokens.Primary.default)

                Text(localization.t("missions.shekels"))
                    .font(.system(size: TVDesignTokens.FontSize.xl))
                    .foregroundStyle(DesignTokens.Text.muted)

                HStack(spacing: TVDesignTokens.Spacing.xxxl) {
                    statColumn(
                        label: localization.t("missions.wallet.totalEarned"),
                        value: "\(balance.totalEarned)",
                        color: DesignTokens.Success.default
                    )

                    statColumn(
                        label: localization.t("missions.wallet.totalSpent"),
                        value: "\(balance.totalSpent)",
                        color: DesignTokens.ErrorColor.default
                    )
                }
                .padding(.top, TVDesignTokens.Spacing.lg)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, TVDesignTokens.Spacing.xl)
    }

    private func statColumn(label: String, value: String, color: Color) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.sm) {
            Text(value)
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(color)

            Text(label)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
    }

    private func transactionsSection(_ vm: MissionsViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text(localization.t("missions.wallet.recentTransactions"))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)

            if vm.recentTransactions.isEmpty {
                emptyTransactionsState
            } else {
                LazyVStack(spacing: TVDesignTokens.Spacing.md) {
                    ForEach(vm.recentTransactions) { transaction in
                        TVTransactionRowCard(transaction: transaction)
                            .focusable()
                    }
                }
            }
        }
    }

    private var emptyTransactionsState: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: "tray")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Text.muted)

            Text(localization.t("missions.wallet.noTransactions"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, TVDesignTokens.Spacing.xxxl)
    }

    private var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)

            Text(localization.t("missions.wallet.loading"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }
}
#endif
