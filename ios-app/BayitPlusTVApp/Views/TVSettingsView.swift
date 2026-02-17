import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS Settings screen with account info, navigation to sub-screens
/// for language, notifications, security, billing, subscription,
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

    // MARK: - Preferences

    private var preferencesSection: some View {
        Section {
            settingsNavRow(
                icon: "globe",
                title: localization.t("settings.language"),
                detail: localization.currentLanguage.displayName
            ) {
                TVLanguageSettingsView()
            }

            settingsNavRow(
                icon: "bell.badge",
                title: localization.t("settings.notificationSettings"),
                detail: nil
            ) {
                TVNotificationSettingsView()
            }

            if let vm = viewModel {
                Toggle(isOn: Bindable(vm).subtitles) {
                    HStack {
                        Image(systemName: "captions.bubble")
                            .foregroundStyle(DesignTokens.Primary.p400)
                            .frame(width: 32)
                        Text(localization.t("settings.subtitles"))
                            .foregroundStyle(DesignTokens.Text.primary)
                    }
                }
                .tint(DesignTokens.Primary.default)
                .onChange(of: vm.subtitles) { _, newValue in
                    Task { await vm.updateSubtitles(newValue) }
                }
                .accessibilityLabel(localization.t("settings.subtitles"))

                Toggle(isOn: Bindable(vm).autoplay) {
                    HStack {
                        Image(systemName: "play.circle")
                            .foregroundStyle(DesignTokens.Primary.p400)
                            .frame(width: 32)
                        Text(localization.t("settings.autoplay"))
                            .foregroundStyle(DesignTokens.Text.primary)
                    }
                }
                .tint(DesignTokens.Primary.default)
                .onChange(of: vm.autoplay) { _, newValue in
                    Task { await vm.updateAutoplay(newValue) }
                }
                .accessibilityLabel(localization.t("settings.autoplay"))
            }

            settingsNavRow(
                icon: "lightbulb.fill",
                title: "Trivia Settings",
                detail: nil
            ) {
                TVTriviaSettingsView()
            }

            if let vm = viewModel {
                Toggle(isOn: Bindable(vm).interactiveMoments) {
                    HStack {
                        Image(systemName: "person.2.wave.2")
                            .foregroundStyle(DesignTokens.Primary.p400)
                            .frame(width: 32)
                        Text(localization.t("settings.interactiveMoments"))
                            .foregroundStyle(DesignTokens.Text.primary)
                    }
                }
                .tint(DesignTokens.Primary.default)
                .onChange(of: vm.interactiveMoments) { _, newValue in
                    Task { await vm.updateInteractiveMoments(newValue) }
                }
            }

            settingsNavRow(
                icon: "flame",
                title: localization.t("judaism.shabbat.title"),
                detail: nil
            ) {
                TVZmanimView()
            }

            settingsNavRow(
                icon: "sunrise",
                title: localization.t("ritual.title"),
                detail: nil
            ) {
                TVMorningRitualView()
            }
        } header: {
            sectionHeader(localization.t("settings.preferences"))
        }
    }

    // MARK: - Subscription

    private var subscriptionSection: some View {
        Section {
            settingsNavRow(
                icon: "crown",
                title: localization.t("settings.subscription"),
                detail: nil
            ) {
                TVSubscriptionView()
            }

            settingsNavRow(
                icon: "creditcard",
                title: localization.t("settings.billing"),
                detail: nil
            ) {
                TVBillingView()
            }
        } header: {
            sectionHeader(localization.t("settings.subscription"))
        }
    }

    // MARK: - Security

    private var securitySection: some View {
        Section {
            settingsNavRow(
                icon: "lock.shield",
                title: localization.t("settings.security"),
                detail: nil
            ) {
                TVSecurityView()
            }

            settingsNavRow(
                icon: "link",
                title: localization.t("settings.devicePairing"),
                detail: nil
            ) {
                TVDevicePairingView()
            }

            settingsNavRow(
                icon: "figure.2.and.child.holdinghands",
                title: localization.t("settings.familyControls"),
                detail: nil
            ) {
                TVFamilyControlsView()
            }
        } header: {
            sectionHeader(localization.t("settings.security"))
        }
    }

    // MARK: - About

    private var aboutSection: some View {
        Section {
            HStack {
                Image(systemName: "info.circle")
                    .foregroundStyle(DesignTokens.Primary.p400)
                    .frame(width: 32)
                Text(localization.t("settings.version"))
                    .foregroundStyle(DesignTokens.Text.secondary)
                Spacer()
                Text(Bundle.main.object(
                    forInfoDictionaryKey: "CFBundleShortVersionString"
                ) as? String ?? "1.0.0")
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        } header: {
            sectionHeader(localization.t("settings.about"))
        }
    }

    // MARK: - Sign Out

    private var signOutSection: some View {
        Section {
            Button(action: signOut) {
                Text(localization.t("settings.signOut"))
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

    private func signOut() {
        Task {
            await authManager.signOut()
        }
    }
}
