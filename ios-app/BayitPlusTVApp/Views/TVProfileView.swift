import BayitAuth
import BayitDesignSystem
import SwiftUI

/// tvOS Profile screen displaying user account info, stats, and preferences.
/// Reuses ProfileViewModel from shared ViewModels.
struct TVProfileView: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(TVRepositoryProvider.self) private var repos
    @State private var viewModel: ProfileViewModel?

    var body: some View {
        NavigationStack {
            ScrollView(.vertical, showsIndicators: false) {
                if let vm = viewModel {
                    if vm.isLoading && vm.profile == nil {
                        loadingState
                    } else if let error = vm.error, vm.profile == nil {
                        tvErrorState(error) {
                            Task { await vm.load() }
                        }
                    } else if let profile = vm.profile {
                        profileContent(profile, stats: vm.stats)
                    }
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
    }

    @ViewBuilder
    private func profileContent(_ profile: ProfileResponse, stats: ProfileStats?) -> some View {
        LazyVStack(spacing: TVDesignTokens.Spacing.xl) {
            profileHeader(profile)

            if let stats {
                statsSection(stats)
            }

            preferencesSection(profile)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
    }

    private func profileHeader(_ profile: ProfileResponse) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            if let avatarURL = profile.avatar, let url = URL(string: avatarURL) {
                AsyncImage(url: url) { phase in
                    if case .success(let img) = phase {
                        img.resizable().aspectRatio(contentMode: .fill)
                    } else {
                        Image(systemName: "person.crop.circle.fill")
                            .font(.system(size: TVDesignTokens.FontSize.hero))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }
                .frame(width: 120, height: 120)
                .clipShape(Circle())
            } else {
                Image(systemName: "person.crop.circle.fill")
                    .font(.system(size: TVDesignTokens.FontSize.hero))
                    .foregroundStyle(DesignTokens.Text.muted)
            }

            Text(profile.displayName ?? "")
                .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            if let email = profile.email {
                Text(email)
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, TVDesignTokens.Spacing.xxl)
    }

    private func statsSection(_ stats: ProfileStats) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text("Statistics")
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            HStack(spacing: TVDesignTokens.Spacing.xxl) {
                statCard(
                    value: String(stats.totalWatched ?? 0),
                    label: "Watched"
                )
                statCard(
                    value: String(stats.totalFavorites ?? 0),
                    label: "Favorites"
                )
                statCard(
                    value: String(stats.totalPlaylists ?? 0),
                    label: "Playlists"
                )
            }
            .frame(maxWidth: .infinity)
        }
    }

    private func statCard(value: String, label: String) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.sm) {
            Text(value)
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Primary.default)
            Text(label)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .frame(minWidth: 200)
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bg)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
    }

    private func preferencesSection(_ profile: ProfileResponse) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text("Preferences")
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            if let language = profile.language {
                preferenceRow(title: "Language", value: language)
            }

            if let provider = profile.authProvider {
                preferenceRow(title: "Sign-in", value: provider.capitalized)
            }
        }
    }

    private func preferenceRow(title: String, value: String) -> some View {
        HStack {
            Text(title)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
            Spacer()
            Text(value)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.primary)
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bg)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
    }

    private var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
            Text("Loading Profile...")
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }
}
