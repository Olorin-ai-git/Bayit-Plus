import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Widget displaying the user's Beta 500 credit balance with
/// progress bar, status indicators, and warning banners.
struct CreditBalanceWidgetView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: BetaCreditsViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                LazyVStack(spacing: DesignTokens.Spacing.lg) {
                    if vm.isLoading && vm.balance == nil {
                        ProgressView().tint(.white)
                            .padding(.top, DesignTokens.Spacing.xxxxl)
                    } else if let error = vm.error, vm.balance == nil {
                        ErrorStateView(message: error) {
                            Task { await vm.loadBalance() }
                        }
                    } else {
                        headerSection(vm)
                        progressSection(vm)
                        warningSection(vm)
                        if vm.isDepleted {
                            upgradeSection
                        }
                    }
                }
                .padding(.vertical, DesignTokens.Spacing.lg)
            } else {
                ScreenLoadingView()
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
        .onDisappear {
            viewModel?.stopAutoRefresh()
        }
    }

    // MARK: - Header

    private func headerSection(_ vm: BetaCreditsViewModel) -> some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.md) {
                HStack {
                    statusDot(vm)
                    Text(localization.t("beta.credits"))
                        .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.secondary)
                    Spacer()
                    GlassBadge(text: localization.t("beta.beta500"), variant: .primary)
                }

                Text("\(vm.balance?.remainingCredits ?? 0)")
                    .font(.system(size: DesignTokens.FontSize.hero, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(localization.t("beta.remaining"))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Status Dot

    private func statusDot(_ vm: BetaCreditsViewModel) -> some View {
        Circle()
            .fill(statusColor(vm.statusColor))
            .frame(width: DesignTokens.Spacing.sm, height: DesignTokens.Spacing.sm)
    }

    // MARK: - Progress

    private func progressSection(_ vm: BetaCreditsViewModel) -> some View {
        GlassCard {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                HStack {
                    Text(localization.t("beta.usage"))
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.secondary)
                    Spacer()
                    Text("\(vm.balance?.usedCredits ?? 0) / \(vm.balance?.totalCredits ?? 0)")
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                }

                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                            .fill(DesignTokens.Glass.bgMedium)
                            .frame(height: DesignTokens.Spacing.sm)

                        RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                            .fill(
                                LinearGradient(
                                    colors: progressGradientColors(vm.statusColor),
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .frame(
                                width: geometry.size.width * vm.progressPercentage,
                                height: DesignTokens.Spacing.sm
                            )
                    }
                }
                .frame(height: DesignTokens.Spacing.sm)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Warning Banners

    @ViewBuilder
    private func warningSection(_ vm: BetaCreditsViewModel) -> some View {
        if vm.balance?.isCritical == true {
            GlassAlert(
                type: .error,
                title: localization.t("beta.criticalTitle"),
                message: localization.t("beta.criticalMessage")
            )
            .padding(.horizontal, DesignTokens.Spacing.lg)
        } else if vm.balance?.isLow == true {
            GlassAlert(
                type: .warning,
                title: localization.t("beta.lowTitle"),
                message: localization.t("beta.lowMessage")
            )
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
    }

    // MARK: - Upgrade

    private var upgradeSection: some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.system(size: 36))
                    .foregroundStyle(DesignTokens.Primary.p400)

                Text(localization.t("beta.upgradeTitle"))
                    .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(localization.t("beta.upgradeMessage"))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)

                GlassButton(
                    localization.t("beta.upgrade"),
                    variant: .primary
                ) {
                    HapticFeedbackService.impact(style: .medium)
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Helpers

    private func statusColor(_ status: BetaCreditsViewModel.StatusColor) -> Color {
        switch status {
        case .green: return DesignTokens.Success.default
        case .amber: return DesignTokens.Warning.default
        case .red: return DesignTokens.ErrorColor.default
        }
    }

    private func progressGradientColors(
        _ status: BetaCreditsViewModel.StatusColor
    ) -> [Color] {
        switch status {
        case .green:
            return [DesignTokens.Success.s400, DesignTokens.Success.default]
        case .amber:
            return [DesignTokens.Warning.w400, DesignTokens.Warning.default]
        case .red:
            return [DesignTokens.ErrorColor.e400, DesignTokens.ErrorColor.default]
        }
    }
}
