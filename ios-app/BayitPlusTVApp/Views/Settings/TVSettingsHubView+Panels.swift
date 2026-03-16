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

        // MARK: - Preferences (includes Playback)

        @ViewBuilder
        var preferencesPanel: some View {
            hubGlassNavRow(
                icon: "globe",
                title: localization.t("settings.language")
            ) { TVLanguageSettingsView() }

            hubGlassNavRow(
                icon: "bell.badge",
                title: localization.t("settings.notifications")
            ) { TVNotificationSettingsView() }

            hubGlassNavRow(
                icon: "speaker.wave.2",
                title: localization.t("settings.audio.title")
            ) { TVAudioSettingsView() }

            hubGlassNavRow(
                icon: "accessibility",
                title: localization.t("settings.accessibility.title")
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

                hubGlassToggleRow(
                    title: localization.t("settings.interactiveMoments"),
                    isOn: Bindable(vm).subtitles
                ) { _ in }
            }
        }

        // MARK: - Security

        @ViewBuilder
        var securityPanel: some View {
            hubGlassActionRow(
                icon: "key",
                title: localization.t("profile.changePassword"),
                subtitle: localization.t(
                    "settings.security.changePasswordDesc"
                )
            ) { navigationPath.append(.changePassword) }

            hubGlassNavRow(
                icon: "shield.lefthalf.filled",
                title: localization.t(
                    "settings.security.twoFactorAuth"
                ),
                subtitle: localization.t(
                    "settings.security.twoFactorDesc"
                )
            ) { TVSecurityView() }

            hubGlassActionRow(
                icon: "desktopcomputer",
                title: localization.t("profile.connectedDevices"),
                subtitle: nil
            ) { navigationPath.append(.activeSessions) }

            hubGlassNavRow(
                icon: "hand.raised",
                title: localization.t("settings.privacy.title"),
                subtitle: localization.t("settings.privacy.description")
            ) { TVPrivacySettingsView() }

            hubGlassActionRow(
                icon: "link.circle",
                title: localization.t("settings.connectedAccounts"),
                subtitle: nil
            ) { navigationPath.append(.connectedAccounts) }

            hubGlassActionRow(
                icon: "person.badge.key",
                title: localization.t("profile.passkeys"),
                subtitle: nil
            ) { navigationPath.append(.passkeys) }
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
