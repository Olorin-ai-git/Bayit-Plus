import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct DailyMissionsView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: MissionsViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                LazyVStack(spacing: DesignTokens.Spacing.lg) {
                    if vm.isLoading && vm.missions.isEmpty {
                        ProgressView().tint(.white)
                            .padding(.top, DesignTokens.Spacing.xxxxl)
                    } else if let error = vm.errorMessage, vm.missions.isEmpty {
                        ErrorStateView(message: error) {
                            Task { await vm.fetchDailyMissions() }
                        }
                    } else {
                        headerSection(vm)
                        missionsSection(vm)
                    }
                }
                .padding(.vertical, DesignTokens.Spacing.lg)
            }
        }
        .background(DesignTokens.Background.primary)
        .refreshable {
            await viewModel?.refreshMissions()
        }
        .task {
            if viewModel == nil {
                viewModel = MissionsViewModel(repository: repos.missions)
            }
            await viewModel?.fetchDailyMissions()
        }
    }

    private func headerSection(_ vm: MissionsViewModel) -> some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.sm) {
                HStack {
                    Image(systemName: "target")
                        .font(.system(size: DesignTokens.FontSize.lg))
                        .foregroundStyle(DesignTokens.Primary.p400)

                    Text(localization.t("missions.dailyMissions"))
                        .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Spacer()
                }

                HStack {
                    Text(vm.missionDate)
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)

                    Spacer()

                    HStack(spacing: DesignTokens.Spacing.xs) {
                        Image(systemName: "circlebadge.fill")
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Warning.default)

                        Text("\(vm.totalAvailableShekels)")
                            .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                            .foregroundStyle(DesignTokens.Text.primary)

                        Text(localization.t("missions.shekelsAvailable"))
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func missionsSection(_ vm: MissionsViewModel) -> some View {
        ForEach(vm.missions) { mission in
            MissionProgressCard(
                mission: mission,
                isClaiming: vm.isClaimingMissionId == mission.id
            ) {
                Task {
                    await vm.claimMission(id: mission.id)
                }
            }
        }
    }
}
