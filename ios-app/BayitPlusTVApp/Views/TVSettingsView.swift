#if os(tvOS)
    import BayitAuth
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Settings Category

    enum SettingsCategory: String, CaseIterable, Identifiable {
        case account
        case playback
        case notifications
        case security
        case family
        case help

        var id: String {
            rawValue
        }

        var icon: String {
            switch self {
            case .account: return "person.circle"
            case .playback: return "play.circle"
            case .notifications: return "bell.badge"
            case .security: return "shield.lefthalf.filled"
            case .family: return "person.2.circle"
            case .help: return "questionmark.circle"
            }
        }

        func localizedTitle(_ loc: LocalizationManager) -> String {
            switch self {
            case .account: return loc.t("settings.account")
            case .playback: return loc.t("settings.playback.title")
            case .notifications: return loc.t("settings.notifications")
            case .security: return loc.t("settings.security.title")
            case .family: return loc.t("settings.familyAndSafety")
            case .help: return loc.t("settings.help.title")
            }
        }
    }

    // MARK: - Settings View

    struct TVSettingsView: View {
        @Environment(AuthManager.self) var authManager
        @Environment(LocalizationManager.self) var localization
        @Environment(TVRepositoryProvider.self) var repos
        @Environment(TVNavigationCoordinator.self) var coordinator
        @State var viewModel: SettingsViewModel?
        @State var selectedCategory: SettingsCategory = .account

        private let sidebarWidth: CGFloat = 320

        var body: some View {
            NavigationStack {
                HStack(alignment: .top, spacing: 40) {
                    sidebar
                        .frame(width: sidebarWidth)
                        .padding(.top, 40)
                        .padding(.leading, 60)
                        .focusSection()

                    detailPanel
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .padding(.top, 40)
                        .padding(.trailing, 80)
                        .focusSection()
                }
                .background(settingsBackground)
                .task {
                    if viewModel == nil {
                        viewModel = SettingsViewModel(
                            settingsRepository: repos.settings,
                            userRepository: repos.user,
                            avatarRepository: repos.avatarMeshRepository
                        )
                    }
                    await viewModel?.load()
                }
            }
        }

        // MARK: - Background

        private var settingsBackground: some View {
            ZStack {
                DesignTokens.Background.primary

                RadialGradient(
                    colors: [
                        DesignTokens.Primary.p600.opacity(0.18),
                        Color.clear,
                    ],
                    center: .center,
                    startRadius: 100,
                    endRadius: 700
                )

                RadialGradient(
                    colors: [
                        Color(red: 0.2, green: 0.6, blue: 0.7)
                            .opacity(0.1),
                        Color.clear,
                    ],
                    center: UnitPoint(x: 0.7, y: 0.4),
                    startRadius: 50,
                    endRadius: 500
                )
            }
        }

        // MARK: - Sidebar

        private var sidebar: some View {
            VStack(spacing: 14) {
                ForEach(SettingsCategory.allCases) { category in
                    settingsCategoryButton(category)
                }
                Spacer()
            }
        }

        private func settingsCategoryButton(
            _ category: SettingsCategory
        ) -> some View {
            Button {
                selectedCategory = category
            } label: {
                HStack(spacing: 14) {
                    Image(systemName: category.icon)
                        .font(.system(size: 26, weight: .medium))
                        .frame(width: 32)

                    Text(
                        category.localizedTitle(localization)
                            .uppercased()
                    )
                    .font(.system(size: 22, weight: .bold))
                    .tracking(0.8)
                    .lineLimit(1)
                }
                .foregroundStyle(
                    selectedCategory == category
                        ? .white
                        : DesignTokens.Text.secondary
                )
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 28)
                .frame(height: 68)
                .background(categoryBackground(category))
                .clipShape(Capsule())
                .overlay(
                    Capsule()
                        .strokeBorder(
                            selectedCategory == category
                                ? DesignTokens.Primary.p400.opacity(0.5)
                                : Color.white.opacity(0.08),
                            lineWidth: selectedCategory == category
                                ? 1.5 : 1
                        )
                )
            }
            .tvCardStyle()
        }

        @ViewBuilder
        private func categoryBackground(
            _ category: SettingsCategory
        ) -> some View {
            if selectedCategory == category {
                ZStack {
                    DesignTokens.Primary.p600.opacity(0.4)
                    Capsule()
                        .fill(.ultraThinMaterial)
                        .environment(\.colorScheme, .dark)
                }
            } else {
                ZStack {
                    Color.white.opacity(0.04)
                    Capsule()
                        .fill(.ultraThinMaterial)
                        .environment(\.colorScheme, .dark)
                        .opacity(0.3)
                }
            }
        }

        // MARK: - Detail Panel

        private var detailPanel: some View {
            VStack(alignment: .leading, spacing: 0) {
                Text(selectedCategory.localizedTitle(localization))
                    .font(.system(size: 42, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .padding(.bottom, 28)

                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: 10) {
                        detailContent
                    }
                    .padding(.bottom, 60)
                }
            }
        }

        @ViewBuilder
        private var detailContent: some View {
            switch selectedCategory {
            case .account:
                accountDetail
            case .playback:
                playbackDetail
            case .notifications:
                notificationsDetail
            case .security:
                securityDetail
            case .family:
                familyDetail
            case .help:
                helpDetail
            }
        }

        // MARK: - Sign Out

        func signOut() {
            Task {
                await authManager.signOut()
            }
        }
    }
#endif
