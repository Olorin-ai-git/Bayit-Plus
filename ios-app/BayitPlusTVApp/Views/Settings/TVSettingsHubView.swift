#if os(tvOS)

    import BayitAuth
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Unified Settings hub with sidebar navigation.
    /// Consolidates Account, Preferences, Security, Social, and Help
    /// into a single view with pre-selectable category.
    struct TVSettingsHubView: View {
        @Environment(AuthManager.self) var authManager
        @Environment(LocalizationManager.self) var localization
        @Environment(TVRepositoryProvider.self) var repos
        @Environment(TVNavigationCoordinator.self) var coordinator
        @Binding var navigationPath: [TVProfileDestination]

        let initialCategory: TVSettingsCategory
        @State private var selectedCategory: TVSettingsCategory
        @State var viewModel: SettingsViewModel?

        private let sidebarWidth: CGFloat = 280

        init(
            navigationPath: Binding<[TVProfileDestination]>,
            initialCategory: TVSettingsCategory
        ) {
            _navigationPath = navigationPath
            self.initialCategory = initialCategory
            _selectedCategory = State(initialValue: initialCategory)
        }

        var body: some View {
            HStack(alignment: .top, spacing: 40) {
                sidebar
                    .frame(width: sidebarWidth)
                    .padding(.top, TVDesignTokens.Spacing.lg)
                    .padding(.leading, 60)
                    .focusSection()

                detailPanel
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .padding(.top, TVDesignTokens.Spacing.lg)
                    .padding(.trailing, 80)
                    .focusSection()
            }
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

        // MARK: - Sidebar

        private var sidebar: some View {
            VStack(spacing: 14) {
                ForEach(TVSettingsCategory.allCases, id: \.rawValue) { cat in
                    sidebarButton(cat)
                }
                Spacer()
            }
        }

        private func sidebarButton(_ cat: TVSettingsCategory) -> some View {
            let isSelected = selectedCategory == cat
            return Button { selectedCategory = cat } label: {
                HStack(spacing: 14) {
                    Image(systemName: cat.icon)
                        .font(.system(size: 24, weight: .medium))
                        .frame(width: 32)

                    Text(cat.localizedTitle(localization))
                        .font(.system(size: 22, weight: .bold))
                        .tracking(0.6)
                        .lineLimit(1)
                }
                .foregroundStyle(
                    isSelected ? .white : DesignTokens.Text.secondary
                )
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 24)
                .frame(height: 64)
                .background(sidebarItemBackground(isSelected))
                .clipShape(Capsule())
                .overlay(
                    Capsule().strokeBorder(
                        isSelected
                            ? DesignTokens.Primary.p400.opacity(0.5)
                            : Color.white.opacity(0.08),
                        lineWidth: isSelected ? 1.5 : 1
                    )
                )
            }
            .tvCardStyle()
        }

        @ViewBuilder
        private func sidebarItemBackground(_ isSelected: Bool) -> some View {
            if isSelected {
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
                    .padding(.bottom, TVDesignTokens.Spacing.lg)

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
                accountPanel
            case .preferences:
                preferencesPanel
            case .playback:
                playbackPanel
            case .security:
                securityPanel
            case .social:
                socialPanel
            case .help:
                helpPanel
            }
        }
    }

    // MARK: - TVSettingsCategory Extensions

    extension TVSettingsCategory {
        var icon: String {
            switch self {
            case .account: return "person.circle"
            case .preferences: return "slider.horizontal.3"
            case .playback: return "play.circle"
            case .security: return "shield.lefthalf.filled"
            case .social: return "person.2.circle"
            case .help: return "questionmark.circle"
            }
        }

        func localizedTitle(_ loc: LocalizationManager) -> String {
            switch self {
            case .account: return loc.t("settings.account")
            case .preferences: return loc.t("settings.preferences")
            case .playback: return loc.t("settings.playback.title")
            case .security: return loc.t("settings.security.title")
            case .social: return loc.t("settings.social")
            case .help: return loc.t("settings.help.title")
            }
        }
    }

#endif
