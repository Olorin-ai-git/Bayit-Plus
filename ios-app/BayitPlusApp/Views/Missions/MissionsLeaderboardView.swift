import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct MissionsLeaderboardView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: MissionsViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                LazyVStack(spacing: DesignTokens.Spacing.lg) {
                    if let error = vm.errorMessage, vm.leaderboardUsers.isEmpty {
                        ErrorStateView(message: error) {
                            Task { await vm.fetchLeaderboard() }
                        }
                    } else {
                        scopePicker(vm)
                        periodPicker(vm)
                        leaderboardList(vm)
                        if let currentRank = vm.currentUserRank {
                            currentUserSection(currentRank)
                        }
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
            await viewModel?.fetchLeaderboard()
        }
    }

    private func scopePicker(_ vm: MissionsViewModel) -> some View {
        HStack(spacing: 0) {
            ForEach(LeaderboardScope.allCases, id: \.rawValue) { scope in
                scopeButton(scope, viewModel: vm)
            }
        }
        .glassCard(radius: DesignTokens.Radius.md, padding: DesignTokens.Spacing.xs)
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func scopeButton(
        _ scope: LeaderboardScope,
        viewModel vm: MissionsViewModel
    ) -> some View {
        let isSelected = vm.selectedLeaderboardScope == scope

        return Button {
            vm.selectedLeaderboardScope = scope
            Task { await vm.fetchLeaderboard() }
        } label: {
            Text(scope.displayName)
                .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                .foregroundStyle(
                    isSelected ? DesignTokens.Text.primary : DesignTokens.Text.muted
                )
                .frame(maxWidth: .infinity)
                .padding(.vertical, DesignTokens.Spacing.sm)
                .background(isSelected ? DesignTokens.Glass.bgMedium : Color.clear)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        }
    }

    private func periodPicker(_ vm: MissionsViewModel) -> some View {
        HStack(spacing: 0) {
            ForEach(LeaderboardPeriod.allCases, id: \.rawValue) { period in
                periodButton(period, viewModel: vm)
            }
        }
        .glassCard(radius: DesignTokens.Radius.md, padding: DesignTokens.Spacing.xs)
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func periodButton(
        _ period: LeaderboardPeriod,
        viewModel vm: MissionsViewModel
    ) -> some View {
        let isSelected = vm.selectedLeaderboardPeriod == period

        return Button {
            vm.selectedLeaderboardPeriod = period
            Task { await vm.fetchLeaderboard() }
        } label: {
            Text(period.displayName)
                .font(.system(size: DesignTokens.FontSize.xs, weight: .medium))
                .foregroundStyle(
                    isSelected ? DesignTokens.Text.primary : DesignTokens.Text.muted
                )
                .frame(maxWidth: .infinity)
                .padding(.vertical, DesignTokens.Spacing.xs)
                .background(isSelected ? DesignTokens.Glass.bgMedium : Color.clear)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
        }
    }

    private func leaderboardList(_ vm: MissionsViewModel) -> some View {
        ForEach(vm.leaderboardUsers) { user in
            LeaderboardRowCard(user: user)
        }
    }

    private func currentUserSection(_ rank: LeaderboardUser) -> some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.sm) {
                Text(localization.t("leaderboard.myRank"))
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.secondary)

                HStack(spacing: DesignTokens.Spacing.md) {
                    positionBadge(rank.position)

                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                        Text(rank.displayName)
                            .font(.system(size: DesignTokens.FontSize.md, weight: .bold))
                            .foregroundStyle(DesignTokens.Text.primary)

                        HStack(spacing: DesignTokens.Spacing.sm) {
                            Text("\(rank.points) pts")
                                .font(.system(size: DesignTokens.FontSize.sm))
                                .foregroundStyle(DesignTokens.Text.secondary)

                            if rank.streakDays > 0 {
                                Text("|\(rank.streakDays) day streak")
                                    .font(.system(size: DesignTokens.FontSize.sm))
                                    .foregroundStyle(DesignTokens.ErrorColor.default)
                            }
                        }
                    }

                    Spacer()
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func positionBadge(_ position: Int) -> some View {
        let (bgColor, textColor) = badgeColors(for: position)

        return Text("#\(position)")
            .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
            .foregroundStyle(textColor)
            .frame(width: 40, height: 40)
            .background(bgColor)
            .clipShape(Circle())
    }

    private func badgeColors(for position: Int) -> (Color, Color) {
        switch position {
        case 1: return (DesignTokens.Warning.default, DesignTokens.Text.primary)
        case 2: return (DesignTokens.Text.muted, DesignTokens.Text.primary)
        case 3: return (DesignTokens.ErrorColor.default, DesignTokens.Text.primary)
        default: return (DesignTokens.Glass.bgMedium, DesignTokens.Text.secondary)
        }
    }
}
