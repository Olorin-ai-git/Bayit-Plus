import BayitAuth
import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS Profile screen: 3-column dashboard layout matching Figma design.
/// Left: avatar + name + badge + stats. Center: My Content 2x2 grid.
/// Right: Social panel + Settings panel.
struct TVProfileView: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(LocalizationManager.self) var localization
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) var coordinator
    @State var viewModel: ProfileViewModel?
    @State var navigationPath: [TVProfileDestination] = []
    @State var friendsVM: FriendsViewModel?
    @State var messagesVM: DirectMessagesViewModel?

    var body: some View {
        NavigationStack(path: $navigationPath) {
            Group {
                if let vm = viewModel {
                    if vm.isLoading && vm.profile == nil {
                        loadingView
                    } else if let error = vm.error, vm.profile == nil {
                        errorView(error, viewModel: vm)
                    } else if let profile = vm.profile {
                        dashboardView(profile: profile, stats: vm.stats)
                    } else {
                        emptyView
                    }
                } else {
                    loadingView
                }
            }
            .background(DesignTokens.Background.primary)
            .navigationDestination(for: TVProfileDestination.self) { dest in
                TVProfileChildContainer(
                    navigationPath: $navigationPath,
                    destination: dest
                ) {
                    destinationContent(dest)
                }
            }
            .task {
                if viewModel == nil {
                    viewModel = ProfileViewModel(repository: repos.user)
                }
                if friendsVM == nil {
                    friendsVM = FriendsViewModel(repository: repos.friends)
                }
                if messagesVM == nil {
                    messagesVM = DirectMessagesViewModel(
                        repository: repos.directMessages,
                        authTokenProvider: repos.authTokenProvider
                    )
                }
                async let profileLoad: Void = viewModel?.load() ?? ()
                async let friendsLoad: Void = friendsVM?.loadRequests() ?? ()
                async let messagesLoad: Void = messagesVM?.loadConversations() ?? ()
                _ = await (profileLoad, friendsLoad, messagesLoad)
            }
        }
    }

    // MARK: - Navigation Destination Router

    @ViewBuilder
    private func destinationContent(
        _ destination: TVProfileDestination
    ) -> some View {
        switch destination {
        case let .settingsHub(category):
            TVSettingsHubView(
                navigationPath: $navigationPath,
                initialCategory: category
            )
        case .favorites:
            TVFavoritesView()
        case .recordings:
            TVRecordingsView()
        case .playlists:
            TVWatchlistView()
        case .history:
            TVViewingHistoryView(onDismiss: { navigationPath.removeAll() })
        case .friends:
            TVFriendsView()
        case .messages:
            TVDirectMessagesView()
        case .editProfile:
            if let vm = viewModel, let profile = vm.profile {
                TVEditProfileView(
                    profile: profile,
                    viewModel: vm,
                    onDismiss: { navigationPath.removeLast() }
                )
            }
        case .avatarPicker:
            if let vm = viewModel, let profile = vm.profile {
                TVAvatarPickerView(
                    currentAvatar: profile.avatar,
                    viewModel: vm,
                    onDismiss: { navigationPath.removeLast() }
                )
            }
        case .household:
            TVHouseholdProfilesView(onDismiss: { navigationPath.removeLast() })
        case .connectedAccounts:
            TVConnectedAccountsView(onDismiss: { navigationPath.removeLast() })
        case .contentSources:
            TVBYOCSourceListView(
                isEmbedded: true,
                onDismiss: { navigationPath.removeLast() }
            )
        case .widgets:
            TVWidgetsView()
        case .changePassword:
            if let profile = viewModel?.profile {
                TVChangePasswordView(
                    hasPassword: profile.hasPassword == true,
                    onDismiss: { navigationPath.removeLast() }
                )
            }
        case .phoneVerification:
            if let profile = viewModel?.profile {
                TVPhoneVerificationView(
                    existingPhone: profile.phoneNumber,
                    onDismiss: { navigationPath.removeLast() },
                    onVerified: { Task { await viewModel?.load() } }
                )
            }
        case .deleteAccount:
            TVDeleteAccountView(onDismiss: { navigationPath.removeLast() })
        case .passkeys:
            TVPasskeysView(onDismiss: { navigationPath.removeLast() })
        case .linkAccount:
            if let profile = viewModel?.profile {
                TVLinkAccountView(
                    currentProvider: profile.authProvider,
                    onDismiss: { navigationPath.removeLast() }
                )
            }
        case .activeSessions:
            TVActiveSessionsView(onDismiss: { navigationPath.removeLast() })
        case .helpChat:
            placeholderView(localization.t("settings.help.chatWithAI"))
        case .helpTutorials:
            placeholderView(localization.t("settings.help.videoTutorials"))
        }
    }

    private func placeholderView(_ title: String) -> some View {
        Text(title)
            .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
            .foregroundStyle(DesignTokens.Text.primary)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - States

    private var loadingView: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            GlassSpinner(size: .large)
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
            GlassButton(
                localization.t("common.retry"),
                variant: .primary,
                size: .medium
            ) {
                Task { await viewModel.load() }
            }
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

    func switchProfile() {
        coordinator.selectedProfileId = nil
        coordinator.profileSelected = false
    }

    func signOut() {
        Task {
            await authManager.signOut()
            coordinator.profileSelected = false
            coordinator.selectedProfileId = nil
            coordinator.showingAuth = true
            coordinator.selectedTab = .home
        }
    }
}
