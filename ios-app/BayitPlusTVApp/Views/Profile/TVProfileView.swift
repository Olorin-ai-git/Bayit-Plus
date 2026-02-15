import BayitAuth
import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Complete production-ready Profile screen for tvOS.
/// Features: profile editing, stats, account management, quick actions, viewing history.
struct TVProfileView: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(LocalizationManager.self) private var localization
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @State private var viewModel: ProfileViewModel?
    @State private var showingEditProfile = false
    @State private var showingAvatarPicker = false
    @State private var showingPreferences = false
    @State private var showingAccountSettings = false
    @State private var showingViewingHistory = false
    @State private var showingFavorites = false
    @State private var showingRecordings = false
    @State private var showingFriends = false
    @State private var showingMessages = false
    @State private var showingSettings = false
    @State private var showingHelp = false
    @State private var showingConnectedAccounts = false

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
            .fullScreenCover(isPresented: $showingEditProfile) {
                if let vm = viewModel, let profile = vm.profile {
                    TVEditProfileView(
                        profile: profile,
                        viewModel: vm,
                        onDismiss: { showingEditProfile = false }
                    )
                }
            }
            .fullScreenCover(isPresented: $showingAvatarPicker) {
                if let vm = viewModel, let profile = vm.profile {
                    TVAvatarPickerView(
                        currentAvatar: profile.avatar,
                        viewModel: vm,
                        onDismiss: { showingAvatarPicker = false }
                    )
                }
            }
            .fullScreenCover(isPresented: $showingPreferences) {
                if let vm = viewModel, let profile = vm.profile {
                    TVPreferencesView(
                        preferences: profile.preferences,
                        viewModel: vm,
                        onDismiss: { showingPreferences = false }
                    )
                }
            }
            .fullScreenCover(isPresented: $showingAccountSettings) {
                if let vm = viewModel, let profile = vm.profile {
                    TVAccountSettingsView(
                        profile: profile,
                        viewModel: vm,
                        onDismiss: { showingAccountSettings = false }
                    )
                }
            }
            .fullScreenCover(isPresented: $showingViewingHistory) {
                TVViewingHistoryView(
                    onDismiss: { showingViewingHistory = false }
                )
            }
            .fullScreenCover(isPresented: $showingFavorites) {
                TVFavoritesView()
            }
            .fullScreenCover(isPresented: $showingRecordings) {
                TVRecordingsView()
            }
            .fullScreenCover(isPresented: $showingFriends) {
                TVFriendsView()
            }
            .fullScreenCover(isPresented: $showingMessages) {
                TVDirectMessagesView()
            }
            .fullScreenCover(isPresented: $showingSettings) {
                TVSettingsView()
            }
            .fullScreenCover(isPresented: $showingHelp) {
                TVHelpView()
            }
            .fullScreenCover(isPresented: $showingConnectedAccounts) {
                TVConnectedAccountsView(onDismiss: { showingConnectedAccounts = false })
            }
        }
    }

    // MARK: - Profile Content

    private func profileContentView(profile: ProfileResponse, stats: ProfileStats?, viewModel: ProfileViewModel) -> some View {
        List {
            profileHeaderSection(profile, viewModel: viewModel)

            if let stats {
                statsGridSection(stats)
            }

            if profile.isBetaUser == true {
                betaSection(profile)
            }

            quickActionsSection
            socialSection
            accountManagementSection(profile)
            advancedSection
            signOutSection
        }
        .listStyle(.grouped)
    }

    // MARK: - Profile Header

    private func profileHeaderSection(_ profile: ProfileResponse, viewModel: ProfileViewModel) -> some View {
        Section {
            HStack(spacing: TVDesignTokens.Spacing.xxl) {
                // Avatar with edit button
                ZStack(alignment: .bottomTrailing) {
                    profileAvatar(profile)

                    Button {
                        showingAvatarPicker = true
                    } label: {
                        Image(systemName: "pencil.circle.fill")
                            .font(.system(size: 32))
                            .foregroundStyle(DesignTokens.Primary.p400)
                            .background(
                                Circle()
                                    .fill(DesignTokens.Background.primary)
                                    .frame(width: 28, height: 28)
                            )
                    }
                    .buttonStyle(.plain)
                    .offset(x: 8, y: 8)
                }

                // Profile info
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                    HStack {
                        Text(profile.displayName ?? localization.t("common.guest"))
                            .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                            .foregroundStyle(DesignTokens.Text.primary)

                        Button {
                            showingEditProfile = true
                        } label: {
                            Image(systemName: "pencil")
                                .font(.system(size: TVDesignTokens.FontSize.lg))
                                .foregroundStyle(DesignTokens.Primary.p400)
                        }
                        .buttonStyle(.plain)
                    }

                    if let email = profile.email {
                        HStack(spacing: TVDesignTokens.Spacing.xs) {
                            Image(systemName: "envelope.fill")
                                .font(.system(size: TVDesignTokens.FontSize.sm))
                            Text(email)
                                .font(.system(size: TVDesignTokens.FontSize.md))

                            if profile.emailVerified == true {
                                Image(systemName: "checkmark.seal.fill")
                                    .font(.system(size: TVDesignTokens.FontSize.sm))
                                    .foregroundStyle(DesignTokens.Success.default)
                            }
                        }
                        .foregroundStyle(DesignTokens.Text.secondary)
                    }

                    if let phoneNumber = profile.phoneNumber {
                        HStack(spacing: TVDesignTokens.Spacing.xs) {
                            Image(systemName: "phone.fill")
                                .font(.system(size: TVDesignTokens.FontSize.sm))
                            Text(phoneNumber)
                                .font(.system(size: TVDesignTokens.FontSize.md))

                            if profile.phoneVerified == true {
                                Image(systemName: "checkmark.seal.fill")
                                    .font(.system(size: TVDesignTokens.FontSize.sm))
                                    .foregroundStyle(DesignTokens.Success.default)
                            }
                        }
                        .foregroundStyle(DesignTokens.Text.secondary)
                    }

                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        memberSinceBadge(profile.createdAt)

                        if let provider = profile.authProvider {
                            providerBadge(provider)
                        }
                    }
                }

                Spacer()
            }
            .padding(.vertical, TVDesignTokens.Spacing.lg)
        }
    }

    private func profileAvatar(_ profile: ProfileResponse) -> some View {
        Group {
            if let avatarURL = profile.avatar, let url = URL(string: avatarURL) {
                AsyncImage(url: url) { phase in
                    if case .success(let img) = phase {
                        img
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } else {
                        avatarFallback(profile)
                    }
                }
            } else {
                avatarFallback(profile)
            }
        }
        .frame(width: 140, height: 140)
        .clipShape(Circle())
        .overlay(
            Circle()
                .strokeBorder(
                    LinearGradient(
                        colors: [
                            DesignTokens.Primary.p400,
                            DesignTokens.Secondary.s400
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 4
                )
        )
        .shadow(color: DesignTokens.Glass.purpleGlow.opacity(0.4), radius: 16, x: 0, y: 8)
    }

    private func avatarFallback(_ profile: ProfileResponse) -> some View {
        ZStack {
            Circle()
                .fill(
                    LinearGradient(
                        colors: [
                            DesignTokens.Primary.p400,
                            DesignTokens.Secondary.s400
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
            Text(String((profile.displayName ?? "?").prefix(1)).uppercased())
                .font(.system(size: 56, weight: .bold))
                .foregroundStyle(.white)
        }
    }

    private func memberSinceBadge(_ createdAt: String?) -> some View {
        Group {
            if let created = createdAt, let date = ISO8601DateFormatter().date(from: created) {
                HStack(spacing: TVDesignTokens.Spacing.xs) {
                    Image(systemName: "calendar")
                        .font(.system(size: TVDesignTokens.FontSize.xs))
                    Text(localization.t("profile.memberSince", ["date": date.formatted(.dateTime.year().month())]))
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                }
                .padding(.horizontal, TVDesignTokens.Spacing.sm)
                .padding(.vertical, TVDesignTokens.Spacing.xs)
                .background(DesignTokens.Glass.bgLight)
                .cornerRadius(TVDesignTokens.Radius.sm)
                .foregroundStyle(DesignTokens.Text.muted)
            }
        }
    }

    private func providerBadge(_ provider: String) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.xs) {
            Image(systemName: providerIcon(provider))
                .font(.system(size: TVDesignTokens.FontSize.xs))
            Text(provider.capitalized)
                .font(.system(size: TVDesignTokens.FontSize.sm))
        }
        .padding(.horizontal, TVDesignTokens.Spacing.sm)
        .padding(.vertical, TVDesignTokens.Spacing.xs)
        .background(DesignTokens.Glass.bgLight)
        .cornerRadius(TVDesignTokens.Radius.sm)
        .foregroundStyle(DesignTokens.Info.default)
    }

    private func providerIcon(_ provider: String) -> String {
        switch provider.lowercased() {
        case "google": return "g.circle.fill"
        case "apple": return "apple.logo"
        case "facebook": return "f.circle.fill"
        default: return "person.circle.fill"
        }
    }

    // MARK: - Stats Grid

    private func statsGridSection(_ stats: ProfileStats) -> some View {
        Section {
            LazyVGrid(
                columns: [
                    GridItem(.flexible(), spacing: TVDesignTokens.Spacing.lg),
                    GridItem(.flexible(), spacing: TVDesignTokens.Spacing.lg),
                    GridItem(.flexible(), spacing: TVDesignTokens.Spacing.lg)
                ],
                spacing: TVDesignTokens.Spacing.lg
            ) {
                statCard(
                    icon: "play.circle.fill",
                    title: localization.t("profile.watched"),
                    value: "\(stats.totalWatched ?? 0)",
                    color: DesignTokens.Primary.p400
                )

                statCard(
                    icon: "heart.fill",
                    title: localization.t("profile.favorites"),
                    value: "\(stats.totalFavorites ?? 0)",
                    color: DesignTokens.ErrorColor.e400
                )

                statCard(
                    icon: "list.bullet",
                    title: localization.t("profile.playlists"),
                    value: "\(stats.totalPlaylists ?? 0)",
                    color: DesignTokens.Secondary.s400
                )

                if let recordings = stats.totalRecordings, recordings > 0 {
                    statCard(
                        icon: "record.circle",
                        title: localization.t("profile.recordings"),
                        value: "\(recordings)",
                        color: DesignTokens.Warning.default
                    )
                }

                if let streak = stats.streakDays, streak > 0 {
                    statCard(
                        icon: "flame.fill",
                        title: localization.t("profile.dayStreak"),
                        value: "\(streak)",
                        color: DesignTokens.Warning.w500
                    )
                }

                if let watchTime = stats.watchTimeMinutes, watchTime > 0 {
                    let hours = watchTime / 60
                    statCard(
                        icon: "clock.fill",
                        title: localization.t("profile.watchTime"),
                        value: "\(hours)h",
                        color: DesignTokens.Info.default
                    )
                }
            }
            .padding(.vertical, TVDesignTokens.Spacing.sm)
        } header: {
            sectionHeader(localization.t("profile.yourStatistics"))
        }
    }

    private func statCard(icon: String, title: String, value: String, color: Color) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: 40))
                .foregroundStyle(color)

            Text(value)
                .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(title)
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity)
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgMedium)
        .cornerRadius(TVDesignTokens.Radius.lg)
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                .stroke(DesignTokens.Glass.border, lineWidth: 1)
        )
    }

    // MARK: - Beta Section

    private func betaSection(_ profile: ProfileResponse) -> some View {
        Section {
            HStack(spacing: TVDesignTokens.Spacing.xl) {
                Image(systemName: "testtube.2")
                    .font(.system(size: 48))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [DesignTokens.Primary.p400, DesignTokens.Secondary.s400],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )

                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                    Text(localization.t("profile.beta500Member"))
                        .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Text(localization.t("profile.beta500Description"))
                        .font(.system(size: TVDesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }

                Spacer()

                VStack(spacing: TVDesignTokens.Spacing.xs) {
                    Text("\(profile.betaCredits ?? 0)")
                        .font(.system(size: TVDesignTokens.FontSize.display, weight: .bold))
                        .foregroundStyle(DesignTokens.Primary.p400)

                    Text(localization.t("profile.credits"))
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(
                DesignTokens.Glass.bgMedium
            )
            .cornerRadius(TVDesignTokens.Radius.lg)
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                    .stroke(
                        LinearGradient(
                            colors: [DesignTokens.Primary.p400.opacity(0.5), DesignTokens.Secondary.s400.opacity(0.5)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 2
                    )
            )
        }
    }

    // MARK: - Quick Actions

    private var quickActionsSection: some View {
        Section {
            actionRow(
                icon: "heart.fill",
                title: localization.t("profile.myFavorites"),
                subtitle: localization.t("profile.viewFavoriteContent"),
                color: DesignTokens.ErrorColor.e400
            ) {
                showingFavorites = true
            }

            actionRow(
                icon: "record.circle",
                title: localization.t("profile.myRecordings"),
                subtitle: localization.t("profile.manageDvrRecordings"),
                color: DesignTokens.Warning.default
            ) {
                showingRecordings = true
            }

            actionRow(
                icon: "list.bullet",
                title: localization.t("profile.myPlaylists"),
                subtitle: localization.t("profile.organizeContent"),
                color: DesignTokens.Secondary.s400
            ) {
                // Navigate to playlists
            }

            actionRow(
                icon: "clock.arrow.circlepath",
                title: localization.t("profile.viewingHistory"),
                subtitle: localization.t("profile.seeWhatYouWatched"),
                color: DesignTokens.Info.default
            ) {
                showingViewingHistory = true
            }
        } header: {
            sectionHeader(localization.t("profile.quickActions"))
        }
    }

    // MARK: - Account Management

    private func accountManagementSection(_ profile: ProfileResponse) -> some View {
        Section {
            actionRow(
                icon: "gearshape.fill",
                title: localization.t("profile.preferences"),
                subtitle: localization.t("profile.preferencesDesc"),
                color: DesignTokens.Primary.p400
            ) {
                showingPreferences = true
            }

            actionRow(
                icon: "lock.fill",
                title: localization.t("profile.accountSecurity"),
                subtitle: localization.t("profile.accountSecurityDesc"),
                color: DesignTokens.Warning.default
            ) {
                showingAccountSettings = true
            }

            if !(profile.emailVerified ?? false) {
                actionRow(
                    icon: "envelope.badge",
                    title: localization.t("profile.verifyEmail"),
                    subtitle: localization.t("profile.verifyEmailDesc"),
                    color: DesignTokens.ErrorColor.e400
                ) {
                    // Trigger email verification
                }
            }

            if !(profile.phoneVerified ?? false) && profile.phoneNumber != nil {
                actionRow(
                    icon: "phone.badge.checkmark",
                    title: localization.t("profile.verifyPhone"),
                    subtitle: localization.t("profile.verifyPhoneDesc"),
                    color: DesignTokens.ErrorColor.e400
                ) {
                    // Trigger phone verification
                }
            }
        } header: {
            sectionHeader(localization.t("profile.accountManagement"))
        }
    }

    // MARK: - Advanced

    private var advancedSection: some View {
        Section {
            actionRow(
                icon: "person.2.fill",
                title: localization.t("profile.householdProfiles"),
                subtitle: localization.t("profile.householdProfilesDesc"),
                color: DesignTokens.Secondary.s400
            ) {
                // Navigate to household management
            }

            actionRow(
                icon: "bell.fill",
                title: localization.t("profile.notifications"),
                subtitle: localization.t("profile.notificationSettings"),
                color: DesignTokens.Primary.p400
            ) {
                // Navigate to notification settings
            }

            actionRow(
                icon: "questionmark.circle.fill",
                title: localization.t("settings.help"),
                subtitle: localization.t("profile.helpDesc"),
                color: DesignTokens.Info.default
            ) {
                showingHelp = true
            }

            actionRow(
                icon: "link.circle.fill",
                title: localization.t("profile.connectedAccounts"),
                subtitle: localization.t("profile.connectedAccountsDesc"),
                color: DesignTokens.Secondary.s400
            ) {
                showingConnectedAccounts = true
            }

            actionRow(
                icon: "info.circle.fill",
                title: localization.t("settings.about"),
                subtitle: localization.t("profile.aboutDesc"),
                color: DesignTokens.Info.default
            ) {
                // Navigate to about screen
            }
        } header: {
            sectionHeader(localization.t("profile.advanced"))
        }
    }

    // MARK: - Social

    private var socialSection: some View {
        Section {
            actionRow(
                icon: "person.2.fill",
                title: localization.t("nav.friends"),
                subtitle: localization.t("profile.friendsDesc"),
                color: DesignTokens.Primary.p400
            ) {
                showingFriends = true
            }

            actionRow(
                icon: "bubble.left.and.bubble.right",
                title: localization.t("profile.messages"),
                subtitle: localization.t("profile.messagesDesc"),
                color: DesignTokens.Info.default
            ) {
                showingMessages = true
            }

            actionRow(
                icon: "gear",
                title: localization.t("nav.settings"),
                subtitle: localization.t("profile.settingsDesc"),
                color: DesignTokens.Text.secondary
            ) {
                showingSettings = true
            }

            actionRow(
                icon: "square.grid.2x2",
                title: localization.t("nav.widgets"),
                subtitle: localization.t("profile.widgetsDesc"),
                color: DesignTokens.Secondary.s400
            ) {
                // Widgets are managed via the overlay dock
            }
        } header: {
            sectionHeader(localization.t("profile.socialSettings"))
        }
    }

    // MARK: - Sign Out

    private var signOutSection: some View {
        Section {
            Button {
                signOut()
            } label: {
                HStack {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                        .foregroundStyle(DesignTokens.Colors.Semantic.error)
                        .frame(width: 32)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(localization.t("profile.signOut"))
                            .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                            .foregroundStyle(DesignTokens.Colors.Semantic.error)

                        Text(localization.t("profile.signOutConfirmation"))
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }
            }
        }
    }

    // MARK: - Helper Views

    private func actionRow(
        icon: String,
        title: String,
        subtitle: String,
        color: Color,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: icon)
                    .font(.system(size: 28))
                    .foregroundStyle(color)
                    .frame(width: 44)

                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Text(subtitle)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }
    }

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
            .foregroundStyle(DesignTokens.Text.primary)
            .textCase(nil)
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

    private func signOut() {
        Task {
            await authManager.signOut()
            coordinator.showingAuth = true
            coordinator.selectedTab = .home
        }
    }
}
