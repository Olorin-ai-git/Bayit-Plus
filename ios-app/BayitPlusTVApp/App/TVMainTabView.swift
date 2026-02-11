#if os(tvOS)
import BayitAuth
import BayitDesignSystem
import SwiftUI

/// Main tab navigation for the tvOS app.
/// Uses TabView with tvOS-native top shelf styling.
/// Overlays the widget dock at the bottom and profile pill at the top-right.
struct TVMainTabView: View {
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(AuthManager.self) private var authManager
    @State private var dockViewModel: WidgetDockViewModel?
    @State private var showProfileSheet = false

    var body: some View {
        @Bindable var coord = coordinator

        ZStack(alignment: .topTrailing) {
            HStack(spacing: 0) {
                TabView(selection: $coord.selectedTab) {
                    TVHomeView()
                        .tabItem { Label(TVTab.home.title, systemImage: TVTab.home.iconName) }
                        .tag(TVTab.home)

                    TVLiveTVView()
                        .tabItem { Label(TVTab.liveTV.title, systemImage: TVTab.liveTV.iconName) }
                        .tag(TVTab.liveTV)

                    TVVODView()
                        .tabItem { Label(TVTab.vod.title, systemImage: TVTab.vod.iconName) }
                        .tag(TVTab.vod)

                    TVPodcastsView()
                        .tabItem { Label(TVTab.podcasts.title, systemImage: TVTab.podcasts.iconName) }
                        .tag(TVTab.podcasts)

                    TVAudiobooksView()
                        .tabItem { Label(TVTab.audiobooks.title, systemImage: TVTab.audiobooks.iconName) }
                        .tag(TVTab.audiobooks)

                    TVChildrenView()
                        .tabItem { Label(TVTab.children.title, systemImage: TVTab.children.iconName) }
                        .tag(TVTab.children)

                    TVYoungstersView()
                        .tabItem { Label(TVTab.youngsters.title, systemImage: TVTab.youngsters.iconName) }
                        .tag(TVTab.youngsters)

                    TVWidgetsView()
                        .tabItem { Label("Widgets", systemImage: "square.grid.2x2") }
                        .tag(TVTab.settings)

                    TVRecordingsView()
                        .tabItem { Label(TVTab.recordings.title, systemImage: TVTab.recordings.iconName) }
                        .tag(TVTab.recordings)

                    TVEPGView()
                        .tabItem { Label(TVTab.epg.title, systemImage: TVTab.epg.iconName) }
                        .tag(TVTab.epg)

                    TVFavoritesView()
                        .tabItem { Label(TVTab.favorites.title, systemImage: TVTab.favorites.iconName) }
                        .tag(TVTab.favorites)

                    TVWatchPartyView()
                        .tabItem { Label(TVTab.watchParty.title, systemImage: TVTab.watchParty.iconName) }
                        .tag(TVTab.watchParty)

                    TVTriviaView()
                        .tabItem { Label(TVTab.trivia.title, systemImage: TVTab.trivia.iconName) }
                        .tag(TVTab.trivia)

                    TVFriendsView()
                        .tabItem { Label(TVTab.friends.title, systemImage: TVTab.friends.iconName) }
                        .tag(TVTab.friends)

                    TVDirectMessagesView()
                        .tabItem { Label(TVTab.messages.title, systemImage: TVTab.messages.iconName) }
                        .tag(TVTab.messages)

                    TVChessView()
                        .tabItem { Label(TVTab.chess.title, systemImage: TVTab.chess.iconName) }
                        .tag(TVTab.chess)

                    TVChatbotView()
                        .tabItem { Label(TVTab.aiChat.title, systemImage: TVTab.aiChat.iconName) }
                        .tag(TVTab.aiChat)

                    TVAvatarModeView()
                        .tabItem { Label(TVTab.avatar.title, systemImage: TVTab.avatar.iconName) }
                        .tag(TVTab.avatar)

                    TVRewardsView()
                        .tabItem { Label(TVTab.rewards.title, systemImage: TVTab.rewards.iconName) }
                        .tag(TVTab.rewards)

                    TVBetaCreditsView()
                        .tabItem { Label(TVTab.betaCredits.title, systemImage: TVTab.betaCredits.iconName) }
                        .tag(TVTab.betaCredits)

                    TVSearchView()
                        .tabItem { Label(TVTab.search.title, systemImage: TVTab.search.iconName) }
                        .tag(TVTab.search)

                    TVProfileView()
                        .tabItem { Label(TVTab.profile.title, systemImage: TVTab.profile.iconName) }
                        .tag(TVTab.profile)

                    TVSettingsView()
                        .tabItem { Label(TVTab.settings.title, systemImage: TVTab.settings.iconName) }
                        .tag(TVTab.settings)
                }
                .onAppear {
                    coord.selectedTab = .home
                }
                .overlay(alignment: .bottom) {
                    if let vm = dockViewModel {
                        TVWidgetDockView(
                            widgets: vm.minimizedWidgets,
                            isDockVisible: vm.isDockVisible,
                            onRestore: { widgetId in vm.toggleMinimize(widgetId: widgetId) },
                            onCloseDock: { vm.hideDock() }
                        )
                        .padding(.bottom, TVDesignTokens.Spacing.xl)
                    }
                }

                // Widget sidebar
                if let vm = dockViewModel, !vm.restoredWidgets.isEmpty {
                    TVWidgetSidebarView(
                        widgets: vm.restoredWidgets,
                        onMinimize: { widgetId in vm.minimizeWidget(widgetId: widgetId) }
                    )
                    .focusSection()
                }
            }

            // Profile pill + dropdown - top right
            VStack(alignment: .trailing, spacing: TVDesignTokens.Spacing.xs) {
                profilePill

                if showProfileSheet {
                    profileDropdown(coord: coord)
                        .transition(.opacity.combined(with: .scale(scale: 0.95, anchor: .topTrailing)))
                }
            }
            .animation(.spring(duration: 0.25, bounce: 0.1), value: showProfileSheet)
            .padding(.trailing, TVDesignTokens.Spacing.xl)
            .padding(.top, 6)
        }
        .ignoresSafeArea(.all, edges: .trailing)
        .onExitCommand {
            if showProfileSheet { showProfileSheet = false }
        }
        .task {
            if dockViewModel == nil {
                dockViewModel = WidgetDockViewModel(repository: repos.widget)
            }
            await dockViewModel?.loadWidgets()
        }
    }

