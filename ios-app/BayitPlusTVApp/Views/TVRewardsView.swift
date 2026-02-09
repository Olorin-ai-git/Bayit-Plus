import BayitDesignSystem
import SwiftUI

/// tvOS Rewards screen displaying points, level, streak, and badges.
/// Reuses RewardsViewModel from shared ViewModels.
struct TVRewardsView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @State private var viewModel: RewardsViewModel?

    private let badgeColumns = [
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
    ]

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.balance == nil {
                    loadingState
                } else if let error = vm.error, vm.balance == nil {
                    tvErrorState(error) {
                        Task { await vm.load() }
                    }
                } else {
                    rewardsContent(vm)
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = RewardsViewModel(repository: repos.reward)
            }
            await viewModel?.load()
        }
    }

    @ViewBuilder
    private func rewardsContent(_ vm: RewardsViewModel) -> some View {
        LazyVStack(spacing: TVDesignTokens.Spacing.xxl) {
            levelHeader(vm)
            statsRow(vm)

            if !vm.badges.isEmpty {
                badgesSection(vm.badges)
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
    }

    private func levelHeader(_ vm: RewardsViewModel) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: "trophy.fill")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Warning.default)

            Text("Level \(vm.level)")
                .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            levelProgressBar(vm)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, TVDesignTokens.Spacing.xxl)
    }

    private func levelProgressBar(_ vm: RewardsViewModel) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.sm) {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.small)
                        .fill(DesignTokens.Glass.bgStrong)
                        .frame(height: 12)

                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.small)
                        .fill(DesignTokens.Primary.default)
                        .frame(width: geo.size.width * vm.levelProgress, height: 12)
                }
            }
            .frame(height: 12)
            .frame(maxWidth: 500)

            Text("\(vm.points) points")
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
    }

    private func statsRow(_ vm: RewardsViewModel) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.xxl) {
            statCard(
                icon: "star.fill",
                value: String(vm.points),
                label: "Points"
            )
            statCard(
                icon: "flame.fill",
                value: String(vm.streakDays),
                label: "Day Streak"
            )
            statCard(
                icon: "rosette",
                value: String(viewModel?.badges.count ?? 0),
                label: "Badges"
            )
        }
        .frame(maxWidth: .infinity)
    }

    private func statCard(icon: String, value: String, label: String) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: TVDesignTokens.FontSize.xxl))
                .foregroundStyle(DesignTokens.Primary.default)

            Text(value)
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(label)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .frame(minWidth: 200)
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bg)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
    }

    private func badgesSection(_ badges: [Badge]) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text("Badges")
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            LazyVGrid(columns: badgeColumns, spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(badges) { badge in
                    badgeCard(badge)
                }
            }
        }
    }

    private func badgeCard(_ badge: Badge) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            if let iconURL = badge.icon, let url = URL(string: iconURL) {
                AsyncImage(url: url) { phase in
                    if case .success(let img) = phase {
                        img.resizable().aspectRatio(contentMode: .fit)
                    } else {
                        Image(systemName: "rosette")
                            .font(.system(size: TVDesignTokens.FontSize.xxxl))
                            .foregroundStyle(DesignTokens.Primary.default)
                    }
                }
                .frame(width: 60, height: 60)
            } else {
                Image(systemName: "rosette")
                    .font(.system(size: TVDesignTokens.FontSize.xxxl))
                    .foregroundStyle(DesignTokens.Primary.default)
            }

            Text(badge.name ?? "Badge")
                .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineLimit(1)

            if let description = badge.description {
                Text(description)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(TVDesignTokens.Spacing.lg)
        .background(badge.earnedAt != nil ? DesignTokens.Glass.bg : DesignTokens.Glass.bgStrong)
        .opacity(badge.earnedAt != nil ? 1.0 : 0.5)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
    }

    private var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
            Text("Loading Rewards...")
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }
}
