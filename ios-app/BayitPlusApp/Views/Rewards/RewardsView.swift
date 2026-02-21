import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Rewards / Gamification screen with points display, level progress,
/// badge collection grid, and streak tracker.
struct RewardsView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) var localization
    @State var viewModel: RewardsViewModel?
    @State var celebratingBadge: Badge?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                LazyVStack(spacing: DesignTokens.Spacing.lg) {
                    if vm.isLoading && vm.balance == nil {
                        ProgressView().tint(.white)
                            .padding(.top, DesignTokens.Spacing.xxxxl)
                    } else if let error = vm.error, vm.balance == nil {
                        ErrorStateView(message: error) {
                            Task { await vm.load() }
                        }
                    } else {
                        pointsHeader(vm)
                        levelProgress(vm)
                        streakTracker(vm)
                        badgeCollection(vm)
                    }
                }
                .padding(.vertical, DesignTokens.Spacing.lg)
            }
        }
        .background(DesignTokens.Background.primary)
        .overlay {
            if let badge = celebratingBadge {
                badgeCelebration(badge)
            }
        }
        .task {
            if viewModel == nil {
                viewModel = RewardsViewModel(repository: repos.reward)
            }
            await viewModel?.load()
        }
    }

    // MARK: - Points Header

    private func pointsHeader(_ vm: RewardsViewModel) -> some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "star.fill")
                    .font(.system(size: 36))
                    .foregroundStyle(DesignTokens.gold)

                Text("\(vm.points)")
                    .font(.system(size: DesignTokens.FontSize.hero, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(localization.t("rewards.points"))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Level Progress

    private func levelProgress(_ vm: RewardsViewModel) -> some View {
        GlassCard {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                HStack {
                    Text("\(localization.t("rewards.level")) \(vm.level)")
                        .font(.system(size: DesignTokens.FontSize.md, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Spacer()

                    Text(String(format: "%.0f%%", vm.levelProgress * 100))
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
                                    colors: [
                                        DesignTokens.Primary.p500,
                                        DesignTokens.Primary.p400,
                                    ],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .frame(
                                width: geometry.size.width * vm.levelProgress,
                                height: DesignTokens.Spacing.sm
                            )
                    }
                }
                .frame(height: DesignTokens.Spacing.sm)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Streak Tracker

    private func streakTracker(_ vm: RewardsViewModel) -> some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "flame.fill")
                    .font(.system(size: DesignTokens.FontSize.xxl))
                    .foregroundStyle(
                        vm.streakDays > 0
                            ? DesignTokens.Warning.default
                            : DesignTokens.Text.muted
                    )

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                    Text("\(vm.streakDays) \(localization.t("rewards.days"))")
                        .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Text(localization.t("rewards.streak"))
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }

                Spacer()
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }
}
