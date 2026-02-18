import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Main settings screen with sections for preferences, media,
/// account, privacy, and navigation to sub-screens.
struct SettingsView: View {
    @Environment(RepositoryProvider.self) var repos
    @Environment(NavigationCoordinator.self) var coordinator
    @Environment(LocalizationManager.self) var localization
    @Environment(AuthManager.self) private var authManager
    @State private var viewModel: SettingsViewModel?
    @State private var showDeleteAccountConfirmation = false

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                LazyVStack(spacing: DesignTokens.Spacing.lg) {
                    if vm.isLoading && vm.preferences == nil {
                        ProgressView().tint(.white).padding(.top, DesignTokens.Spacing.xxxxl)
                    } else {
                        preferencesSection(vm)
                        mediaNavigationSection
                        accountNavigationSection
                        privacySection
                        dangerZoneSection(vm)
                        appInfoSection
                    }
                }
                .padding(.vertical, DesignTokens.Spacing.lg)
            } else { ScreenLoadingView() }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = SettingsViewModel(
                    settingsRepository: repos.settings, userRepository: repos.user
                )
            }
            await viewModel?.load()
        }
    }

    // MARK: - Preferences

    private func preferencesSection(_ vm: SettingsViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            sectionHeader(localization.t("settings.preferences"))
            toggleRow(icon: "globe", title: localization.t("settings.autoTranslate"),
                      isOn: vm.autoTranslate) { Task { await vm.updateAutoTranslate($0) } }
            toggleRow(icon: "captions.bubble", title: localization.t("settings.subtitles"),
                      isOn: vm.subtitles) { Task { await vm.updateSubtitles($0) } }
            toggleRow(icon: "play.circle", title: localization.t("settings.autoplay"),
                      isOn: vm.autoplay) { Task { await vm.updateAutoplay($0) } }
            toggleRow(icon: "bell", title: localization.t("settings.notifications"),
                      isOn: vm.notifications) { Task { await vm.updateNotifications($0) } }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Privacy Links

    private var privacySection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            sectionHeader(localization.t("settings.privacy"))
            navRow(icon: "doc.text", title: localization.t("settings.privacyPolicy")) {}
            navRow(icon: "doc.plaintext", title: localization.t("settings.termsOfService")) {}
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Danger Zone

    private func dangerZoneSection(_ vm: SettingsViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            sectionHeader(localization.t("settings.dangerZone"))
            GlassCard {
                Button(action: { showDeleteAccountConfirmation = true }) {
                    HStack(spacing: DesignTokens.Spacing.md) {
                        Image(systemName: "trash.fill")
                            .font(.system(size: DesignTokens.FontSize.lg))
                            .foregroundStyle(DesignTokens.ErrorColor.default).frame(width: 32)
                        Text(localization.t("settings.deleteAccount"))
                            .font(.system(size: DesignTokens.FontSize.md))
                            .foregroundStyle(DesignTokens.ErrorColor.default)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }.padding(DesignTokens.Spacing.md)
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .alert(localization.t("settings.deleteAccountConfirmTitle"),
               isPresented: $showDeleteAccountConfirmation) {
            Button(localization.t("common.cancel"), role: .cancel) {}
            Button(localization.t("settings.deleteAccountConfirm"), role: .destructive) {
                Task { do { try await vm.deleteAccount(); await authManager.signOut() } catch {} }
            }
        } message: { Text(localization.t("settings.deleteAccountConfirmMessage")) }
    }

    // MARK: - App Info

    private var appInfoSection: some View {
        GlassCard {
            HStack {
                Text(localization.t("settings.version"))
                    .font(.system(size: DesignTokens.FontSize.sm)).foregroundStyle(DesignTokens.Text.secondary)
                Spacer()
                Text(Bundle.main.shortVersion)
                    .font(.system(size: DesignTokens.FontSize.sm)).foregroundStyle(DesignTokens.Text.muted)
            }.padding(DesignTokens.Spacing.md)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Shared Row Builders

    func sectionHeader(_ title: String) -> some View {
        HStack {
            Text(title)
                .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.muted).textCase(.uppercase)
            Spacer()
        }
    }

    func toggleRow(icon: String, title: String, isOn: Bool,
                   onChange: @escaping (Bool) -> Void) -> some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: icon)
                    .font(.system(size: DesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Primary.default).frame(width: 32)
                Text(title).font(.system(size: DesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.primary)
                Spacer()
                Toggle("", isOn: Binding(get: { isOn }, set: { onChange($0) }))
                    .tint(DesignTokens.Primary.default).labelsHidden()
            }.padding(DesignTokens.Spacing.md)
        }
    }

    func navRow(icon: String, title: String, action: @escaping () -> Void) -> some View {
        GlassCard {
            Button(action: action) {
                HStack(spacing: DesignTokens.Spacing.md) {
                    Image(systemName: icon)
                        .font(.system(size: DesignTokens.FontSize.lg))
                        .foregroundStyle(DesignTokens.Primary.default).frame(width: 32)
                    Text(title).font(.system(size: DesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.primary)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                }.padding(DesignTokens.Spacing.md)
            }
        }
    }
}

private extension Bundle {
    var shortVersion: String { infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0" }
}
