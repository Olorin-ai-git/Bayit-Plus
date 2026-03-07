import BayitAuth
import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Enum-driven sheet presentation replacing 15 individual boolean states.
enum ProfileSheet: Identifiable {
    case editProfile
    case avatarPicker
    case preferences
    case accountSettings
    case viewingHistory
    case favorites
    case recordings
    case watchlist
    case downloads
    case friends
    case messages
    case settings
    case help
    case connectedAccounts
    case widgets

    var id: String {
        String(describing: self)
    }
}

/// Complete production-ready Profile screen for tvOS.
/// Features: profile editing, stats, account management, quick actions, viewing history.
struct TVProfileView: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(LocalizationManager.self) private var localization
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) var coordinator
    @State var viewModel: ProfileViewModel?
    @State var activeSheet: ProfileSheet?

    var body: some View {
        NavigationStack {
            Group {
                if let vm = viewModel {
                    if vm.isLoading && vm.profile == nil {
                        loadingView
                    } else if let error = vm.error, vm.profile == nil {
                        errorView(error, viewModel: vm)
                    } else if let profile = vm.profile {
                        profileContentView(profile: profile, stats: vm.stats, viewModel: vm)
                    } else {
                        emptyView
                    }
                } else {
                    loadingView
                }
            }
            .background(DesignTokens.Background.primary)
            .task {
                if viewModel == nil {
                    viewModel = ProfileViewModel(repository: repos.user)
                }
                await viewModel?.load()
            }
            .fullScreenCover(item: $activeSheet) { sheet in
                sheetContent(for: sheet)
            }
        }
    }

    // MARK: - Profile Content

    private func profileContentView(profile: ProfileResponse, stats: ProfileStats?, viewModel _: ProfileViewModel) -> some View {
        List {
            TVProfileHeaderSection(
                profile: profile,
                localization: localization,
                onEditProfile: { activeSheet = .editProfile },
                onEditAvatar: { activeSheet = .avatarPicker }
            )

            if let stats {
                TVProfileStatsSection(stats: stats, localization: localization)
            }

            if profile.isBetaUser == true {
                TVProfileBetaSection(profile: profile, localization: localization)
            }

            TVProfileQuickActionsSection(localization: localization, onAction: { activeSheet = $0 })
            TVProfileSocialSection(localization: localization, onAction: { activeSheet = $0 })
            TVProfileAccountSection(
                profile: profile,
                localization: localization,
                onAction: { activeSheet = $0 }
            )
            TVProfileAdvancedSection(localization: localization, onAction: { activeSheet = $0 })

            if authManager.user?.role.isAdmin == true {
                TVProfileAdminSection(authManager: authManager, localization: localization)
            }

            TVProfileSwitchProfileSection(
                localization: localization,
                onSwitchProfile: { switchProfile() }
            )

            TVProfileSignOutSection(localization: localization, onSignOut: { signOut() })
        }
        .listStyle(.grouped)
    }

    // MARK: - States

    private var loadingView: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(2.0)

            Text(localization.t("profile.loading"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func errorView(_ message: String, viewModel: ProfileViewModel) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 72))
                .foregroundStyle(DesignTokens.Warning.default)

            Text(message)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 600)

            Button {
                Task { await viewModel.load() }
            } label: {
                Text(localization.t("common.retry"))
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                    .padding(.horizontal, TVDesignTokens.Spacing.xl)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
            }
            .buttonStyle(.plain)
            .background(DesignTokens.Glass.bgMedium)
            .cornerRadius(TVDesignTokens.Radius.md)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var emptyView: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "person.crop.circle")
                .font(.system(size: 72))
                .foregroundStyle(DesignTokens.Text.muted)

            Text(localization.t("profile.noData"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Actions

    private func switchProfile() {
        coordinator.profileSelected = false
        coordinator.selectedProfileId = nil
        coordinator.selectedTab = .home
    }

    private func signOut() {
        Task {
            await authManager.signOut()
            coordinator.profileSelected = false
            coordinator.selectedProfileId = nil
            coordinator.showingAuth = true
            coordinator.selectedTab = .home
        }
    }
}
