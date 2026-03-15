#if os(tvOS)
    import BayitAuth
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - TVSettingsView + Detail Sections

    extension TVSettingsView {
        // MARK: - Account

        @ViewBuilder
        var accountDetail: some View {
            if let user = authManager.user {
                settingsGlassRow(
                    title: localization.t("settings.account"),
                    detail: user.email
                )
            }

            if let profile = authManager.activeProfile {
                settingsGlassRow(
                    title: localization.t("settings.profile.title"),
                    detail: profile.name
                )
            }

            settingsGlassNavRow(
                icon: "crown",
                title: localization.t("settings.subscription.title"),
                detail: nil
            ) {
                TVSubscriptionView()
            }

            settingsGlassNavRow(
                icon: "creditcard",
                title: localization.t("settings.billing"),
                detail: nil
            ) {
                TVBillingView()
            }

            settingsGlassNavRow(
                icon: "link.circle",
                title: localization.t("settings.connectedAccounts"),
                detail: nil
            ) {
                TVConnectedAccountsView(onDismiss: {})
            }

            Spacer().frame(height: TVDesignTokens.Spacing.md)

            signOutButton
        }

        // MARK: - Playback

        @ViewBuilder
        var playbackDetail: some View {
            settingsGlassNavRow(
                icon: "film",
                title: localization.t("settings.playback.videoQuality"),
                detail: localization.t("settings.playback.qualityAuto")
            ) {
                TVSubtitleSettingsView()
            }

            if let vm = viewModel {
                settingsGlassToggleRow(
                    title: localization.t(
                        "settings.playback.autoplayNext"
                    ),
                    isOn: Bindable(vm).autoplay
                ) { newValue in
                    Task { await vm.updateAutoplay(newValue) }
                }

                settingsGlassToggleRow(
                    title: localization.t("settings.playback.pip"),
                    isOn: Bindable(vm).subtitles
                ) { _ in }

                settingsGlassToggleRow(
                    title: localization.t(
                        "settings.playback.backgroundAudio"
                    ),
                    isOn: Bindable(vm).subtitles
                ) { _ in }
            }

            settingsGlassNavRow(
                icon: "captions.bubble",
                title: localization.t("settings.subtitleSettings.title"),
                detail: nil
            ) {
                TVSubtitleSettingsView()
            }

            settingsGlassNavRow(
                icon: "gauge.with.needle",
                title: localization.t("settings.playback.playbackSpeed"),
                detail: "1.0x"
            ) {
                TVSubtitleSettingsView()
            }
        }

        // MARK: - Preferences

        @ViewBuilder
        var preferencesDetail: some View {
            settingsGlassNavRow(
                icon: "globe",
                title: localization.t("settings.language"),
                detail: nil
            ) {
                TVLanguageSettingsView()
            }

            settingsGlassNavRow(
                icon: "bell.badge",
                title: localization.t("settings.notifications"),
                detail: nil
            ) {
                TVNotificationSettingsView()
            }

            settingsGlassNavRow(
                icon: "speaker.wave.2",
                title: localization.t("settings.audio.title"),
                detail: nil
            ) {
                TVAudioSettingsView()
            }

            settingsGlassNavRow(
                icon: "accessibility",
                title: localization.t("settings.accessibility.title"),
                detail: nil
            ) {
                TVAccessibilitySettingsView()
            }

            if let vm = viewModel {
                settingsGlassToggleRow(
                    title: localization.t("settings.subtitles"),
                    isOn: Bindable(vm).subtitles
                ) { _ in }

                settingsGlassToggleRow(
                    title: localization.t("settings.autoplay"),
                    isOn: Bindable(vm).autoplay
                ) { newValue in
                    Task { await vm.updateAutoplay(newValue) }
                }

                settingsGlassToggleRow(
                    title: localization.t("settings.interactiveMoments"),
                    isOn: Bindable(vm).subtitles
                ) { _ in }
            }
        }

        // MARK: - Security

        @ViewBuilder
        var securityDetail: some View {
            settingsGlassNavRow(
                icon: "shield.lefthalf.filled",
                title: localization.t("settings.security.accountSecurity"),
                subtitle: localization.t("settings.security.twoFactorDesc"),
                detail: nil
            ) {
                TVSecurityView()
            }

            settingsGlassNavRow(
                icon: "hand.raised",
                title: localization.t("settings.privacy.title"),
                subtitle: localization.t("settings.privacy.description"),
                detail: nil
            ) {
                TVPrivacySettingsView()
            }

            settingsGlassNavRow(
                icon: "link",
                title: localization.t("settings.devicePairing"),
                detail: nil
            ) {
                TVDevicePairingView()
            }
        }

        // MARK: - Social

        @ViewBuilder
        var socialDetail: some View {
            settingsGlassNavRow(
                icon: "person.2.circle",
                title: localization.t("settings.household"),
                detail: nil
            ) {
                TVHouseholdProfilesView(onDismiss: {})
            }

            settingsGlassNavRow(
                icon: "figure.2.and.child.holdinghands",
                title: localization.t("settings.familyControls"),
                detail: nil
            ) {
                TVFamilyControlsView()
            }

            settingsGlassNavRow(
                icon: "flame",
                title: localization.t("judaism.shabbat.title"),
                detail: nil
            ) {
                TVZmanimView()
            }

            settingsGlassNavRow(
                icon: "sunrise",
                title: localization.t("ritual.title"),
                detail: nil
            ) {
                TVMorningRitualView()
            }
        }

        // MARK: - Help

        @ViewBuilder
        var helpDetail: some View {
            settingsGlassNavRow(
                icon: "info.circle",
                title: localization.t("settings.about.title"),
                detail: Bundle.main.object(
                    forInfoDictionaryKey: "CFBundleShortVersionString"
                ) as? String
            ) {
                TVAboutView()
            }

            settingsGlassNavRow(
                icon: "questionmark.circle",
                title: localization.t("settings.help.contactSupport"),
                detail: nil
            ) {
                TVHelpView()
            }

            replayOnboardingGlassRow

            settingsGlassNavRow(
                icon: "doc.text",
                title: localization.t("settings.privacyPolicy"),
                detail: nil
            ) {
                TVAboutView()
            }

            settingsGlassNavRow(
                icon: "doc.plaintext",
                title: localization.t("settings.termsOfService"),
                detail: nil
            ) {
                TVAboutView()
            }
        }

        // MARK: - Replay Onboarding

        private var replayOnboardingGlassRow: some View {
            Button {
                replayOnboarding()
            } label: {
                glassRowContent(
                    title: localization.t(
                        "settings.help.replayOnboarding"
                    ),
                    icon: "sparkles",
                    detail: nil,
                    showChevron: true
                )
            }
            .tvCardStyle()
        }

        private func replayOnboarding() {
            guard let profileId = authManager.activeProfile?.id
            else { return }
            let key = "tv.bayit.plus.onboarding.\(profileId).completed"
            UserDefaults.standard.set(false, forKey: key)
            coordinator.showingOnboarding = true
        }

        // MARK: - Sign Out Button

        private var signOutButton: some View {
            Button { signOut() } label: {
                HStack(spacing: 16) {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                        .font(.system(size: 26, weight: .medium))
                        .foregroundStyle(DesignTokens.Colors.Semantic.error)
                    Text(localization.t("settings.signOut"))
                        .font(.system(size: 28, weight: .semibold))
                        .foregroundStyle(DesignTokens.Colors.Semantic.error)
                    Spacer()
                }
                .padding(.horizontal, 28)
                .frame(minHeight: 76)
                .background(settingsRowBackground)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .overlay(settingsRowBorder)
            }
            .tvCardStyle()
        }
    }
#endif
