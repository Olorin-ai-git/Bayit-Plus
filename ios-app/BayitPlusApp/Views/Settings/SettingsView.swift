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
    @Environment(AuthManager.self) var authManager
    @Environment(UserUIPreferencesStore.self) private var uiPreferences
    @Environment(TooltipManager.self) private var tooltipManager
    @State private var viewModel: SettingsViewModel?
    @State private var showDeleteAccountConfirmation = false
    @State var tourViewModel: FeatureTourViewModel?
    @State var showFeatureTour = false
    @State var showOnboardingReplay = false

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                LazyVStack(spacing: DesignTokens.Spacing.lg) {
                    if vm.isLoading && vm.preferences == nil {
                        ProgressView().tint(.white).padding(.top, DesignTokens.Spacing.xxxxl)
                    } else {
                        preferencesSection(vm)
                        displaySection
                        mediaNavigationSection
                        accountNavigationSection
                        helpSection
                        privacySection
                        dangerZoneSection(vm)
                        appInfoSection
                    }
                }
                .padding(.vertical, DesignTokens.Spacing.lg)
            } else { ScreenLoadingView() }
        }
        .background(DesignTokens.Background.primary)
        .fullScreenCover(isPresented: $showOnboardingReplay) {
            OnboardingFlowView {
                showOnboardingReplay = false
            }
        }
        .fullScreenCover(isPresented: $showFeatureTour) {
            if let vm = tourViewModel {
                FeatureTourView(viewModel: vm) {
                    showFeatureTour = false
                }
            }
        }
        .task {
            if viewModel == nil {
                viewModel = SettingsViewModel(
                    settingsRepository: repos.settings,
                    userRepository: repos.user,
                    avatarRepository: repos.avatarMeshRepository,
                    uiPreferences: uiPreferences
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
                      isOn: vm.autoTranslate) { v in Task { await vm.updateAutoTranslate(v) } }
            toggleRow(icon: "captions.bubble", title: localization.t("settings.subtitles"),
                      isOn: vm.subtitles) { v in Task { await vm.updateSubtitles(v) } }
            toggleRow(icon: "play.circle", title: localization.t("settings.autoplay"),
                      isOn: vm.autoplay) { v in Task { await vm.updateAutoplay(v) } }
            toggleRow(icon: "bell", title: localization.t("settings.notifications"),
                      isOn: vm.notifications) { v in Task { await vm.updateNotifications(v) } }
            toggleRow(icon: "rectangle.stack", title: localization.t("settings.showWidgetsDock"),
                      isOn: vm.showWidgetsDock) { v in Task { await vm.updateShowWidgetsDock(v) } }
            toggleRow(icon: "waveform.circle", title: localization.t("settings.showVoiceControlFAB"),
                      isOn: vm.showVoiceControlFAB) { v in Task { await vm.updateShowVoiceControlFAB(v) } }
            interactiveMomentsRow(vm)
            toggleRow(icon: "lightbulb.max", title: localization.t("settings.showFeatureTips"),
                      isOn: !tooltipManager.tipsDisabled) { v in tooltipManager.tipsDisabled = !v }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private var displaySection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            sectionHeader(localization.t("settings.display"))
            GlassCard {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                    HStack(spacing: DesignTokens.Spacing.md) {
                        Image(systemName: "rectangle.on.rectangle")
                            .font(.system(size: DesignTokens.FontSize.lg))
                            .foregroundStyle(DesignTokens.Primary.default)
                            .frame(width: 32)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(localization.t("settings.homepageStyle"))
                                .font(.system(size: DesignTokens.FontSize.md))
                                .foregroundStyle(DesignTokens.Text.primary)
                            Text(localization.t("settings.homepageStyleDescription"))
                                .font(.system(size: DesignTokens.FontSize.xs))
                                .foregroundStyle(DesignTokens.Text.muted)
                        }
                        Spacer()
                    }
                    Picker("", selection: Binding(
                        get: { uiPreferences.homepageStyle },
                        set: { uiPreferences.homepageStyle = $0 }
                    )) {
                        Text(localization.t("settings.homepageStyleCinematic"))
                            .tag("cinematic")
                        Text(localization.t("settings.homepageStyleClassic"))
                            .tag("classic")
                    }
                    .pickerStyle(.segmented)
                    .tint(DesignTokens.Primary.default)
                }
                .padding(DesignTokens.Spacing.md)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private var privacySection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            sectionHeader(localization.t("settings.privacySection"))
            navRow(icon: "doc.text", title: localization.t("settings.privacyPolicy")) {}
            navRow(icon: "doc.plaintext", title: localization.t("settings.termsOfService")) {}
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

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
               isPresented: $showDeleteAccountConfirmation)
        {
            Button(localization.t("common.cancel"), role: .cancel) {}
            Button(localization.t("settings.deleteAccountConfirm"), role: .destructive) {
                Task { do { try await vm.deleteAccount(); await authManager.signOut() } catch {} }
            }
        } message: { Text(localization.t("settings.deleteAccountConfirmMessage")) }
    }

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

    private func interactiveMomentsRow(_ vm: SettingsViewModel) -> some View {
        VStack(spacing: 0) {
            toggleRow(
                icon: "bubble.left.and.bubble.right",
                title: localization.t("settings.interactiveMoments"),
                isOn: vm.interactiveMoments
            ) { v in Task { await vm.updateInteractiveMoments(v) } }

            if vm.interactiveMomentsBlocked,
               let msgKey = vm.interactiveMomentsBlockedMessage
            {
                HStack(spacing: DesignTokens.Spacing.xs) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Warning.default)
                    Text(localization.t(msgKey))
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
                .padding(.top, DesignTokens.Spacing.xs)
            }
        }
    }

    func sectionHeader(_ title: String) -> some View {
        HStack {
            Text(title)
                .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.muted).textCase(.uppercase)
            Spacer()
        }
    }

    func toggleRow(icon: String, title: String, isOn: Bool,
                   onChange: @escaping (Bool) -> Void) -> some View
    {
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
