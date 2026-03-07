import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Account and media navigation sections extracted from SettingsView
/// to keep each file under 200 lines.
extension SettingsView {
    // MARK: - Media Navigation

    var mediaNavigationSection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            sectionHeader(localization.t("settings.mediaSection"))
            navRow(icon: "play.rectangle", title: localization.t("settings.playback")) {
                coordinator.pushToCurrentTab(.playbackSettings)
            }
            navRow(icon: "speaker.wave.3", title: localization.t("settings.audio")) {
                coordinator.pushToCurrentTab(.audioSettings)
            }
            navRow(icon: "accessibility", title: localization.t("settings.accessibility")) {
                coordinator.pushToCurrentTab(.accessibilitySettings)
            }
            navRow(icon: "hand.raised", title: localization.t("settings.privacyData")) {
                coordinator.pushToCurrentTab(.privacySettings)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Account Navigation

    var accountNavigationSection: some View {
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
            navRow(icon: "link.circle", title: localization.t("settings.connectedAccounts")) {
                coordinator.pushToCurrentTab(.connectedAccounts)
            }
            navRow(icon: "play.tv", title: localization.t("byoc.connectedSources")) {
                coordinator.pushToCurrentTab(.byocSources)
            }
            navRow(icon: "person.3", title: localization.t("settings.familyControls")) {
                coordinator.pushToCurrentTab(.familyControls)
            }
            navRow(icon: "house.lodge", title: localization.t("settings.household")) {
                coordinator.pushToCurrentTab(.household)
            }
            navRow(icon: "link", title: localization.t("settings.devicePairing")) {
                coordinator.pushToCurrentTab(.devicePairing)
            }
            navRow(icon: "questionmark.circle", title: localization.t("settings.support")) {
                coordinator.pushToCurrentTab(.support)
            }
            navRow(icon: "lifepreserver", title: localization.t("settings.helpCenter")) {
                coordinator.pushToCurrentTab(.helpCenter)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }
}
