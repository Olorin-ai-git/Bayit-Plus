import BayitAuth
import BayitBYOC
import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Account & Settings Section

struct TVProfileAccountSection: View {
    @Environment(BYOCSourceManager.self) private var byocManager
    let profile: ProfileResponse
    let localization: LocalizationManager
    let onAction: (TVProfileDestination) -> Void

    var body: some View {
        Section {
            profileActionRow(
                icon: "gearshape.fill",
                title: localization.t("profile.preferences"),
                subtitle: localization.t("profile.preferencesDesc"),
                color: DesignTokens.Primary.p400
            ) { onAction(.settingsHub(category: .preferences)) }

            profileActionRow(
                icon: "gear",
                title: localization.t("nav.settings"),
                subtitle: localization.t("profile.settingsDesc"),
                color: DesignTokens.Text.secondary
            ) { onAction(.settingsHub(category: .account)) }

            profileActionRow(
                icon: "lock.fill",
                title: localization.t("profile.accountSecurity"),
                subtitle: localization.t("profile.accountSecurityDesc"),
                color: DesignTokens.Warning.default
            ) { onAction(.settingsHub(category: .security)) }

            if !(profile.emailVerified ?? false) {
                profileActionRow(
                    icon: "envelope.badge",
                    title: localization.t("profile.verifyEmail"),
                    subtitle: localization.t("profile.verifyEmailDesc"),
                    color: DesignTokens.ErrorColor.e400
                ) { onAction(.settingsHub(category: .security)) }
            }

            if !(profile.phoneVerified ?? false) {
                profileActionRow(
                    icon: "phone.badge.checkmark",
                    title: localization.t("profile.verifyPhone"),
                    subtitle: localization.t("profile.verifyPhoneDesc"),
                    color: DesignTokens.ErrorColor.e400
                ) { onAction(.phoneVerification) }
            }

            profileActionRow(
                icon: "play.tv",
                title: localization.t("byoc.connectedSources"),
                subtitle: byocManager.hasAnySources
                    ? String(format: localization.t("byoc.channelCount"), byocManager.sources.count)
                    : localization.t("byoc.connectContentDesc"),
                color: DesignTokens.Primary.p400
            ) { onAction(.contentSources) }

            profileActionRow(
                icon: "person.2.fill",
                title: localization.t("profile.householdProfiles"),
                subtitle: localization.t("profile.householdProfilesDesc"),
                color: DesignTokens.Secondary.s400
            ) { onAction(.household) }
        } header: {
            profileSectionHeader(localization.t("profile.accountSettings"))
        }
    }
}

// MARK: - Info Section

struct TVProfileInfoSection: View {
    let localization: LocalizationManager
    let onAction: (TVProfileDestination) -> Void

    var body: some View {
        Section {
            profileActionRow(
                icon: "questionmark.circle.fill",
                title: localization.t("settings.help.title"),
                subtitle: localization.t("settings.help.subtitle"),
                color: DesignTokens.Info.default
            ) { onAction(.settingsHub(category: .help)) }

            profileActionRow(
                icon: "info.circle.fill",
                title: localization.t("settings.about.title"),
                subtitle: localization.t("profile.aboutDesc"),
                color: DesignTokens.Info.default
            ) { onAction(.settingsHub(category: .help)) }
        } header: {
            profileSectionHeader(localization.t("profile.info"))
        }
    }
}

// MARK: - Admin Section

struct TVProfileAdminSection: View {
    let authManager: AuthManager
    let localization: LocalizationManager

    var body: some View {
        Section {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "shield.fill")
                    .font(.system(size: 28))
                    .foregroundStyle(DesignTokens.Warning.default)
                    .frame(width: 44)
                VStack(alignment: .leading, spacing: 4) {
                    Text(localization.t("profile.admin"))
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                    if let role = authManager.user?.role.rawValue
                        .replacingOccurrences(of: "_", with: " ")
                        .capitalized
                    {
                        Text(role)
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Warning.default)
                    }
                }
                Spacer()
                Image(systemName: "checkmark.shield.fill")
                    .font(.system(size: 20))
                    .foregroundStyle(DesignTokens.Success.default)
            }
        } header: {
            profileSectionHeader(localization.t("profile.role"))
        }
    }
}

// MARK: - Switch Profile Section

struct TVProfileSwitchProfileSection: View {
    let localization: LocalizationManager
    let onSwitchProfile: () -> Void

    var body: some View {
        Section {
            profileActionRow(
                icon: "person.2.circle",
                title: localization.t("profile.switchProfile"),
                subtitle: localization.t("profile.switchProfileDesc"),
                color: DesignTokens.Secondary.s400
            ) {
                onSwitchProfile()
            }
        }
    }
}

// MARK: - Sign Out Section

struct TVProfileSignOutSection: View {
    let localization: LocalizationManager
    let onSignOut: () -> Void

    var body: some View {
        Section {
            Button {
                onSignOut()
            } label: {
                HStack {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                        .foregroundStyle(DesignTokens.Colors.Semantic.error)
                        .frame(width: 32)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(localization.t("profile.signOut"))
                            .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                            .foregroundStyle(DesignTokens.Colors.Semantic.error)

                        Text(localization.t("profile.signOutConfirmation"))
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }
            }
        }
    }
}
