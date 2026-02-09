import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS Settings screen with language selection, subtitle preferences,
/// playback quality, and account info.
struct TVSettingsView: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(LocalizationManager.self) private var localization
    @Environment(TVRepositoryProvider.self) private var repos
    @State private var viewModel: SettingsViewModel?

    var body: some View {
        NavigationStack {
            List {
                accountSection
                languageSection
                playbackSection
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

    // MARK: - Sections

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
            Text("Account")
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    private var languageSection: some View {
        Section {
            ForEach(Language.allCases, id: \.self) { language in
                Button(action: { localization.setLanguage(language) }) {
                    HStack {
                        Text(language.displayName)
                            .foregroundStyle(DesignTokens.Text.primary)
                        Spacer()
                        if localization.currentLanguage == language {
                            Image(systemName: "checkmark")
                                .foregroundStyle(DesignTokens.Primary.default)
                        }
                    }
                }
            }
        } header: {
            Text("Language")
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    private var playbackSection: some View {
        Section {
            HStack {
                Text("Subtitles")
                    .foregroundStyle(DesignTokens.Text.secondary)
                Spacer()
                Text(viewModel?.subtitles == true ? "On" : "Off")
                    .foregroundStyle(DesignTokens.Text.primary)
            }

            HStack {
                Text("Autoplay")
                    .foregroundStyle(DesignTokens.Text.secondary)
                Spacer()
                Text(viewModel?.autoplay == true ? "On" : "Off")
                    .foregroundStyle(DesignTokens.Text.primary)
            }
        } header: {
            Text("Playback")
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    private var aboutSection: some View {
        Section {
            HStack {
                Text("Version")
                    .foregroundStyle(DesignTokens.Text.secondary)
                Spacer()
                Text(Bundle.main.object(
                    forInfoDictionaryKey: "CFBundleShortVersionString"
                ) as? String ?? "1.0.0")
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        } header: {
            Text("About")
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    private var signOutSection: some View {
        Section {
            Button(action: signOut) {
                Text("Sign Out")
                    .foregroundStyle(DesignTokens.Colors.Semantic.error)
            }
        }
    }

    // MARK: - Actions

    private func signOut() {
        Task {
            await authManager.signOut()
        }
    }
}
