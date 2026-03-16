#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Section

    enum SecuritySection: CaseIterable, Identifiable {
        case accountSecurity, connectedAccounts, devices, privacy
        var id: Self {
            self
        }

        func label(_ l: LocalizationManager) -> String {
            switch self {
            case .accountSecurity: return l.t("settings.security.accountSecurity")
            case .connectedAccounts: return l.t("settings.connectedAccounts")
            case .devices: return l.t("settings.security.devices")
            case .privacy: return l.t("settings.privacy.title")
            }
        }

        var icon: String {
            switch self {
            case .accountSecurity: return "shield.fill"
            case .connectedAccounts: return "link"
            case .devices: return "display"
            case .privacy: return "eye.fill"
            }
        }
    }

    // MARK: - Root View

    struct TVSecurityView: View {
        @Environment(LocalizationManager.self) var localization
        @Environment(TVRepositoryProvider.self) private var repos
        @State var viewModel: SecurityViewModel?
        @State private var profileViewModel: ProfileViewModel?
        @State private var selected: SecuritySection = .accountSecurity
        @State private var showingChangePassword = false
        @FocusState private var sidebarFocus: SecuritySection?

        var body: some View {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()
                RadialGradient(
                    colors: [DesignTokens.Primary.p600.opacity(0.65), Color.clear],
                    center: UnitPoint(x: 0.05, y: 0.2),
                    startRadius: 0,
                    endRadius: 920
                )
                .ignoresSafeArea()
                .allowsHitTesting(false)
                HStack(spacing: 0) {
                    sidebar
                        .frame(width: 340)
                    Divider()
                        .background(Color.white.opacity(0.08))
                    contentPanel
                        .frame(maxWidth: .infinity)
                }
            }
            .task {
                if viewModel == nil {
                    viewModel = SecurityViewModel(repository: repos.settings, localization: localization)
                    profileViewModel = ProfileViewModel(repository: repos.user)
                }
                async let devLoad: () = viewModel?.load() ?? ()
                async let profLoad: () = profileViewModel?.load() ?? ()
                _ = await (devLoad, profLoad)
            }
            .fullScreenCover(isPresented: $showingChangePassword) {
                TVChangePasswordSheet(viewModel: viewModel, onDismiss: { showingChangePassword = false })
            }
        }

        // MARK: - Sidebar

        private var sidebar: some View {
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 10) {
                    ForEach(SecuritySection.allCases) { section in
                        sidebarItem(section)
                    }
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 56)
            }
        }

        private func sidebarItem(_ section: SecuritySection) -> some View {
            let isSelected = selected == section
            return Button { selected = section } label: {
                HStack(spacing: 16) {
                    Image(systemName: section.icon)
                        .font(.system(size: 22, weight: .medium))
                        .foregroundStyle(isSelected ? DesignTokens.Primary.p400 : DesignTokens.Text.secondary)
                        .frame(width: 30)
                    Text(section.label(localization))
                        .font(.system(size: 26, weight: isSelected ? .semibold : .regular))
                        .foregroundStyle(isSelected ? DesignTokens.Text.primary : DesignTokens.Text.secondary)
                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 22)
                .background(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(isSelected ? DesignTokens.Primary.p700.opacity(0.18) : DesignTokens.Glass.bgLight)
                        .overlay(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .stroke(
                                    isSelected ? DesignTokens.Primary.p400.opacity(0.6) : Color.white.opacity(0.07),
                                    lineWidth: 1.5
                                )
                        )
                )
            }
            .tvCardStyle()
            .focused($sidebarFocus, equals: section)
        }

        // MARK: - Content Panel

        @ViewBuilder
        private var contentPanel: some View {
            switch selected {
            case .accountSecurity:
                TVSecurityAccountPanel(
                    viewModel: viewModel,
                    profileViewModel: profileViewModel,
                    onChangePassword: { showingChangePassword = true }
                )
            case .connectedAccounts:
                TVConnectedAccountsView(onDismiss: {})
            case .devices:
                TVSecurityDevicesPanel(viewModel: viewModel)
            case .privacy:
                TVPrivacySettingsView()
            }
        }
    }
#endif
