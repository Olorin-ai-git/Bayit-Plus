import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS Profile screen using List for proper focus navigation.
/// Follows the same List + .grouped pattern as TVSettingsView
/// so every row is focusable via the Siri Remote.
struct TVProfileView: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(LocalizationManager.self) private var localization
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @State private var viewModel: ProfileViewModel?

    var body: some View {
        NavigationStack {
            profileContent
                .background(DesignTokens.Background.primary)
                .task {
                    if viewModel == nil {
                        viewModel = ProfileViewModel(repository: repos.user)
                    }
                    await viewModel?.load()
                }
        }
    }

    // MARK: - Content Router

    @ViewBuilder
    private var profileContent: some View {
        if let vm = viewModel, let profile = vm.profile {
            profileList(profile, stats: vm.stats)
        } else if let vm = viewModel, let error = vm.error {
            tvErrorState(error) {
                Task { await vm.load() }
            }
        } else {
            // Show quick links + sign out even while loading or if profile fetch fails
            List {
                if viewModel?.isLoading == true {
                    Section {
                        HStack {
                            Spacer()
                            ProgressView()
                                .tint(DesignTokens.Primary.default)
                            Text("Loading Profile...")
                                .foregroundStyle(DesignTokens.Text.muted)
                            Spacer()
                        }
                    }
                }

                // User info from AuthManager as fallback
                authFallbackSection
                quickLinksSection
                signOutSection
            }
            .listStyle(.grouped)
        }
    }

    // MARK: - Auth Fallback Header

    private var authFallbackSection: some View {
        Section {
            if let user = authManager.user {
                HStack(spacing: TVDesignTokens.Spacing.xl) {
                    ZStack {
                        Circle()
                            .fill(DesignTokens.Primary.p400.opacity(0.2))
                        Text(String((user.displayName ?? "?").prefix(1)).uppercased())
                            .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                            .foregroundStyle(DesignTokens.Primary.p400)
                    }
                    .frame(width: 100, height: 100)
                    .overlay(
                        Circle().stroke(DesignTokens.Glass.border, lineWidth: 2)
                    )

                    VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                        Text(user.displayName ?? "")
                            .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                            .foregroundStyle(DesignTokens.Text.primary)
                        if !user.email.isEmpty {
                            Text(user.email)
                                .font(.system(size: TVDesignTokens.FontSize.base))
                                .foregroundStyle(DesignTokens.Text.secondary)
                        }
                    }
                    Spacer()
                }
                .padding(.vertical, TVDesignTokens.Spacing.sm)
            }
        }
    }

    // MARK: - Profile List

    private func profileList(_ profile: ProfileResponse, stats: ProfileStats?) -> some View {
        List {
            headerSection(profile)

            if let stats {
                statsSection(stats)
            }

            accountSection(profile)
            quickLinksSection
            signOutSection
        }
        .listStyle(.grouped)
    }

    // MARK: - Header

    private func headerSection(_ profile: ProfileResponse) -> some View {
        Section {
            HStack(spacing: TVDesignTokens.Spacing.xl) {
                profileAvatar(profile)
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                    Text(profile.displayName ?? "")
                        .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    if let email = profile.email {
                        Text(email)
                            .font(.system(size: TVDesignTokens.FontSize.base))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }

                    if let provider = profile.authProvider {
                        Text(provider.capitalized)
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }
                Spacer()

                if profile.isBetaUser == true {
                    VStack(spacing: TVDesignTokens.Spacing.xs) {
                        Image(systemName: "testtube.2")
                            .font(.system(size: TVDesignTokens.FontSize.lg))
                            .foregroundStyle(DesignTokens.Primary.p400)
                        Text(localization.t("profile.betaCredits"))
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Primary.p400)
                        if let credits = profile.betaCredits {
                            Text("\(credits)")
                                .font(.system(size: TVDesignTokens.FontSize.md, weight: .bold))
                                .foregroundStyle(DesignTokens.Text.primary)
                        }
                    }
                }
            }
            .padding(.vertical, TVDesignTokens.Spacing.sm)
        }
    }

    private func profileAvatar(_ profile: ProfileResponse) -> some View {
        Group {
            if let avatarURL = profile.avatar, let url = URL(string: avatarURL) {
                AsyncImage(url: url) { phase in
                    if case .success(let img) = phase {
                        img.resizable().aspectRatio(contentMode: .fill)
                    } else {
                        avatarFallback(profile)
                    }
                }
            } else {
                avatarFallback(profile)
            }
        }
        .frame(width: 100, height: 100)
        .clipShape(Circle())
        .overlay(
            Circle()
                .stroke(DesignTokens.Glass.border, lineWidth: 2)
        )
    }

    private func avatarFallback(_ profile: ProfileResponse) -> some View {
        ZStack {
            Circle()
                .fill(DesignTokens.Primary.p400.opacity(0.2))
            Text(String((profile.displayName ?? "?").prefix(1)).uppercased())
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Primary.p400)
        }
    }

    // MARK: - Stats

    private func statsSection(_ stats: ProfileStats) -> some View {
        Section {
            statRow(
                icon: "play.circle.fill",
                title: localization.t("profile.watched"),
                value: "\(stats.totalWatched ?? 0)"
            )
            statRow(
                icon: "heart.fill",
                title: localization.t("profile.favorites"),
                value: "\(stats.totalFavorites ?? 0)"
            )
            statRow(
                icon: "list.bullet",
                title: "Playlists",
                value: "\(stats.totalPlaylists ?? 0)"
            )
            if let recordings = stats.totalRecordings, recordings > 0 {
                statRow(
                    icon: "record.circle",
                    title: "Recordings",
                    value: "\(recordings)"
                )
            }
            if let streak = stats.streakDays, streak > 0 {
                statRow(
                    icon: "flame.fill",
                    title: localization.t("profile.streak"),
                    value: "\(streak) days"
                )
            }
            if let watchTime = stats.watchTimeMinutes, watchTime > 0 {
                let hours = watchTime / 60
                let minutes = watchTime % 60
                statRow(
                    icon: "clock.fill",
                    title: "Watch Time",
                    value: hours > 0 ? "\(hours)h \(minutes)m" : "\(minutes)m"
                )
            }
        } header: {
            sectionHeader("Statistics")
        }
    }

    private func statRow(icon: String, title: String, value: String) -> some View {
        HStack {
            Image(systemName: icon)
                .foregroundStyle(DesignTokens.Primary.p400)
                .frame(width: 32)
            Text(title)
                .foregroundStyle(DesignTokens.Text.secondary)
            Spacer()
            Text(value)
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    // MARK: - Account

    private func accountSection(_ profile: ProfileResponse) -> some View {
        Section {
            if let language = profile.language {
                infoRow(
                    icon: "globe",
                    title: localization.t("settings.language"),
                    value: language
                )
            }

            if let provider = profile.authProvider {
                infoRow(
                    icon: "person.badge.shield.checkmark",
                    title: "Sign-in Method",
                    value: provider.capitalized
                )
            }

            if profile.emailVerified == true {
                infoRow(
                    icon: "checkmark.seal.fill",
                    title: localization.t("profile.email"),
                    value: localization.t("profile.verified")
                )
            }

            if profile.phoneVerified == true {
                infoRow(
                    icon: "phone.badge.checkmark",
                    title: localization.t("profile.phoneNumber"),
                    value: localization.t("profile.verified")
                )
            }
        } header: {
            sectionHeader(localization.t("profile.accountInfo"))
        }
    }

    private func infoRow(icon: String, title: String, value: String) -> some View {
        HStack {
            Image(systemName: icon)
                .foregroundStyle(DesignTokens.Primary.p400)
                .frame(width: 32)
            Text(title)
                .foregroundStyle(DesignTokens.Text.secondary)
            Spacer()
            Text(value)
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    // MARK: - Quick Links

    private var quickLinksSection: some View {
        Section {
            quickLinkRow(icon: "heart.fill", title: localization.t("profile.favorites")) {
                coordinator.selectedTab = .favorites
            }
            quickLinkRow(icon: "record.circle", title: localization.t("profile.recordings")) {
                coordinator.selectedTab = .recordings
            }
            quickLinkRow(icon: "star.fill", title: localization.t("profile.rewards")) {
                coordinator.selectedTab = .rewards
            }
            quickLinkRow(icon: "gearshape.fill", title: localization.t("profile.settings")) {
                coordinator.selectedTab = .settings
            }
        } header: {
            sectionHeader("Quick Links")
        }
    }

    private func quickLinkRow(
        icon: String,
        title: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack {
                Image(systemName: icon)
                    .foregroundStyle(DesignTokens.Primary.p400)
                    .frame(width: 32)
                Text(title)
                    .foregroundStyle(DesignTokens.Text.primary)
                Spacer()
                Image(systemName: "chevron.right")
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }
    }

    // MARK: - Sign Out

    private var signOutSection: some View {
        Section {
            Button(action: signOut) {
                HStack {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                        .foregroundStyle(DesignTokens.Colors.Semantic.error)
                        .frame(width: 32)
                    Text(localization.t("profile.logout"))
                        .foregroundStyle(DesignTokens.Colors.Semantic.error)
                }
            }
        }
    }

    // MARK: - Helpers

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.primary)
    }

    private func signOut() {
        Task {
            await authManager.signOut()
            coordinator.showingAuth = true
            coordinator.selectedTab = .home
        }
    }
}
