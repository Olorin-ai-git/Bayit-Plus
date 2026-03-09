import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Help section for SettingsView providing the ability to replay
/// the feature discovery tour from Settings.
extension SettingsView {
    var helpSection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            sectionHeader(localization.t("settings.help.title"))
            replayOnboardingRow
            replayTourRow
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private var replayOnboardingRow: some View {
        GlassCard {
            Button(action: { showOnboardingReplay = true }) {
                HStack(spacing: DesignTokens.Spacing.md) {
                    Image(systemName: "sparkles")
                        .font(.system(size: DesignTokens.FontSize.lg))
                        .foregroundStyle(DesignTokens.Primary.default)
                        .frame(width: 32)
                    Text(localization.t("settings.help.replayOnboarding"))
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.primary)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                }.padding(DesignTokens.Spacing.md)
            }
        }
    }

    private var replayTourRow: some View {
        GlassCard {
            Button(action: { resetAndShowTour() }) {
                HStack(spacing: DesignTokens.Spacing.md) {
                    Image(systemName: "arrow.counterclockwise.circle")
                        .font(.system(size: DesignTokens.FontSize.lg))
                        .foregroundStyle(DesignTokens.Primary.default)
                        .frame(width: 32)
                    Text(localization.t("settings.help.replayTour"))
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.primary)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                }.padding(DesignTokens.Spacing.md)
            }
        }
    }

    func resetAndShowTour() {
        guard let userId = authManager.user?.id else { return }
        let storageKey = "bayit.onboarding.tour.\(userId)"
        let resetState: [String: Any] = [
            "completion_status": "not_started",
            "current_card_index": 0,
            "completed_cards": [String](),
            "demo_cards_tapped": [String](),
        ]
        UserDefaults.standard.set(resetState, forKey: storageKey)

        tourViewModel = FeatureTourViewModel(
            apiClient: repos.apiClient,
            userId: userId
        )
        showFeatureTour = true
    }
}
