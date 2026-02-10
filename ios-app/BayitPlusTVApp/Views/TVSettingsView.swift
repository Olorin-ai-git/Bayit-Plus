import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS Settings screen with account info, navigation to sub-screens
/// for language, notifications, security, billing, subscription, passkeys,
/// device pairing, and playback preferences.
struct TVSettingsView: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(LocalizationManager.self) private var localization
    @Environment(TVRepositoryProvider.self) private var repos
    @State private var viewModel: SettingsViewModel?

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
                        userRepository: repos.user
                    )
                }
                await viewModel?.load()
            }
        }
    }

    // MARK: - Account

    private var accountSection: some View {
        Section {
            if let user = authManager.user {
                HStack {
                    Text("Account")
                        .foregroundStyle(DesignTokens.Text.secondary)
                    Spacer()
                    Text(user.email ?? user.displayName ?? "")
                        .foregroundStyle(DesignTokens.Text.primary)
                }
            }

            if let profile = authManager.activeProfile {
                HStack {
                    Text("Profile")
                        .foregroundStyle(DesignTokens.Text.secondary)
                    Spacer()
                    Text(profile.name)
                        .foregroundStyle(DesignTokens.Text.primary)
                }
            }
        } header: {
            sectionHeader("Account")
        }
    }

    // MARK: - Preferences

    private var preferencesSection: some View {
        Section {
            settingsNavRow(
                icon: "globe",
                title: "Language",
                detail: localization.currentLanguage.displayName
            ) {
                TVLanguageSettingsView()
            }

            settingsNavRow(
                icon: "bell.badge",
                title: "Notifications",
                detail: nil
            ) {
                TVNotificationSettingsView()
            }

            HStack {
                Image(systemName: "captions.bubble")
                    .foregroundStyle(DesignTokens.Primary.p400)
                    .frame(width: 32)
                Text("Subtitles")
                    .foregroundStyle(DesignTokens.Text.primary)
                Spacer()
                Text(viewModel?.subtitles == true ? "On" : "Off")
                    .foregroundStyle(DesignTokens.Text.muted)
            }

            HStack {
                Image(systemName: "play.circle")
                    .foregroundStyle(DesignTokens.Primary.p400)
                    .frame(width: 32)
                Text("Autoplay")
                    .foregroundStyle(DesignTokens.Text.primary)
                Spacer()
                Text(viewModel?.autoplay == true ? "On" : "Off")
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        } header: {
            sectionHeader("Preferences")
        }
    }

    // MARK: - Subscription

    private var subscriptionSection: some View {
        Section {
            settingsNavRow(
                icon: "crown",
                title: "Subscription",
                detail: nil
            ) {
                TVSubscriptionView()
            }

            settingsNavRow(
                icon: "creditcard",
                title: "Billing",
                detail: nil
            ) {
                TVBillingView()
            }
        } header: {
            sectionHeader("Subscription")
        }
    }

    // MARK: - Security

    private var securitySection: some View {
        Section {
            settingsNavRow(
                icon: "lock.shield",
                title: "Security",
                detail: nil
            ) {
                TVSecurityView()
            }

            settingsNavRow(
                icon: "person.badge.key",
                title: "Passkeys",
                detail: nil
            ) {
                TVPasskeyManagementView()
            }

            settingsNavRow(
                icon: "link",
                title: "Device Pairing",
                detail: nil
            ) {
                TVDevicePairingView()
            }
        } header: {
            sectionHeader("Security")
        }
    }

    // MARK: - About

    private var aboutSection: some View {
        Section {
            HStack {
                Image(systemName: "info.circle")
                    .foregroundStyle(DesignTokens.Primary.p400)
                    .frame(width: 32)
                Text("Version")
                    .foregroundStyle(DesignTokens.Text.secondary)
                Spacer()
                Text(Bundle.main.object(
                    forInfoDictionaryKey: "CFBundleShortVersionString"
                ) as? String ?? "1.0.0")
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        } header: {
            sectionHeader("About")
        }
    }

    // MARK: - Sign Out

    private var signOutSection: some View {
        Section {
            Button(action: signOut) {
                Text("Sign Out")
                    .foregroundStyle(DesignTokens.Colors.Semantic.error)
            }
        }
    }

    // MARK: - Helpers

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.primary)
    }

    private func settingsNavRow<Destination: View>(
        icon: String,
        title: String,
        detail: String?,
        @ViewBuilder destination: () -> Destination
    ) -> some View {
        NavigationLink(destination: destination) {
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

    private func signOut() {
        Task {
            await authManager.signOut()
        }
    }
}
