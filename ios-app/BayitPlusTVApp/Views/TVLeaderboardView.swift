import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS Leaderboard screen with focus-navigable scope selector and ranked entries.
/// Reuses MissionsViewModel from shared ViewModels for leaderboard data.
struct TVLeaderboardView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: MissionsViewModel?
    @FocusState private var focusedScope: LeaderboardScope?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.leaderboardUsers.isEmpty {
                    loadingState
                } else if let error = vm.errorMessage, vm.leaderboardUsers.isEmpty {
                    tvErrorState(error) {
                        Task { await vm.fetchLeaderboard() }
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
            await viewModel?.fetchLeaderboard()
        }
    }

    private func contentSections(_ vm: MissionsViewModel) -> some View {
        LazyVStack(spacing: TVDesignTokens.Spacing.xl) {
            headerSection
            scopeSelector(vm)
            leaderboardList(vm)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
    }

    private var headerSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: "trophy.fill")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Warning.default)
            Text(localization.t("leaderboard.title"))
                .font(.system(size: TVDesignTokens.FontSize.display, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, TVDesignTokens.Spacing.xl)
    }

    private func scopeSelector(_ vm: MissionsViewModel) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.focusGap) {
            ForEach(LeaderboardScope.allCases, id: \.self) { scope in
                scopeButton(scope, viewModel: vm)
            }
        }
    }

    private func scopeButton(_ scope: LeaderboardScope, viewModel vm: MissionsViewModel) -> some View {
        @Bindable var bindableVM = vm
        return Button {
            bindableVM.selectedLeaderboardScope = scope
            Task { await vm.fetchLeaderboard() }
        } label: {
            Text(scope.displayName)
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(vm.selectedLeaderboardScope == scope ? DesignTokens.Text.primary : DesignTokens.Text.muted)
                .padding(.horizontal, TVDesignTokens.Spacing.lg)
                .padding(.vertical, TVDesignTokens.Spacing.md)
                .background(vm.selectedLeaderboardScope == scope ? DesignTokens.Primary.default : DesignTokens.Glass.bg)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }
        .tvCardStyle()
        .focused($focusedScope, equals: scope)
    }

    private func leaderboardList(_ vm: MissionsViewModel) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            ForEach(vm.leaderboardUsers) { user in
                TVLeaderboardRow(user: user)
            }
        }
    }

    private var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView().tint(DesignTokens.Primary.default).scaleEffect(1.5)
            Text(localization.t("leaderboard.loading")).font(.system(size: TVDesignTokens.FontSize.lg)).foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }
}

struct TVLeaderboardRow: View {
    @Environment(LocalizationManager.self) private var localization
    let user: LeaderboardUser

    var body: some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            positionBadge
            avatarView
            userInfo
            Spacer()
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(user.isCurrentUser ? DesignTokens.Primary.default.opacity(0.1) : DesignTokens.Glass.bg)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                .stroke(user.isCurrentUser ? DesignTokens.Primary.default : Color.clear, lineWidth: 2)
        )
    }

    private var positionBadge: some View {
        ZStack {
            Circle().fill(badgeColor).frame(width: 50, height: 50)
            Text("\(user.position)").font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold)).foregroundStyle(Color.white)
        }
    }

    private var badgeColor: Color {
        switch user.position {
        case 1: return DesignTokens.Leaderboard.gold
        case 2: return DesignTokens.Leaderboard.silver
        case 3: return DesignTokens.Leaderboard.bronze
        default: return DesignTokens.Glass.bgStrong
        }
    }

    private var avatarView: some View {
        Group {
            if let avatarUrl = user.avatarUrl, let url = URL(string: avatarUrl) {
                CachedAsyncImage(url: url) {
                    avatarPlaceholder
                }
            } else {
                avatarPlaceholder
            }
        }
        .frame(width: 60, height: 60)
        .clipShape(Circle())
    }

    private var avatarPlaceholder: some View {
        Circle()
            .fill(DesignTokens.Glass.bgMedium)
            .overlay(
                Text(String(user.displayName.prefix(1)).uppercased())
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                    .foregroundStyle(DesignTokens.Primary.p400)
            )
    }

    private var userInfo: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Text(user.displayName).font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold)).foregroundStyle(DesignTokens.Text.primary)
                if user.isCurrentUser {
                    Text(localization.t("leaderboard.you"))
                        .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                        .foregroundStyle(DesignTokens.Primary.default)
                        .padding(.horizontal, TVDesignTokens.Spacing.sm)
                        .padding(.vertical, TVDesignTokens.Spacing.xxs)
                        .background(DesignTokens.Glass.bgMedium)
                        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
                }
            }
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                statBadge(icon: "star.fill", value: user.points, color: DesignTokens.Warning.default)
                statBadge(icon: "flame.fill", value: user.streakDays, color: DesignTokens.Colors.Semantic.warning)
            }
        }
    }

    private func statBadge(icon: String, value: Int, color: Color) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.xs) {
            Image(systemName: icon).font(.system(size: TVDesignTokens.FontSize.sm)).foregroundStyle(color)
            Text("\(value)").font(.system(size: TVDesignTokens.FontSize.base)).foregroundStyle(DesignTokens.Text.secondary)
        }
    }
}
