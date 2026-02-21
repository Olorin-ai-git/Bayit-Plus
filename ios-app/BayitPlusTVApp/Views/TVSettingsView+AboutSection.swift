import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - TVSettingsView + About Section

extension TVSettingsView {
    var aboutSection: some View {
        Section {
            settingsNavRow(
                icon: "info.circle",
                title: localization.t("settings.about.title"),
                detail: Bundle.main.object(
                    forInfoDictionaryKey: "CFBundleShortVersionString"
                ) as? String ?? "1.0.0"
            ) {
                TVAboutView()
            }

            settingsNavRow(
                icon: "questionmark.circle",
                title: localization.t("settings.help"),
                detail: nil
            ) {
                TVHelpView()
            }

            settingsNavRow(
                icon: "link.circle",
                title: localization.t("settings.connectedAccounts"),
                detail: nil
            ) {
                TVConnectedAccountsView(onDismiss: {})
            }
        } header: {
            sectionHeader(localization.t("settings.about"))
        }
    }
}
