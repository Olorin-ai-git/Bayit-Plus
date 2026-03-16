#if os(tvOS)

    import BayitAuth
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Panel Content

    extension TVSettingsHubView {
        // MARK: - Account

        @ViewBuilder
        var accountPanel: some View {
            if let user = authManager.user {
                hubGlassRow(
                    title: localization.t("settings.account"),
                    detail: user.email
                )
            }

            if let profile = authManager.activeProfile {
                hubGlassRow(
                    title: localization.t("settings.profile.title"),
                    detail: profile.name
                )
            }

            hubGlassNavRow(
                icon: "crown",
                title: localization.t("settings.subscription.title")
            ) { TVSubscriptionView() }

            hubGlassNavRow(
                icon: "creditcard",
                title: localization.t("settings.billing")
            ) { TVBillingView() }

            hubGlassNavRow(
                icon: "link.circle",
                title: localization.t("settings.connectedAccounts")
            ) {
                TVConnectedAccountsView(
                    onDismiss: { navigationPath.removeLast() }
                )
            }

            Spacer().frame(height: TVDesignTokens.Spacing.md)
            signOutButton
        }

        // MARK: - Preferences

        @ViewBuilder
        var preferencesPanel: some View {
            hubGlassNavRow(
                icon: "globe",
                title: localization.t("settings.language"),
                detail: localization.currentLanguage.displayName
            ) { TVLanguageSettingsView() }

            hubGlassNavRow(
                icon: "bell.badge",
                title: localization.t("settings.notifications"),
                detail: localization.t("common.on")
            ) { TVNotificationSettingsView() }

            hubGlassNavRow(
                icon: "speaker.wave.2",
                title: localization.t("settings.audio.title"),
                subtitle: localization.t("settings.audio.description"),
                detail: localization.currentLanguage.displayName
            ) { TVAudioSettingsView() }

            hubGlassNavRow(
                icon: "accessibility",
                title: localization.t("settings.accessibility.title"),
                detail: localization.t("common.off")
            ) { TVAccessibilitySettingsView() }

            if let vm = viewModel {
                hubGlassToggleRow(
                    title: localization.t("settings.subtitles"),
                    isOn: Bindable(vm).subtitles
                ) { _ in }

                hubGlassToggleRow(
                    title: localization.t("settings.autoplay"),
                    isOn: Bindable(vm).autoplay
                ) { newValue in
                    Task { await vm.updateAutoplay(newValue) }
                }

                hubGlassNavRow(
                    icon: "sparkles",
                    title: localization.t("settings.trivia.title"),
                    subtitle: localization.t(
                        "settings.aiFeatures.trivia.autoShow"
                    ),
                    detail: localization.t("common.on")
                ) { TVTriviaSettingsView() }

                hubGlassToggleRow(
                    title: localization.t("settings.interactiveMoments"),
                    subtitle: localization.t(
                        "settings.interactiveMomentsDesc"
                    ),
                    isOn: Bindable(vm).subtitles
                ) { _ in }
            }
        }

        // MARK: - Playback

        @ViewBuilder
        var playbackPanel: some View {
            if let vm = viewModel {
                hubGlassNavRow(
                    icon: "film",
                    title: localization.t("settings.playback.videoQuality"),
                    detail: localization.t(
                        "settings.playback.qualityAuto"
                    )
                ) { TVSubtitleSettingsView() }

                hubGlassToggleRow(
                    title: localization.t(
                        "settings.playback.autoplayNext"
                    ),
                    isOn: Bindable(vm).autoplay
                ) { newValue in
                    Task { await vm.updateAutoplay(newValue) }
                }

                hubGlassToggleRow(
                    title: localization.t("settings.playback.pip"),
                    isOn: Bindable(vm).subtitles
                ) { _ in }

                hubGlassToggleRow(
                    title: localization.t(
                        "settings.playback.backgroundAudio"
                    ),
                    isOn: Bindable(vm).subtitles
                ) { _ in }

                hubGlassNavRow(
                    icon: "captions.bubble",
                    title: localization.t(
                        "settings.subtitleSettings.title"
                    )
                ) { TVSubtitleSettingsView() }

                hubGlassNavRow(
                    icon: "gauge.with.needle",
                    title: localization.t(
                        "settings.playback.playbackSpeed"
                    ),
                    detail: "1.0x"
                ) { TVSubtitleSettingsView() }
            }
        }

        // MARK: - Security

        @ViewBuilder
        var securityPanel: some View {
            securitySectionHeader(localization.t("settings.security.title"))

            hubGlassActionRow(
                icon: "key",
                title: localization.t("profile.changePassword"),
                subtitle: localization.t(
                    "settings.security.changePasswordDesc"
                )
            ) { navigationPath.append(.changePassword) }

            hubGlassNavRowWithBadge(
                icon: "shield.lefthalf.filled",
                title: localization.t("profile.twoFactorAuth"),
                badgeText: localization.t("settings.enabled"),
                badgeColor: DesignTokens.Success.default
            ) { TVSecurityView() }

            hubGlassActionRow(
                icon: "desktopcomputer",
                title: localization.t("profile.connectedDevices"),
                subtitle: nil
            ) { navigationPath.append(.activeSessions) }

            securitySectionHeader(localization.t("settings.linkedAccounts"))

            if let email = authManager.user?.email {
                hubGlassRowWithStatus(
                    icon: "envelope.fill",
                    title: localization.t("settings.email"),
                    subtitle: email,
                    isConnected: true
                )
            }

            hubGlassRowWithStatus(
                icon: "g.circle.fill",
                title: "Google",
                subtitle: localization.t("settings.notConnected"),
                isConnected: false
            )

            hubGlassRowWithStatus(
                icon: "apple.logo",
                title: "Apple",
                subtitle: localization.t("settings.notConnected"),
                isConnected: false
            )

            hubGlassActionRow(
                icon: "link.circle",
                title: localization.t("profile.linkAccount"),
                subtitle: nil
            ) { navigationPath.append(.linkAccount) }
        }

        private func securitySectionHeader(_ title: String) -> some View {
            Text(title.uppercased())
                .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                .foregroundStyle(DesignTokens.Primary.p400)
                .kerning(1.2)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.top, TVDesignTokens.Spacing.md)
        }

        func hubGlassNavRowWithBadge<Dest: View>(
            icon: String,
            title: String,
            badgeText: String,
            badgeColor: Color,
            @ViewBuilder destination: () -> Dest
        ) -> some View {
            NavigationLink {
                destination().tvBreadcrumb(title, icon: icon)
            } label: {
                HStack(spacing: 16) {
                    Image(systemName: icon)
                        .font(.system(size: 26, weight: .medium))
                        .foregroundStyle(DesignTokens.Primary.p400)
                        .frame(width: 36)
                    Text(title)
                        .font(.system(size: 28, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.primary)
                    Spacer()
                    Text(badgeText)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 4)
                        .background(badgeColor)
                        .clipShape(Capsule())
                    Image(systemName: "chevron.right")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
                .padding(.horizontal, 28)
                .frame(minHeight: 76)
                .background(hubRowBackground)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .overlay(hubRowBorder)
            }
            .tvCardStyle()
        }

        func hubGlassRowWithStatus(
            icon: String,
            title: String,
            subtitle: String,
            isConnected: Bool
        ) -> some View {
            HStack(spacing: 16) {
                Image(systemName: icon)
                    .font(.system(size: 26, weight: .medium))
                    .foregroundStyle(
                        isConnected
                            ? DesignTokens.Text.primary
                            : DesignTokens.Text.muted
                    )
                    .frame(width: 36)
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.system(size: 28, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.primary)
                    Text(subtitle)
                        .font(.system(size: 22))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
                Spacer()
                if isConnected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(DesignTokens.Success.default)
                } else {
                    Text(localization.t("settings.notConnected"))
                        .font(.system(size: 22))
                        .foregroundStyle(DesignTokens.Text.muted)
                    Image(systemName: "chevron.right")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }
            .padding(.horizontal, 28)
            .frame(minHeight: 76)
            .background(hubRowBackground)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay(hubRowBorder)
        }

        // MARK: - Social

        @ViewBuilder
        var socialPanel: some View {
            hubGlassNavRow(
                icon: "person.2.circle",
                title: localization.t("settings.household")
            ) { TVHouseholdProfilesView(onDismiss: {}) }

            hubGlassNavRow(
                icon: "figure.2.and.child.holdinghands",
                title: localization.t("settings.familyControls")
            ) { TVFamilyControlsView() }

            hubGlassNavRow(
                icon: "flame",
                title: localization.t("judaism.shabbat.title")
            ) { TVZmanimView() }

            hubGlassNavRow(
                icon: "sunrise",
                title: localization.t("ritual.title")
            ) { TVMorningRitualView() }
        }

        // MARK: - Help

        @ViewBuilder
        var helpPanel: some View {
            hubGlassNavRow(
                icon: "info.circle",
                title: localization.t("settings.about.title"),
                detail: Bundle.main.object(
                    forInfoDictionaryKey: "CFBundleShortVersionString"
                ) as? String
            ) { TVAboutView() }

            hubGlassNavRow(
                icon: "questionmark.circle",
                title: localization.t("settings.help.contactSupport")
            ) { TVHelpView() }

            replayOnboardingRow

            hubGlassNavRow(
                icon: "doc.text",
                title: localization.t("settings.privacyPolicy")
            ) { TVAboutView() }

            hubGlassNavRow(
                icon: "doc.plaintext",
                title: localization.t("settings.termsOfService")
            ) { TVAboutView() }
        }

        // MARK: - Replay Onboarding

        private var replayOnboardingRow: some View {
            hubGlassActionRow(
                icon: "sparkles",
                title: localization.t("settings.help.replayOnboarding"),
                subtitle: nil
            ) { replayOnboarding() }
        }

        private func replayOnboarding() {
            guard let profileId = authManager.activeProfile?.id
            else { return }
            let key = "tv.bayit.plus.onboarding.\(profileId).completed"
            UserDefaults.standard.set(false, forKey: key)
            coordinator.showingOnboarding = true
        }

        // MARK: - Sign Out

        private var signOutButton: some View {
            Button {
                Task { await authManager.signOut() }
            } label: {
                HStack(spacing: 16) {
                    Image(
                        systemName:
                        "rectangle.portrait.and.arrow.right"
                    )
                    .font(.system(size: 26, weight: .medium))
                    .foregroundStyle(DesignTokens.Colors.Semantic.error)
                    Text(localization.t("settings.signOut"))
                        .font(.system(size: 28, weight: .semibold))
                        .foregroundStyle(
                            DesignTokens.Colors.Semantic.error
                        )
                    Spacer()
                }
                .padding(.horizontal, 28)
                .frame(minHeight: 76)
                .background(hubRowBackground)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .overlay(hubRowBorder)
            }
            .tvCardStyle()
        }
    }

    // MARK: - Glass Row Components

    extension TVSettingsHubView {
        var hubRowBackground: some View {
            ZStack {
                Color.white.opacity(0.06)
                RoundedRectangle(cornerRadius: 16)
                    .fill(.ultraThinMaterial)
                    .environment(\.colorScheme, .dark)
            }
        }

        var hubRowBorder: some View {
            RoundedRectangle(cornerRadius: 16)
                .strokeBorder(Color.white.opacity(0.12), lineWidth: 1.5)
        }

        func hubGlassRow(
            title: String,
            detail: String?
        ) -> some View {
            hubRowContent(title: title, detail: detail)
        }

        func hubGlassNavRow<Dest: View>(
            icon: String,
            title: String,
            subtitle: String? = nil,
            detail: String? = nil,
            @ViewBuilder destination: () -> Dest
        ) -> some View {
            NavigationLink {
                destination().tvBreadcrumb(title, icon: icon)
            } label: {
                hubRowContent(
                    title: title,
                    icon: icon,
                    subtitle: subtitle,
                    detail: detail,
                    showChevron: true
                )
            }
            .tvCardStyle()
        }

        func hubGlassActionRow(
            icon: String,
            title: String,
            subtitle: String?,
            action: @escaping () -> Void
        ) -> some View {
            Button(action: action) {
                hubRowContent(
                    title: title,
                    icon: icon,
                    subtitle: subtitle,
                    detail: nil,
                    showChevron: true
                )
            }
            .tvCardStyle()
        }

        func hubGlassToggleRow(
            title: String,
            subtitle: String? = nil,
            isOn: Binding<Bool>,
            onChange: @escaping (Bool) -> Void
        ) -> some View {
            Button {
                isOn.wrappedValue.toggle()
                onChange(isOn.wrappedValue)
            } label: {
                HStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(title)
                            .font(.system(size: 28, weight: .medium))
                            .foregroundStyle(DesignTokens.Text.primary)
                            .lineLimit(1)
                        if let subtitle {
                            Text(subtitle)
                                .font(.system(size: 22))
                                .foregroundStyle(DesignTokens.Text.muted)
                                .lineLimit(1)
                        }
                    }
                    Spacer()
                    TVSettingsPillToggle(isOn: isOn.wrappedValue)
                }
                .padding(.horizontal, 28)
                .frame(minHeight: subtitle != nil ? 90 : 76)
                .background(hubRowBackground)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .overlay(hubRowBorder)
            }
            .tvCardStyle()
        }

        private func hubRowContent(
            title: String,
            icon: String? = nil,
            subtitle: String? = nil,
            detail: String? = nil,
            showChevron: Bool = false
        ) -> some View {
            HStack(spacing: 16) {
                if let icon {
                    Image(systemName: icon)
                        .font(.system(size: 26, weight: .medium))
                        .foregroundStyle(DesignTokens.Primary.p400)
                        .frame(width: 36)
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.system(size: 28, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(1)
                    if let subtitle {
                        Text(subtitle)
                            .font(.system(size: 22))
                            .foregroundStyle(DesignTokens.Text.muted)
                            .lineLimit(1)
                    }
                }
                Spacer()
                if let detail {
                    Text(detail)
                        .font(.system(size: 24))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
                if showChevron {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }
            .padding(.horizontal, 28)
            .frame(minHeight: subtitle != nil ? 90 : 76)
            .background(hubRowBackground)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay(hubRowBorder)
        }
    }

#endif