    // MARK: - Profile Pill

    private var profilePill: some View {
        Button {
            showProfileSheet = true
        } label: {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                profileAvatar
                Text(profileName)
                    .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)
            }
            .padding(.horizontal, TVDesignTokens.Spacing.md)
            .padding(.vertical, TVDesignTokens.Spacing.xs)
        }
        .buttonStyle(.card)
        .tvFocusStyle()
    }

    private var profileAvatar: some View {
        ZStack {
            if let photoURL = authManager.user?.photoURL {
                AsyncImage(url: photoURL) { phase in
                    if case .success(let img) = phase {
                        img.resizable().aspectRatio(contentMode: .fill)
                    } else {
                        profileAvatarFallback
                    }
                }
            } else {
                profileAvatarFallback
            }
        }
        .frame(width: 36, height: 36)
        .clipShape(Circle())
        .overlay(Circle().stroke(DesignTokens.Primary.p400.opacity(0.4), lineWidth: 1.5))
    }

    private var profileAvatarFallback: some View {
        ZStack {
            LinearGradient(
                colors: [DesignTokens.Primary.p400, DesignTokens.Primary.p600],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
            Text(profileInitials)
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(.white)
        }
    }

    private var profileName: String {
        if let name = authManager.user?.displayName, !name.isEmpty { return name }
        if let email = authManager.user?.email {
            return email.components(separatedBy: "@").first ?? "Profile"
        }
        return "Profile"
    }

    private var profileInitials: String {
        guard let name = authManager.user?.displayName, !name.isEmpty else { return "?" }
        let parts = name.split(separator: " ")
        if parts.count >= 2 {
            return String(parts[0].prefix(1) + parts[1].prefix(1)).uppercased()
        }
        return String(name.prefix(1)).uppercased()
    }

    // MARK: - Profile Dropdown

    private func profileDropdown(coord: TVNavigationCoordinator) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            // User info header
            HStack(spacing: TVDesignTokens.Spacing.md) {
                profileAvatar

                VStack(alignment: .leading, spacing: 2) {
                    Text(profileName)
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(1)

                    if let email = authManager.user?.email {
                        Text(email)
                            .font(.system(size: TVDesignTokens.FontSize.xs))
                            .foregroundStyle(DesignTokens.Text.muted)
                            .lineLimit(1)
                    }
                }
            }
            .padding(TVDesignTokens.Spacing.lg)

            Rectangle()
                .fill(Color.white.opacity(0.08))
                .frame(height: 1)

            ProfileDropdownItem(icon: "person", title: "My Profile") {
                showProfileSheet = false
                coordinator.selectedTab = .profile
            }
            ProfileDropdownItem(icon: "star", title: "Favorites") {
                showProfileSheet = false
                coordinator.selectedTab = .favorites
            }
            ProfileDropdownItem(icon: "gearshape", title: "Settings") {
                showProfileSheet = false
                coordinator.selectedTab = .settings
            }

            Rectangle()
                .fill(Color.white.opacity(0.08))
                .frame(height: 1)

            ProfileDropdownItem(icon: "rectangle.portrait.and.arrow.right", title: "Sign Out", isDestructive: true) {
                showProfileSheet = false
                Task {
                    await authManager.signOut()
                    coordinator.showingAuth = true
                    coordinator.selectedTab = .home
                }
            }
        }
        .focusSection()
        .frame(width: 380)
        .background {
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                .fill(.ultraThinMaterial)
                .environment(\.colorScheme, .dark)
        }
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                .stroke(DesignTokens.Glass.borderLight, lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.5), radius: 16, y: 8)
    }
}

// MARK: - Profile Dropdown Item

/// Standalone focusable row for the profile dropdown.
/// Uses @Environment(\.isFocused) for highlight and plain button style.
private struct ProfileDropdownItem: View {
    let icon: String
    let title: String
    var isDestructive: Bool = false
    let action: () -> Void

    @Environment(\.isFocused) private var isFocused

    var body: some View {
        Button(action: action) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: icon)
                    .font(.system(size: 22, weight: .medium))
                    .foregroundStyle(iconColor)
                    .frame(width: 32)

                Text(title)
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
                    .foregroundStyle(textColor)
                    .lineLimit(1)

                Spacer()
            }
            .padding(.horizontal, TVDesignTokens.Spacing.lg)
            .padding(.vertical, TVDesignTokens.Spacing.md)
            .background(isFocused ? DesignTokens.Primary.p700.opacity(0.3) : Color.clear)
        }
        .buttonStyle(.plain)
    }

    private var iconColor: Color {
        if isDestructive { return .red }
        return isFocused ? DesignTokens.Primary.p300 : DesignTokens.Text.secondary
    }

    private var textColor: Color {
        if isDestructive { return .red }
        return isFocused ? DesignTokens.Text.primary : DesignTokens.Text.secondary
    }
}
#endif
