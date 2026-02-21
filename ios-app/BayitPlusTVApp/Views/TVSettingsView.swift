import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS Settings screen with account info, navigation to sub-screens
/// for language, notifications, audio, accessibility, privacy,
/// security, billing, subscription, device pairing, and preferences.
struct TVSettingsView: View {
    @Environment(AuthManager.self) var authManager
    @Environment(LocalizationManager.self) var localization
    @Environment(TVRepositoryProvider.self) var repos
    @State var viewModel: SettingsViewModel?

    var body: some View {
        NavigationStack {
            List {
                accountSection
                preferencesSection
                subscriptionSection
                securitySection
                aboutSection
                signOutSection
            }
            .listStyle(.grouped)
            .background(DesignTokens.Background.primary)
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

    // MARK: - Account

    var accountSection: some View {
        Section {
            if let user = authManager.user {
                HStack {
                    Text(localization.t("settings.account"))
                        .foregroundStyle(DesignTokens.Text.secondary)
                    Spacer()
                    Text(user.email)
                        .foregroundStyle(DesignTokens.Text.primary)
                }
            }

            if let profile = authManager.activeProfile {
                HStack {
                    Text(localization.t("settings.profile"))
                        .foregroundStyle(DesignTokens.Text.secondary)
                    Spacer()
                    Text(profile.name)
                        .foregroundStyle(DesignTokens.Text.primary)
                }
            }
        } header: {
            sectionHeader(localization.t("settings.account"))
        }
    }

    // MARK: - Sign Out

    var signOutSection: some View {
        Section {
            Button(action: signOut) {
                Text(localization.t("settings.signOut"))
                    .foregroundStyle(DesignTokens.Colors.Semantic.error)
            }
        }
    }

    // MARK: - Helpers

    func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.primary)
    }

    func settingsNavRow<Destination: View>(
        icon: String,
        title: String,
        detail: String?,
        @ViewBuilder destination: () -> Destination
    ) -> some View {
        NavigationLink {
            destination()
                .tvBreadcrumb(title, icon: icon)
        } label: {
            HStack {
                Image(systemName: icon)
                    .foregroundStyle(DesignTokens.Primary.p400)
                    .frame(width: 32)
                Text(title)
                    .foregroundStyle(DesignTokens.Text.primary)
                Spacer()
                if let detail {
                    Text(detail)
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }
        }
    }

    func signOut() {
        Task {
            await authManager.signOut()
        }
    }
}
