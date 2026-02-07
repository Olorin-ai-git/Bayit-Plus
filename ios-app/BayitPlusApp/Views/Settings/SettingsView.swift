import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Main settings screen with sections for language, playback,
/// notifications, and navigation to sub-screens.
struct SettingsView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: SettingsViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                LazyVStack(spacing: DesignTokens.Spacing.lg) {
                    if vm.isLoading && vm.preferences == nil {
                        ProgressView().tint(.white).padding(.top, DesignTokens.Spacing.xxxxl)
                    } else {
                        preferencesSection(vm)
                        navigationSection
                        privacySection
                        appInfoSection
                    }
                }
                .padding(.vertical, DesignTokens.Spacing.lg)
            }
        }
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

    // MARK: - Preferences

    private func preferencesSection(_ vm: SettingsViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            sectionHeader(localization.t("settings.preferences"))

            toggleRow(
                icon: "globe",
                title: localization.t("settings.autoTranslate"),
                isOn: vm.autoTranslate
            ) { val in Task { await vm.updateAutoTranslate(val) } }

            toggleRow(
                icon: "captions.bubble",
                title: localization.t("settings.subtitles"),
                isOn: vm.subtitles
            ) { val in Task { await vm.updateSubtitles(val) } }

            toggleRow(
                icon: "play.circle",
                title: localization.t("settings.autoplay"),
                isOn: vm.autoplay
            ) { val in Task { await vm.updateAutoplay(val) } }

            toggleRow(
                icon: "bell",
                title: localization.t("settings.notifications"),
                isOn: vm.notifications
            ) { val in Task { await vm.updateNotifications(val) } }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Navigation

    private var navigationSection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            sectionHeader(localization.t("settings.account"))

            navRow(icon: "globe", title: localization.t("settings.language")) {
                coordinator.pushToCurrentTab(.languageSettings)
            }
            navRow(icon: "bell.badge", title: localization.t("settings.notificationSettings")) {
                coordinator.pushToCurrentTab(.notificationSettings)
            }
            navRow(icon: "creditcard", title: localization.t("settings.billing")) {
                coordinator.pushToCurrentTab(.billing)
            }
            navRow(icon: "crown", title: localization.t("settings.subscription")) {
                coordinator.pushToCurrentTab(.subscription)
            }
            navRow(icon: "lock.shield", title: localization.t("settings.security")) {
                coordinator.pushToCurrentTab(.security)
            }
            navRow(icon: "questionmark.circle", title: localization.t("settings.support")) {
                coordinator.pushToCurrentTab(.support)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Privacy

    private var privacySection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            sectionHeader(localization.t("settings.privacy"))

            navRow(icon: "doc.text", title: localization.t("settings.privacyPolicy")) {}
            navRow(icon: "doc.plaintext", title: localization.t("settings.termsOfService")) {}
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - App Info

    private var appInfoSection: some View {
        GlassCard {
            HStack {
                Text(localization.t("settings.version"))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
                Spacer()
                Text(Bundle.main.shortVersion)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .padding(DesignTokens.Spacing.md)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Shared Rows

    private func sectionHeader(_ title: String) -> some View {
        HStack {
            Text(title)
                .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.muted)
                .textCase(.uppercase)
            Spacer()
        }
    }

    private func toggleRow(
        icon: String, title: String, isOn: Bool, onChange: @escaping (Bool) -> Void
    ) -> some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: icon)
                    .font(.system(size: DesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Primary.default)
                    .frame(width: 32)

                Text(title)
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                Toggle("", isOn: Binding(
                    get: { isOn },
                    set: { onChange($0) }
                ))
                .tint(DesignTokens.Primary.default)
                .labelsHidden()
            }
            .padding(DesignTokens.Spacing.md)
        }
    }

    private func navRow(
        icon: String, title: String, action: @escaping () -> Void
    ) -> some View {
        GlassCard {
            Button(action: action) {
                HStack(spacing: DesignTokens.Spacing.md) {
                    Image(systemName: icon)
                        .font(.system(size: DesignTokens.FontSize.lg))
                        .foregroundStyle(DesignTokens.Primary.default)
                        .frame(width: 32)

                    Text(title)
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
                .padding(DesignTokens.Spacing.md)
            }
        }
    }
}

// MARK: - Bundle Extension

private extension Bundle {
    var shortVersion: String {
        infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
    }
}
