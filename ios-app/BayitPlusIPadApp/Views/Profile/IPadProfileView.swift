import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// iPad-optimized profile with two-column layout
struct IPadProfileView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @Environment(AuthManager.self) private var authManager
    @State private var viewModel: ProfileViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.profile == nil {
                    loadingState
                } else if let error = vm.error, vm.profile == nil {
                    ErrorStateView(message: error) {
                        Task { await viewModel?.load() }
                    }
                } else if let profile = vm.profile {
                    HStack(alignment: .top, spacing: DesignTokens.Spacing.xl) {
                        leftColumn(profile).frame(maxWidth: .infinity)
                        rightColumn(vm).frame(maxWidth: .infinity)
                    }
                    .padding(.horizontal, DesignTokens.Spacing.xl)
                    .padding(.top, DesignTokens.Spacing.lg)
                }
            } else {
                ScreenLoadingView()
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = ProfileViewModel(repository: repos.user)
            }
            await viewModel?.load()
        }
    }

    // MARK: - Left Column

    private func leftColumn(_ profile: ProfileResponse) -> some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            avatarView(profile.avatar)
            Text(profile.displayName ?? profile.email ?? "")
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)
            if let email = profile.email {
                Text(email)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundColor(DesignTokens.Text.secondary)
            }
            if profile.isBetaUser == true, let credits = profile.betaCredits {
                GlassBadge(text: "Beta 500 - \(credits) credits", variant: .primary)
            }
            VStack(spacing: DesignTokens.Spacing.md) {
                profileNavButton(icon: "heart", title: localization.t("profile.favorites")) {
                    coordinator.navigate(to: .favorites)
                }
                profileNavButton(icon: "music.note.list", title: localization.t("common.playlist")) {
                    coordinator.navigate(to: .playlist)
                }
                profileNavButton(icon: "arrow.down.circle", title: localization.t("profile.downloads")) {
                    coordinator.navigate(to: .downloads)
                }
                profileNavButton(icon: "gearshape", title: localization.t("settings.title")) {
                    coordinator.navigate(to: .settings)
                }
            }
            .padding(.top, DesignTokens.Spacing.md)
        }
    }

    // MARK: - Right Column

    private func rightColumn(_ vm: ProfileViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            statsGrid(vm.stats)
            GlassCard {
                VStack(spacing: DesignTokens.Spacing.md) {
                    profileNavButton(icon: "person.2", title: localization.t("friends.title")) {
                        coordinator.navigate(to: .friends)
                    }
                    profileNavButton(icon: "trophy", title: localization.t("rewards.title")) {
                        coordinator.navigate(to: .rewards)
                    }
                    profileNavButton(icon: "house", title: localization.t("household.title")) {
                        coordinator.navigate(to: .household)
                    }
                }
                .padding(DesignTokens.Spacing.md)
            }
        }
    }

    // MARK: - Helpers

    private func avatarView(_ url: String?) -> some View {
        Group {
            if let urlStr = url, let imageURL = URL(string: urlStr) {
                CachedAsyncImage(url: imageURL) { avatarPlaceholder }
                    .aspectRatio(contentMode: .fill)
            } else {
                avatarPlaceholder
            }
        }
        .frame(width: 120, height: 120)
        .clipShape(Circle())
        .overlay(Circle().stroke(DesignTokens.Glass.border, lineWidth: 2))
    }

    private var avatarPlaceholder: some View {
        Circle().fill(DesignTokens.Glass.bg).overlay(
            Image(systemName: "person.fill")
                .font(.system(size: 42))
                .foregroundColor(DesignTokens.Text.secondary)
        )
    }

    private func statsGrid(_ stats: ProfileStats?) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            statCard(label: localization.t("profile.watched"), value: "\(stats?.totalWatched ?? 0)")
            statCard(label: localization.t("profile.favorites"), value: "\(stats?.totalFavorites ?? 0)")
            statCard(label: localization.t("profile.streak"), value: "\(stats?.streakDays ?? 0)")
        }
    }

    private func statCard(label: String, value: String) -> some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.xs) {
                Text(value)
                    .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                    .foregroundColor(DesignTokens.Primary.default)
                Text(label)
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundColor(DesignTokens.Text.secondary)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity)
            .padding(DesignTokens.Spacing.md)
        }
    }

    private func profileNavButton(icon: String, title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: icon)
                    .font(.system(size: 18)).foregroundColor(DesignTokens.Primary.default).frame(width: 28)
                Text(title)
                    .font(.system(size: DesignTokens.FontSize.md)).foregroundColor(DesignTokens.Text.primary)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: DesignTokens.FontSize.xs)).foregroundColor(DesignTokens.Text.muted)
            }
            .padding(DesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        }
        .buttonStyle(.plain)
    }

    private var loadingState: some View {
        HStack(spacing: DesignTokens.Spacing.xl) {
            VStack(spacing: DesignTokens.Spacing.lg) {
                Circle().fill(DesignTokens.Glass.bg).frame(width: 120, height: 120)
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg).frame(width: 200, height: 24)
            }
            .frame(maxWidth: .infinity)
            HStack(spacing: DesignTokens.Spacing.md) {
                ForEach(0..<3, id: \.self) { _ in
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                        .fill(DesignTokens.Glass.bg).frame(height: 80)
                }
            }
            .frame(maxWidth: .infinity)
        }
        .padding(.horizontal, DesignTokens.Spacing.xl)
        .padding(.top, DesignTokens.Spacing.xxl)
    }
}
