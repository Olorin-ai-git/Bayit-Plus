import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS Daily Missions screen with focus-navigable mission cards.
/// Reuses MissionsViewModel from shared ViewModels.
struct TVDailyMissionsView: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(TVRepositoryProvider.self) private var repos
    @State private var viewModel: MissionsViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.missions.isEmpty {
                    loadingState
                } else if let error = vm.errorMessage, vm.missions.isEmpty {
                    tvErrorState(error) {
                        Task { await vm.fetchDailyMissions() }
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
            await viewModel?.fetchDailyMissions()
            await viewModel?.fetchWalletBalance()
        }
    }

    private func contentSections(_ vm: MissionsViewModel) -> some View {
        LazyVStack(spacing: TVDesignTokens.Spacing.xl) {
            headerSection(vm)
            missionsSection(vm)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
    }

    private func headerSection(_ vm: MissionsViewModel) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: "target")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Primary.default)

            Text(localization.t("missions.title"))
                .font(.system(size: TVDesignTokens.FontSize.display, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            if let balance = vm.walletBalance {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: "shekel.sign.circle.fill")
                        .font(.system(size: TVDesignTokens.FontSize.xl))
                        .foregroundStyle(DesignTokens.Warning.default)
                    Text("\(balance.balance)")
                        .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)
                    Text(localization.t("missions.shekels"))
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }

            Text(vm.missionDate)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, TVDesignTokens.Spacing.xl)
    }

    private func missionsSection(_ vm: MissionsViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            LazyHStack(spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(vm.missions) { mission in
                    missionCard(mission, viewModel: vm)
                }
            }
        }
    }

    private func missionCard(_ mission: DailyMission, viewModel vm: MissionsViewModel) -> some View {
        Button {
            if mission.isCompleted && !mission.isClaimed {
                Task { await vm.claimMission(id: mission.id) }
            }
        } label: {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                Image(systemName: mission.iconName)
                    .font(.system(size: TVDesignTokens.FontSize.xxxl))
                    .foregroundStyle(
                        mission.isCompleted
                            ? DesignTokens.Colors.Semantic.success
                            : DesignTokens.Primary.default
                    )

                Text(mission.title)
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)

                progressRing(mission)

                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: "shekel.sign.circle.fill")
                        .font(.system(size: TVDesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Warning.default)
                    Text("\(mission.rewardShekels)")
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)
                }

                if mission.isClaimed {
                    Text(localization.t("missions.claimed"))
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.muted)
                } else if mission.isCompleted {
                    Text(localization.t("missions.tapToClaim"))
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .bold))
                        .foregroundStyle(DesignTokens.Colors.Semantic.success)
                } else {
                    Text("\(mission.currentValue) / \(mission.targetValue)")
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
            }
            .frame(width: 320, height: 400)
            .padding(TVDesignTokens.Spacing.lg)
            .background(mission.isClaimed ? DesignTokens.Glass.bgStrong : DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
            .opacity(mission.isClaimed ? 0.6 : 1.0)
        }
        .tvCardStyle()
        .disabled(mission.isClaimed || !mission.isCompleted || vm.isClaimingMissionId == mission.id)
    }

    private func progressRing(_ mission: DailyMission) -> some View {
        ZStack {
            Circle()
                .stroke(DesignTokens.Glass.bgStrong, lineWidth: 8)
                .frame(width: 80, height: 80)

            Circle()
                .trim(from: 0, to: mission.progress)
                .stroke(
                    mission.isCompleted
                        ? DesignTokens.Colors.Semantic.success
                        : DesignTokens.Primary.default,
                    style: StrokeStyle(lineWidth: 8, lineCap: .round)
                )
                .frame(width: 80, height: 80)
                .rotationEffect(.degrees(-90))

            Text("\(Int(mission.progress * 100))%")
                .font(.system(size: TVDesignTokens.FontSize.md, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    private var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
            Text(localization.t("missions.loading"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }
}

private extension DailyMission {
    var progress: Double {
        guard targetValue > 0 else { return 0 }
        return min(Double(currentValue) / Double(targetValue), 1.0)
    }
}
