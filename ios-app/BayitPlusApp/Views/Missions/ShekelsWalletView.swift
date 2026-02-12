import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct ShekelsWalletView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: MissionsViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                LazyVStack(spacing: DesignTokens.Spacing.lg) {
                    if let error = vm.errorMessage, vm.walletBalance == nil {
                        ErrorStateView(message: error) {
                            Task { await vm.fetchWalletBalance() }
                        }
                    } else {
                        balanceSection(vm)
                        statsSection(vm)
                        transactionsSection(vm)
                    }
                }
                .padding(.vertical, DesignTokens.Spacing.lg)
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

    private func balanceSection(_ vm: MissionsViewModel) -> some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "circlebadge.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(DesignTokens.Warning.default)

                Text("\(vm.walletBalance?.balance ?? 0)")
                    .font(.system(size: DesignTokens.FontSize.hero, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(localization.t("wallet.shekelsBalance"))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func statsSection(_ vm: MissionsViewModel) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            statCard(
                icon: "arrow.up.circle.fill",
                label: localization.t("wallet.earned"),
                value: "\(vm.walletBalance?.totalEarned ?? 0)",
                color: DesignTokens.Success.default
            )

            statCard(
                icon: "arrow.down.circle.fill",
                label: localization.t("wallet.spent"),
                value: "\(vm.walletBalance?.totalSpent ?? 0)",
                color: DesignTokens.ErrorColor.default
            )
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func statCard(
        icon: String,
        label: String,
        value: String,
        color: Color
    ) -> some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: icon)
                    .font(.system(size: 24))
                    .foregroundStyle(color)

                Text(value)
                    .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(label)
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
            .frame(maxWidth: .infinity)
        }
    }

    private func transactionsSection(_ vm: MissionsViewModel) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text(localization.t("wallet.recentTransactions"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            if vm.recentTransactions.isEmpty {
                emptyTransactionsView
            } else {
                ForEach(vm.recentTransactions) { transaction in
                    TransactionRowCard(transaction: transaction)
                }
            }
        }
    }

    private var emptyTransactionsView: some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "tray")
                    .font(.system(size: 32))
                    .foregroundStyle(DesignTokens.Text.muted)

                Text(localization.t("wallet.noTransactions"))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
            .padding(.vertical, DesignTokens.Spacing.xl)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }
}
