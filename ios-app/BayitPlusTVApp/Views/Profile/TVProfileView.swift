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
    case friends
    case messages
    case settings
    case help
    case connectedAccounts
    case contentSources
    case widgets
    case householdProfiles
    case about
    case changePassword
    case activeSessions
    case passkeys
    case linkAccount
    case phoneVerification
    case deleteAccount

    var id: String {
        String(describing: self)
    }
}

/// tvOS Profile screen: 3-column dashboard layout matching Figma design.
/// Left: avatar + name + badge + stats. Center: My Content 2x2 grid.
/// Right: Social panel + Settings panel.
struct TVProfileView: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(LocalizationManager.self) var localization
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) var coordinator
    @State var viewModel: ProfileViewModel?
    @State var activeSheet: ProfileSheet?
    @State var friendsVM: FriendsViewModel?
    @State var messagesVM: DirectMessagesViewModel?

    var body: some View {
        NavigationStack {
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
            .fullScreenCover(item: $activeSheet) { sheet in
                sheetContent(for: sheet)
            }
        }
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
