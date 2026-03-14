import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - TVSettingsView + About Section

extension TVSettingsView {
    var aboutSection: some View {
        Section {
            replayOnboardingRow

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
                title: localization.t("settings.help.title"),
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
            sectionHeader(localization.t("settings.about.title"))
        }
    }

    private var replayOnboardingRow: some View {
        Button {
            replayOnboarding()
        } label: {
            HStack {
                Image(systemName: "sparkles")
                    .foregroundStyle(DesignTokens.Primary.p400)
                    .frame(width: 32)
                Text(localization.t("settings.help.replayOnboarding"))
                    .foregroundStyle(DesignTokens.Text.primary)
                Spacer()
                Image(systemName: "chevron.right")
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }
    }

    private func replayOnboarding() {
        guard let profileId = authManager.activeProfile?.id else { return }
        let key = "tv.bayit.plus.onboarding.\(profileId).completed"
        UserDefaults.standard.set(false, forKey: key)
        coordinator.showingOnboarding = true
    }
}
