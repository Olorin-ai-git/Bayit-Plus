import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - TVSettingsView + Sections

extension TVSettingsView {
    // MARK: - Preferences

    var preferencesSection: some View {
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

            settingsNavRow(
                icon: "speaker.wave.3",
                title: localization.t("settings.audio.title"),
                detail: nil
            ) {
                TVAudioSettingsView()
            }

            settingsNavRow(
                icon: "accessibility",
                title: localization.t("settings.accessibility.title"),
                detail: nil
            ) {
                TVAccessibilitySettingsView()
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

                if vm.interactiveMomentsBlocked,
                   let msgKey = vm.interactiveMomentsBlockedMessage
                {
                    Text(localization.t(msgKey))
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Warning.default)
                        .padding(.leading, 44)
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

    var subscriptionSection: some View {
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

    var securitySection: some View {
        Section {
            settingsNavRow(
                icon: "hand.raised",
                title: localization.t("settings.privacy.title"),
                detail: nil
            ) {
                TVPrivacySettingsView()
            }

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
            sectionHeader(localization.t("settings.privacySecurity"))
        }
    }
}
