import BayitDesignSystem
import SwiftUI

/// tvOS Beta Credits screen showing Beta 500 credit balance.
/// Reuses BetaCreditsViewModel from shared ViewModels.
struct TVBetaCreditsView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @State private var viewModel: BetaCreditsViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.balance == nil {
                    loadingState
                } else if let error = vm.error, vm.balance == nil {
                    tvErrorState(error) {
                        Task { await vm.loadBalance() }
                    }
                } else if let balance = vm.balance {
                    creditsContent(balance, vm: vm)
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = BetaCreditsViewModel(repository: repos.betaCredits)
            }
            await viewModel?.loadBalance()
            viewModel?.startAutoRefresh()
        }
    }

    @ViewBuilder
    private func creditsContent(_ balance: CreditBalance, vm: BetaCreditsViewModel) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xxl) {
            Image(systemName: "sparkles")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Primary.default)

            Text("Beta 500")
                .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            balanceDisplay(balance, vm: vm)
            statusInfo(balance, vm: vm)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, TVDesignTokens.Spacing.xxl)
    }

    private func balanceDisplay(_ balance: CreditBalance, vm: BetaCreditsViewModel) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Text(String(balance.remainingCredits ?? 0))
                .font(.system(size: 80, weight: .bold))
                .foregroundStyle(statusColor(vm))

            Text("Credits Remaining")
                .font(.system(size: TVDesignTokens.FontSize.xl))
                .foregroundStyle(DesignTokens.Text.secondary)

            progressBar(vm)
        }
        .padding(TVDesignTokens.Spacing.xxl)
        .frame(maxWidth: 600)
        .background(DesignTokens.Glass.bg)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
    }

    private func progressBar(_ vm: BetaCreditsViewModel) -> some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                    .fill(DesignTokens.Glass.bgStrong)
                    .frame(height: 12)

                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                    .fill(statusColor(vm))
                    .frame(width: geo.size.width * vm.progressPercentage, height: 12)
            }
        }
        .frame(height: 12)
    }

    private func statusInfo(_ balance: CreditBalance, vm: BetaCreditsViewModel) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.xxl) {
            if let total = balance.totalCredits {
                infoCard(value: String(total), label: "Total Credits")
            }

            let used = (balance.totalCredits ?? 0) - (balance.remainingCredits ?? 0)
            infoCard(value: String(used), label: "Used")

            let hasCredits = (balance.remainingCredits ?? 0) > 0
            infoCard(value: hasCredits ? "Active" : "Depleted", label: "Beta Status")
        }
    }

    private func infoCard(value: String, label: String) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.sm) {
            Text(value)
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
            Text(label)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .frame(minWidth: 160)
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bg)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
    }

    private func statusColor(_ vm: BetaCreditsViewModel) -> Color {
        switch vm.statusColor {
        case .green: return DesignTokens.Colors.Semantic.success
        case .amber: return DesignTokens.Warning.default
        case .red: return DesignTokens.Colors.Semantic.error
        }
    }

    private var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
            Text("Loading Credits...")
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }
}
